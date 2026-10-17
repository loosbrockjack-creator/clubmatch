#!/usr/bin/env python3
"""Scrape public exec-board contacts from ISU StuOrg club pages.

Public data only: the StuOrg officers table embeds each officer's ISU email in
the directory link href (info.iastate.edu/search?s=<email>). No login, no POSTs,
no joins, no messages. Read-only GETs with a polite delay.

Out: active/research/outreach/officers_raw.json
"""
import json, re, html, time, urllib.request, urllib.error, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
PILOT = ROOT / "research/outreach/pilot_clubs.json"
OUT = ROOT / "research/outreach/officers_raw.json"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/155.0 Safari/537.36")
DELAY = 1.0


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read().decode("utf-8", "replace"), r.getcode()
    except urllib.error.HTTPError as e:
        return "", e.code
    except Exception as e:
        return "", f"ERR {e}"


def strip_tags(s):
    s = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", s)
    s = re.sub(r"(?is)<!--.*?-->", " ", s)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


OFFICER_ROW = re.compile(
    r"(?is)<tr(?P<attrs>[^>]*)>\s*<th[^>]*>(?P<role>.*?)</th>\s*<td[^>]*>(?P<cell>.*?)</td>\s*</tr>")
EMAIL_IN_HREF = re.compile(r"(?i)info\.iastate\.edu/search\?s=([^\"'&>\s]+)")
ANCHOR = re.compile(r"(?is)<a[^>]*>(.*?)</a>")
# one directory anchor = one person: captures (email, inner name markup)
PERSON = re.compile(r'(?is)<a[^>]*href="[^"]*?info\.iastate\.edu/search\?s=([^"&]+)[^"]*"[^>]*>(.*?)</a>')


def parse_officers(h):
    """Pull (role, name, email) from the officers table.

    A single <td> can list several people (e.g. "Advisors", co-presidents), so
    every directory anchor in the cell becomes its own row. Duplicate emails
    within one cell are collapsed.
    """
    tbl = re.search(r'(?is)<table[^>]*class="[^"]*officers[^"]*"[^>]*>(.*?)</table>', h)
    if not tbl:
        return []
    rows = []
    for m in OFFICER_ROW.finditer(tbl.group(1)):
        role = strip_tags(m.group("role"))
        cell, attrs = m.group("cell"), m.group("attrs").lower()
        required = "non-pta" not in attrs
        people, seen = PERSON.findall(cell), set()
        for email, raw_name in people:
            email = html.unescape(email).strip()
            name = strip_tags(raw_name)
            key = email.lower()
            if key in seen:
                continue
            seen.add(key)
            rows.append({"role": role, "name": name, "email": email,
                         "vacant": False, "required_officer": required,
                         "shared_role": len(people) > 1})
        if not people:
            name = strip_tags(cell)
            rows.append({"role": role, "name": name, "email": "",
                         "vacant": (not name or name.lower() in {"none", "n/a", "vacant", "tbd"}
                                    or "no-officer" in attrs),
                         "required_officer": required, "shared_role": False})
    return rows


SOCIAL = {
    "instagram": r"(?i)https?://(?:www\.)?instagram\.com/[A-Za-z0-9_.\-/]+",
    "linkedin":  r"(?i)https?://(?:www\.)?linkedin\.com/[A-Za-z0-9_.\-/%]+",
    "discord":   r"(?i)https?://(?:www\.)?discord(?:\.gg|app\.com|\.com)/[A-Za-z0-9_.\-/]+",
    "facebook":  r"(?i)https?://(?:www\.)?facebook\.com/[A-Za-z0-9_.\-/]+",
    "twitter":   r"(?i)https?://(?:www\.)?(?:twitter\.com|x\.com)/[A-Za-z0-9_.\-/]+",
    "youtube":   r"(?i)https?://(?:www\.)?youtube\.com/[A-Za-z0-9_.\-/@]+",
}


def parse_extras(h):
    out = {k: sorted({re.sub(r"[)\"'>,.]+$", "", u) for u in re.findall(p, h)})[:3]
           for k, p in SOCIAL.items()}
    mails = {m.lower() for m in re.findall(r"(?i)mailto:([^\"'&<>\s?]+)", h)}
    mails = {m for m in mails if "contact@iastate.edu" not in m}
    out["mailto"] = sorted(mails)
    ext = re.findall(r'(?i)href="(https?://(?!(?:www\.)?(?:stuorg|info|www)\.iastate\.edu)[^"]+)"', h)
    skip = ("iastate.edu", "facebook.com", "instagram.com", "linkedin.com", "twitter.com",
            "x.com", "discord", "youtube.com", "adobe.com", "microsoft.com", "google.com")
    out["external_sites"] = sorted({u for u in ext if not any(s in u.lower() for s in skip)})[:4]
    return out


def main():
    clubs = json.loads(PILOT.read_text())
    results = []
    for i, c in enumerate(clubs, 1):
        base = c["stuorgUrl"].rstrip("/")
        rec = dict(c)
        rec["officers_url"] = base + "/officers"
        print(f"[{i}/{len(clubs)}] {c['name']}", file=sys.stderr)

        oh, ocode = get(rec["officers_url"]); time.sleep(DELAY)
        rec["officers_http"] = ocode
        rec["officers"] = parse_officers(oh) if oh else []

        home, hcode = get(base); time.sleep(DELAY)
        rec["home_http"] = hcode
        rec["description"] = ""
        if home:
            rec.update(parse_extras(home))
            # club description = first long paragraph of visible text
            txt = strip_tags(re.search(r"(?is)<main.*?</main>", home).group(0)) if re.search(r"(?is)<main.*?</main>", home) else ""
            rec["description"] = txt[:600]
            # the StuOrg "CONTACT" footer block
            cm = re.search(r"(?is)CONTACT\s*</[^>]+>(.*?)</(?:div|footer|section)>", home)
            rec["contact_block"] = strip_tags(cm.group(1))[:300] if cm else ""

        info, icode = get(base + "/information"); time.sleep(DELAY)
        if info:
            ex = parse_extras(info)
            for k, v in ex.items():
                rec[k] = sorted(set(rec.get(k, []) or []) | set(v))[:4]
        rec["information_http"] = icode
        results.append(rec)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(results, indent=1))
    tot = sum(len(r["officers"]) for r in results)
    withem = sum(1 for r in results for o in r["officers"] if o["email"] and not o["vacant"])
    print(f"\nclubs={len(results)} officer_rows={tot} rows_with_email={withem}", file=sys.stderr)
    print(f"wrote {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Scrape public exec-board contacts from ISU StuOrg club pages.

Public data only: the StuOrg officers table embeds each officer's ISU email in
the directory link href (info.iastate.edu/search?s=<email>). No login, no POSTs,
no joins, no messages. Read-only GETs with a polite delay.

Resumable: each club is appended to a .jsonl checkpoint as it completes, so an
interrupted run picks up where it stopped instead of refetching everything.
Logging is aggregate by design: a progress line every N clubs, one line per
failure, and a summary at the end. At several hundred clubs, per-club success
logging is thousands of lines nobody reads.

  python3 scrape_officers.py [--input pilot_clubs.json] [--delay 1.0]
                             [--progress-every 25] [--restart]
"""
import argparse, json, re, html, time, urllib.request, urllib.error, pathlib, sys, collections

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUTDIR = ROOT / "research/outreach"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/155.0 Safari/537.36")


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def get(url, retries=2):
    for attempt in range(retries + 1):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace"), r.getcode()
        except urllib.error.HTTPError as e:
            return "", e.code
        except Exception as e:
            if attempt == retries:
                return "", f"ERR {e}"
            time.sleep(2 * (attempt + 1))
    return "", "ERR unreachable"


def strip_tags(s):
    s = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", s)
    s = re.sub(r"(?is)<!--.*?-->", " ", s)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


OFFICER_ROW = re.compile(
    r"(?is)<tr(?P<attrs>[^>]*)>\s*<th[^>]*>(?P<role>.*?)</th>\s*<td[^>]*>(?P<cell>.*?)</td>\s*</tr>")
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


def scrape_club(c, delay):
    base = c["stuorgUrl"].rstrip("/")
    rec = dict(c)
    rec["officers_url"] = base + "/officers"

    oh, ocode = get(rec["officers_url"]); time.sleep(delay)
    rec["officers_http"] = ocode
    rec["officers"] = parse_officers(oh) if oh else []

    home, hcode = get(base); time.sleep(delay)
    rec["home_http"] = hcode
    rec["description"] = ""
    if home:
        rec.update(parse_extras(home))
        mm = re.search(r"(?is)<main.*?</main>", home)
        rec["description"] = strip_tags(mm.group(0))[:600] if mm else ""
        cm = re.search(r"(?is)CONTACT\s*</[^>]+>(.*?)</(?:div|footer|section)>", home)
        rec["contact_block"] = strip_tags(cm.group(1))[:300] if cm else ""

    info, icode = get(base + "/information"); time.sleep(delay)
    rec["information_http"] = icode
    if info:
        for k, v in parse_extras(info).items():
            rec[k] = sorted(set(rec.get(k, []) or []) | set(v))[:4]
    return rec


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default=str(OUTDIR / "pilot_clubs.json"))
    ap.add_argument("--out", default=str(OUTDIR / "officers_raw.json"))
    ap.add_argument("--delay", type=float, default=1.0)
    ap.add_argument("--progress-every", type=int, default=25)
    ap.add_argument("--restart", action="store_true", help="ignore the checkpoint and refetch everything")
    a = ap.parse_args()

    out = pathlib.Path(a.out)
    ckpt = out.with_suffix(".partial.jsonl")
    out.parent.mkdir(parents=True, exist_ok=True)
    if a.restart and ckpt.exists():
        ckpt.unlink()

    clubs = json.loads(pathlib.Path(a.input).read_text())

    done = {}
    if ckpt.exists():
        for line in ckpt.read_text().splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
                done[r.get("slug") or r.get("stuorgUrl")] = r
            except json.JSONDecodeError:
                continue          # a torn last line from a hard kill
        log(f"resuming: {len(done)} of {len(clubs)} clubs already scraped")

    todo = [c for c in clubs if (c.get("slug") or c.get("stuorgUrl")) not in done]
    log(f"scraping {len(todo)} clubs (delay {a.delay}s, ~{len(todo)*3*a.delay/60:.0f} min)")

    failures = []
    t0 = time.time()
    with ckpt.open("a") as fh:
        for i, c in enumerate(clubs, 1):
            key = c.get("slug") or c.get("stuorgUrl")
            if key in done:
                continue
            rec = scrape_club(c, a.delay)
            fh.write(json.dumps(rec) + "\n"); fh.flush()
            done[key] = rec
            if rec["officers_http"] != 200 or not rec["officers"]:
                failures.append((c["name"], rec["officers_http"], len(rec["officers"])))
                log(f"  FAIL {c['name'][:46]}: officers_http={rec['officers_http']} rows={len(rec['officers'])}")
            if len(done) % a.progress_every == 0:
                rate = (time.time() - t0) / max(1, len(done) - (len(clubs) - len(todo)))
                left = (len(clubs) - len(done)) * rate
                log(f"  [{len(done)}/{len(clubs)}] {len(failures)} failures, ~{left/60:.0f} min left")

    results = [done[c.get("slug") or c.get("stuorgUrl")] for c in clubs
               if (c.get("slug") or c.get("stuorgUrl")) in done]
    out.write_text(json.dumps(results, indent=1))

    rows = sum(len(r["officers"]) for r in results)
    withem = sum(1 for r in results for o in r["officers"] if o["email"] and not o["vacant"])
    codes = collections.Counter(str(r["officers_http"]) for r in results)
    log("")
    log(f"clubs={len(results)} officer_rows={rows} rows_with_email={withem}")
    log(f"officers_http: {dict(codes)}")
    log(f"clubs with zero officers listed: {sum(1 for r in results if not r['officers'])}")
    log(f"failures: {len(failures)}")
    log(f"elapsed: {(time.time()-t0)/60:.1f} min")
    log(f"wrote {out}")
    log(f"checkpoint kept at {ckpt} (delete it to force a clean refetch)")


if __name__ == "__main__":
    main()

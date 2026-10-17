#!/usr/bin/env python3
"""Verify every scraped officer against the public ISU directory.

For each unique @iastate.edu address, GET info.iastate.edu/search?s=<email>
(the same public lookup StuOrg itself links to) and record the resolved person.
This proves each contact is a real Iowa State person and enriches the row with
major/classification (students) or department/title/phone (faculty & staff).

Read-only GETs, polite delay, results cached so re-runs are cheap.
Out: active/research/outreach/directory_verify.json
"""
import json, re, html, time, urllib.request, urllib.error, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
RAW = ROOT / "research/outreach/officers_raw.json"
OUT = ROOT / "research/outreach/directory_verify.json"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/155.0 Safari/537.36")
DELAY = 0.8


def strip_lines(seg):
    seg = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", seg)
    txt = html.unescape(re.sub(r"<[^>]+>", "\n", seg))
    return [l.strip() for l in txt.split("\n") if l.strip()]


def field(lines, label):
    for l in lines:
        if l.lower().startswith(label.lower() + ":"):
            return l.split(":", 1)[1].strip()
    return ""


def lookup(email):
    url = f"https://info.iastate.edu/search?s={email}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            h = r.read().decode("utf-8", "replace")
            code = r.getcode()
    except urllib.error.HTTPError as e:
        return {"email": email, "found": False, "http": e.code, "lookup_url": url}
    except Exception as e:
        return {"email": email, "found": False, "http": f"ERR {e}", "lookup_url": url}

    title = re.search(r"(?is)<title[^>]*>(.*?)</title>", h)
    title = html.unescape(title.group(1)).split("•")[0].strip() if title else ""
    m = re.search(r"(?is)<main.*?</main>", h)
    lines = strip_lines(m.group(0) if m else h)

    name = ""
    if "Back to Search" in lines:
        i = lines.index("Back to Search")
        if i + 1 < len(lines):
            name = lines[i + 1]
    found = bool(name) and "no results" not in h.lower()

    phone = ""
    pm = re.search(r"\b(\d{3}-\d{3}-\d{4})\b", "\n".join(lines))
    if pm:
        phone = pm.group(1)

    major = field(lines, "Major")
    classification = field(lines, "Classification")
    dept = field(lines, "Department")
    jobtitle = field(lines, "Title")
    gated = "only available to signed-in users" in h.lower()
    kind = "Student" if (major or classification) else ("Faculty/Staff" if (dept or jobtitle) else "Unknown")

    return {"email": email, "found": found, "http": code, "lookup_url": url,
            "directory_name": name, "directory_title_tag": title,
            "major": major, "classification": classification,
            "department": dept, "job_title": jobtitle,
            "phone": phone, "contact_gated": gated, "person_kind": kind}


def main():
    clubs = json.loads(RAW.read_text())
    emails = sorted({o["email"].lower() for c in clubs for o in c["officers"] if o["email"]})
    cache = {}
    if OUT.exists():
        cache = {r["email"]: r for r in json.loads(OUT.read_text())}

    todo = [e for e in emails if e not in cache]
    print(f"{len(emails)} unique emails; {len(todo)} to look up", file=sys.stderr)
    for i, e in enumerate(todo, 1):
        cache[e] = lookup(e)
        st = "ok" if cache[e].get("found") else "NOT FOUND"
        print(f"[{i}/{len(todo)}] {e:34s} {st} {cache[e].get('directory_name','')}", file=sys.stderr)
        time.sleep(DELAY)

    rows = [cache[e] for e in emails]
    OUT.write_text(json.dumps(rows, indent=1))
    nf = [r for r in rows if not r.get("found")]
    print(f"\nverified={len(rows)-len(nf)} not_found={len(nf)}", file=sys.stderr)
    for r in nf:
        print("  NOT FOUND:", r["email"], file=sys.stderr)
    print(f"wrote {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()

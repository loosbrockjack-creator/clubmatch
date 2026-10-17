#!/usr/bin/env python3
"""Verify every scraped officer against the public ISU directory.

For each unique @iastate.edu address, GET info.iastate.edu/search?s=<email>
(the same public lookup StuOrg itself links to) and record the resolved person.
This proves each contact is a real Iowa State person and enriches the row with
major/classification (students) or department/title/phone (faculty & staff).

Read-only GETs, polite delay. Every lookup is appended to a .jsonl checkpoint
as it completes, so a run interrupted after two hours resumes instead of
starting over, and a re-run only looks up addresses it has never seen.
Logging is aggregate: progress every N lookups, one line per address that does
not resolve, and a summary at the end.
Out: active/research/outreach/directory_verify.json

  python3 verify_directory.py [--raw officers_raw.json] [--delay 0.8]
                              [--progress-every 50] [--restart]
"""
import argparse, json, re, html, time, urllib.request, urllib.error, pathlib, sys, collections

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUTDIR = ROOT / "research/outreach"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/155.0 Safari/537.36")


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def strip_lines(seg):
    seg = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", seg)
    txt = html.unescape(re.sub(r"<[^>]+>", "\n", seg))
    return [l.strip() for l in txt.split("\n") if l.strip()]


def field(lines, label):
    for l in lines:
        if l.lower().startswith(label.lower() + ":"):
            return l.split(":", 1)[1].strip()
    return ""


def lookup(email, retries=2):
    url = f"https://info.iastate.edu/search?s={email}"
    h, code = None, None
    for attempt in range(retries + 1):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                h = r.read().decode("utf-8", "replace")
                code = r.getcode()
            break
        except urllib.error.HTTPError as e:
            return {"email": email, "found": False, "http": e.code, "lookup_url": url}
        except Exception as e:
            if attempt == retries:
                return {"email": email, "found": False, "http": f"ERR {e}", "lookup_url": url}
            time.sleep(2 * (attempt + 1))

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
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default=str(OUTDIR / "officers_raw.json"))
    ap.add_argument("--out", default=str(OUTDIR / "directory_verify.json"))
    ap.add_argument("--delay", type=float, default=0.8)
    ap.add_argument("--progress-every", type=int, default=50)
    ap.add_argument("--restart", action="store_true", help="ignore the checkpoint and re-verify everything")
    a = ap.parse_args()

    out = pathlib.Path(a.out)
    ckpt = out.with_suffix(".partial.jsonl")
    out.parent.mkdir(parents=True, exist_ok=True)
    if a.restart and ckpt.exists():
        ckpt.unlink()

    clubs = json.loads(pathlib.Path(a.raw).read_text())
    emails = sorted({o["email"].lower() for c in clubs for o in c["officers"] if o["email"]})

    cache = {}
    if out.exists():
        for r in json.loads(out.read_text()):
            cache[r["email"]] = r
    if ckpt.exists():
        for line in ckpt.read_text().splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
                cache[r["email"]] = r
            except json.JSONDecodeError:
                continue          # torn last line from a hard kill
    if cache:
        log(f"resuming: {len(cache)} addresses already verified")

    todo = [e for e in emails if e not in cache]
    log(f"{len(emails)} unique addresses; {len(todo)} to look up "
        f"(delay {a.delay}s, ~{len(todo)*a.delay/60:.0f} min)")

    notfound, t0 = [], time.time()
    with ckpt.open("a") as fh:
        for i, e in enumerate(todo, 1):
            rec = lookup(e)
            cache[e] = rec
            fh.write(json.dumps(rec) + "\n"); fh.flush()
            if not rec.get("found"):
                notfound.append(e)
                log(f"  unresolved: {e}")
            if i % a.progress_every == 0:
                rate = (time.time() - t0) / i
                log(f"  [{i}/{len(todo)}] {len(notfound)} unresolved, "
                    f"~{(len(todo)-i)*rate/60:.0f} min left")

    rows = [cache[e] for e in emails]
    out.write_text(json.dumps(rows, indent=1))

    kinds = collections.Counter(r.get("person_kind") or "n/a" for r in rows if r.get("found"))
    nf = [r for r in rows if not r.get("found")]
    log("")
    log(f"verified={len(rows)-len(nf)} unresolved={len(nf)} of {len(rows)}")
    log(f"person_kind: {dict(kinds)}")
    log(f"elapsed: {(time.time()-t0)/60:.1f} min")
    log(f"wrote {out}")
    log(f"checkpoint kept at {ckpt} (delete it to force a clean re-verify)")


if __name__ == "__main__":
    main()

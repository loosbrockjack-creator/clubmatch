#!/usr/bin/env python3
"""Build the target club list for a scrape run from data/clubs.json.

The outreach scope is academic and professional clubs at Iowa State only, so the
default selects clubs that carry a college label. Clubs with an empty college
field are the non-academic set (Greek chapters, residence, religious, cultural,
special interest) and are excluded unless --all is passed.

  python3 make_target_list.py                      # 7 core colleges
  python3 make_target_list.py --scope with-college  # + grad, pre-prof, open
  python3 make_target_list.py --scope all           # every club in clubs.json
"""
import argparse, json, pathlib, collections, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
CLUBS = ROOT.parent / "data/clubs.json"
OUT = ROOT / "research/outreach/target_clubs.json"

CORE = {"College of Engineering", "College of Agriculture and Life Sciences",
        "College of Liberal Arts and Sciences", "Ivy College of Business",
        "College of Health and Human Sciences", "College of Veterinary Medicine",
        "College of Design"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scope", choices=["core", "with-college", "all"], default="core")
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--exclude", default="", help="JSON file of clubs already done, skipped by slug")
    a = ap.parse_args()

    clubs = json.loads(CLUBS.read_text())
    if a.scope == "core":
        sel = [c for c in clubs if c.get("college") in CORE]
    elif a.scope == "with-college":
        sel = [c for c in clubs if (c.get("college") or "").strip()]
    else:
        sel = list(clubs)

    skipped = 0
    if a.exclude:
        done = {c["slug"] for c in json.loads(pathlib.Path(a.exclude).read_text())}
        before = len(sel)
        sel = [c for c in sel if c["slug"] not in done]
        skipped = before - len(sel)

    rows = [{"slug": c["slug"], "name": c["name"], "college": c.get("college", ""),
             "members": c.get("memberCount"), "stuorgUrl": c["stuorgUrl"]}
            for c in sel if c.get("stuorgUrl")]

    out = pathlib.Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(rows, indent=1))

    print(f"scope={a.scope} selected={len(rows)} (of {len(clubs)} total)"
          + (f", skipped {skipped} already done" if skipped else ""), file=sys.stderr)
    for col, n in collections.Counter(r["college"] or "(no college)" for r in rows).most_common():
        print(f"  {n:4d}  {col}", file=sys.stderr)
    print(f"est. {len(rows)*3} page requests, ~{len(rows)*3/60:.0f} min at 1s delay", file=sys.stderr)
    print(f"wrote {out}", file=sys.stderr)


if __name__ == "__main__":
    main()

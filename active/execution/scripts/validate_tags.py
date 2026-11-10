"""Merge retag shards into data/club-tags.json and validate them.

Usage: python3 active/execution/scripts/validate_tags.py [--write]
Prints aggregates only. With --write, saves data/club-tags.json when valid.
Overrides in active/config/tag-overrides.json win over shard output.
"""

import collections
import re
import glob
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
SHARDS = os.path.join(ROOT, "active/execution/logs/retag/shard-*.jsonl")
OVERRIDES = os.path.join(ROOT, "active/config/tag-overrides.json")
OUT = os.path.join(ROOT, "data/club-tags.json")
CLUBS = os.path.join(ROOT, "data/clubs.json")

AREAS = {"business", "engineering", "computing", "agriculture", "design", "liberal-arts", "human-sciences",
         "veterinary"}
CAREERS = {"finance", "accounting", "consulting", "marketing", "real-estate", "supply-chain", "software",
           "data-ai", "cybersecurity", "engineering-design", "architecture", "agriculture-food",
           "healthcare", "media-comm", "entrepreneurship"}
WANTS = {"career", "networking", "community", "leadership", "projects", "competition", "academic",
         "service", "entrepreneurship"}
AUDIENCES = {"general", "identity", "faith", "international", "residence", "graduate", "honor", "governance"}
COMMUNITIES = {"faith", "culture-heritage", "international", "lgbtq", "women-in-field"}
COMMITMENTS = {"casual", "moderate", "involved", "high"}
CATEGORIES = {"Business", "Engineering", "Computing & Data", "Agriculture & Life Sciences", "Design & Arts",
              "Health & Pre-Professional", "Liberal Arts & Sciences", "Media & Communication",
              "Service & Volunteering", "Leadership & Government", "Sports & Recreation",
              "Performing Arts & Music", "Culture & Identity", "Faith & Spirituality",
              "Hobbies & Special Interest", "Residence Life"}
FIELDS = ["academicAreas", "openToAllMajors", "careerPaths", "wants", "topics", "audience",
          "communityTags", "commitmentLevel", "categories", "genderFocus"]

# Clubs built for one gender: the "(Men)" and "(Women)" teams, and Women-in-X
# groups. Reviewed against the club list; fix edge cases in tag-overrides.json
# ("genderFocus": "women" | "men" | null). Fraternities and sororities are
# handled by the Greek life question instead.
WOMEN_NAME = re.compile(
    r"\(women\)|^women\b|\bwomen (in|who|impacting|inspired)\b|\bdigital women\b|girls who code"
    r"|society of women|collegiate women|association for women|women in",
    re.I,
)
MEN_NAME = re.compile(r"\(men\)", re.I)


def gender_focus(name):
    if WOMEN_NAME.search(name):
        return "women"
    if MEN_NAME.search(name):
        return "men"
    return None


def load_shards():
    tags, torn = {}, 0
    for path in sorted(glob.glob(SHARDS)):
        for line in open(path):
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                torn += 1
                continue
            tags[row["id"]] = row
    return tags, torn


def check(cid, t):
    errs = []
    def subset(field, allowed, lo, hi):
        v = t.get(field)
        if not isinstance(v, list) or not (lo <= len(v) <= hi) or not set(v) <= allowed:
            errs.append(f"{field}={v}")
    subset("academicAreas", AREAS, 0, 2)
    subset("careerPaths", CAREERS, 0, 3)
    subset("wants", WANTS, 1, 4)
    subset("communityTags", COMMUNITIES, 0, 2)
    subset("categories", CATEGORIES, 1, 2)
    if t.get("audience") not in AUDIENCES:
        errs.append(f"audience={t.get('audience')}")
    if t.get("commitmentLevel") not in COMMITMENTS:
        errs.append(f"commitment={t.get('commitmentLevel')}")
    if not isinstance(t.get("openToAllMajors"), bool):
        errs.append("openToAllMajors")
    topics = t.get("topics")
    if not isinstance(topics, list) or not (1 <= len(topics) <= 4) or any(
        not isinstance(x, str) or x != x.lower() or len(x) > 40 for x in topics
    ):
        errs.append(f"topics={topics}")
    if t.get("genderFocus") not in (None, "women", "men"):
        errs.append(f"genderFocus={t.get('genderFocus')}")
    if t.get("audience") in {"identity", "faith", "international"} and not t.get("communityTags"):
        errs.append("community audience without communityTags")
    if any(ch in json.dumps(t, ensure_ascii=False) for ch in "—–"):
        errs.append("dash")
    return errs


def main():
    tags, torn = load_shards()
    overrides = json.load(open(OVERRIDES)) if os.path.exists(OVERRIDES) else {}
    # Category renames after tagging: match the quiz's Area row wording.
    renames = {"Sciences & Liberal Arts": "Liberal Arts & Sciences"}
    for t in tags.values():
        t["categories"] = [renames.get(c, c) for c in t.get("categories", [])]
    for cid, patch in overrides.items():
        if cid in tags:
            tags[cid].update(patch)

    names = {c["id"]: c["name"] for c in json.load(open(CLUBS))}
    for cid, t in tags.items():
        t["genderFocus"] = gender_focus(names.get(cid, ""))
    for cid, patch in overrides.items():
        if cid in tags and "genderFocus" in patch:
            tags[cid]["genderFocus"] = patch["genderFocus"]

    # Every College of Veterinary Medicine club is in the "veterinary" area.
    vet = {c["id"] for c in json.load(open(CLUBS)) if c.get("college") == "College of Veterinary Medicine"}
    for cid in vet & set(tags):
        tags[cid]["academicAreas"] = ["veterinary"]

    expected = {c["id"] for c in json.load(open(CLUBS)) if not c.get("greek")}
    missing = expected - set(tags)
    extra = set(tags) - expected
    bad = {cid: e for cid, t in tags.items() if (e := check(cid, t))}

    print(f"rows {len(tags)}  expected {len(expected)}  missing {len(missing)}  extra {len(extra)}  "
          f"torn {torn}  invalid {len(bad)}  overrides {len(overrides)}")
    for cid, e in list(bad.items())[:15]:
        print("  INVALID", cid, e)
    if missing:
        print("  missing:", sorted(missing)[:10])

    def dist(field):
        c = collections.Counter(x for t in tags.values() for x in (t[field] if isinstance(t[field], list) else [t[field]]))
        return ", ".join(f"{k} {v}" for k, v in c.most_common())

    print("audience:", dist("audience"))
    print("careers:", dist("careerPaths"))
    print("areas:", dist("academicAreas"))
    print("wants:", dist("wants"))
    print("communities:", dist("communityTags"))
    print("commitment:", dist("commitmentLevel"))
    print("categories:", dist("categories"))
    print("no area and no career:", sum(1 for t in tags.values() if not t["academicAreas"] and not t["careerPaths"]))
    gf = collections.Counter(t.get("genderFocus") for t in tags.values())
    print("genderFocus:", dict(gf))
    print("low confidence:", sum(1 for t in tags.values() if t.get("confidence") == "low"))
    thin = [k for k, v in collections.Counter(x for t in tags.values() for x in t["careerPaths"]).items() if v < 3]
    print("careers under 3 clubs:", thin or "none")

    if "--write" in sys.argv:
        if bad or missing:
            print("NOT WRITTEN: fix invalid or missing rows first")
            sys.exit(1)
        out = {cid: {f: t[f] for f in FIELDS} for cid, t in sorted(tags.items()) if cid in expected}
        json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=0, sort_keys=True)
        print(f"wrote {len(out)} -> {OUT}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Build active/leads/clubmatch_presidents.xlsx: one row per club.

One primary contact per club (the president), plus a fallback ladder when the
president has no verified channel. Reads contacts_normalized.json (output of
normalize_contacts.py) and data/clubs.json (for category labels).

Tabs: Presidents | Needs Review | Notes
Prints aggregates only, never rows.
"""
import json, pathlib, re, datetime, collections, sys
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from build_workbook import header, finish, put, TITLE_F, SECTION_F, BODY, MUTED_F  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[2]          # .../active
SRC = ROOT / "research/outreach/contacts_normalized.json"
CLUBS = ROOT.parent / "data/clubs.json"
OUT = ROOT / "leads/clubmatch_presidents.xlsx"
TODAY = datetime.date.today().isoformat()

ISU = "@iastate.edu"
NOT_PRES = re.compile(r"(?i)\b(vice|past|former|ex)[\s\-]*(co[\s\-]*)?president|\bvp\b")
PRES = re.compile(r"(?i)president")
# Titles that stand in for a president when a club has none (sports, Greek, special interest).
LEADER = re.compile(r"(?i)\b(captain|chair(man|woman|person)?|chief|founder|director|leader|head|"
                    r"commander|coordinator|manager)\b")


def is_president(role):
    role = role or ""
    return bool(PRES.search(role)) and not NOT_PRES.search(role)


def isu_email(e):
    return (e or "").strip().lower().endswith(ISU)


def safe_url(u):
    """Drop any link hosted on a non Iowa State .edu domain."""
    m = re.match(r"(?i)^https?://([^/]+)", u or "")
    if not m:
        return ""
    host = m.group(1).lower()
    if host.endswith(".edu") and not host.endswith("iastate.edu"):
        return ""
    return u


def pick_leader(rows):
    """No president: best stand-in among non advisor student officers."""
    lead = [r for r in rows if r["person_type"] == "Student Officer" and LEADER.search(r["role"] or "")]
    if lead:
        return lead[0]
    vp = [r for r in rows if r["person_type"] == "Student Officer"
          and re.search(r"(?i)vice[\s\-]*president", r["role"] or "")]
    return vp[0] if vp else None


def main():
    data = json.loads(SRC.read_text())
    cat = {}
    for c in json.loads(CLUBS.read_text()):
        cat[c["name"]] = ", ".join(c.get("categories") or [])

    by_club = collections.defaultdict(list)
    for r in data["contacts"]:
        by_club[r["club"]].append(r)
    review_by = collections.defaultdict(list)
    for r in data["needs_review"]:
        review_by[r["club"]].append(r)

    rows, review_rows, dropped_nonisu = [], [], 0
    for club in data["clubs"]:
        name = club["club"]
        mine = by_club.get(name, [])
        pres = [r for r in mine if is_president(r["role"]) and r["person_type"] == "Student Officer"
                and isu_email(r["email"])]
        dropped_nonisu += sum(1 for r in mine if not isu_email(r["email"]))
        advisors = [r for r in mine if r["person_type"] in ("Advisor", "Faculty/Staff") and isu_email(r["email"])]
        inbox = club.get("role_based_inbox") or ""
        inbox = inbox if isu_email(inbox) else ""            # drops typos such as @iatstate.edu
        listed = club.get("listed_contact_email") or ""
        if listed.lower().endswith(".edu") and not isu_email(listed):
            listed = ""                                       # non-ISU .edu is never used
        listed_isu, listed_other = (listed, "") if isu_email(listed) else ("", listed)
        adv = advisors[0] if advisors else None

        standin = None
        if pres:
            status, primary = "Verified president", pres[0]
        else:
            standin = pick_leader(mine)
            status, primary = ("Leader stand-in (no president listed)", standin) if standin else ("", None)

        pres_unverified = [r for r in review_by.get(name, []) if is_president(r["role"])]
        for r in pres_unverified:
            review_rows.append(r)

        # Fallback ladder, first non blank wins.
        ladder = []
        if primary:
            ladder.append(("President email" if pres else "Leader email", primary["email"]))
        ladder += [("Club inbox", inbox), ("Club listed email", listed_isu),
                   ("Advisor email", adv["email"] if adv else ""),
                   ("Club listed email (non-ISU address)", listed_other),
                   ("Instagram", club.get("instagram")), ("LinkedIn", club.get("linkedin")),
                   ("Discord", club.get("discord")), ("Facebook", club.get("facebook"))]
        best_label, best_val = next(((k, v) for k, v in ladder if v), ("None found", ""))
        if not status:
            status = ("President unverified (see Needs Review)" if pres_unverified
                      else "No president or leader listed" if best_val else "Nothing found")
        elif status == "Verified president" and len(pres) > 1:
            status = "Verified president (co-presidents)"

        extra = "; ".join(f"{r['full_name']} <{r['email']}>" for r in pres[1:])
        rows.append({
            "club": name, "college": club["college"] or "Non-academic / other",
            "category": cat.get(name, ""), "status": status,
            "name": primary["full_name"] if primary else "",
            "role": primary["role"] if primary else "",
            "email": primary["email"] if primary else "",
            "phone": (primary or {}).get("phone") or "",
            "extra": extra,
            "best_label": best_label, "best": best_val,
            "inbox": inbox, "listed": listed_isu, "listed_other": listed_other,
            "advisor": f"{adv['full_name']} <{adv['email']}>" if adv else "",
            "instagram": safe_url(club.get("instagram")), "linkedin": safe_url(club.get("linkedin")),
            "discord": safe_url(club.get("discord")), "facebook": safe_url(club.get("facebook")),
            "source": (primary or {}).get("source_url") or club.get("officers_url") or "",
            "also": (primary or {}).get("other_clubs") or "",
            "verified": today_verified(primary),
        })

    rows.sort(key=lambda r: (r["college"] == "Non-academic / other", r["college"], r["club"]))
    build_workbook(rows, review_rows)
    aggregates(rows, review_rows, dropped_nonisu)


def today_verified(primary):
    return "Yes" if primary and primary.get("directory_verified") else ""


COLS = [("Club", 38), ("College", 30), ("Category", 22), ("Status", 30), ("President", 24),
        ("Role", 22), ("Email", 30), ("Phone", 14), ("Additional Presidents", 34),
        ("Best Channel", 22), ("Best Channel Value", 36), ("Club Inbox", 28),
        ("Club Listed Email", 28), ("Club Listed Email (non-ISU)", 28), ("Advisor", 36),
        ("Instagram", 22), ("LinkedIn", 22), ("Discord", 22), ("Facebook", 22),
        ("Also Listed In", 26), ("Directory Verified", 12), ("Source (StuOrg)", 34)]


def link_for(v):
    if not v:
        return None
    if v.startswith("http"):
        return v
    return f"mailto:{v}" if "@" in v else None


def build_workbook(rows, review_rows):
    wb = Workbook()
    ws = wb.active
    ws.title = "Presidents"
    header(ws, COLS)
    keys = ["club", "college", "category", "status", "name", "role", "email", "phone", "extra",
            "best_label", "best", "inbox", "listed", "listed_other", "advisor", "instagram",
            "linkedin", "discord", "facebook", "also", "verified", "source"]
    for i, r in enumerate(rows, 2):
        for c, k in enumerate(keys, 1):
            v = r[k]
            if isinstance(v, list):
                v = ", ".join(v)
            put(ws, i, c, v or None, link=link_for(v) if k in (
                "email", "best", "inbox", "listed", "listed_other", "instagram", "linkedin",
                "discord", "facebook", "source") else None)
    finish(ws, len(COLS), len(rows))

    ws2 = wb.create_sheet("Needs Review")
    put(ws2, 1, 1, "Presidents listed on StuOrg but not confirmed as a current ISU person in the "
        "directory (likely graduated or suppressed). Not used on the Presidents tab. Verify before use.",
        font=MUTED_F)
    hdr = [("Club", 36), ("Name", 24), ("Role", 24), ("Email as listed", 30), ("Why", 44), ("Source", 34)]
    header(ws2, hdr, row=3)
    for i, r in enumerate(review_rows, 4):
        for c, v in enumerate([r["club"], r["full_name"], r["role"], r["email"],
                               r.get("review_reason", ""), r.get("source_url", "")], 1):
            put(ws2, i, c, v or None, link=v if c == 6 and v else None)
    finish(ws2, len(hdr), len(review_rows), hdr_row=3)

    ws3 = wb.create_sheet("Notes")
    ws3.column_dimensions["A"].width = 30
    ws3.column_dimensions["B"].width = 100
    ws3.cell(row=1, column=1, value="ClubMatch | Iowa State club presidents").font = TITLE_F
    notes = [
        ("Built", TODAY),
        ("What this is", "One row per Iowa State club. Primary contact is the club president, taken from "
                         "the club's public StuOrg officers page and confirmed in the ISU directory."),
        ("Best Channel ladder", "President email, club inbox, club listed email (ISU), advisor email, "
                                "club listed email (non-ISU address), Instagram, LinkedIn, Discord, Facebook."),
        ("Status values", "Verified president | Verified president (co-presidents) | Leader stand-in "
                          "(no president listed) | President unverified (see Needs Review) | "
                          "No president or leader listed | Nothing found."),
        ("Non-ISU address", "A few clubs list a non @iastate.edu address (for example Gmail) as their "
                            "contact. Kept in its own column and ranked after every ISU channel."),
        ("Turnover", "Presidents change every spring. Treat as a snapshot as of the build date."),
        ("Privacy", "Student addresses are masked by ISU from the public but published by the clubs on "
                    "StuOrg. Keep inside the group, include an opt out in outreach, honor removals. "
                    "Do not commit this file; active/leads/ is gitignored and the repo is public."),
    ]
    for r, (k, v) in enumerate(notes, 3):
        a = ws3.cell(row=r, column=1, value=k); a.font = Font(name="Arial", size=10, bold=True)
        b = ws3.cell(row=r, column=2, value=v); b.font = BODY
        b.alignment = Alignment(wrap_text=True, vertical="top")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT)


def aggregates(rows, review_rows, dropped_nonisu):
    print(f"clubs={len(rows)}  needs_review_rows={len(review_rows)}  non-ISU contact rows excluded={dropped_nonisu}")
    print("status:", dict(collections.Counter(r["status"] for r in rows)))
    print("best channel:", dict(collections.Counter(r["best_label"] for r in rows)))
    bad = sum(1 for r in rows if r["email"] and not isu_email(r["email"]))
    dup = [e for e, n in collections.Counter(r["email"] for r in rows if r["email"]).items() if n > 1]
    print(f"president emails not @iastate.edu: {bad}   emails on more than one club: {len(dup)}")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()

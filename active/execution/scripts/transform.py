"""Turn scraped stuorg records into ClubMatch Club objects.

Every string written here comes from the organization's own registry entry.
Where the registry is silent the field is left empty rather than invented, and
the UI is expected to handle that.
"""

import json
import os
import re

import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import classify as C

DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "data")
RAW = os.path.join(DATA, "stuorg-raw.json")
OUT = os.path.join(DATA, "clubs.json")
INDEX_OUT = os.path.join(DATA, "clubs-index.json")

# Fields every card, filter, and match score needs. Everything else is detail-only.
INDEX_FIELDS = [
    "id", "name", "mark", "slug", "college", "tagline", "categories",
    "academicAreas", "openToAllMajors", "careerPaths", "goalsServed",
    "experienceTypes", "commitmentLevel", "freshmenWelcome",
]

# --- ISU category -> ClubMatch taxonomy -------------------------------------

AREA_BY_CATEGORY = {
    "Academic - Ag & Life Sciences": ["agriculture"],
    "Academic - Business": ["business"],
    "Academic - Design": ["design"],
    "Academic - Engineering": ["engineering"],
    "Academic - Health and Human Sciences": ["human-sciences"],
    "Academic - LAS": ["liberal-arts"],
    "Academic - Pre-Professional": ["liberal-arts"],
    "Academic - Vet-Med": ["agriculture"],
    "Programming": ["computing"],
}

COLLEGE_BY_CATEGORY = {
    "Academic - Ag & Life Sciences": "College of Agriculture and Life Sciences",
    "Academic - Business": "Ivy College of Business",
    "Academic - Design": "College of Design",
    "Academic - Engineering": "College of Engineering",
    "Academic - Health and Human Sciences": "College of Health and Human Sciences",
    "Academic - LAS": "College of Liberal Arts and Sciences",
    "Academic - Vet-Med": "College of Veterinary Medicine",
    "Academic - Pre-Professional": "Pre-professional",
    "Academic - Intercollegiate": "Open to every college",
    "Graduate and Professional": "Graduate College",
}

CATEGORY_LABEL = {
    "Academic - Ag & Life Sciences": "Agriculture & Life Sciences",
    "Academic - Business": "Business",
    "Academic - Design": "Design",
    "Academic - Engineering": "Engineering",
    "Academic - Health and Human Sciences": "Health & Human Sciences",
    "Academic - Intercollegiate": "Intercollegiate",
    "Academic - LAS": "Liberal Arts & Sciences",
    "Academic - Pre-Professional": "Pre-Professional",
    "Academic - Vet-Med": "Veterinary Medicine",
    "Culture/Identity Based": "Culture & Identity",
    "Religious/Spiritual": "Religious & Spiritual",
    "Service & Volunteerism": "Service & Volunteering",
    "Graduate and Professional": "Graduate & Professional",
}

EXPERIENCE_BY_CATEGORY = {
    "Academic - Ag & Life Sciences": ["academic"],
    "Academic - Business": ["professional"],
    "Academic - Design": ["projects"],
    "Academic - Engineering": ["projects"],
    "Academic - Health and Human Sciences": ["academic"],
    "Academic - Intercollegiate": ["academic"],
    "Academic - LAS": ["academic"],
    "Academic - Pre-Professional": ["professional"],
    "Academic - Vet-Med": ["academic"],
    "Culture/Identity Based": ["community"],
    "Fraternities": ["community"],
    "Graduate and Professional": ["academic"],
    "Honor Societies": ["academic"],
    "Media Production": ["projects"],
    "Military": ["service"],
    "Music & Performing Arts": ["community"],
    "Political & Activism": ["community"],
    "Programming": ["projects"],
    "Religious/Spiritual": ["community"],
    "Residence": ["community"],
    "Service & Volunteerism": ["service"],
    "Sororities": ["community"],
    "Special Interest": ["community"],
    "Sports & Recreation": ["community"],
    "Sports Club": ["competition"],
    "Student Innovation Center": ["projects"],
    "Council": ["community"],
    "Leadership": ["community"],
}

GOALS_BY_CATEGORY = {
    "Academic - Ag & Life Sciences": ["career", "networking"],
    "Academic - Business": ["career", "networking"],
    "Academic - Design": ["skills", "hands-on"],
    "Academic - Engineering": ["hands-on", "skills"],
    "Academic - Health and Human Sciences": ["career", "skills"],
    "Academic - Intercollegiate": ["skills"],
    "Academic - LAS": ["skills"],
    "Academic - Pre-Professional": ["career", "networking"],
    "Academic - Vet-Med": ["career", "networking"],
    "Council": ["leadership", "community"],
    "Culture/Identity Based": ["community"],
    "Fraternities": ["community", "leadership"],
    "Graduate and Professional": ["career", "networking"],
    "Honor Societies": ["networking"],
    "Leadership": ["leadership"],
    "Media Production": ["skills", "hands-on"],
    "Military": ["leadership"],
    "Music & Performing Arts": ["community"],
    "Political & Activism": ["community"],
    "Programming": ["skills", "hands-on"],
    "Religious/Spiritual": ["community"],
    "Residence": ["community"],
    "Service & Volunteerism": ["community"],
    "Sororities": ["community", "leadership"],
    "Special Interest": ["community"],
    "Sports & Recreation": ["community"],
    "Sports Club": ["community"],
    "Student Innovation Center": ["hands-on"],
}

CAREERS_BY_CATEGORY = {
    "Academic - Business": ["consulting"],
    "Academic - Design": ["architecture"],
    "Academic - Engineering": ["engineering-design"],
    "Academic - Vet-Med": ["healthcare"],
    "Academic - Pre-Professional": ["healthcare"],
    "Programming": ["software"],
    "Media Production": ["media-comm"],
    "Student Innovation Center": ["entrepreneurship"],
}

MAJORS_BY_AREA = {
    "business": ["Finance", "Marketing", "Accounting", "Supply Chain", "Management"],
    "engineering": ["Mechanical Engineering", "Civil Engineering",
                    "Electrical Engineering", "Aerospace Engineering",
                    "Industrial Engineering"],
    "computing": ["Computer Science", "Software Engineering", "Data Science",
                  "Cybersecurity", "Management Information Systems"],
    "agriculture": ["Agronomy", "Animal Science", "Agricultural Business",
                    "Food Science", "Horticulture"],
    "design": ["Architecture", "Graphic Design", "Industrial Design",
               "Interior Design", "Landscape Architecture"],
    "liberal-arts": ["Biology", "Psychology", "Political Science", "Communication",
                     "English"],
    "human-sciences": ["Kinesiology", "Dietetics", "Education", "Event Management",
                       "Apparel Merchandising"],
}

AREA_LABEL = {
    "business": "business",
    "engineering": "engineering",
    "computing": "computing and data",
    "agriculture": "agriculture and life sciences",
    "design": "design and architecture",
    "liberal-arts": "liberal arts and sciences",
    "human-sciences": "human sciences",
}

STOPWORDS = {"of", "the", "and", "at", "for", "in", "a", "an", "isu", "iowa",
             "state", "university", "students", "student"}

# Records the registry uses to exercise its own database, not real clubs.
SKIP_NAME_RX = re.compile(r"(?i)\btest organi[sz]ation\b|\btest org\b|^travelauth\b|^test too$")
SKIP_DESC_RX = re.compile(
    r"(?i)(only )?for testing (online systems|the stuorg|the database)"
    r"|used for testing the stuorg")

COMMITMENT_TEXT = {
    "casual": "About 1 to 2 hours a week",
    "moderate": "About 2 to 4 hours a week",
    "involved": "About 5 to 8 hours a week",
    "high": "8 or more hours a week",
}


# --- text helpers -----------------------------------------------------------

def collapse(text):
    return re.sub(r"\s+", " ", (text or "")).strip()


def slugify(name):
    s = name.lower().replace("&", " and ")
    s = re.sub(r"[''’]", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"-+", "-", s).strip("-")[:70] or "club"


def initials(name):
    cleaned = re.sub(r"\(.*?\)", " ", name)
    words = re.findall(r"[A-Za-z0-9]+", cleaned)
    if not words:
        return "ISU"

    # An acronym the group already uses beats manufactured initials.
    for w in words:
        if 2 <= len(w) <= 4 and w.isupper() and w.lower() not in ("isu", "the"):
            return w

    significant = [w for w in words if w.lower() not in STOPWORDS]
    if len(significant) < 2:
        significant = [w for w in words if w.lower() not in {"of", "the", "and", "at", "for", "in", "a", "an"}]
    if not significant:
        significant = words

    mark = "".join(w[0].upper() for w in significant[:4])
    if len(mark) < 2:
        mark = significant[0][:2].upper()
    return mark[:4]


def sentences(text):
    text = collapse(text)
    if not text:
        return []
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"'])", text)
    return [p.strip() for p in parts if p.strip()]


def clean_prose(text):
    text = collapse(text)
    if not text:
        return ""
    text = re.sub(
        r"(?i)^(the )?(purpose|mission|goal|objective)s? of (this|our|the) "
        r"(organization|club|group|chapter|society|association)[^.]*?(is|shall be|are) (to )?",
        "", text)
    text = re.sub(r"(?i)^(the )?(purpose|mission) (is|shall be) (to )?", "", text)
    text = text.strip(" -–|•")
    if text and text[0].islower():
        text = text[0].upper() + text[1:]
    return text


def truncate(text, limit):
    text = clean_prose(text)
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0].rstrip(",;:-– ")
    return cut + "..."


def dedupe(seq):
    seen, out = set(), []
    for item in seq:
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out


def bulletize(text, limit=4):
    """Split registry prose into short, readable bullets."""
    if not text:
        return []
    candidates = []
    for line in text.split("\n"):
        line = line.strip().lstrip("-•* ").strip()
        if not line:
            continue
        if len(line) < 130:
            candidates.append(line)
        else:
            candidates.extend(sentences(line))

    bullets = []
    for b in candidates:
        b = clean_prose(b).rstrip(".")
        b = re.sub(r"(?i)^(we|the club|the organization|our club|this organization)\s+", "", b)
        if b:
            b = b[0].upper() + b[1:]
        # "See website, facebook, or twitter" tells a student nothing.
        if C.POINTER_RX.search(b) or "http" in b.lower():
            continue
        low = b.lower()
        if 15 <= len(b) <= 180 and low not in (x.lower() for x in bullets):
            bullets.append(b)
        if len(bullets) >= limit:
            break
    return bullets


# --- inference --------------------------------------------------------------

def infer_commitment(cats, signal_text, meetings):
    m = meetings or ""
    if any(c in cats for c in ("Sports Club", "Fraternities", "Sororities", "Military")):
        return "involved"
    if "Honor Societies" in cats:
        return "casual"

    if re.search(r"(?i)\b(twice a week|two times a week|three times a week|multiple times (a|per) week|daily)\b", m):
        return "high"

    weekly = re.search(r"(?i)\b(weekly|every week|once a week|each week)\b", m)
    biweekly = re.search(r"(?i)\b(bi-?weekly|every other week|twice a month|two times a month)\b", m)
    monthly = re.search(r"(?i)\b(monthly|once a month|each month|per month|a semester)\b", m)

    heavy = bool(C.COMPETITION_RX.search(signal_text) and C.PROJECTS_RX.search(signal_text))

    if heavy:
        return "involved" if not weekly else "involved"
    if weekly:
        return "moderate"
    if biweekly or monthly:
        return "casual"
    return "moderate"


DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def meeting_frequency(meetings):
    """A short, clean phrase, or an honest fallback. Never a truncated sentence."""
    m = collapse(meetings)
    if not m:
        return "Check with the club for meeting times"

    if re.search(r"(?i)\b(twice a week|two times a week)\b", m):
        return "Meets twice a week"
    if re.search(r"(?i)\b(bi-?weekly|every other week)\b", m):
        return "Meets every other week"
    if re.search(r"(?i)\b(weekly|every week|once a week|each week)\b", m):
        day = next((d for d in DAYS if re.search(rf"(?i)\b{d}s?\b", m)), None)
        return f"Weekly, usually on {day}s" if day else "Weekly meetings"
    if re.search(r"(?i)\b(monthly|once a month|each month|one time a month)\b", m):
        return "Monthly meetings"
    if re.search(r"(?i)\btwice a month\b", m):
        return "Meets twice a month"
    if re.search(r"(?i)\b(once|twice|two|three|four|\d+) times? (a|per) semester\b", m):
        return "Meets a few times a semester"

    day = next((d for d in DAYS if re.search(rf"(?i)\b{d}s?\b", m)), None)
    if day:
        return f"Meets on {day}s"
    return "Check with the club for meeting times"


def build_gains(club_text, cats, experiences, goals):
    """Only claims the registry text actually supports."""
    gains = []
    if C.PROFESSIONAL_RX.search(club_text):
        gains.append("Contact with speakers, alumni, and employers in the field")
    if C.PROJECTS_RX.search(club_text):
        gains.append("Hands-on project work you can point to on a resume")
    if C.COMPETITION_RX.search(club_text):
        gains.append("Competition experience against other schools")
    if C.LEADERSHIP_RX.search(club_text):
        gains.append("A path into officer and leadership roles")
    if C.SERVICE_RX.search(club_text):
        gains.append("Volunteer and service hours with the group")
    if C.COMMUNITY_RX.search(club_text) and "community" in goals:
        gains.append("A group of students with the same interest")
    if C.ACADEMIC_RX.search(club_text):
        gains.append("Depth in the subject beyond what coursework covers")
    return dedupe(gains)[:4]


GREETING_RX = re.compile(
    r"^(welcome to|hello|hi there|hi,|greetings|thanks for (visiting|stopping))|"
    r"^(this is|here is) (the|our) (home|web)?page", re.I)


def pick_tagline(sents, name):
    """The first sentence that says something, not a greeting or a header."""
    for s in sents[:4]:
        s = clean_prose(s)
        if not s or len(s) < 25:
            continue
        if GREETING_RX.search(s) or C.POINTER_RX.search(s):
            continue
        return s if len(s) <= 165 else truncate(s, 140)

    for s in sents:
        s = clean_prose(s)
        if len(s) >= 25:
            return s if len(s) <= 165 else truncate(s, 140)
    return f"{name} is a registered student organization at Iowa State."


def pick_college(cats, subject_text):
    """Orgs often tag several academic categories. Pick the one their own
    description actually supports, not whichever happens to sort first."""
    academic = [c for c in cats if c in COLLEGE_BY_CATEGORY and c.startswith("Academic")]
    if not academic:
        for c in cats:
            if c in COLLEGE_BY_CATEGORY:
                return COLLEGE_BY_CATEGORY[c]
        # Non-academic orgs have no college; the category chips carry the label.
        return ""

    def support(cat):
        areas = AREA_BY_CATEGORY.get(cat, [])
        return sum(
            len(C.AREA_PATTERNS[a].findall(subject_text))
            for a in areas
            if a in C.AREA_PATTERNS
        )

    best = max(academic, key=lambda c: (support(c), -academic.index(c)))
    return COLLEGE_BY_CATEGORY[best]


def build_best_for(areas, cats, open_to_all, application_required):
    """One plain sentence, or nothing."""
    if areas:
        labels = [AREA_LABEL[a] for a in areas[:2] if a in AREA_LABEL]
        if labels:
            who = " and ".join(labels)
            base = f"Students in {who}"
            if open_to_all:
                return f"{base}, though the group is open to any major."
            return f"{base}."
    if "Graduate and Professional" in cats:
        return "Graduate and professional students."
    if "Residence" in cats:
        return "Students living in this residence hall community."
    if open_to_all and not application_required:
        return "Any student who wants to try the group out, no experience assumed."
    return ""


# --- main transform ---------------------------------------------------------

def build(rec):
    name = collapse(rec["name"])
    if SKIP_NAME_RX.search(name) or SKIP_DESC_RX.search(rec.get("description") or ""):
        return None

    cats = rec.get("categories") or []
    desc = clean_prose(rec.get("description") or "")
    activities = rec.get("activities") or ""
    events = rec.get("specialEvents") or ""
    meetings = rec.get("meetings") or ""
    home = rec.get("homeText") or ""

    body = desc or clean_prose(" ".join(sentences(home)[:4]))

    # Classification reads the club's own prose, not meeting-minutes boilerplate.
    subject_text = f"{name}. {body}"
    # Signals about what the group does can safely read the wider text.
    signal_text = " ".join([name, body, activities, events, home[:2000]])

    areas = dedupe(
        [a for c in cats for a in AREA_BY_CATEGORY.get(c, [])]
        + [a for a, rx in C.AREA_PATTERNS.items() if rx.search(subject_text)]
    )

    careers = dedupe(
        [c for cat in cats for c in CAREERS_BY_CATEGORY.get(cat, [])]
        + [c for c, rx in C.CAREER_PATTERNS.items() if rx.search(subject_text)]
    )[:5]

    goals = [g for c in cats for g in GOALS_BY_CATEGORY.get(c, [])]
    if C.ENTREPRENEURSHIP_RX.search(subject_text):
        goals.append("entrepreneurship")
    if C.SERVICE_RX.search(signal_text):
        goals.append("community")
    if C.LEADERSHIP_RX.search(signal_text):
        goals.append("leadership")
    if C.PROJECTS_RX.search(signal_text):
        goals.append("hands-on")
    if C.PROFESSIONAL_RX.search(signal_text):
        goals.append("career")
    goals = dedupe(goals)[:4] or ["community"]

    experiences = [e for c in cats for e in EXPERIENCE_BY_CATEGORY.get(c, [])]
    if C.COMPETITION_RX.search(signal_text):
        experiences.append("competition")
    if C.SERVICE_RX.search(signal_text):
        experiences.append("service")
    if C.PROJECTS_RX.search(signal_text):
        experiences.append("projects")
    if C.PROFESSIONAL_RX.search(signal_text):
        experiences.append("professional")
    if C.ACADEMIC_RX.search(signal_text):
        experiences.append("academic")
    if C.COMMUNITY_RX.search(signal_text):
        experiences.append("community")
    experiences = dedupe(experiences)[:4] or ["community"]

    college = pick_college(cats, subject_text)

    restrictions = collapse(" ".join([
        rec.get("membershipRestrictions") or "",
        rec.get("membershipQualifications") or "",
        rec.get("allowedMembers") or "",
    ]))

    open_to_all = not (
        "Honor Societies" in cats or bool(C.RESTRICTED_RX.search(restrictions))
    )
    # An explicit "open to all majors" outranks an incidental GPA floor.
    if C.OPEN_TO_ALL_RX.search(restrictions) or C.BEGINNER_RX.search(signal_text):
        open_to_all = True

    application_required = bool(
        C.SELECTIVE_RX.search(restrictions)
        or C.SELECTIVE_RX.search(subject_text)
        or any(c in cats for c in ("Honor Societies", "Fraternities", "Sororities"))
    )

    beginner_friendly = bool(C.BEGINNER_RX.search(signal_text)) or not application_required
    freshmen_welcome = open_to_all and not bool(C.UPPERCLASS_RX.search(restrictions))

    majors = dedupe([m for a in areas for m in MAJORS_BY_AREA.get(a, [])])[:5]
    categories = dedupe([CATEGORY_LABEL.get(c, c) for c in cats]) or ["Student Organization"]

    commitment = infer_commitment(cats, signal_text, meetings)

    sents = sentences(body)
    tagline = pick_tagline(sents, name)

    summary = truncate(body, 900) if body else (
        "This group is registered with Iowa State's Student Organizations office "
        "but has not published a full description yet. Check their ISU page for "
        "current officers and contact details."
    )

    what_you_do = bulletize(activities, 4)
    if len(what_you_do) < 2 and events:
        what_you_do += [b for b in bulletize(events, 3) if b not in what_you_do]
    if len(what_you_do) < 2 and len(sents) > 1:
        what_you_do += [b for b in bulletize(" ".join(sents[1:4]), 3) if b not in what_you_do]
    what_you_do = what_you_do[:4]

    return {
        "id": rec["slug"],
        "name": name,
        "mark": initials(name),
        "slug": slugify(name),
        "college": college,
        "tagline": tagline,
        "summary": summary,
        "academicAreas": areas,
        "openToAllMajors": open_to_all,
        "categories": categories,
        "careerPaths": careers,
        "goalsServed": goals,
        "experienceTypes": experiences,
        "commitmentLevel": commitment,
        "meetingFrequency": meeting_frequency(meetings),
        "bestFor": build_best_for(areas, cats, open_to_all, application_required),
        "whatYouDo": what_you_do,
        "whatYouGain": build_gains(signal_text, cats, experiences, goals),
        "beginnerFriendly": beginner_friendly,
        "freshmenWelcome": freshmen_welcome,
        "applicationRequired": application_required,
        "stuorgUrl": f"https://www.stuorg.iastate.edu/{rec['slug']}",
        "memberCount": int(rec["studentMembers"]) if (rec.get("studentMembers") or "").isdigit() else None,
        "meetingDetail": truncate(meetings, 240) if meetings else "",
    }


if __name__ == "__main__":
    raw = json.load(open(RAW))
    built, skipped = [], []
    for rec in raw:
        club = build(rec) if rec.get("ok") else None
        (built if club else skipped).append(club or rec["name"])

    # Slug collisions would break /clubs/[slug] routing.
    seen = {}
    for club in built:
        base = club["slug"]
        seen[base] = seen.get(base, 0) + 1
        if seen[base] > 1:
            club["slug"] = f"{base}-{seen[base]}"

    built.sort(key=lambda c: c["name"].lower())

    # The client filters and ranks every club, so the browser gets a lean index.
    # The prose only a detail page renders stays server-side.
    index = [{k: club[k] for k in INDEX_FIELDS} for club in built]

    json.dump(index, open(INDEX_OUT, "w"), separators=(",", ":"), ensure_ascii=False)
    json.dump(built, open(OUT, "w"), separators=(",", ":"), ensure_ascii=False)

    print(f"built {len(built)} clubs, skipped {len(skipped)}: {skipped}")
    print(f"  index  {os.path.getsize(INDEX_OUT) // 1024} KB -> {INDEX_OUT}")
    print(f"  full   {os.path.getsize(OUT) // 1024} KB -> {OUT}")

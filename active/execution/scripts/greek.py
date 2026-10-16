"""Merge the SFE fraternity and sorority list into the built club records.

The SFE list (sfe.dso.iastate.edu) is the source of truth for which groups are
Greek chapters. Stuorg records that match a chapter keep their registry data
(meetings, member count, stuorg link) and gain the chapter's SFE details.
Chapters stuorg does not have become new records built from SFE text only.
Anything else stuorg tagged Fraternities or Sororities loses those tags: those
are councils, music fraternities, and a few mis-tagged clubs, not chapters.

Same rule as the rest of the pipeline: if SFE says nothing, the field is empty.
"""

import re

KIND_CATEGORY = {"fraternity": "Fraternities", "sorority": "Sororities"}
GREEK_CATEGORIES = set(KIND_CATEGORY.values())

COUNCIL_ID = {
    "collegiate panhellenic council": "cpc",
    "interfraternity council": "ifc",
    "multicultural greek council": "mgc",
    "national pan-hellenic council": "nphc",
}

# SFE affiliation tag -> ClubMatch academic area, so a STEM or agriculture
# chapter scores like the major it is built around.
AREAS_BY_AFFILIATION = {
    "STEM": ["engineering", "computing"],
    "Agriculture": ["agriculture"],
    "Architecture": ["design"],
}

# Names that normalization alone does not line up.
ALIASES = {
    "catalyst": "catalyst interest group",
    "delta sigma theta": "delta sigma theta phi",
}

GREEK_LETTERS = {
    "alpha": "Α", "beta": "Β", "gamma": "Γ", "delta": "Δ", "epsilon": "Ε",
    "zeta": "Ζ", "eta": "Η", "theta": "Θ", "iota": "Ι", "kappa": "Κ",
    "lambda": "Λ", "mu": "Μ", "nu": "Ν", "xi": "Ξ", "omicron": "Ο", "pi": "Π",
    "rho": "Ρ", "sigma": "Σ", "tau": "Τ", "upsilon": "Υ", "phi": "Φ",
    "chi": "Χ", "psi": "Ψ", "omega": "Ω",
}

# The SFE office address, which some chapters without a house list as theirs.
SFE_OFFICE_RX = re.compile(r"(?i)memorial union")


def collapse(text):
    return re.sub(r"\s+", " ", (text or "")).strip()


def normalize(name):
    s = name.lower()
    s = re.sub(r"\(.*?\)", " ", s)
    s = s.split(":")[0]
    s = re.sub(r"-\s*\w+ \w+ chapter$", " ", s)
    s = re.sub(r"\b(fraternity|sorority|incorporated|inc|international|latin|chapter)\b", " ", s)
    s = re.sub(r"[^a-z ]+", " ", s)
    return collapse(s)


def letters_for(name):
    """'Alpha Gamma Rho' -> 'ΑΓΡ'. Only when the name is all Greek letters."""
    words = normalize(name).split()
    if 2 <= len(words) <= 3 and all(w in GREEK_LETTERS for w in words):
        return "".join(GREEK_LETTERS[w] for w in words)
    return ""


def display_name(name):
    """SFE writes 'Inc.' three ways ('Sorority, Inc.', 'Sorority Inc.',
    'Fraternity Inc.'). Normalize to ', Inc.' and drop stray spaces."""
    name = collapse(name).rstrip(" ,")
    return re.sub(r",?\s+Inc\.?$", ", Inc.", name)


# Monograms for chapters whose names are not Greek letters. FarmHouse writes
# its own initials as FH; single-word names get one serif initial.
MARK_OVERRIDES = {"farmhouse": "FH"}


def mark_for(name, initials):
    key = normalize(name)
    if key in MARK_OVERRIDES:
        return MARK_OVERRIDES[key]
    if len(key.split()) == 1:
        return key[:1].upper()
    return initials(name)


def year_of(date):
    m = re.search(r"\b(18|19|20)\d\d\b", date or "")
    return m.group(0) if m else ""


def url_or_empty(value):
    value = (value or "").strip()
    return value if value.lower().startswith("http") else ""


def same_url(a, b):
    def key(u):
        return re.sub(r"^https?://(www\.)?", "", u.lower()).rstrip("/")
    return bool(a and b) and key(a) == key(b)


def title_address(address):
    """'2121 sunset drive' -> '2121 Sunset Drive', '2136 Lincoln way' ->
    '2136 Lincoln Way'. The page appends ', Ames', so a city SFE already
    included is dropped."""
    address = collapse(address).rstrip(".")
    address = re.sub(r"(?i),?\s*Ames(,?\s*(IA|Iowa))?(\s*\d{5})?$", "", address)
    return " ".join(w.capitalize() if w.isalpha() and w.islower() else w for w in address.split())


def complete_sentence(text, limit=280):
    """SFE truncates long housing cells mid-word. Only keep finished text."""
    text = collapse(text)
    if not text or len(text) > limit or not text.endswith((".", "!")):
        return ""
    return text


def tidy_author(author):
    """'Tyrique Ross, 2024 & 2025 Chapter President' -> '..., 2024-2025 ...'.
    Also puts the name first when SFE wrote '2026 Chapter President, Name'."""
    author = collapse(author)
    author = re.sub(r"(20\d\d)\s*(?:&|and|-)\s*(20\d\d)", r"\1-\2", author)
    parts = [p.strip() for p in author.split(",", 1)]
    if len(parts) == 2 and re.match(r"20\d\d", parts[0]):
        author = f"{parts[1]}, {parts[0]}"
    return author


def housing_info(rows, has_page):
    by_label = {r["label"].lower(): r["value"] for r in rows}
    address = by_label.get("address", "")
    # A chapter page without a housing table means no house (it matches the
    # councils' own counts). An empty or missing page says nothing either way.
    housed = (bool(address) and not SFE_OFFICE_RX.search(address)) if has_page else None
    alcohol = by_label.get("alcohol status", "")
    status = alcohol.partition(":")[0]
    info = {
        "housed": housed,
        "address": title_address(address) if housed else "",
        "parking": complete_sentence(by_label.get("parking", ""), 160) if housed else "",
        "living": complete_sentence(by_label.get("style of living", "")) if housed else "",
        "alcoholStatus": status.strip() if housed and status.strip() in ("Prohibited", "Limited", "Permitted") else "",
    }
    return info


def first_sentence(text, limit=165):
    text = collapse(text)
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z])", text)
    for p in parts:
        if len(p) >= 25 and not re.match(r"(?i)^(welcome|hello|hi\b)", p):
            if len(p) <= limit:
                return p
            return p[:limit - 25].rsplit(" ", 1)[0].rstrip(",;:- ") + "..."
    return ""


def chapter_detail(ch):
    facts = ch.get("facts", {})
    has_page = bool(ch.get("facts") or ch.get("description"))
    housing = housing_info(ch.get("housing", []), has_page)
    nickname = collapse(ch.get("nickname", ""))
    if nickname.lower() == normalize(ch["name"]):
        nickname = ""
    quote = collapse(ch.get("quote", ""))
    return {
        "sfeUrl": ch.get("sfeUrl", ""),
        "nickname": nickname,
        "motto": collapse(facts.get("Motto", "")).strip('"“”'),
        "philanthropy": collapse(facts.get("Philanthropy", "")),
        "foundedLocal": year_of(facts.get("Local Founding Date", "")),
        "foundedNational": year_of(facts.get("National Founding Date", "")),
        "quote": quote,
        "quoteAuthor": tidy_author(ch.get("quoteAuthor", "")) if quote else "",
        "address": housing["address"],
        "parking": housing["parking"],
        "living": housing["living"],
        "alcoholStatus": housing["alcoholStatus"],
        "chapterWebsite": url_or_empty(facts.get("Chapter Website")),
        "nationalWebsite": "" if same_url(facts.get("Chapter Website"), facts.get("National Website"))
        else url_or_empty(facts.get("National Website")),
        "socialUrl": url_or_empty(facts.get("Social Media")),
    }, housing["housed"]


def council_of(ch):
    name = ch.get("council") or ch.get("facts", {}).get("Council", "")
    return COUNCIL_ID.get(collapse(name).lower())


def affiliations_of(ch):
    tags = []
    for field in ("academic", "identity", "religious"):
        tags += [t.strip() for t in (ch.get(field) or "").split(",") if t.strip()]
    return tags


def apply(built, sfe, slugify, initials):
    by_norm = {}
    for club in built:
        by_norm.setdefault(normalize(club["name"]), club)

    matched, created = [], []
    chapter_ids = set()

    for ch in sfe["chapters"]:
        key = normalize(ch["name"])
        club = by_norm.get(ALIASES.get(key, key))
        kind = ch["kind"]
        council = council_of(ch)
        affiliations = affiliations_of(ch)
        detail, housed = chapter_detail(ch)
        description = collapse(ch.get("description", ""))

        if club is None:
            name = display_name(ch["name"])
            council_label = next((k for k, v in COUNCIL_ID.items() if v == council), "")
            fallback = (
                f"{name} is a {council_label.title()} {kind} at Iowa State."
                if council_label else f"{name} is a {kind} at Iowa State."
            )
            club = {
                "id": f"sfe-{ch['slug'] or slugify(name)}",
                "name": name,
                "mark": mark_for(name, initials),
                "slug": slugify(name),
                "college": "",
                "tagline": first_sentence(description) or fallback,
                "summary": description or fallback,
                "academicAreas": [],
                "openToAllMajors": True,
                "categories": [],
                "careerPaths": [],
                "goalsServed": ["community", "leadership"],
                "experienceTypes": ["community"],
                "commitmentLevel": "involved",
                "meetingFrequency": "Check with the chapter for meeting times",
                "bestFor": "",
                "whatYouDo": [],
                "whatYouGain": [],
                "beginnerFriendly": False,
                "freshmenWelcome": True,
                "applicationRequired": True,
                "stuorgUrl": "",
                "memberCount": None,
                "meetingDetail": "",
            }
            built.append(club)
            created.append(name)
        else:
            matched.append(f"{ch['name']} -> {club['name']}")
            # SFE's listing name is the clean official one ("Alpha Kappa Alpha
            # Sorority, Inc." rather than "...Incorporated- Eta Tau Chapter").
            # The slug stays, so existing links keep working.
            club["name"] = display_name(ch["name"])
            club["mark"] = mark_for(club["name"], initials)
            # The chapter's own SFE description is current and usually fuller
            # than the registry's, which for some chapters is a single period.
            if len(description) >= 80 and len(description) > len(club["summary"]) * 0.6:
                club["summary"] = description
                club["tagline"] = first_sentence(description) or club["tagline"]
            elif "registered student organization" in club["tagline"] and description:
                club["tagline"] = first_sentence(description) or club["tagline"]

        # Only tags SFE supports. The stuorg keyword classifier read words like
        # "finance" or "software" in chapter blurbs as subject areas, which
        # told business students Alpha Chi Omega was a finance group.
        identity = ["Culture & Identity"] if any(
            a in affiliations for a in ("Black/African American", "Latina/o/x", "Asian/Pacific Islander", "LGBTQIA+")
        ) else []
        club["categories"] = [KIND_CATEGORY[kind]] + identity
        club["academicAreas"] = list(dict.fromkeys(
            a for tag in affiliations for a in AREAS_BY_AFFILIATION.get(tag, [])))
        club["careerPaths"] = []
        club["openToAllMajors"] = True
        club["freshmenWelcome"] = True
        club["experienceTypes"] = ["community"] + (["service"] if detail["philanthropy"] else [])
        club["goalsServed"] = ["community", "leadership"]
        # "What you would gain" is inferred from keywords, not stated by anyone,
        # and stuorg's activity text split into bullets reads badly for
        # chapters ("Section 1, Order of Business"). The SFE description and
        # facts sheet carry the chapter page instead.
        club["whatYouGain"] = []
        club["whatYouDo"] = []
        club["bestFor"] = ""

        club["greek"] = {
            "kind": kind,
            "council": council,
            "letters": letters_for(ch["name"]),
            "affiliations": affiliations,
            "nickname": detail["nickname"],
            "housed": housed,
            "photo": ch.get("photo"),
        }
        club["greekDetail"] = detail
        chapter_ids.add(club["id"])

    untagged = []
    for club in built:
        if club["id"] in chapter_ids:
            continue
        if GREEK_CATEGORIES & set(club["categories"]):
            club["categories"] = [c for c in club["categories"] if c not in GREEK_CATEGORIES] or ["Student Organization"]
            untagged.append(club["name"])

    return {"matched": matched, "created": created, "untagged": untagged}

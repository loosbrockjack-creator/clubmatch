"""Keyword patterns for mapping ISU registry text onto the ClubMatch taxonomy.

Patterns are deliberately specific. Ambiguous single words ("business",
"equity", "design", "security") match far too much registry boilerplate
("orders of business", "social equity"), so every pattern here is either a
multi-word phrase or a word that only appears in its domain.
"""

import re

def rx(*patterns):
    return re.compile("|".join(patterns), re.I)


# --- career paths -----------------------------------------------------------

CAREER_PATTERNS = {
    "finance": rx(
        r"\binvestment(s)?\b", r"\bfinancial\b", r"\bfinance\b", r"\bportfolio\b",
        r"\bstock market\b", r"\bequity research\b", r"\bcapital market",
        r"\bwealth management\b", r"\binvestment banking\b", r"\btrading\b",
        r"\bhedge fund", r"\bventure capital\b", r"\bbanking\b",
    ),
    "accounting": rx(
        r"\baccounting\b", r"\baccountancy\b", r"\baccountants?\b", r"\bauditing\b",
        r"\bbeta alpha psi\b", r"\btax(ation)? (season|law|practice|preparation)\b",
        r"\bcertified public accountant\b", r"\bCPA\b",
    ),
    "consulting": rx(
        r"\bconsult(ing|ant|ants)\b", r"\bcase competition", r"\bmanagement consulting\b",
        r"\bstrategy consulting\b",
    ),
    "marketing": rx(
        r"\bmarketing\b", r"\badvertis(ing|ement)\b", r"\bbrand(ing)?\b",
        r"\bpublic relations\b", r"\bmarket research\b", r"\bsales career",
    ),
    "real-estate": rx(
        r"\breal estate\b", r"\bproperty (management|development|investment)\b",
        r"\bconstruction management\b", r"\bappraisal\b", r"\bland development\b",
    ),
    "supply-chain": rx(
        r"\bsupply chain\b", r"\blogistics\b", r"\boperations management\b",
        r"\bprocurement\b", r"\btransportation (planning|engineering|student)\b",
        r"\bwarehous", r"\bAPICS\b",
    ),
    "software": rx(
        r"\bsoftware\b", r"\bprogramming\b", r"\bcomputer science\b", r"\bcoding\b",
        r"\bdeveloper(s)?\b", r"\bapp development\b", r"\bweb development\b",
        r"\bgame develop", r"\bhackathon\b", r"\blinux\b", r"\bopen source\b",
        r"\bfull.stack\b", r"\bcompetitive programming\b", r"\bpython\b",
    ),
    "data-ai": rx(
        r"\bdata science\b", r"\bmachine learning\b", r"\bartificial intelligence\b",
        r"\bdata analytics\b", r"\bdata analysis\b", r"\bstatistics club\b",
        r"\bactuarial\b", r"\bbig data\b", r"\bdeep learning\b", r"\bAI\b",
        r"\bpredictive model", r"\bquantitative research\b",
    ),
    "cybersecurity": rx(
        r"\bcyber ?security\b", r"\bcyber ?defense\b", r"\binformation security\b",
        r"\binformation assurance\b", r"\bpenetration testing\b",
        r"\bcapture the flag\b", r"\bdigital forensics\b", r"\bnetwork security\b",
    ),
    "engineering-design": rx(
        r"\bengineering\b", r"\bengineers?\b", r"\brobotics?\b", r"\bmechanical\b",
        r"\baerospace\b", r"\belectrical engineer", r"\bcivil engineer",
        r"\bchemical engineer", r"\bmanufacturing\b", r"\bmaterials science\b",
        r"\bnuclear\b", r"\bstructural\b", r"\bCAD\b", r"\bmachining\b",
        r"\baeronautic", r"\bautomotive\b", r"\bpropulsion\b",
    ),
    "architecture": rx(
        r"\barchitectur(e|al)\b", r"\bindustrial design\b", r"\bgraphic design\b",
        r"\binterior design\b", r"\blandscape architecture\b",
        r"\burban (and regional )?planning\b", r"\bproduct design\b",
        r"\bdesign studio\b", r"\bcommunity planning\b",
    ),
    "agriculture-food": rx(
        r"\bagronom", r"\bagricultur", r"\bagribusiness\b", r"\banimal science\b",
        r"\bfood science\b", r"\bhorticultur", r"\bdairy\b", r"\blivestock\b",
        r"\bcrop(s| production| science)\b", r"\bsoil science\b", r"\bforestry\b",
        r"\bpoultry\b", r"\bswine\b", r"\bequine\b", r"\bseed (science|industry)\b",
        r"\bfarm(ing)?\b", r"\bbeef\b", r"\bfood industry\b",
    ),
    "healthcare": rx(
        r"\bpre.?med(ical|icine)?\b", r"\bmedical (school|students|field)\b",
        r"\bmedicine\b", r"\bnursing\b", r"\bdietetics?\b", r"\bnutrition\b",
        r"\bpublic health\b", r"\bveterinar", r"\bdental\b", r"\bpharmac",
        r"\bphysician", r"\bphysical therapy\b", r"\boccupational therapy\b",
        r"\bkinesiolog", r"\bhealth ?care\b", r"\bclinical\b", r"\bpatient care\b",
        r"\bMCAT\b", r"\bhealth professions\b",
    ),
    "media-comm": rx(
        r"\bjournalism\b", r"\bbroadcast", r"\bfilmmaking\b", r"\bfilm production\b",
        r"\bphotograph", r"\bpublic speaking\b", r"\bdebate\b", r"\btoastmasters\b",
        r"\bmagazine\b", r"\bnewspaper\b", r"\bradio station\b", r"\bvideograph",
        r"\bcommunication(s)? (major|student|field|industry)\b", r"\bpodcast",
    ),
    "entrepreneurship": rx(
        r"\bentrepreneur", r"\bstart.?ups?\b", r"\bfounders?\b",
        r"\bsmall business\b", r"\bpitch competition\b", r"\bbusiness plan\b",
        r"\binnovation\b",
    ),
}


# --- academic areas ---------------------------------------------------------

AREA_PATTERNS = {
    "business": rx(
        r"\bbusiness (school|students|majors?|college|community|world|career)\b",
        r"\bcollege of business\b", r"\bIvy College\b", r"\bfinance\b",
        r"\bmarketing\b", r"\baccounting\b", r"\bsupply chain\b", r"\beconomics\b",
        r"\bmanagement information systems\b", r"\bentrepreneur",
        r"\bbusiness (analytics|administration|major)\b",
    ),
    "engineering": rx(
        r"\bengineering\b", r"\bengineers?\b", r"\brobotics?\b", r"\baerospace\b",
        r"\bmechanical\b", r"\bcivil engineer", r"\belectrical engineer",
        r"\bchemical engineer", r"\bmanufacturing\b", r"\bnuclear\b",
        r"\bmaterials science\b", r"\baeronautic",
    ),
    "computing": rx(
        r"\bcomputer science\b", r"\bsoftware\b", r"\bprogramming\b",
        r"\bdata science\b", r"\bcyber ?security\b", r"\bmachine learning\b",
        r"\bartificial intelligence\b", r"\binformatics\b", r"\bcoding\b",
        r"\bdeveloper(s)?\b", r"\bcomputer engineering\b", r"\binformation technology\b",
    ),
    "agriculture": rx(
        r"\bagricultur", r"\bagronom", r"\banimal science\b", r"\bagribusiness\b",
        r"\bfood science\b", r"\bhorticultur", r"\bforestry\b", r"\bveterinar",
        r"\bdairy\b", r"\bcrop(s| science)\b", r"\bsoil science\b", r"\bfarm(ing)?\b",
        r"\bnatural resource", r"\bwildlife\b",
    ),
    "design": rx(
        r"\barchitectur(e|al)\b", r"\bindustrial design\b", r"\bgraphic design\b",
        r"\binterior design\b", r"\blandscape architecture\b",
        r"\burban (and regional )?planning\b", r"\bcollege of design\b",
        r"\bdesign students?\b", r"\bfine arts\b", r"\bstudio art\b",
    ),
    "liberal-arts": rx(
        r"\bpolitical science\b", r"\bpsycholog", r"\bbiolog", r"\bchemistry\b",
        r"\bphysics\b", r"\bhistory (major|department|students)\b", r"\benglish major",
        r"\bphilosoph", r"\bsociolog", r"\bjournalism\b", r"\bworld languages\b",
        r"\bmathematic", r"\banthropolog", r"\bgeolog", r"\bliberal arts\b",
        r"\bpre.?law\b", r"\blinguistic", r"\bcriminal justice\b",
    ),
    "human-sciences": rx(
        r"\bkinesiolog", r"\bdietetics?\b", r"\bnutrition\b",
        r"\beducation major", r"\bteacher education\b", r"\bpre.?service teacher",
        r"\bevent management\b", r"\bhospitality\b", r"\bapparel\b",
        r"\bhuman development\b", r"\bfamily (services|studies)\b",
        r"\bhuman sciences\b", r"\bfamily and consumer\b",
    ),
}


# --- experience / goal signals ---------------------------------------------

COMPETITION_RX = rx(
    r"\bcompet(e|es|ing|ition|itions|itive team)\b", r"\btournament", r"\bcontest\b",
    r"\bnational(s| championship| competition)\b", r"\bconference (meet|championship)\b",
    # "race" alone collides with diversity statements ("regardless of race").
    r"\bracing\b", r"\brace team\b", r"\bregatta\b", r"\bcase competition\b",
)

PROJECTS_RX = rx(
    r"\bdesign and build\b", r"\bbuild(ing)? (a|an|our|the)\b", r"\bfabricat",
    r"\bprototyp", r"\bhands.on\b", r"\bproject team\b", r"\bsub.?teams?\b",
    r"\bmachine shop\b", r"\bworkshops? where\b", r"\bCAD\b", r"\bassembl(e|y|ing)\b",
    r"\bdesign(s|ing)? (and|our|a|an|the) (vehicle|robot|rocket|car|system|product)\b",
)

SERVICE_RX = rx(
    r"\bvolunteer", r"\bphilanthrop", r"\bservice project", r"\bcommunity service\b",
    r"\boutreach\b", r"\bfundrais", r"\bgive back\b", r"\bnonprofit\b",
    r"\bcharit(y|able)\b", r"\bfood bank\b", r"\bmentor(ing|ship)?\b",
)

PROFESSIONAL_RX = rx(
    r"\bguest speakers?\b", r"\bspeakers?\b", r"\bnetworking\b", r"\bresum(e|es)\b",
    r"\binternship", r"\bcareer fair\b", r"\bemployers?\b", r"\balumni\b",
    r"\bprofessional development\b", r"\bindustry (tour|visit|professional|contact)",
    r"\bmock interview", r"\bsite visit", r"\bcompany tour",
)

ACADEMIC_RX = rx(
    r"\bresearch\b", r"\bcurriculum\b", r"\bacademic\b", r"\bstudy (group|sessions)\b",
    r"\bjournal club\b", r"\bseminar", r"\blecture", r"\bpresentations? on\b",
    r"\btutoring\b",
)

COMMUNITY_RX = rx(
    r"\bsocial events?\b", r"\bsocials\b", r"\bcommunity\b", r"\bfriendship\b",
    r"\bfellowship\b", r"\bmeet new people\b", r"\bwelcoming\b", r"\binclusive\b",
    r"\bsupport (group|network|system)\b", r"\bbelonging\b",
)

LEADERSHIP_RX = rx(
    r"\bleadership\b", r"\bofficer positions?\b", r"\bexecutive board\b",
    r"\blead(ing)? (a|the) (team|committee|chapter)\b", r"\bcommittee chair",
)

ENTREPRENEURSHIP_RX = rx(
    r"\bentrepreneur", r"\bstart.?ups?\b", r"\bbusiness plan\b",
    r"\bpitch competition\b", r"\bfound(ing|ers?)\b", r"\binnovation\b",
)

BEGINNER_RX = rx(
    r"\bno (prior )?experience (is )?(necessary|needed|required)\b",
    r"\ball (experience|skill) levels\b", r"\bbeginners? (are )?welcome\b",
    r"\bnew members? (are )?welcome\b", r"\bno background\b",
    r"\bwe'?ll teach you\b", r"\bopen to (all|any) (majors?|students?|skill)\b",
    r"\ball majors welcome\b",
)

SELECTIVE_RX = rx(
    r"\bapplication (is )?(required|process)\b", r"\bmust apply\b", r"\bapply (to|for) (join|membership)\b",
    r"\bby invitation\b", r"\binvite only\b", r"\bselective\b",
    r"\binterview (process|required)\b", r"\baudition", r"\btry.?outs?\b",
    r"\bnomination\b", r"\brecruitment process\b",
)

RESTRICTED_RX = rx(
    r"\bmust be\b", r"\bonly (open to|available to)\b", r"\brestricted to\b",
    r"\blimited to\b", r"\brequired to be\b", r"\bmajors only\b",
    r"\bminimum GPA\b", r"\bGPA of\b", r"\bgraduate students only\b",
)

OPEN_TO_ALL_RX = rx(
    r"\bopen to all\b", r"\bopen to any\b", r"\ball majors\b", r"\bany major\b",
    r"\ball ISU majors\b", r"\bregardless of major\b", r"\ball students\b",
    r"\bevery major\b", r"\ball registered students\b",
)

# Registry prose that points elsewhere instead of describing anything.
POINTER_RX = rx(
    r"^see (our |the )?(website|webpage|facebook|instagram|twitter|page)",
    r"^(check|visit) (out )?(our|the) (website|page|facebook|instagram)",
    r"^(TBD|TBA|N/?A|none|varies|see above|same as above|see constitution)\b",
    r"^(see|refer to) (our |the )?constitution",
    r"^more info", r"^email us\b", r"^contact us\b",
)

UPPERCLASS_RX = rx(
    r"\bjuniors?\b", r"\bseniors?\b", r"\bupper.?class", r"\bgraduate students only\b",
    r"\bsophomore standing\b", r"\bsecond.year\b", r"\bat least \d+ credit",
)

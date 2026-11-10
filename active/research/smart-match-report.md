# Smart Match: Report

Status: shipped to main on 2026-11-10 after two harsh review rounds.

## Handoff summary
- **Club tags:** all 672 non-Greek clubs re-tagged from their own registry text (8 tagging agents plus a second-opinion check on 122 clubs). Max 2 academic areas and 3 careers per club, plus who it's for, community tags, and topic keywords. Explore uses 16 clean categories.
- **Quiz:** optional resume or LinkedIn PDF step (AI pre-fills answers, file never stored). Goals and Experience merged into "What do you want from a club?" (pick up to 3). Time options are now "More than 8 hours a week" at the top. New optional step 5: "Anything specific?" text box plus an opt-in communities question. No race, religion, or gender questions.
- **Scoring:** a club must match something specific (major area, career, or a topic). Faith, culture, identity, and international clubs only show for students who ask, in their own section. Residence halls and grad-only groups never show in results.
- **Results:** top 20 plus "Show more", AI-written "why it fits" lines that swap in after load, a "Because you mentioned" row, and a communities section.
- **Privacy:** club officers never see community opt-ins or typed text (`scoreForOfficers`). Community-section views aren't counted for clubs. The privacy page explains the resume upload and the AI provider.
- **Without an API key** the AI parts hide and everything else works (tested with a no-key production build).

## For Jack
1. Add `ANTHROPIC_API_KEY` in Vercel: Project > Settings > Environment Variables > Production, then Redeploy. `/match` and `/results` are prerendered, so the AI parts only appear after a redeploy with the key set.
2. Set a monthly spend cap in the Anthropic console (Settings > Limits). Haiku 5.5 costs a fraction of a cent per quiz.

## Review log
Round 1 (21 items, 1 blocker): resume topics were hidden and outweighed typed ones. Fixed with separate, removable, lower-weight resume topics, rarity weighting, and a "Because you mentioned" row. Also fixed: 4 MB upload cap, timeouts and maxDuration, sanitized AI inputs, community opt-ins kept out of prompts, campus-friendly rate limits, balanced community picks, similar clubs, retake flow, and copy and casing.
Round 2 (13 items, 1 blocker): mobile overflow in the new row (fixed), honor note dropped (fixed), failed text-box read was silent (fixed), near-area filler capped at 5, a "Browse all X clubs" link when results are thin, catch-all categories damped in similar clubs.
Held as decided, logged rather than changed:
- Professional identity societies (SWE, NSBE, SHPE) stay in general results, with a +15 boost for opted-in students (owner-approved spec).
- Calibration kept honest (see Known limits).
- Explore shows A to Z for a moment before switching to fit order on first load. The page prerenders A to Z for search engines; showing a skeleton instead would cost that.
- A club that matches only a typed topic can show around 60% on its detail page. Left as is; the % is consistent with Results.


## How the simulation works
`node active/execution/scripts/sim-match.mjs 2000` runs 2,000 seeded random students (area, 1 to 3 careers biased toward their area, 1 to 3 wants, time, 20% opt into a community) through the old scoring (snapshot of the previous commit) and the new one. "No major or career match" is judged with the reviewed tags for both versions.


## Known limits and calls made
- **Calibration vs the plan's target.** The plan aimed for a median top score of 85 to 95 and the 20th result at 60 to 75. Actual: 82 and 55. I kept the honest scale (a % is "share of what a perfect club would score for you") rather than inflating it; scores under 60 mean a partial match, and the first card says "Top match" instead of "Best match" when the best score is under 60.
- **Thin careers are real, not a tagging gap.** Iowa State has 1 accounting, 1 consulting, and 1 real-estate club, and 2 each for cybersecurity and supply chain (checked by name scan). To keep those students from getting 1 result, a club in the area a career points to (accounting -> business) now counts as a weaker match. "Top-10 slots with no major or career match" moved from 0% to 2% because of these near-area matches and typed topics; that is by design.
- **Identity-focused professional societies** (SWE, NSBE, SHPE) stay in everyone's results, per the tagging spec. Students who opt in to that community get a +15 boost.
- **Rate limits** are best effort per server instance (40 resumes, 120 text-box, and 120 reasons calls per IP per hour). The Anthropic console spend cap is the real ceiling.
- **Zero-result students.** About 1% of simulated students are undecided on a major and pick only "Other" for careers. The quiz has nothing specific to match, so they see the "no strong matches" screen (it suggests adding a career or an interest) instead of unrelated clubs.
- **Before column.** The "Before" numbers use the same simulated students, now including a gender answer and "Other" careers, so they shift slightly between runs.

## Simulation: 2000 students

| Metric | Before | After |
|---|---|---|
| Results per student (median / p10 / p90) | 246 / 137 / 392 | 38 / 14 / 77 |
| Students with zero results | 0 | 25 |
| Top-1 score (median) | 89 | 83 |
| 20th result score (median) | 72 | 56 |
| Clubs that ever reach a top 10 | 341 | 238 |
| Most common top-10 club (share of students) | Cardinal Space Mining Club (41%) | Algorithmic Trading Club (24%) |
| Ties for #1 (median / max) | 2 / 362 | 1 / 41 |
| Top-10 slots with no major or career match | 54% | 2% |
| Students shown a faith/culture/identity club they did not ask for (top 20) | 1052 | 0 |
| Students shown a residence-hall or grad-only club (top 20) | 1234 | 0 |
| Students shown a club built for the other gender (top 20) | 259 | 0 |
| Students shown Ames Furry Club (top 20) | 1 | 0 |

## Personas (top 5)

**Finance student**
- Before: Entrepreneurial Product Development Club (98); Finance Club (98); Investment Group (98); Real Estate Development Club (98); Algorithmic Trading Club (94)
- After (29 results): Finance Club (91); Algorithmic Trading Club (91); The Actuarial Collective (91); Investment Group (82); Beta Alpha Psi (82)

**Accounting student**
- Before: Beta Alpha Psi (94); Advertising Club (75); Agricultural Business Club (75); Alpha Kappa Psi (75); Cardinal Key Honor Society (75)
- After (29 results): Beta Alpha Psi (82); Alpha Kappa Psi (65); Collegiate Women in Business (65); Delta Sigma Pi (65); Future Business Leaders of America Collegiate (65)

**CS student who likes to build**
- Before: AI & ML Club (98); Stats Club (94); Data Science Club (89); Greek Week (88); Hacking and Cyber Security Club (88)
- After (18 results): Developer Group (87); AI & ML Club (87); Algorithmic Trading Club (86); Hackathon Club (82); Game Development Club (78)

**Agronomy student**
- Before: Agricultural Marketing and Management Organization (98); Dairy Science Club (98); Natural Resource Ecology and Management Graduate Student Organization (98); Agronomy Graduate Student Club (95); Association of Graduate Animal Scientists (95)
- After (48 results): Culinary Science Club (91); Agronomy Club (91); Farm Operations Club (91); Iowa Corn Growers Collegiate Club (91); Agricultural Systems Technology Club (91)

**Pre-med biology student**
- Before: Cardinal Key Honor Society (98); Communication Disorders Club (98); Friends of MSF (98); National Organization of Minority Architecture Students (98); Pre-Medical Club (98)
- After (64 results): Pre-Medical Club (91); Communication Disorders Club (86); Pre-Physician Assistant Club (86); Pre-Dental Club (86); Pre-Health Club (77)

**Graphic design student**
- Before: Cardinal Space Mining Club (97); Cyber Robotics (97); Datum, Student Journal of Architecture (97); Entrepreneur Club (97); Game Design Major Club (97)
- After (35 results): StratAA (89); Datum, Student Journal of Architecture (89); ISD Media Group (89); Women Who Design (71); National Organization of Minority Architecture Students (71)

**Undecided freshman**
- Before: Dance Marathon (76); Agricultural Marketing and Management Organization (73); Structural Engineering Institute Graduate Student Chapter (73); Women in Mechanical Engineering (73); Global Health Innovation Lab (72)
- After (15 results): Medical Sales Club (92); Entrepreneur Club (84); Marketing Club (81); Sales Club (74); Entrepreneurial Product Development Club (74)

**Marketing student who climbs**
- Before: Agricultural Marketing and Management Organization (94); Women in Mechanical Engineering (94); National Agri-Marketing Association (90); Cardinal Creative Agency (87); Public Relations Student Society of America (81)
- After (30 results): Medical Sales Club (86); Mountaineering and Climbing Club (78); Sales Club (74); Marketing Club (69); Delta Sigma Pi (65)
- Because you mentioned: rock climbing: Mountaineering and Climbing Club

**Undecided, accounting only**
- Before: Beta Alpha Psi (82); Advanced Manufacturing Club (71); Advertising Club (71); Aerospace Engineering Graduate Student Organization (71); Agricultural and Rural Policy Studies Club (71)
- After (6 results): Beta Alpha Psi (97); Collegiate Women in Business (67); Delta Sigma Pi (67); Future Business Leaders of America Collegiate (67); Alpha Kappa Psi (67)

**Finance student who typed K-pop dance**
- Before: Chemical Engineering Graduate Student Organization (98); Entrepreneurial Product Development Club (98); Finance Club (98); Investment Group (98); Real Estate Development Club (98)
- After (33 results): Finance Club (91); Investment Group (91); The Actuarial Collective (91); Algorithmic Trading Club (91); Beta Alpha Psi (82)
- Because you mentioned: K-pop: K-pop Club; dance: Bhangra Dance Club, Orchesis II Dance Club

**Finance resume listing volunteering**
- Before: Chemical Engineering Graduate Student Organization (98); Entrepreneurial Product Development Club (98); Finance Club (98); Investment Group (98); Real Estate Development Club (98)
- After (29 results): Investment Group (91); Finance Club (91); Algorithmic Trading Club (91); The Actuarial Collective (91); Beta Alpha Psi (82)

**Business + CS double major**
- Before: Chemical Engineering Graduate Student Organization (88); Data Science Club (88); Entrepreneurial Product Development Club (88); Future Business Leaders of America Collegiate (88); Real Estate Development Club (88)
- After (45 results): Investment Group (91); AI & ML Club (91); Algorithmic Trading Club (91); Institute of Electrical and Electronics Engineers (89); Developer Group (83)

**Vet Med (DVM) student**
- Before: Exercise is Medicine On Campus (87); Latinx Veterinary Medical Association (87); Pre-Physician Assistant Club (87); Pre-Veterinary Club (87); Students Helping Rescue Animals (87)
- After (48 results): Veterinarians as One Inclusive Community for Empowerment (VOICE) (91); Omega Tau Sigma (91); Student Chapter of the Association of Shelter Veterinarians (84); Student American Veterinary Medical Association Chapter (81); CVM Animal Welfare Club (74)

**Male engineer**
- Before: Alpha Kappa Psi (98); Cardinal Key Honor Society (98); Data Science Club (98); Engineers Without Borders (98); Entrepreneur Club (98)
- After (68 results): GeoInstitute Student Chapter of ASCE of Ames, Iowa (91); Associated General Contractors of America- Student Chapter (91); Society of Hispanic Professional Engineers (91); American Institute of Chemical Engineers (91); Sales Engineering Club (91)

**Female engineer**
- Before: Alpha Kappa Psi (98); Cardinal Key Honor Society (98); Data Science Club (98); Engineers Without Borders (98); Entrepreneur Club (98)
- After (71 results): Society of Women Engineers (98); Digital Women (98); GeoInstitute Student Chapter of ASCE of Ames, Iowa (91); Associated General Contractors of America- Student Chapter (91); Society of Hispanic Professional Engineers (91)

**Prefers not to say, engineer**
- Before: Alpha Kappa Psi (98); Cardinal Key Honor Society (98); Data Science Club (98); Engineers Without Borders (98); Entrepreneur Club (98)
- After (71 results): GeoInstitute Student Chapter of ASCE of Ames, Iowa (91); Associated General Contractors of America- Student Chapter (91); Society of Hispanic Professional Engineers (91); American Institute of Chemical Engineers (91); Society of Women Engineers (91)

**Business student, career Other only**
- Before: Advertising Club (75); Agricultural Business Club (75); Alpha Kappa Psi (75); Cardinal Key Honor Society (75); Chemical Engineering Graduate Student Organization (75)
- After (29 results): Future Business Leaders of America Collegiate (98); Collegiate Women in Business (98); Delta Sigma Pi (98); Alpha Kappa Psi (98); Healthcare Management Club (98)

**Engineer seeking faith community**
- Before: 3D Printing and Design (98); American Institute of Aeronautics and Astronautics (98); Associated General Contractors of America- Student Chapter (98); Automotive Design Club (98); BOOST: Sports Engineering Club (98)
- After (71 results): Society of Hispanic Professional Engineers (91); National Society of Black Engineers (91); Emerging Leaders in Engineering (91); American Institute of Aeronautics and Astronautics (91); Society of Women Engineers (91)
- Communities (24): Catholic Student Community; Thomistic Institute; International Friendship Connection


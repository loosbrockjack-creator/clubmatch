# Club Tagging Spec (Smart Match)

Every non-Greek club gets one JSON object. Tags drive the match quiz and the Explore filters, so they must be
**accurate and conservative**: a missing tag costs a little, a wrong tag puts an irrelevant club in front of a student.
Tag only what the club's own text supports. When unsure, leave it out.

ClubMatch is a club-discovery app for Iowa State students. The quiz is mainly for academic and professional clubs.
A student sees a club only if it matches something specific they picked (their academic area, a career, a typed topic,
or a community they opted into).

## Output shape (one JSON object per line)
```json
{"id":"amesfurryclub","academicAreas":[],"openToAllMajors":true,"careerPaths":[],
 "wants":["community"],"topics":["furry fandom","gaming","crafts"],"audience":"general",
 "communityTags":[],"focus":"hobby","commitmentLevel":"casual","categories":["Hobbies & Special Interest"],
 "confidence":"high","note":""}
```

## Fields

### academicAreas (0 to 2)
`business`, `engineering`, `computing`, `agriculture`, `design`, `liberal-arts`, `human-sciences`, `veterinary`
- Only when the club exists for students of that academic area (a major society, a discipline club, a pre-professional
  club tied to that college). A rocketry team is `engineering`. A finance club is `business`.
- A general hobby, sport, culture, faith, or residence club gets `[]` even if some members are engineers.
- Never more than 2. If a club seems to fit 3+, it is a general club: use `[]` or the 1 to 2 strongest.
- Areas: computing = computer science, software, data science, cyber, MIS-tech. design = College of Design
  (architecture, landscape arch, graphic/industrial/interior design, art). human-sciences = kinesiology, nutrition,
  hospitality, apparel, education, family studies, event management. liberal-arts = sciences, math, humanities,
  social sciences, journalism, pre-law, psychology. agriculture = ag, animal science, food science, agronomy,
  ag business, environmental/natural resources, pre-vet. Veterinary Medicine (DVM) clubs: `veterinary` (validate_tags.py sets this for every club in the College of Veterinary Medicine). Pre-vet clubs are `agriculture`.

### openToAllMajors (bool)
True unless the club restricts membership to a major, program, or college.

### careerPaths (0 to 3)
`finance`, `accounting`, `consulting`, `marketing`, `real-estate`, `supply-chain`, `software`, `data-ai`,
`cybersecurity`, `engineering-design`, `architecture`, `agriculture-food`, `healthcare`, `media-comm`, `entrepreneurship`
- Only when a student pursuing that career would join this club **to advance that career**. Evidence must be in the text.
- "Case competition" alone is NOT consulting. Consulting needs consulting, strategy, or client advisory work.
- `engineering-design` = engineering and hardware careers (mechanical, electrical, civil, aerospace, robotics, manufacturing).
- `healthcare` = medicine, nursing, pharmacy, PT/OT, dentistry, vet med, public health, pre-health.
- `media-comm` = journalism, PR, broadcasting, film/video production, advertising-as-media.
- `architecture` = architecture, landscape architecture, interior/industrial/graphic design careers.
- `agriculture-food` = farming, agronomy, animal science, food science, agribusiness, natural resources.
- Hobby, sport, culture, faith, social, residence clubs: `[]`.

### wants (1 to 4): what a member gets
`career` (resume, recruiting, professional development), `networking` (meet people/professionals in the field),
`community` (friends, belonging), `leadership` (officer/lead roles are a real focus), `projects` (build something hands-on),
`competition` (competes against other schools/teams), `academic` (learning, research, the academic side of a field),
`service` (volunteering, philanthropy), `entrepreneurship` (start ventures)
- Order by strength. Do not add `community` to everything: only when friendship/belonging is a primary draw
  (social, cultural, faith, hobby, residence clubs). A professional society gets `career`, `networking` first.
- `leadership` only for leadership-development orgs, student government, or where the text stresses leading.

### topics (1 to 4)
Short lowercase keywords a student might type to find this club: the specific activity or subject
("rock climbing", "chess", "k-pop dance", "investing", "rocketry", "hackathons", "pre-med", "vietnamese culture",
"catholic", "a cappella", "esports", "beekeeping"). Prefer common words students would use. No generic words
("community", "students", "club", "fun", "events").

### audience
- `general`: anyone could reasonably join for the club's purpose.
- `identity`: primary purpose is community around a culture, ethnicity, nationality, gender identity, or sexuality
  (cultural associations, LGBTQ+ groups, heritage clubs). Professional societies with an identity focus
  (NSBE, SHPE, SWE, oSTEM, Women in Business) are `general` with `communityTags`, NOT `identity`.
- `faith`: primary purpose is religious or spiritual community or worship.
- `international`: primary purpose is support/community for international students (not a single culture).
- `residence`: residence hall house, hall council, or a living community.
- `graduate`: only for graduate or professional-program students (grad associations, DVM-only clubs, MBA clubs).
- `honor`: invitation-only by grades/standing (honor societies, honoraries).
- `governance`: student government, councils, umbrella boards, program boards, event committees.

### communityTags (0 to 2)
`faith`, `culture-heritage`, `international`, `lgbtq`, `women-in-field`
- Required for `identity`, `faith`, `international` audiences. Optional for `general` clubs with an identity focus
  (SWE gets `women-in-field`; NSBE gets `culture-heritage`; a Muslim students' professional club gets `faith`).
- Never put anything here a club's text does not say outright.

### focus (one)
`professional`, `academic`, `hobby`, `service`, `social`, `competitive`, `arts`, `sports`, `advocacy`, `faith`, `culture`

### commitmentLevel
`casual` (under 2 hrs/week: occasional meetings), `moderate` (2 to 4: weekly meeting plus some events),
`involved` (5 to 8: projects, practices, multiple meetings), `high` (8+: competition teams, performance groups with
heavy rehearsal, publications on deadlines). Use the meetings/activities text. Default `moderate` when unclear.

### categories (1 to 2), Explore filters
Business · Engineering · Computing & Data · Agriculture & Life Sciences · Design & Arts · Health & Pre-Professional ·
Liberal Arts & Sciences · Media & Communication · Service & Volunteering · Leadership & Government ·
Sports & Recreation · Performing Arts & Music · Culture & Identity · Faith & Spirituality · Hobbies & Special Interest ·
Residence Life
- First category is the primary one. Honor societies go under their field. Vet Med clubs: Health & Pre-Professional.

### confidence / note
`low` if the text is too thin to tag well; note says why in under 15 words. Otherwise `high` and `""`.

## Worked examples
- **Ames Furry Club** (games, movies, crafts for the furry community): areas `[]`, careers `[]`, wants `["community"]`,
  topics `["furry fandom","gaming","crafts"]`, audience `general`, focus `hobby`, casual, `Hobbies & Special Interest`.
- **Cardinal Space Mining Club** (builds a robot for NASA Lunabotics): areas `["engineering"]`, careers
  `["engineering-design","software"]`, wants `["projects","competition","career"]`, topics `["space robotics","nasa","mining robots"]`,
  focus `competitive`, involved, `Engineering`.
- **Beta Alpha Psi** (accounting/finance honorary, firm recruiting): areas `["business"]`, careers `["accounting","finance"]`,
  wants `["career","networking"]`, topics `["accounting","cpa","recruiting"]`, audience `honor`, focus `professional`, `Business`.
- **Vietnamese Student Association**: areas `[]`, careers `[]`, wants `["community","service"]`, topics `["vietnamese culture","lunar new year"]`,
  audience `identity`, communityTags `["culture-heritage"]`, focus `culture`, `Culture & Identity`.
- **Society of Women Engineers**: areas `["engineering"]`, careers `["engineering-design"]`, wants `["career","networking","community"]`,
  topics `["women in engineering","career fair"]`, audience `general`, communityTags `["women-in-field"]`, focus `professional`, `Engineering`.
- **Cru / Catholic student group**: areas `[]`, wants `["community","service"]`, topics `["christian","bible study"]`, audience `faith`,
  communityTags `["faith"]`, focus `faith`, `Faith & Spirituality`.
- **A residence hall house council**: areas `[]`, wants `["community","leadership"]`, topics `["residence hall"]`, audience `residence`,
  focus `social`, casual, `Residence Life`.
- **Investment club managing a portfolio**: areas `["business"]`, careers `["finance"]`, wants `["career","projects","networking"]`,
  topics `["investing","stock pitches","portfolio management"]`, focus `professional`, moderate, `Business`.
- **Rock climbing club**: areas `[]`, careers `[]`, wants `["community"]`, topics `["rock climbing","bouldering","outdoors"]`,
  focus `sports`, `Sports & Recreation`.
- **Pre-Med club**: areas `["liberal-arts","human-sciences"]`, careers `["healthcare"]`, wants `["career","academic","service"]`,
  topics `["pre-med","mcat","shadowing"]`, focus `professional`, `Health & Pre-Professional`.

# ClubMatch — Visual Direction & Decision Log

**Living source of truth** · Version 0.1 · Updated November 4, 2026  
**Owner:** ClubMatch team (ENTSP 3100)  
**Scope:** Cover artwork and official photos for the Explore grid and club profiles.

> **How to use this file:** Edit any section directly. Add your feedback under **Team notes / edits**. After each brainstorming session, add one entry to the change log and update statuses below. In ChatGPT, share the latest file (or keep editing in this conversation) and ask for an updated version. Your written changes take priority over AI suggestions.

## Status legend
- **DECIDED** — User explicitly approved or requested this.
- **PROPOSED** — Idea to prototype, not committed.
- **OPEN** — Requires team decision, research, or permission.
- **REJECTED** — Do not implement unless reconsidered.

## A. Decisions / requirements from the team

| ID | Status | Direction | Implementation note |
|---|---|---|---|
| D01 | DECIDED | Preserve the warm watercolor/gouache illustrated aesthetic from the original ClubMatch campus artwork. | Consistent texture, palette and handmade feel. |
| D02 | DECIDED | Make illustrations more diverse and reduce repetitive subjects/compositions. | Avoid making every cover a group of students at a table. |
| D03 | DECIDED | Avoid repeating the same-looking characters across different covers; occasional similarity is acceptable. | Vary clothing, framing, ages (college-age), appearances, and number of subjects. |
| D04 | DECIDED | Keep the existing Greek-life illustrations from the first prototype as they are for the next batch. | Preserve original assets; do not regenerate unless specifically requested. |
| D05 | DECIDED | Club illustrations must be plausible and relevant, not implausibly dramatic or fabricated depictions of specific events. | Description-grounded representations, not documentary claims. |
| D06 | DECIDED | Design for 700+ clubs using a repeatable system, not 700 ad hoc prompts. | Build once, test, then batch. |
| D07 | DECIDED | User/team must be able to edit visual rules and track changes in a shared working document. | This is the master editable specification. |

## B. Strong proposals to test (not yet locked)

| ID | Status | Proposal | How to evaluate |
|---|---|---|---|
| P01 | PROPOSED | Generate covers **one club at a time**, not as a single 20-image collage. | Compare detail, originality, and character repetition against Prototype 1. |
| P02 | PROPOSED | Base each concept on club **name + description + category/tags**. | Require every significant subject/action to be supported by the description or a safe general theme. |
| P03 | PROPOSED | Assign a unique `scene recipe` before image creation: subject, activity, focal object, setting, viewpoint, number of people, palette accent. | Generate 20 scene plans and check diversity BEFORE spending on rendering. |
| P04 | PROPOSED | Mix illustrations and verified real club photos in Explore, with the same image ratio, card shape, overlays and typography. | Test a 12-card mixed grid; evaluate at mobile and desktop widths. |
| P05 | PROPOSED | Vary cover types across a batch: people in action, object close-ups, campus/environment, community, symbolic compositions. | Avoid visual clusters when scrolling. |
| P06 | PROPOSED | Use authentic Iowa State campus buildings/photography for inspiration or licensed elements **only when authorized**. | Verify rights separately for viewing, reuse, and AI alteration. |
| P07 | PROPOSED | Let club officers eventually claim profiles and submit authorized images; favor authentic images whenever approved. | Validate officer process and image permissions. |
| P08 | PROPOSED | Generate a graphic/illustration fallback for any club without a verified usable photo. | Every club has a non-misleading cover. |
| P09 | PROPOSED | Treat ~25% as a tentative maximum for generic 'students around a table' compositions in a batch. | Adjust according to club descriptions, not a rigid quota. |

## C. Questions we have NOT decided

| ID | Status | Question / trade-off |
|---|---|---|
| Q01 | OPEN | Should all verified clubs upload one real cover free, or should photo tools be tied to subscription? Earlier discussion explored both; **not decided**. |
| Q02 | OPEN | Which official Iowa State photographs or landmarks may be used, transformed, or embedded in commercial artwork? Need written authorization where required. |
| Q03 | OPEN | Where will approved images live in the actual ClubMatch stack (current storage/CDN, database fields, review UI)? |
| Q04 | OPEN | Which image generation model/provider and expected cost per approved cover? Test before selecting. |
| Q05 | OPEN | What percentage of cards in the Explore viewport should be original illustrations versus real, approved photos as adoption grows? |
| Q06 | OPEN | Should illustrated cards disclose 'ClubMatch illustration' directly on grid, on hover, or on the detail page? |

## D. Art direction — stable guide

**Keep**: rich but natural cardinal red, gold/yellow, burnt orange, muted forest green, warm cream, printed paper texture, watercolor/gouache brushwork, approachable college atmosphere, subtle imperfections and human warmth. Match the **feeling** of the original shared artwork; do not repeatedly reproduce its exact characters or composition.

**Avoid**: hyperrealistic images pretending to be actual club photos; repeated cast members; generic boardroom imagery; invented named events, club logos, specific teams/uniforms, unverifiable trophies, stereotyped cultural representations; excessive Campanile repetition; identical 'three students smiling at laptop' scenes.

**Preferred output**: one coherent 4:3 landscape cover per organization, leaving legible card UI outside the image. Do not bake the club name, match percentage, logos or badges into artwork.

**Grounding rule**: If a description is clear, illustrate the main activity or safe related objects. If vague, choose a broad symbolic scene; do not hallucinate an event. Greek-life covers from Prototype 1 stay frozen until otherwise directed.

## E. Prototype review scorecard (1–5 each)

- Club relevance / description grounding
- Originality versus other covers
- Activity plausibility / absence of misleading specifics
- Warmth and match to ClubMatch's established art direction
- Composition / visual interest at card size
- Technical quality (hands, objects, faces, crop, text artifacts)

**Publish rule (proposed):** No image goes live without human approval. Any rights issue or strong misrepresentation concern is an automatic hold regardless of score.

## F. Prototype 1 feedback — user notes

**Liked:** Warm painting style. Greek-life covers should be preserved.  
**Disliked:** Repetition; recurring character designs; some unrealistic activities.  
**Experiment requested:** Incorporate custom/authentic ISU photography, subject to licensing/permission and visual suitability.

## G. Team notes / edits (type directly below)

<!-- Add your corrections, disagreements, examples, new rules, and preferences here. -->

- 

## H. Change log

| Date | Version | Change | Decision source |
|---|---|---|---|
| 2026-11-04 | 0.1 | Created editable visual-direction log. Captured Prototype 1 feedback, preservation of Greek-life covers, proposed diverse per-club generation, and open permissions questions. | User conversation |

### Update protocol for future brainstorming
1. Preserve the existing file and all team-written text.
2. Put new suggestions in **PROPOSED** unless user explicitly approves them.
3. Move items to **DECIDED** only on explicit agreement; mark dropped ideas **REJECTED**.
4. Add a dated change-log line for each revision.
5. Keep the companion `ClubMatch_Generation_System_Blueprint.md` consistent with decisions; never silently turn a proposal into an implementation constraint.


## I. Version 2 — campus reference library (November 7, 2026)

| ID | Status | Decision / proposal | Implementation notes |
|---|---|---|---|
| D-ISU-01 | DECIDED | Add a lightweight ISU campus photo reference library as an **optional** input to the AI Art Director. | Core club title/description/category remains the primary subject. |
| D-ISU-02 | DECIDED | Avoid hand-tagging approximately 430 images: automate initial cataloging using filenames/metadata and AI vision captions **when permitted**. | Store descriptions/tags once; machine-generated landmark identities require checking. |
| D-ISU-03 | DECIDED | Limit reference retrieval to 0–3 relevant images per cover; no need to send entire library to the model. | Allow zero reference images; don't bloat prompts. |
| D-ISU-04 | DECIDED | Maintain independent original watercolor compositions and plausible people, props, and activity. | Do not paint over, recreate, or closely copy source photographs by default. |
| D-ISU-05 | DECIDED | Keep previously approved Greek-life covers unchanged. | Protect with `keep_existing`. |
| O-ISU-06 | OPEN / PERMISSION GATE | Confirm rights for AI vision indexing, transforming, and publishing work based on ISU stock photos, especially for potential commercial use. | Public download availability alone is insufficient. |
| P-ISU-07 | PROPOSED | Begin with text search over the machine-generated photo catalog, add embeddings only if retrieval quality is poor. | Avoid premature vector database. |
| P-ISU-08 | PROPOSED | Pilot with 10–20 authorized reference images before full 430-image indexing. | Review usefulness and diversity first. |

**Team comments / overrides for Version 2:**

- [Type here]

## J. Implementation checkpoint — November 7, 2026

This section records implementation facts; it does not promote earlier proposals or resolve the team's open product questions.

| Status | Finding / implementation |
| --- | --- |
| IMPLEMENTED | Local Cover Studio reads existing stable club IDs, versions briefs/candidates and records human reviews. No production deployment or automatic publishing. |
| IMPLEMENTED | Twenty deterministic test recipes: 6 action, 5 object, 4 environment, 3 community, 2 symbolic. They are development fixtures, not evidence of model-generated creativity. |
| IMPLEMENTED | Protect all 59 Greek chapter records as keep_existing. Individual Prototype 1 Greek painting originals were not supplied; current app photo mappings remain unchanged. |
| IMPLEMENTED | Local photo metadata index, scoped permission evidence, optional one-time caption adapter and 0–3-reference retrieval. First 20 of 429 photos locally cataloged. |
| BLOCKED / INPUT | User reports documented ISU photo permission. Need exact terms/evidence recorded before external AI processing or derivative use. |
| BLOCKED / INPUT | Real OpenAI generation/vision adapters need secure credentials and a specific spending authorization. No API charges incurred. |
| EXPERIMENTAL | Pixel difference hashes flag possible duplicate covers; they do not reliably identify recurring characters. Human review remains required. |
| PROPOSED NEXT TEST | Three real style-guided covers, then cost/quality review before a 20-cover paid batch. |
| OPEN | Photo subscriptions, officer upload verification, disclosure placement, cover/photo mix and hosted team review remain undecided/unimplemented. |

Grounding correction for VOICE: illustrate inclusion/mentorship from its actual description; do not assume clinical dog treatment. Sparse agricultural-business/horticulture/art descriptions remain flagged for thematic treatment and team review.

| Date | Version | Change | Decision source |
| --- | --- | --- | --- |
| 2026-11-07 | 0.2 implementation checkpoint | Added local pilot findings, explicit mock/live boundary, preserved open decisions, and recorded missing originals/credentials/permission evidence. | Version 2 handoff and repository audit |

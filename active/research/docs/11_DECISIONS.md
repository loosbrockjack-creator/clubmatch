# Decision Log

Use this file to preserve decisions across long Claude sessions.

## Locked decisions
- Product is a personalized academic/professional club discovery MVP, not merely a complete directory.
- P0 does not require auth.
- Recommendations use explainable weighted scoring, not ML.
- Design is consumer-product oriented, not university-portal oriented.
- Cardinal is an accent, not the dominant background color.
- Core demo flow gets priority over feature count.

## New decisions
Add dated entries below when major architecture, scope, content, or visual decisions change.

### 2026-09-16 - First prototype

**Stack: Next.js 16 App Router, TypeScript, Tailwind v4, no backend.**
Club data is a typed module in `lib/clubs.ts`, so every club page prerenders as
static HTML. Nothing needs a server, which keeps the deploy trivial.

**App code lives at the repository root.**
This conflicts with the usual `active/` workspace layout, but Next.js requires
its own conventions at the root. See the 2026-09-17 entry for where the agent
pack ended up.

**Preferences live in `localStorage`, read through `useSyncExternalStore`.**
No auth, per scope. The store hook distinguishes "still hydrating" from "nothing
saved", which is what lets `/results` show a skeleton instead of flashing its
empty state. Reading storage inside `useEffect` is rejected by the React
compiler lint rules in this Next version.

**Displayed fit scores are capped at 98%.**
The weighted score can reach a literal 100. Showing that implies a precision the
heuristic does not have, which `06_MATCHING_LOGIC.md` warns against.

**Club logos are neutral monograms, not real marks.**
Using each organization's actual logo would mean reproducing marks without
permission. A uniform monogram tile also keeps the grid calm.

**No invented meeting times, locations, officers, or contact links.**
`09_QUALITY_BAR.md` forbids unsupported claims about clubs. Superseded in part
by the scrape below: meeting cadence and activity text now come from the ISU
registry rather than being described in general terms, and the footer credits
that directory. Commitment level and the taxonomy tags are still our inference,
which the footer says plainly.

**Added the involvement stack ("A balanced start") in P0 rather than P1.**
Three complementary picks, one career-leaning, one hands-on, one community. It
is the clearest thing separating this from a directory, which matters for the
creativity line on the rubric.

**Cardinal is reserved for the primary CTA, fit scores, selected states, and the
progress bar.** Everything else is neutral. Gold appears only as the bullet
marker in "What you would gain".

**Club data is scraped from Iowa State's official student organization
directory, not written by hand.** `scripts/scrape.py` walks the A-Z list at
`stuorg.iastate.edu/organizations` and pulls each group's `/information` page
(categories, description, tier, membership rules, meetings, activities, special
events), falling back to the org's own landing page for the three records with
no `/information` page. `scripts/transform.py` maps that onto the `Club` shape.
Raw responses are kept in `data/stuorg-raw.json` so the transform can be re-run
without re-scraping. Regenerate with `npm run scrape:clubs` then
`npm run build:clubs`.

This replaces the 32 hand-written placeholder clubs with all 726 registered
organizations. Three registry records that exist only to test the ISU database
are filtered out.

**The dataset ships as two files, and that split is load-bearing.**
`data/clubs-index.json` (~384 KB) holds only what a card, a filter, and a match
score need, and is the one the browser gets. `data/clubs.json` (~1.2 MB) holds
the prose and is reachable only through `lib/clubs-detail.ts`, which server
components import. An earlier version exposed both through `lib/clubs.ts`, and
because `/explore` is a client component the whole 1.2 MB landed in a browser
chunk. Importing `lib/clubs-detail.ts` from a client component brings it back.

**Taxonomy is inferred from registry text with deliberately narrow patterns.**
`scripts/classify.py` matches multi-word phrases rather than bare words, because
single words collide badly with registry boilerplate: "business" matches "orders
of business", "equity" matches "social equity", "race" matches "regardless of
race". Category-to-area mapping runs against the club's own name and description
only; the wider text (meeting notes, activity blurbs) is used only for softer
signals like "does this group compete" or "does it do service".

**Where the registry says nothing, the field is empty and the UI adapts.**
Registry entries vary from two sentences to several paragraphs. Rather than
invent "What you would do" bullets for thin entries, the transform emits an
empty array and the club page drops the section. Same for "What you would gain",
"Best for", and the college label on non-academic orgs. Six clubs have neither
activity list; roughly 100 have no "Best for" line. This keeps
`09_QUALITY_BAR.md`'s no-unsupported-claims rule intact at 726 clubs.

**Commitment level is inferred, and it is the weakest field in the dataset.**
It comes from the meeting cadence text plus category (Greek life and sports
clubs default to "involved") plus competition and project signals. Clubs whose
meeting text gives no cadence default to "moderate". The club page shows the
registry's own meeting sentence when it has one, so students can check the
inference against the source.

**`majors` and `commitmentText` are derived in `lib/taxonomy.ts`, not stored.**
Both are pure functions of fields already present, and storing them per club
cost ~90 KB in the client index for no added information.

**Explore paginates at 48 cards with a "Show more" button, and gained a Category
filter row.** 726 cards in one grid is slow and unreadable. The Category row
exposes the non-academic half of campus (Greek life, service, sports clubs,
residence communities) that the academic Area filter cannot reach; categories
that duplicate an Area chip are excluded from it.

**Club pages link out to the group's real ISU page.** Now that every club has a
canonical `stuorgUrl`, "Visit club on stuorg" is a real destination for the
"Visit Club" step of the core path, and the page states that details come from
the ISU directory along with the listed member count.

### 2026-09-17 - Agent pack moved under `active/research/`

**Non-code material now lives in `active/research/`.**
`docs/`, `references/`, `source_materials/`, `START_HERE.md`, and
`FIRST_PROMPT.md` moved there to match the standard workspace layout. Paths in
`CLAUDE.md` were rewritten to match. Because all three folders moved together,
sibling-relative paths inside the docs still resolve.

**Runnable code did not move.**
`app/`, `components/`, `lib/`, `data/`, `public/`, `scripts/`, and the config
files stay at the root. Next.js resolves `app/` and the `@/data/...` alias from
the project root, and `scripts/*.py` locate `data/` relative to their own
parent, so relocating any of them breaks the build or the data pipeline.

**New design reference screenshots stored in `references/real/`.**
Four full-page PNG captures, roughly 30 MB total, kept alongside the existing
SVG reference boards rather than in `public/`, since they are direction for the
build and not assets the site serves.

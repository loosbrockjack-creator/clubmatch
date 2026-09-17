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
its own conventions at the root. The agent pack (`docs/`, `references/`,
`source_materials/`) stays where it was.

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
`09_QUALITY_BAR.md` forbids unsupported claims about clubs. Commitment and
cadence are described in general terms only, and the footer states that profiles
were compiled for the prototype rather than confirmed with each group.

**Added the involvement stack ("A balanced start") in P0 rather than P1.**
Three complementary picks, one career-leaning, one hands-on, one community. It
is the clearest thing separating this from a directory, which matters for the
creativity line on the rubric.

**Cardinal is reserved for the primary CTA, fit scores, selected states, and the
progress bar.** Everything else is neutral. Gold appears only as the bullet
marker in "What you would gain".

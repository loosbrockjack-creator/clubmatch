# Matching Logic

Deterministic, explainable, and easy to tune. Implemented in `lib/matching.ts`.
Updated 2026-11-09 for Smart Match (see `12_SMART_MATCH_PLAN.md`), and
2026-11-14 for the two-path design below.

## Two paths
- **Survey path** (no upload): everything in this doc. Deterministic.
- **Resume path** (resume or LinkedIn upload): `/api/ai/picks` sends the resume
  plus the whole rankable catalog (one line per club, cached) to Claude Sonnet
  5.5, which returns about 20 picks with a 55-98 fit and a one-line reason.
  The student then answers only time, gender, and Greek life. `matchAiPicks`
  drops gender conflicts (gender is never sent to the AI) and takes 5 / 15 / 25
  points off a pick that runs 1 / 2 / 3 commitment steps over their time. If
  the picks call fails, the quiz falls back to the old reader and the full
  survey, pre-filled. Why: a keyword score can't tell a team captain from a
  one-line mention, and sport clubs carry no area or career tags.

## Eligibility (before any scoring)
- Main results only include `general`, `honor`, and `governance` audience clubs.
- A club must have at least one specific hit: the student's academic area, one of
  their careers, or a topic matched from the "Anything specific?" box (or resume).
- `identity`, `faith`, `international` clubs appear only in "Communities you asked
  about", for students who opted into a matching community. Unranked, no %.
- `residence` and `graduate` clubs never appear in quiz results (Explore only).
- Greek chapters keep their own opt-in section.

## Points
| Component | Max | Rule |
|---|---|---|
| Academic area | 30 | Club tagged with the student's area (x0.7 if a club has 3+ areas) |
| Career | 30 | 1 shared career = 22.5, 2+ = 30 (x0.92 if club has 3 careers) |
| Wants | 15 | Rarity-weighted overlap; full credit = the student's two rarest picks |
| Time | 10 | Exact 10, one step 6, two 2.5, three 0. Flexible = 8 |
| Topic | +45 / +15 | First and second topic hits |
| Resume topic | +20 / +8 | Same, for topics read from a resume (survey fallback only) |
| Community | +15 | General club also tagged with a community the student asked for |
| Gender | +10 | Club built for the student's gender (male or female only) |

Penalties: club limited to one major and not the student's area x0.5; honor society x0.9.

Score % = points / (what a perfect club would score for this student), capped at 98.
Undecided students drop the area component from the denominator.
Minimum to show: 40.

Ties: score, then specificity (fewer area+career tags first), then a hash of
the student's answers and the slug (stable per student, varied across students).

## Explainability
Up to 3 rule-based reasons from the components that scored. When AI is on, the
results page swaps in one AI-written line per club for the first 20, built only
from the student's answers and the club's own text. Never invent a reason that
is not supported by the club data.

## Officers
Lead lists use `scoreForOfficers`: the same score with communities and typed
topics removed, so private opt-ins never reach a club.

## Percentages
A product heuristic, not a measurement. Explore only shows a % on clubs that
would be in the student's matches.

# Matching Logic

Deterministic, explainable, and easy to tune. Implemented in `lib/matching.ts`.
Updated 2026-11-09 for Smart Match (see `12_SMART_MATCH_PLAN.md`).

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
| Community | +8 | General club also tagged with a community the student asked for |

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

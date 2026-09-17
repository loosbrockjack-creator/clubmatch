# Matching Logic

The recommendation system should be deterministic, explainable, and easy to tune.

## Suggested weights
- major / academic alignment: 30
- career-interest alignment: 25
- user-goal alignment: 20
- time-commitment alignment: 15
- experience-type alignment: 10

Total: 100

## Scoring notes
### Major alignment
Full points for a strong direct fit, partial points for broad/all-major clubs.

### Career alignment
Score based on overlap between selected career areas and a club's `careerPaths`.

### Goal alignment
Overlap between user goals and `benefits` / `goalsServed`.

### Time alignment
Prefer clubs whose expected commitment fits the user's selected tolerance. Slightly adjacent levels may receive partial credit.

### Experience type
Professional, academic, project-based, competitive, social/community, etc.

## Explainability
Every result should include 1-3 plain-language reasons generated from the scoring inputs, e.g.:
- "Matches your interest in real estate and finance."
- "Fits your 1-3 hour weekly commitment."
- "Strong option for networking and career development."

Never invent a reason that is not supported by the club data.

## Percentages
A displayed match score can be the normalized weighted score. Do not imply scientific precision. It is a product heuristic.

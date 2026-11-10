# Smart Match: Build Plan

Status: approved by Jack 2026-11-09. Built unattended in one run. Jack is away; do not wait on him.
Read this whole file before starting. Resume from the checklist at the bottom after any interruption.

## Why
A 2,000-student simulation of the current quiz found:
- The 45-point cutoff filters almost nothing (a typical student gets 270 results).
- Irrelevant clubs score about 50% (e.g. the furry club) because "open to all majors" (16.5), one shared
  "community" goal (10), nearby time commitment (about 9), and the "community" experience (5) add up to
  about 45-50 points without matching anything specific.
- Over-tagged clubs win for everyone (Cardinal Space Mining has all 7 academic areas, in 31% of top 10s).
- 44% of clubs have no academic area; Accounting and Real Estate match 1 club each; Consulting matches 48.
- Common tags ("community": 477 clubs) count as much as rare ones. Goals and Experience overlap.
- Time commitment barely separates clubs. Up to 40-way ties, broken alphabetically.
- Identity and faith clubs (127) can be surfaced to students who never asked for them.

## Decisions (Jack, 2026-11-09)
| Topic | Decision |
|---|---|
| Identity / faith clubs | One optional opt-in "communities" question. Never ask students who they are. |
| AI pieces | All four: offline re-tag of every club, resume/LinkedIn PDF upload, "Anything specific?" text box, AI-written "why it fits". |
| Score display | Keep %, recalibrated so irrelevant clubs score low and get filtered out. |
| Results count | Top 20, then "Show more" for the remaining relevant clubs. |
| Shipping | Push live to `main` once every check below passes. |
| API key | Jack adds `ANTHROPIC_API_KEY` to `.env.local` before leaving. Production must still hide AI parts if the Vercel env var is missing. |
| Resume data | Never stored. Read in memory, then discarded. Only the pre-filled answers are kept. |
| Explore categories | Clean them up in the same re-tag pass. |
| Abuse guard | AI endpoints open to everyone, with per-IP rate limits and size caps. Jack sets a monthly spend cap in the Anthropic console. |
| Model | `claude-haiku-5-5` for resume reading, text box, and reasons. |
| Review loop | Fresh-context reviewer subagent, up to 2 rounds (see Phase 5b). Jack's decisions win over reviewer objections; log objections in the report. |
| Push timing | One push to `main`, only after review round 2 fixes and final checks. |

## Guardrails for the unattended run
- Do NOT commit `lib/club-covers.json` or the untracked `public/photos/clubs/*.jpg` files. They belong to
  the watercolor cover review workflow, which needs Jack's sign-off. Stage files by explicit path, never `git add -A`.
- No em dashes anywhere (copy, comments, commits).
- Never fake a passing check. If something cannot be verified, say so in the handoff report and do not push that part.
- If production would break without the Vercel key, the AI UI must not render. Verify by running with the key unset.
- Read `node_modules/next/dist/docs/` for any Next.js API touched (route handlers, server actions, file upload limits).

## Phase 1: Re-tag all 731 clubs (offline, by Claude subagents)
Source text: `data/stuorg-raw.json` (description, activities, membership fields) plus current `data/clubs.json`.

1. Write the tag spec to `active/config/tagging-spec.md`: allowed values for every field, rules, and 10 worked examples
   (include the furry club, Cardinal Space Mining, an accounting club, a cultural club, a faith club, a residence hall).
2. New and tightened fields per club:
   - `academicAreas`: 0 to 2. Only when the club is really for that area.
   - `careerPaths`: 0 to 3, evidence-based. Fix Consulting over-tagging; find real Accounting, Real Estate, Supply Chain, Cyber, Data/AI clubs.
   - `topics`: 1 to 4 free-form lowercase keywords (e.g. "rock climbing", "sports marketing") used by the text box.
   - `audience`: one of `general | identity | faith | international | residence | graduate | honor | greek`.
   - `communityTags` (only for identity/faith/international): `faith`, `culture-heritage`, `international`, `lgbtq`, `women-in-field`.
   - `focus`: `professional | academic | hobby | service | social | competitive`.
   - `goalsServed`, `experienceTypes`, `commitmentLevel`: re-check against the merged quiz options (see Phase 2).
   - `categories`: from the clean Explore set (see below).
3. Run shards of about 60 clubs per subagent (about 12 shards), each writing JSONL to
   `active/execution/logs/retag/shard-NN.jsonl`. Resumable: skip clubs already written. Subagents return only counts and doubtful cases.
4. Validate with a script (`active/execution/scripts/validate-tags.mjs`): enum checks, caps, every club present, coverage counts
   per career (each career needs at least 3 clubs, or a note explaining why not). Print aggregates only.
5. Second-opinion pass: a separate subagent spot-checks a random 60 plus all `identity`/`faith` clubs. Fix disagreements.
6. Merge into `data/clubs.json` (and `clubs-index.json` if derived). Update `lib/types.ts` and `lib/club-validate.ts`.

Clean Explore category set (about 14): Business, Engineering, Computing & Data, Agriculture & Life Sciences, Design & Arts,
Health & Pre-Professional, Sciences & Liberal Arts, Media & Communication, Service & Volunteering, Leadership & Government,
Sports & Recreation, Performing Arts & Music, Culture & Identity, Faith & Spirituality, Hobbies & Special Interest,
Residence Life, Greek Life. Map all current categories onto this set; drop "Student Organization", fold "Council" and "Honor Societies" by topic.

## Phase 2: Quiz changes (`app/match/page.tsx`, `lib/taxonomy.ts`, `lib/types.ts`)
Order (still 6 steps, plus an optional step 0):
0. **Start faster (optional):** "Upload your resume or LinkedIn PDF" or "Skip". Only rendered when AI is enabled.
1. What are you studying? (unchanged)
2. Which career areas interest you? (unchanged list, now backed by real tags)
3. **What do you want from a club?** Goals and Experience merged into one list, pick up to 3:
   Career and resume, Meet people in my field, Friends and community, Lead something, Build things (projects),
   Compete, Learn the academic side, Give back (service), Start something (entrepreneurship).
4. How much time do you have? "Under 2 / 2 to 4 / 5 to 8 / 8+ hours a week", plus "I'm flexible".
5. **Communities (optional):** "Want to find any of these communities? Totally optional." Multi-select:
   Faith and spirituality, Culture and heritage, International students, LGBTQ+, Women in my field, "Not right now".
   Plus the **"Anything specific?"** text box (optional, 200 chars, only when AI is enabled).
6. Greek life (unchanged).

Saved preferences migrate: old `goals` + `experiences` map onto the merged `wants` field; old saved prefs must still load.
Supabase-stored preferences (see `lib/preferences.ts`) need the same tolerant read. No destructive migration.

Upload flow: PDF only, max 5 MB, one file. Server route reads it, sends it to Claude as a document, gets back JSON
matching the quiz option IDs (academicArea, careers, wants, topics). Pre-fill steps 1 to 3 and show
"We filled these in from your resume. Change anything." Prompt instructs the model to ignore name, contact details,
and any race, religion, gender, age, or other demographic detail, and to never infer communities.
Errors (bad PDF, timeout, key missing) fall back silently to the normal quiz with a short note.

## Phase 3: Scoring rewrite (`lib/matching.ts`)
1. **Relevance gate.** A club is only eligible if it has at least one specific hit: academic area match, career match,
   or a topic match from the text box. "Open to all majors", commitment, and generic wants alone never qualify a club.
2. **Opt-in audiences.** `identity`/`faith`/`international` clubs are only eligible if the student picked a matching
   community tag (and then get a bonus like Greek). `residence` only if we ever ask about halls (we don't, so excluded
   from quiz results, still in Explore). `graduate` only for a grad-student signal (excluded by default).
3. **Rarity weighting.** Each tag's value scales with inverse frequency (IDF-style, clamped), so a rare career match
   beats "community". Normalize so the best possible score for this student maps near 98%.
4. **Focus bonus.** Clubs with 1 to 2 academic areas get full academic credit; clubs with more get reduced credit.
5. **No free points.** Remove the 0.6 "nothing selected" credit and the open-to-all 0.55 credit as standalone sources;
   keep open-to-all only as a small tiebreak-level boost.
6. **Text box topics.** AI maps free text to existing tag IDs plus topic keywords; topic keyword hits on `topics` count as a strong signal.
7. **Tiebreak** on tag specificity, then member count, then a stable per-student hash (never alphabet).
8. **Results.** Top 20, then "Show more" reveals the rest of the eligible list in pages of 20.
9. **% recalibrated.** Display the normalized score. A target from the simulation: median top-1 score 85 to 95,
   20th result around 60 to 75, and no irrelevant club (zero specific hits) above 0 because it is filtered out.

Keep the scoring pure and deterministic. AI never changes the ranking; it only shapes inputs (upload, text box) and words (reasons).

## Phase 4: AI-written "why it fits"
- Results render instantly with the rule-based reasons (existing `buildReasons`, updated for new fields).
- Client then requests AI reasons for the visible top 20 in one batched call; swap in per card with a 150ms fade.
- Prompt gets only the student's quiz answers plus each club's tags and summary. The model must only cite facts from the
  club data; reject and fall back if output names something not in the inputs.
- Cache by hash(prefs + club ids) in memory/edge cache so reloads are free.

## Shared AI plumbing
- `lib/ai.ts`: `aiEnabled()` (true only when `ANTHROPIC_API_KEY` is set), Anthropic SDK client, JSON-output helper.
- Model: `claude-haiku-5-5` for all three runtime features (cheap, fast). Load the `claude-api` skill before writing this code.
- Route handlers under `app/api/ai/` (`resume`, `interests`, `reasons`). Each has: per-IP rate limit (for example
  10/hour for resume, 30/hour for others), input size caps, `max_tokens` caps, 15s timeout, no logging of resume text.
- A public flag (from the server, e.g. a server component prop) tells the quiz whether to render the AI parts.
- Privacy page: add one plain line about resume uploads being read once and never stored.

## Phase 5: Verification (all must pass before pushing)
1. Rebuild the simulator at `active/execution/scripts/sim-match.mjs` (2,000 random students, old vs new scoring).
   Write `active/research/smart-match-report.md` with before/after: results count, top-10 spread
   (clubs that ever reach a top 10), max share of any one club in top 10s, ties at #1, identity/faith clubs shown to non-opted
   students (must be 0), and 8 hand-made personas (finance, accounting, CS, ag, pre-med, design, undecided, "rock climbing + marketing")
   with their top 5. Furry club must not appear for any persona that did not mention it.
2. `npm run build` and `npm run lint` clean.
3. Dev server: run the full core path (Landing, Quiz, Results, Club Detail, Interested) at desktop and 390px mobile,
   with AI on (real key from `.env.local`): upload a sample resume PDF (generate a fake one in the scratchpad, never commit it),
   use the text box, confirm AI reasons swap in.
4. Same path with `ANTHROPIC_API_KEY` unset: no AI UI renders, no console errors, quiz works.
5. Old saved preferences (pre-merge shape) still load results.
6. Explore filters use the new category set and every club has at least one category.

## Phase 5b: Harsh review loop (2 rounds max)
1. Spawn a fresh-context `general-purpose` subagent. Give it: this plan, `CLAUDE.md`, docs 01 to 11, the diff
   (`git diff main`), the sim report, and the running dev server URL. Do not give it my reasoning or excuses.
2. Its job: be harsh. Compare the build against the product spec and quality bar. Use the browser at desktop and 390px.
   Return a numbered tally of issues, each with severity (blocker / should-fix / polish), file or screen, and the concrete fix.
3. Fix every blocker and should-fix, and polish items where cheap. Anything I decline gets a one-line reason. Anything that
   conflicts with Jack's decisions is kept as Jack decided and logged.
4. Round 2: send the same reviewer (SendMessage, so it keeps context) the tally with what changed. It re-verifies and returns
   a new tally. Fix again. Stop after round 2 even if polish items remain; list them in the report.
5. Re-run Phase 5 checks after the final fixes.

## Phase 6: Ship
- Update `06_MATCHING_LOGIC.md` (new formula) and add entries to `11_DECISIONS.md`.
- Commit in logical pieces (tags data, scoring, quiz, AI) by explicit path, then push to `main`.
- After push, check the deployment with the Vercel tools if available. If `ANTHROPIC_API_KEY` is not set in the
  Vercel project, the AI parts stay hidden in production; tell Jack the click-by-click steps to add it
  (Vercel dashboard > clubmatch project > Settings > Environment Variables > add `ANTHROPIC_API_KEY` for Production > Redeploy).
- Write a handoff summary at the top of `active/research/smart-match-report.md`: what shipped, live URL, numbers, anything skipped.

## Progress checklist (update as you go)
- [x] Phase 1 spec written
- [x] Phase 1 shards tagged (8/8)
- [x] Phase 1 validated + spot-checked + merged
- [x] Phase 2 quiz
- [x] Phase 3 scoring
- [x] Phase 4 AI reasons
- [x] AI plumbing + privacy line
- [x] Phase 5 verification
- [x] Review round 1 + fixes
- [x] Review round 2 + fixes
- [x] Phase 6 shipped (Jack: set Anthropic spend cap + Vercel env var)

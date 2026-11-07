# ClubMatch continuation audit — November 7, 2026

Recovered from draft PR #1: https://github.com/loosbrockjack-creator/clubmatch/pull/1

Base `main`: `20d88e5f4a335fcfb0503e25558edb37b79e855e`. Source branch `feat/cover-studio-pilot`, original implementation head `3001dd3991294b16ac01949aeabe5dc3a7efdbb8`. One commit, 28 changed files, 5,116 additions and 7 deletions. GitHub metadata, changed-file listing, README blob hash and local Git head agree. The initial tracked/untracked working tree was clean. The only PR conversation entry was Vercel's successful preview; no GitHub Actions runs were returned for that commit.

## Implemented versus demonstrated

| Stage | Existing code and evidence | Limit |
| --- | --- | --- |
| Club database | 731 existing JSON records; 20 real stable IDs selected | No new database service needed |
| Art Director | Source snapshots/hashes, exact evidence validation, editable versioned briefs, structured Responses adapter | All 20 saved briefs are curated deterministic recipes; no live AI planning |
| Diversity Controller | Recipe/focal-anchor collisions, shot/people counts, table frequency, sparse-source warnings | Heuristics and human correction; no autonomous corrective agent or reliable recurring-face detection |
| Generation | Mock adapter and OpenAI multipart image-edit adapter; original team-owned style image included | Twenty labeled diagnostic graphics; zero real watercolors or paid image calls |
| Quality control | Resolution/crop normalization, hashes, pixel difference hashes, optional vision adapter | Real anatomy, style, relevance, latency and cost unmeasured; vision calls not run |
| Human approval | Brief approval, six scores, reviewer acknowledgment, revisions/rejections, immutable versions, local studio | No saved human brief or artwork approvals; browser/HTTP functionality cannot be reverified in this restricted runtime |
| App integration | Approved manifest resolver in `lib/photos.ts`; cards/results/details share it; attribution rendering and isolated staging export | Checked-in manifest empty, feature flag defaults off, no real approved image integrated |
| Photo indexer | Local metadata, hashes, dimensions, filename search, scoped rights gates, optional caption adapter | Twenty local records; zero captions or approved AI-use rights; full 429-photo indexing not done |
| Greek protection | 59 chapter jobs frozen; app resolver bypasses chapters | Separate approved painting originals still absent; existing chapter imagery preserved |

## Recovered session-local work

The existing `.cover-work/` survived. Its state is schema 1, revision 66: 79 jobs (59 protected plus 20 pilot clubs), 20 briefs, 20 mock WebP assets, 20 photo records, zero paid ledger entries and zero approval events. Every saved candidate's file hash matches its state record, and all 20 catalog source-photo paths exist. The local diversity report shows 6 action, 5 object, 4 environment, 3 community and 2 symbolic concepts, no exact scene collisions and no generic table scenes. Sparse-source warnings remain for Agricultural Business, Horticulture and College of Design Art Club.

The local state, diagnostic assets, photo source archive/sample, empty staging export and private provenance are **not in GitHub**. No missing code was identified in this accessible workspace. Work that existed only in the previous conversation or another machine cannot be ruled out. Keep the existing private state and source photos together when transferring machines; source-photo paths are absolute and may require local re-indexing after a move. GitHub alone does not restore private reviews, candidates or permission evidence.

## Fresh verification in this session

- Original tests: **17 passed; 1 failed to start** because the sandbox rejects listening on `127.0.0.1` (`EPERM`). This is the local HTTP studio test. Do not restate the historical 18/18 as a fresh full pass.
- Four new preflight tests pass: mock/approval blockers without mutations or secret leakage; style-only readiness/configuration/source/budget checks; protected chapters/reference permission and file changes; CLI persistence/absent-home behavior.
- Final combined run: **21/22 pass**, with the same HTTP listener test failing at startup on `EPERM`. No test was skipped or weakened.
- ESLint and TypeScript `--noEmit` pass.
- Default `npm run build` is blocked by Turbopack's attempt to bind an internal port (`EPERM`). Supported `npm run build -- --webpack` reaches compilation but fails because `fonts.googleapis.com` cannot resolve. No app build setting or fonts were changed to hide these limits.
- Original PR has a successful Vercel preview status. That is remote evidence for the original commit, not proof of a fresh local build or current browser interactions.
- The configured image model and 1536 × 1152 request match the current official OpenAI image-edit reference. Live account/model access remains untested. Reference: https://developers.openai.com/api/reference/resources/images/methods/edit

## Continuation changes

Added `tools/covers/preflight.mjs`, its CLI command/package script and four tests. The report is read-only: it inspects proposed render readiness without requests, reservations, state writes or human approvals. It checks selected-job eligibility, current club source, the style image, permission-cleared reference bytes, retry state and cumulative budget reservations. It does not replace human review or validate actual paid-service availability. `npm run covers:preflight -- --limit 3` currently exits 1 as expected: credentials/spending policy are absent, briefs are unapproved, and the existing mock candidates need revision requests before replacement.

Extended `.gitignore` to protect `.cover-work-*` repo-root folders, including the README's `.cover-work-real` example. Updated README and decision logs. Existing pilot state and assets were not changed. No API costs, restricted-photo uploads, merge or production publishing occurred.

## Proposed path to the first 20 real images

1. Securely configure an image API credential, confirm model access, and obtain an explicit test budget. A proposed **$5 reservation budget for three single-image requests** is not yet approved; reservation accounting does not guarantee an invoice cap.
2. Review three existing grounded concepts that cover different visual challenges. Suggested IDs: `2541` (3D Printing and Design: printer close-up), `prisum` (Solar Car: two students and vehicle workshop), `psa` (Pakistan Student Association: community). Keep campus photo references empty; the supplied team-owned style painting is sufficient. These are proposed subjects, not approved briefs.
3. Use the existing pilot recipes in an isolated private home, or explicitly request revisions for the corresponding mock jobs. Human approval of each brief remains required. No new paid text planning is necessary to test the image adapter; separately test the AI Art Director if the full model-planned architecture must be validated.
4. Generate three independent covers only after approval. Review at 4:3 card size for style, club accuracy, anatomy, unwanted text, repeated people and crop. Record actual usage, time, revision count and costs. Optional paid vision screening requires separate model configuration and inclusion in the approved budget.
5. After sample review, approve the remaining 17 concepts and a separate budget for the rest of the 20-cover prototype. Resolve sparse-source concepts before spending. Each completed image needs human artwork approval before staging export.
6. Validate the exported manifest/assets in an explicitly authorized preview. Production publishing remains a separate approval. Campus references can be added after their exact permission scopes are recorded; missing Greek originals do not block a non-Greek, style-only batch.

Run the full HTTP test and normal build in a runtime that permits local listeners and Google Font access before merging. Hosted team review, officer-upload verification, photo subscriptions and public illustration-disclosure placement remain open and outside this continuation's changes.

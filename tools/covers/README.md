# ClubMatch Cover Studio

A local, human-reviewed cover pipeline inside the existing ClubMatch repository. Uses `data/clubs.json`, stable `id` values, and the existing 4:3 card/photo resolver. No new database, hosted admin service, or agent framework.

**Current pilot is a development run, not a completed AI artwork collection.** Twenty exact-source recipes and diagnostic graphics exercise ingestion, storage, review and export controls. The OpenAI text, image and vision adapters exist and have request-contract tests; they have not been exercised against the paid service. Real watercolor quality, anatomy, recurring characters, latency and cost remain unmeasured.

## Run the no-cost pilot

Use Node 22+ (validated with Node 24), then from the repo root:

```bash
npm ci
npm run covers:plan
npm run covers:render
npm run covers:studio
```

Open **http://127.0.0.1:4317**. Keep the server running while reviewing. This studio is loopback-only, checks Host/Origin, requires a per-session nonce for writes, and never initiates paid API calls or production publishing. It is not a remotely hosted/team-authenticated dashboard. For team use, review together on the operator's machine; hosted authentication/storage is a later implementation.

The dashboard supports source/recipe review, manual recipe edits, brief approval, candidate version selection, six-factor artwork review, reject/revision with reasons, keep-current, possible-duplicate comparisons, Explore-like preview, photo metadata search, and the cost/activity ledger. Requesting a revision queues work; it does not automatically spend money. Changing a recipe creates a new version with a new brief-approval requirement.

Mock graphics say **PIPELINE TEST · NO ARTWORK GENERATED**. They cannot be approved or exported, even by calling the review API directly. The operator must not mark synthetic fixtures as genuine artwork.

State is in ignored `.cover-work/state.json`, assets in `.cover-work/assets/`. Writes use an exclusive lock and atomic JSON rename. Back up this directory before moving to another machine. The public Git repository contains code and sample briefs, not local permission evidence, source photos, private keys or unpublished candidate images. Use `--home /absolute/folder` on any command for another working directory.

## Inputs, state and provenance

- `data/clubs.json`: 731 records at this checkout. `summary` is the source description, `categories` provide context, `stuorgUrl` is the source link. `whatYouDo` and inferred tags are not authoritative activity evidence.
- Default pilot: 20 IDs/curated recipes in `pilot.mjs`, across engineering, business, agriculture, science, recreation, culture, art, media, service and writing.
- Custom batch: create a JSON array of **string IDs**, then `node tools/covers/cli.mjs plan --ids /path/ids.json`. Batch size is capped at 50. Duplicate and unknown IDs fail before ingestion.
- Job: exact source snapshot + hash, frozen flag, status, active brief, immutable brief/candidate history, approved-candidate ID and failure history.
- Brief: source hash, prompt/style version, provider, recipe, exact grounding quotes, 0–3 reference IDs, timestamp and human brief approval.
- Candidate: version UUID, 1200 × 900 WebP, SHA-256, pixel-based difference hash, source/brief versions, references, usage, QA flags, reviewer and scores. Raw provider output dimensions are recorded before the standardized card crop.
- Ledger: request reservation persisted **before** each paid call, usage when returned, completion or failed/unknown result. An interrupted request is never retried automatically.

Source changes invalidate current brief approval and block stale-source exports. Older approved art stays stored while a replacement is reviewed. Rejecting or requesting regeneration of the selected approved candidate revokes its export eligibility.

All 59 recognized Greek chapters are protected as `keep_existing`. The three named Prototype 1 Greek subjects are also protected by slug. **Original individual Prototype 1 Greek paintings were not included**; only the review board was supplied. The studio cannot recover those originals from the collage. Existing app Greek photo mappings are untouched.

## Real AI setup — optional and disabled until authorized

The proposed adapter uses OpenAI directly: Responses API for structured briefs/vision; Image API `images/edits` for one independent reference-guided cover. The team-owned original watercolor is image 1 for style inspiration. Up to three permission-cleared campus references can follow. Default image model is `gpt-image-2.5-flare`, medium quality, requested 1536 × 1152, compressed/cropped to 1200 × 900 WebP. Provider interfaces can be replaced without changing state/review logic.

Configure these securely in the operator's environment, or an ignored `.env.covers.local` file. Do not commit or paste real values into chat/PRs:

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | An API project credential with appropriate model access/billing |
| `COVER_TEXT_MODEL` | Operator-selected Responses model supporting strict JSON-schema output |
| `COVER_VISION_MODEL` | Operator-selected model supporting image inputs and structured output |
| `COVER_IMAGE_MODEL` | Optional override of `gpt-image-2.5-flare` |
| `COVER_IMAGE_QUALITY` | Optional override of `medium`; reestimate costs before changing |

**A ChatGPT subscription/GitHub connection does not configure these credentials.** Current process has no API key configured. The following commands are examples, not spending authorization:

```bash
# New paid text planning uses a NEW state directory; an existing brief is cached.
node --env-file=.env.covers.local tools/covers/cli.mjs plan \
  --home .cover-work-real --provider openai --ids /path/three-club-ids.json \
  --allow-paid --budget-usd 5 --max-paid-calls 12

# Review and approve those briefs in this studio before paid rendering.
node tools/covers/cli.mjs serve --home .cover-work-real

# Then generate only the first three jobs, individually.
node --env-file=.env.covers.local tools/covers/cli.mjs render \
  --home .cover-work-real --provider openai --limit 3 \
  --allow-paid --budget-usd 5 --max-paid-calls 12

# Optional automated visual screening, followed by human review.
node --env-file=.env.covers.local tools/covers/cli.mjs qa \
  --home .cover-work-real --limit 3 \
  --allow-paid --budget-usd 5 --max-paid-calls 12
```

Budget/call limits apply cumulatively to the working directory's ledger. Default conservative reservations are $1/image and $0.10/text or vision request; overrides are `--image-reserve-usd`, `--text-reserve-usd`, `--vision-reserve-usd`. Failed/unknown calls retain the reservation. There is no automatic paid retry. Each brief has at most three render attempts, including failures. Retry by requesting a revision with a reason; after three attempts, revise and reapprove the brief. If the mock pilot already has a candidate, request revision before switching that job to the real image provider.

**Reservation caps are not guaranteed invoice caps:** token usage is only known after a provider response, and a timed-out request may still be billed. Pair conservative reservations with provider-side project controls. The CLI stops before submitting a request if the configured reservation/call limit would be exceeded. It checks missing credentials/models before reserving. Paid cost approval, not just a configured key, is required.

For interrupted work, stop/check the prior process and the provider's request log first. Remove a stale `.cover-work/write.lock/` only after confirming no writer is running. Then `node tools/covers/cli.mjs recover` marks interrupted jobs blocked/unknown. No paid retry is triggered by recovery.

Failed/unknown requests also require `--retry-failed` explicitly; rerunning a batch alone cannot resubmit the same image/text/vision request. Reviewer revision notes are passed into the next image request and stored with its candidate. Render `--limit` counts new attempts, skipping completed/frozen jobs so small runs progress through a batch.

## Campus photo catalog

The supplied archive has 429 JPEG entries. A sample of 20 was extracted and indexed **locally only**. No external photo uploads, captions or derivative generation took place. The user reports documented permission; its terms have not yet been supplied/recorded in the catalog.

```bash
# Extract a ZIP locally into a photo folder first; do not add it to Git.
node tools/covers/cli.mjs index --folder /path/campus-photos --limit 20
node tools/covers/cli.mjs search --query campanile
node tools/covers/cli.mjs search --query campanile --scope derivatives
```

The first query can return filename/metadata matches. The derivatives query returns zero until scoped permission evidence is recorded. Indexing computes image hashes, dimensions, orientation, format, density, filename tags and EXIF presence/hash without uploading pixels. Same-byte photos are deduplicated and captions cached by hash/model. AI-suggested landmark names are never promoted to `verifiedLandmark`; an operator must verify them.

After the sample is reviewed, local metadata indexing can scan the whole folder with `index --folder /path/campus-photos --limit 429` (index-only cap: 1,000 files). External caption runs remain capped at 50 per invocation and skip already-captioned records.

Rights updates are JSON arrays keyed by the catalog's exact photo `id`. Example shape (replace all example values with actual permission evidence; this is not a license grant):

```json
[
  {
    "id": "catalog-photo-id",
    "rights": {
      "holder": "Actual rights holder",
      "evidence": "Actual written permission/license reference and relevant scope",
      "reviewedBy": "Team reviewer",
      "reviewedAt": "2026-11-07T00:00:00Z",
      "aiProcessing": false,
      "derivatives": false,
      "commercial": false,
      "expiresAt": null,
      "attribution": "Required attribution, if any"
    }
  }
]
```

```bash
node tools/covers/cli.mjs rights --file /path/rights.json
# Only after actual permission and API spending approval:
node --env-file=.env.covers.local tools/covers/cli.mjs caption --limit 10 \
  --allow-paid --budget-usd 5 --max-paid-calls 20
```

Captioning requires AI-processing permission; derivative references require AI-processing, derivative and commercial-use scopes. Evidence/holder/reviewer/date and nonexpired terms are required. Permission is checked again at generation, approval and export. The catalog records considered/used reference IDs. `plan --provider openai --with-references` optionally retrieves up to three permitted caption/metadata matches, with usage counts as a tie-breaker. Zero references is valid. The pipeline works without campus photos. Full 429-image captioning and a reference-assisted real image test remain gated, not completed.

## QA and human approval

Automatic checks: source/evidence presence, duplicate scene recipes/focal anchors against current and older approved briefs, shot/people distribution, generic table frequency, output resolution/4:3 normalization, file hashes, pixel difference hashes and nearest-duplicate suggestions. Paid vision screening can flag relevance, style, anatomy, lettering, misleading scenes and repeated staging/characters. There are no guarantees of image uniqueness or correctness from these checks.

Human approval requires a current approved brief, a real candidate, technical QA, current photo permission scopes, a named reviewer, explicit visual/source acknowledgment and six scores of at least 3/5. Low scores require revision. Visual-model holds require a written resolution note. The operator is responsible for truthful review; this local prototype does not authenticate identities or prevent a local file owner from editing the JSON state.

## Staging integration, no deployment

```bash
node tools/covers/cli.mjs export
```

This creates `.cover-work/exports/<version>/covers/`, `cover-manifest.json` and instructions. Only approved, current-source, hash-verified, nonmock, nonfrozen assets qualify. It never changes `data/clubs.json`, `public/`, the checked-in manifest, `main` or the live website.

The export also includes `private-provenance.json` with brief/reference rights evidence for internal review. Keep that file private; it is not an app asset. Required attribution strings are included in the public manifest and rendered alongside approved covers on cards, results and detail pages. Check any license-specific placement/wording requirements before publishing.

After separate publishing approval, the team can copy that staging bundle's covers into `public/covers/` and its manifest to `data/cover-manifest.json`. The app resolver opts in only with `NEXT_PUBLIC_APPROVED_COVERS=true` in an authorized preview/deployment. The checked-in manifest is empty and flag defaults off. With the flag off, existing card/detail cover behavior is preserved. Greek covers bypass the generated-art resolver. Future verified official-photo entries have a distinct asset type, but officer verification, upload handling and any subscription rules remain unimplemented/open.

## Costs and scale

No API costs incurred for this implementation/test run. Current paid-service and quality results are unmeasured. OpenAI's published standard GPT Image 2.5 token rates checked November 7, 2026: $5/million text-input tokens, $8/million image-input tokens, $30/million image-output tokens. Reference inputs and retries contribute to total cost.

Planning **scenario, not a quote or measured image estimate**: 2,500 text-input + 2,000 reference-image-input + 10,000 image-output tokens would cost $0.3285 per request. At that assumed usage:

| Covers | One pass | With 25% extra renders |
| --- | ---: | ---: |
| 20 | $6.57 | $8.21 |
| 50 | $16.43 | $20.53 |
| 700 | $229.95 | $287.44 |

These figures exclude text planning, vision/captioning, taxes, storage and labor; actual tokens may differ substantially. Replacing the assumption with usage from three real covers is the next step before any 20/50/700 commitment. At one minute of human review each, 700 covers alone take about 11.7 hours; allow extra time for revisions and reference verification. At the observed diagnostic WebP size, storage is small, but real image sizes must be measured. Serial jobs are intentionally conservative; add bounded concurrency only after the paid pilot succeeds.

## Validation and references

```bash
npm run covers:test
npm run lint
npm run build
```

Lifecycle tests use explicit synthetic fixtures and fake provider replies, never paid calls. They cover grounding, unknown/duplicate IDs, 59 frozen chapters, mock rejection, budget/failure persistence, retries, source changes, approvals/revocations, image hashes, permission expiry, caption caching, actual adapter request structure, atomic locking, local HTTP review, and the app's default-off manifest gate. Browser checks covered desktop/mobile layout, queue/search, reference permission filtering and console logs.

Primary API references used for adapters/pricing:
- https://developers.openai.com/api/docs/guides/image-generation
- https://developers.openai.com/api/reference/resources/images
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/models/gpt-image-2.5-flare
- https://developers.openai.com/api/docs/pricing

See `active/research/covers/Visual_Decisions.md` for the team's editable decisions, `Handoff_v2.md` for original scope, and `Pilot_Evaluation.md` for this run's results/limitations.

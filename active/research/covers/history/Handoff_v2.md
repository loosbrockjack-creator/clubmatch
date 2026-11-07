# ClubMatch — Build the AI Watercolor Cover Production System

**ChatGPT Work execution handoff**  
Updated: November 7, 2026 — Version 2 (ISU photo reference library)  
Project: ClubMatch, ENTSP 3100, Iowa State University

## Your role and objective

Act as an implementation-focused senior product engineer and AI workflow architect. **Build a functioning first version** of ClubMatch's repeatable image-cover production system—not just a conceptual plan. Use the existing ClubMatch codebase and organization data if access is available. Prefer existing frameworks, storage and hosting; do not recreate the app or bolt on an unnecessary agent platform.

We have approved this architecture:

```text
Existing ClubMatch club database + selected batch
    + optional indexed Iowa State visual-reference library
    ↓
AI Art Director (grounded scene brief for each club)
    ↓
Diversity Controller (batch-wide visual variety)
    ↓
Image Generation (individual warm watercolor covers)
    ↓
Automated QA + human review
    ↓
Approved asset store → ClubMatch Explore/profile images
```

### Version 2 addendum — approved photo-reference workflow

The team has approved **adding a lightweight, searchable ISU campus photo reference library** to support the Art Director. This is an optional context source, **not** the main subject or a mandatory input for every cover. A folder/ZIP of approximately 430 public Iowa State stock photographs may be supplied separately. **Do not imply this ZIP is included in this handoff unless it is actually attached.**

First verify whether the image ZIP/folder exists and whether the intended use (including uploads to AI vision/image-generation services, editing, derivative artwork, redistribution and any future commercial application) is licensed or authorized. A public download or a permission to download does **not** by itself grant all these rights. Until clarified, build a mock/indexer that uses synthetic test images or local metadata only; do **not** upload Iowa State source photographs to third-party AI services, generate derivative art from them, or publish reproductions. Flag this as a blocked integration pending documented permission.

**Photo Library Indexer (small new component):**
- Scan local folder/ZIP and read filenames, image dimensions, file hashes, and embedded metadata; avoid duplicates and retain exact provenance, source URLs if available, and rights status.
- After AI processing rights are confirmed, optionally caption each image *once* using a vision model: setting, recognizable landmark only when verified, objects, composition, season, color/mood, people presence, useful background traits, confidence and uncertainty. Generate 5–12 machine tags; no manual tagging of ~430 images is expected.
- Save compact records in a CSV/JSON or existing database; don't repeatedly pass all images into the model. For ~430 images, keyword/full-text retrieval with curated metadata is the v1 default; embeddings/vector search are an optional future enhancement, **not** necessary infrastructure.
- On each club cover, Art Director first prioritizes real club title/description/category, retrieves **0–3** permitted reference candidates, and may choose **none**. Save which source references were considered or used. Vary settings/landmarks across the whole batch.
- Do not paste recognizable students or copy full stock compositions. Illustrate the actual club theme primarily; campus architecture/ambience supports the scene. Populate some covers with plausible people, some with objects, and some with environments. Preserve existing Greek-life paintings unchanged.
- Permit human review of auto-captions when specific building identities are uncertain; never guess source licenses.

**Pilot acceptance test:** import/inspect a small authorized sample (10–20 references) first; show indexing output, searchable retrieval, a brief with and without campus references, diversity outcomes, and rights gate. Scale index to all ~430 only when source files and necessary permissions are verified.

This addendum supersedes older language stating ISU photos are only a separate future track: the *indexer and optional retrieval interface* are now in scope; actual copyrighted image processing/reuse remains conditional on permission.

### Context

ClubMatch is a campus organization discovery platform at https://clubmatch-puce.vercel.app/explore with approximately 700–730+ Iowa State organizations. Its existing Explore cards reuse about 10–20 generic stock photos, which looks repetitive and can misrepresent organizations. The team wants distinctive, club-specific hand-painted watercolor/gouache artwork as the default for clubs without an authorized genuine photo. Official authorized real photographs may coexist in the same image/card design system later; that is a parallel track, not required for the first working pipeline.

An earlier 20-club prototype established an appealing warm painterly aesthetic, but exposed flaws: repeated character designs, repetitive meetings/table scenes, and some implausible activities. The team **explicitly approved preserving the existing Greek-life illustrations** from that prototype. The team's original campus painting is included as a style reference. It must inform *aesthetic only*, not lead to copying its specific people/scene repeatedly.

### Required source documents attached alongside this handoff

1. `ClubMatch_Visual_Decisions.md` — **living source of truth**; preserve team edits; statuses `DECIDED`, `PROPOSED`, `OPEN`, `REJECTED` mean what they say.
2. `ClubMatch_Generation_System_Blueprint.md` — the engineering design and schema starter.
3. `ClubMatch_Build_Prompt.md` — earlier technical build brief, subordinate to this updated handoff and the decision log.
4. `ClubMatch_Original_Watercolor_Reference.png` — team-owned reference artwork for color, warmth, texture and tone.
5. `ClubMatch_Prototype_1_Review_Board.jpg` + `Prototype_1_Club_Manifest.csv` — evaluate prior image diversity and note Greek assets to preserve. The full previous 20-cover pack may be supplied separately; if not available, do not pretend its original asset files exist.

## First: access verification and repo audit

Without making production changes:

- Check whether you can access the ClubMatch GitHub repo (if connected), the app via the browser, the stored club records, the existing art assets and storage/CDN, and staging/deployment configuration.
- Inspect actual architecture, club IDs, database schema, image mappings, image service, current deployment configuration and test commands. Verify where authoritative names, descriptions, categories and tags are stored.
- Identify approved Greek prototype assets (at least Triangle, Alpha Gamma Rho and Alpha Sigma Kappa in the earlier 20-club prototype) and preserve **all** actual team-approved Greek-life paintings, not just these three, with explicit `keep_existing` or equivalent mapping. If unable to identify approved originals, leave those cards untouched and flag it.
- Do **not** ask the user to paste secrets. Use already connected resources or secure environment configuration. Do not print secrets. Do not assume the user has paid image/API access.
- Give a concise audit of what's verified and what is inaccessible. Then proceed with work that is safely possible. If repo access is not available, build a portable, tested prototype in a working project rather than fabricating integrations.

## Implementation: incremental, functioning deliverables

### Phase 1 — Club batch ingestion + structured AI Art Director

- Import a chosen batch of 20 actual clubs via stable IDs (not merely names), plus exact name, description, category/tags and source link/provenance from ClubMatch's existing data.
- Generate a **structured** art brief per club BEFORE image generation, not a loose prompt only. Include: supported themes/activity cues; quote(s) or references to grounding in description; realistic subject; composition/framing; setting; objects; people count; palette accent; explicit avoid-list; shot/scene type; description uncertainty indicator; prompt/style version.
- Reject or rewrite concepts inventing specific meetings, member identities, uniforms, competitions, events, trophies, brand marks, cultural stereotypes or unsupported activities.
- For generic/sparse descriptions, default to symbolic/thematic imagery rather than implausible details.
- Make the scene-brief generator provider-agnostic with a mock/deterministic mode for development.

### Phase 2 — Diversity Controller

- Evaluate the full batch of 20 **scene briefs** before rendering. Track diversity in composition, shot types, main props, locations, visual focal points, and people count. Check against older approved covers if supplied.
- Flag/re-plan overused ideas like “three students smiling around a laptop”; avoid recognizable recurring character/cast designs. The first 20-collage prototype should be used as examples of what to avoid.
- A tentative composition target (not a mandatory quota) for 20 NEW covers: 6 active student activity, 5 objects/equipment closeups, 4 environmental/campus, 3 social/community, 2 symbolic; override when a club's actual description requires it.
- Aim for <25% generic meeting/table compositions unless source content requires them. Avoid repeating ISU Campanile/campus landmarks in too many cards.
- Record diversity decisions and provide a batch visualization/sheet of planned concepts. Do not hard-code extreme randomness or use variety at the expense of relevance.

### Phase 3 — Image generation, cost guardrails, and persistence

- Implement an interchangeable image-provider interface plus a no-cost mock mode. Show the configured vendor and estimated cost range **before any paid batch**; do not initiate a paid 20-image run without user permission or an existing authorized budget.
- Generate **one cover per club**, not a single collage later cropped. Target an image aspect ratio of 4:3 (matching the planned card system), sufficient resolution for modern Explore cards, correct output metadata, a consistent warm vintage watercolor/gouache style with cardinal red, warm gold, muted greens, cream, handmade paper textures, and diverse natural compositions.
- Use the original image as artistic reference if the provider supports that use. Never embed generic fake club logos, labels, fit percentages, or readable text in the art.
- Save each candidate independently with immutable IDs, retry/resume state, content hash, source provenance, prompt version, brief, cost metadata when available, and approval status. Retain older versions and never overwrite approved assets.
- Keep `keep_existing` Greek images frozen. Skip rendering those entries.

### Phase 4 — QA with human approval

- Implement visual QA hooks that check relevance/grounding, physical/artifact quality, similarity/reused characters, photo-like misleadingness, culturally insensitive cues, title/category match, composition and crop. Clearly separate automated flags from confirmed judgments.
- Use actual thumbnail perceptual-hash or embedding-based comparisons when practical; do not claim an embedding similarity score is proof of uniqueness.
- Provide a review interface (prefer within existing app admin tools, otherwise a standalone local page) displaying card preview, exact organization data, brief, candidate image, rights/provenance, warnings, versions; actions: **approve / reject / regenerate / keep current**.
- A human approval action is **required before an image becomes a live cover**. A failed or missing candidate yields a safe existing or graphic fallback.

### Phase 5 — Controlled integration and testing

- Connect only approved assets to the correct organizations using stable IDs. Keep the Explore card layout consistent for illustrations and later authorized real photography: 4:3 media, matching radii/borders/type/overlays and accurate club data.
- Build in a feature flag, branch, or staging environment. Never deploy to production or modify 700+ live clubs without explicit approval.
- Provide a local 20-club pilot: input → 20 distinct scene briefs → diversity report → candidate/mock assets → QA/review → preview Explore grid. Include functional tests for skipped frozen clubs, missing descriptions, duplicates, retry behavior, permission metadata and approval gate.
- Write a clear README, setup steps, env var names (not values), exact commands, what is implemented vs mocked, where generated assets live, and how the team can edit or veto art direction. Update the decisions file/changelog with findings without overwriting team edits.

## Important boundaries

1. **Copyright and image sourcing:** public website visibility ≠ permission. Do not scrape or reuse Instagram, X, Facebook, LinkedIn, Iowa State stock photos, or official logos without required authorization and rights verification. The photo-library indexer and optional Art Director retrieval are now part of the system; ingesting or transforming Iowa State copyrighted photographs through AI services remains blocked pending verified permission. Avoid uploading restricted real photos to generation APIs without rights for transformation.
2. **Authenticity:** these are **representative illustrations**, not depictions of actual club members or verified club events. Prevent specificity unsupported by source descriptions.
3. **Subscription question unresolved:** do not enforce a paywall on authentic photos without a team decision. Keep official/authorized photo slot extendable but uncommitted.
4. **Preserve approvals:** all existing approved Greek-life art stays as is. Do not automatically modify the official ClubMatch production dataset, images, or published site.
5. **Cost and scope:** build low-cost/mock-capable architecture first. Build and demonstrate a 20-club pilot; no 700-cover mass generation until approved.
6. **Traceability:** Every planned or generated cover should be attributable to a club ID, actual club data, art brief, version, generation status, and reviewer approval.

## Definition of done for this Work session

A meaningful first completion is not another brainstorm. Produce a repo-aware, functioning **20-club pipeline pilot** with real clubs' text data where accessible, clear access findings, structured scene briefs, batch diversity QA, persistent status/asset manifests, review/approval UI, an Explore-like preview, and run instructions. Implement real image generation if and only if authorized credentials and a spending budget are available; otherwise run with honest mock output and document what would switch it to real generation.

End with an explicit report: files changed, features functional, demos/preview links if actually created, tests and results, blocked elements, costs incurred (if any), remaining approvals, and the next small step for scaling to 50 then 700+ clubs.

**Start now with access checks and then execute. Do not stop at recommendations unless actual repository/app access is truly unavailable.**

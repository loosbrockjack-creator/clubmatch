import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { pilotRecipes } from "./pilot.mjs";

export const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const DEFAULT_HOME = path.join(REPO, ".cover-work");
export const VERSION = "clubmatch-watercolor-v2.1";
export const STYLE =
  "Warm watercolor and opaque gouache on handmade cream paper; earthy cardinal, warm gold, muted forest green; natural brush texture; approachable college atmosphere; believable anatomy. One independent 4:3 composition with safe margins. No lettering, labels, logos, uniforms, recognizable real members, trophies or fabricated events. Use reference 1 ONLY for palette, texture and warmth; do not copy its cast, tower or arrangement. These are representative illustrations, never documentary club photos.";
export const now = () => new Date().toISOString();
export const sha = (value) =>
  createHash("sha256")
    .update(
      typeof value === "string" || Buffer.isBuffer(value)
        ? value
        : JSON.stringify(value),
    )
    .digest("hex");
export const clone = (value) => structuredClone(value);
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
export const sourceHash = (c) =>
  sha({
    id: c.id,
    name: c.name,
    summary: c.summary,
    categories: c.categories,
    source: c.stuorgUrl,
  });
export const frozen = (c) =>
  Boolean(c.greek) ||
  (c.categories || []).some((x) =>
    ["Fraternities", "Sororities"].includes(x),
  ) ||
  ["triangle", "alpha-gamma-rho", "alpha-sigma-kappa"].includes(c.slug);
export async function clubs() {
  return JSON.parse(
    await fs.readFile(path.join(REPO, "data/clubs.json"), "utf8"),
  );
}
export function emptyState() {
  return {
    schema: 1,
    revision: 0,
    jobs: {},
    batches: [],
    photos: [],
    ledger: [],
    events: [],
  };
}
export async function readState(home = DEFAULT_HOME) {
  try {
    const state = JSON.parse(
      await fs.readFile(path.join(home, "state.json"), "utf8"),
    );
    assert(state.schema === 1, "Unsupported state schema");
    return state;
  } catch (e) {
    if (e.code === "ENOENT") return emptyState();
    throw e;
  }
}
export async function saveState(home, state) {
  await fs.mkdir(home, { recursive: true });
  state.revision++;
  state.updatedAt = now();
  const tmp = path.join(home, `state-${randomUUID()}.tmp`);
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
  await fs.rename(tmp, path.join(home, "state.json"));
}
export async function withStore(home, fn) {
  await fs.mkdir(home, { recursive: true });
  const lock = path.join(home, "write.lock");
  try {
    await fs.mkdir(lock);
  } catch (e) {
    if (e.code === "EEXIST")
      throw new Error(
        "Another cover operation holds write.lock. If a process crashed, check it has stopped before removing the lock.",
      );
    throw e;
  }
  try {
    await fs.writeFile(
      path.join(lock, "owner.json"),
      JSON.stringify({ pid: process.pid, started: now() }),
    );
    const state = await readState(home);
    const result = await fn(state);
    await saveState(home, state);
    return result;
  } finally {
    await fs.rm(lock, { recursive: true, force: true });
  }
}
export function event(state, type, details) {
  state.events.push({ at: now(), type, ...details });
}
export function ingest(state, records, ids) {
  assert(
    Array.isArray(ids) && ids.length > 0 && ids.length <= 50,
    "Select 1–50 stable club IDs per batch",
  );
  assert(new Set(ids).size === ids.length, "Duplicate club IDs in batch");
  const byId = new Map(records.map((c) => [String(c.id), c]));
  for (const id of ids) assert(byId.has(id), `Unknown club ID: ${id}`);
  // Protect every known Greek chapter, even when it is not part of the pilot.
  for (const c of records.filter(frozen)) {
    state.jobs[c.id] ||= {
      club: clone(c),
      sourceHash: sourceHash(c),
      briefs: [],
      candidates: [],
      status: "keep_existing",
      approvedCandidate: null,
    };
    state.jobs[c.id].frozen = true;
    state.jobs[c.id].status = "keep_existing";
  }
  for (const id of ids) {
    const c = byId.get(id);
    assert(c.name && typeof c.summary === "string", `Invalid record ${id}`);
    let j = state.jobs[id];
    if (!j)
      j = state.jobs[id] = {
        club: clone(c),
        sourceHash: sourceHash(c),
        briefs: [],
        candidates: [],
        status: "unplanned",
        approvedCandidate: null,
      };
    if (j.sourceHash !== sourceHash(c)) {
      j.club = clone(c);
      j.sourceHash = sourceHash(c);
      j.activeBrief = null;
      if (!j.frozen) j.status = "source_changed";
      event(state, "source_changed", { clubId: id });
    }
  }
  const key = sha(ids).slice(0, 12);
  let batch = state.batches.find((b) => b.key === key);
  if (!batch) {
    batch = { id: randomUUID(), key, ids, createdAt: now() };
    state.batches.push(batch);
  }
  return batch;
}
export const activeBrief = (job) =>
  job.briefs.find((b) => b.id === job.activeBrief);
export function validateRecipe(recipe, club) {
  const fields = [
    "subject",
    "setting",
    "framing",
    "palette_accent",
    "anchor",
    "why_this_image",
  ];
  for (const key of fields)
    assert(
      typeof recipe[key] === "string" &&
        recipe[key].trim().length > 0 &&
        recipe[key].length < 2000,
      `Invalid brief ${key}`,
    );
  assert(
    [
      "people_action",
      "object_closeup",
      "environment",
      "community",
      "symbolic",
    ].includes(recipe.shot_type),
    "Invalid shot type",
  );
  assert(
    Number.isInteger(recipe.people_count) &&
      recipe.people_count >= 0 &&
      recipe.people_count <= 6,
    "People count must be 0–6",
  );
  assert(
    ["low", "medium", "high"].includes(recipe.grounding_confidence),
    "Invalid grounding confidence",
  );
  assert(
    Array.isArray(recipe.avoid) &&
      recipe.avoid.length &&
      recipe.avoid.every((x) => typeof x === "string"),
    "Avoid list required",
  );
  const source = [club.name, club.summary, ...club.categories].join("\n");
  assert(
    Array.isArray(recipe.grounded_evidence) &&
      recipe.grounded_evidence.length > 0 &&
      recipe.grounded_evidence.every(
        (x) => typeof x === "string" && x.length > 3 && source.includes(x),
      ),
    "Every evidence quote must appear exactly in club source text",
  );
  if (!club.summary.trim())
    assert(
      recipe.shot_type === "symbolic",
      "Missing descriptions require symbolic direction",
    );
  return recipe;
}
export function deterministicRecipe(club, index = 0) {
  const fixture = pilotRecipes.find((p) => p.id === club.id);
  const sparse = club.summary.length < 180;
  const r = fixture
    ? {
        ...fixture,
        grounded_evidence: [fixture.evidence],
        grounding_confidence: sparse ? "low" : "medium",
        why_this_image: `A representative ${fixture.anchor} theme grounded in the source; not a documented club event.`,
      }
    : {
        subject: `A nonliteral abstract composition suggesting ${club.name}; no specific activity or objects asserted`,
        setting: "warm cream paper",
        framing: ["diagonal", "balanced negative space", "layered shapes"][
          index % 3
        ],
        people_count: 0,
        palette_accent: ["cardinal", "gold", "sage"][index % 3],
        anchor: club.name,
        shot_type: "symbolic",
        grounded_evidence: [club.name],
        grounding_confidence: "low",
        why_this_image:
          "Description needs creative review. Use abstract thematic imagery without inventing an event.",
      };
  delete r.id;
  delete r.evidence;
  r.avoid = [
    "readable text",
    "logos",
    "specific events or real member identities",
    "unsupported equipment",
    "stereotyped cultural symbols",
    "recurring cast from the style reference",
  ];
  if (club.id === "voice")
    r.avoid.push(
      "clinical animal treatment: the source focuses on inclusion and mentorship",
    );
  return validateRecipe(r, club);
}
export function addBrief(
  state,
  id,
  recipe,
  provider = "deterministic",
  references = [],
) {
  const j = state.jobs[id];
  assert(
    j && !j.frozen && j.status !== "keep_existing",
    "Frozen or unresolved club",
  );
  validateRecipe(recipe, j.club);
  const r = references.slice(0, 3);
  assert(
    r.every((ref) => canUsePhoto(ref, "derivatives")),
    "Reference lacks documented derivative permission",
  );
  const brief = {
    id: randomUUID(),
    createdAt: now(),
    version: VERSION,
    provider,
    sourceHash: j.sourceHash,
    recipe: clone(recipe),
    referenceIds: r.map((p) => p.id),
    approved: null,
  };
  j.briefs.push(brief);
  j.activeBrief = brief.id;
  j.status = "brief_draft";
  event(state, "brief_created", { clubId: id, briefId: brief.id, provider });
  for (const p of r) {
    p.consideredBy ||= [];
    p.consideredBy.push({ clubId: id, briefId: brief.id, at: now() });
  }
  return brief;
}
export function diversity(state, ids) {
  const items = ids
    .map((id) => ({ id, j: state.jobs[id], b: activeBrief(state.jobs[id]) }))
    .filter((x) => x.b && !x.j.frozen);
  const report = {
    total: items.length,
    shotTypes: {},
    peopleCounts: {},
    collisions: [],
    warnings: [],
    genericTableFraction: 0,
    limitation:
      "Brief-level heuristics. Visual anatomy, recurring faces and style require image screening and human review.",
  };
  let tables = 0;
  for (const { id, b } of items) {
    const r = b.recipe;
    report.shotTypes[r.shot_type] = (report.shotTypes[r.shot_type] || 0) + 1;
    report.peopleCounts[r.people_count] =
      (report.peopleCounts[r.people_count] || 0) + 1;
    if (
      r.people_count > 1 &&
      /table|boardroom/i.test(r.subject + " " + r.setting)
    )
      tables++;
    const key = (x) =>
      [x.shot_type, x.setting, x.framing, x.people_count]
        .join("|")
        .toLowerCase();
    const matches = Object.entries(state.jobs)
      .filter(([other, j]) => other !== id && !j.frozen)
      .flatMap(([other, j]) => {
        const briefs = [
          activeBrief(j),
          ...j.candidates
            .filter((c) => c.review?.action === "approve")
            .map((c) => j.briefs.find((b) => b.id === c.briefId)),
        ].filter(Boolean);
        return briefs
          .filter(
            (p) =>
              key(p.recipe) === key(r) ||
              p.recipe.anchor.toLowerCase() === r.anchor.toLowerCase(),
          )
          .map((p) => ({
            clubId: other,
            briefId: p.id,
            reason:
              key(p.recipe) === key(r)
                ? "same scene recipe"
                : "same focal anchor",
          }));
      });
    if (matches.length)
      report.collisions.push({ clubId: id, similar: matches });
    if (r.grounding_confidence === "low")
      report.warnings.push({
        clubId: id,
        message:
          "Sparse source or symbolic direction: review grounding carefully.",
      });
  }
  report.genericTableFraction = items.length ? tables / items.length : 0;
  if (report.genericTableFraction >= 0.25)
    report.warnings.push({
      message:
        "At least 25% of plans are generic table scenes. Reconsider unless source-supported.",
    });
  return report;
}
export function canUsePhoto(p, scope) {
  const r = p.rights;
  if (!r || !r.evidence || !r.holder || !r.reviewedBy || !r.reviewedAt)
    return false;
  if (
    r.expiresAt &&
    (!Number.isFinite(Date.parse(r.expiresAt)) ||
      Date.parse(r.expiresAt) <= Date.now())
  )
    return false;
  return (
    r.aiProcessing === true &&
    (scope !== "derivatives" ||
      (r.derivatives === true && r.commercial === true))
  );
}
export function searchPhotos(
  state,
  query,
  { scope = "metadata", limit = 3 } = {},
) {
  assert(
    ["metadata", "indexing", "derivatives"].includes(scope),
    "Invalid photo scope",
  );
  const terms = query.toLowerCase().match(/[a-z]{3,}/g) || [];
  return state.photos
    .filter((p) => scope === "metadata" || canUsePhoto(p, scope))
    .map((p) => {
      const text = [p.filename, p.caption || "", ...(p.tags || [])]
        .join(" ")
        .toLowerCase();
      return {
        ...p,
        score: terms.reduce((s, t) => s + (text.includes(t) ? 1 : 0), 0),
      };
    })
    .filter((p) => p.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || (a.usedBy?.length || 0) - (b.usedBy?.length || 0),
    )
    .slice(0, Math.min(3, limit));
}
export function requirePaid(policy, kind) {
  assert(
    policy?.allowPaid === true,
    "Paid calls disabled. Explicit --allow-paid, budget and call limit required.",
  );
  assert(
    Number.isFinite(policy.budgetUsd) && policy.budgetUsd > 0,
    "Positive --budget-usd required",
  );
  assert(
    Number.isInteger(policy.maxCalls) && policy.maxCalls > 0,
    "Positive --max-paid-calls required",
  );
  assert(
    Number.isFinite(policy.reserveUsd?.[kind]) && policy.reserveUsd[kind] > 0,
    `Positive reservation required for ${kind}`,
  );
}
export async function reserve(state, home, policy, kind, details = {}) {
  requirePaid(policy, kind);
  const used = state.ledger.reduce((s, x) => s + x.reservedUsd, 0);
  assert(
    state.ledger.length < policy.maxCalls,
    "Paid call limit reached (includes failures/unknown results)",
  );
  assert(
    used + policy.reserveUsd[kind] <= policy.budgetUsd + 1e-8,
    "Budget reservation limit reached",
  );
  const entry = {
    id: randomUUID(),
    kind,
    reservedUsd: policy.reserveUsd[kind],
    status: "started",
    at: now(),
    ...details,
  };
  state.ledger.push(entry);
  await saveState(home, state);
  return entry;
}
export async function paidCall(state, home, policy, kind, fn, details = {}) {
  const requestKey = sha({ kind, ...details });
  assert(
    !state.ledger.some(
      (x) =>
        x.requestKey === requestKey &&
        ["started", "failed_or_unknown"].includes(x.status),
    ) || policy?.retryFailed === true,
    "Previous paid result is failed/unknown; inspect the provider and use --retry-failed explicitly.",
  );
  const entry = await reserve(state, home, policy, kind, {
    ...details,
    requestKey,
  });
  try {
    const result = await fn();
    entry.status = "completed";
    entry.usage = result.usage || null;
    entry.finishedAt = now();
    await saveState(home, state);
    return result;
  } catch (e) {
    entry.status = "failed_or_unknown";
    entry.error =
      "Provider request failed; may still be billable. No automatic retry.";
    await saveState(home, state);
    throw e;
  }
}
export async function imageHash(bytes) {
  const data = await sharp(bytes)
    .rotate()
    .resize(9, 8, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer();
  let bits = 0n;
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++)
      bits = (bits << 1n) | (data[y * 9 + x] > data[y * 9 + x + 1] ? 1n : 0n);
  return bits.toString(16).padStart(16, "0");
}
export function distance(a, b) {
  let x = BigInt("0x" + a) ^ BigInt("0x" + b),
    n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
}
export async function recordCandidate(
  state,
  home,
  id,
  bytes,
  provider,
  { usage = null, mock = false, revisionNote = "" } = {},
) {
  const j = state.jobs[id],
    b = activeBrief(j);
  assert(j && !j.frozen && b, "Frozen club or missing brief");
  const originalMetadata = await sharp(bytes).metadata();
  assert(
    originalMetadata.width >= 640 && originalMetadata.height >= 480,
    "Image resolution too small",
  );
  const image = await sharp(bytes)
    .rotate()
    .resize(1200, 900, { fit: "cover", position: "centre" })
    .webp({ quality: 86 })
    .toBuffer();
  const hash = sha(image);
  assert(
    !j.candidates.some((c) => c.sha256 === hash),
    "Duplicate image bytes for this club",
  );
  const assetId = randomUUID();
  await fs.mkdir(path.join(home, "assets"), { recursive: true });
  await fs.writeFile(path.join(home, "assets", assetId + ".webp"), image, {
    flag: "wx",
  });
  const dhash = await imageHash(image);
  const similar = Object.values(state.jobs).flatMap((other) =>
    other.candidates
      .filter(
        (c) => !c.mock && !mock && c.dhash && distance(c.dhash, dhash) <= 8,
      )
      .map((c) => ({
        clubId: other.club.id,
        candidateId: c.id,
        distance: distance(c.dhash, dhash),
      })),
  );
  const c = {
    id: assetId,
    createdAt: now(),
    provider,
    mock,
    briefId: b.id,
    sourceHash: j.sourceHash,
    styleVersion: VERSION,
    sha256: hash,
    dhash,
    width: 1200,
    height: 900,
    bytes: image.length,
    originalDimensions: {
      width: originalMetadata.width,
      height: originalMetadata.height,
    },
    referenceIds: b.referenceIds,
    usage,
    revisionNote,
    rights: {
      type: mock ? "test_graphic" : "original_generated_illustration",
      referencesChecked:
        !mock &&
        b.referenceIds.every((id) =>
          canUsePhoto(
            state.photos.find((p) => p.id === id) || {},
            "derivatives",
          ),
        ),
    },
    qa: {
      technical: "pass",
      visual: "not_run",
      flags: mock
        ? [
            "Pipeline test graphic, not generated artwork. Cannot approve or export.",
          ]
        : [
            "Review crop, activity, anatomy, repeated characters, style, accidental lettering and misrepresentation.",
          ],
      similar,
    },
    review: null,
  };
  if (similar.length)
    c.qa.flags.push(
      "Possible visual duplicate: compare the linked candidates. Perceptual hash is a screening heuristic.",
    );
  j.candidates.push(c);
  j.status = "qa_review";
  event(state, "candidate_created", { clubId: id, candidateId: c.id, mock });
  for (const refId of b.referenceIds) {
    const p = state.photos.find((p) => p.id === refId);
    p.usedBy ||= [];
    p.usedBy.push({ clubId: id, candidateId: c.id, at: now() });
  }
  return c;
}
export function review(
  state,
  id,
  action,
  {
    reviewer,
    note = "",
    candidateId,
    briefId,
    scores,
    acknowledged = false,
  } = {},
) {
  const j = state.jobs[id];
  assert(j, "Unknown club");
  assert(
    typeof reviewer === "string" && reviewer.trim(),
    "Reviewer name required",
  );
  if (j.frozen) {
    assert(action === "keep_existing", "Greek covers are frozen");
    return j;
  }
  if (action === "keep_existing") {
    j.status = "keep_existing";
    event(state, action, { clubId: id, reviewer, note });
    return j;
  }
  assert(
    j.status !== "keep_existing",
    "Restore a kept club deliberately before changing it",
  );
  const b = activeBrief(j);
  if (action === "approve_brief") {
    assert(
      b && b.id === briefId && b.sourceHash === j.sourceHash,
      "Brief changed; refresh",
    );
    b.approved = { reviewer, note, at: now() };
    j.status = "brief_approved";
    event(state, "brief_approved", {
      clubId: id,
      briefId: b.id,
      reviewer,
      note,
    });
    return j;
  }
  const c = j.candidates.find((c) => c.id === candidateId);
  assert(c, "Candidate changed; refresh");
  if (action === "approve") {
    assert(!c.mock, "Test graphics cannot be approved");
    assert(
      b && c.briefId === b.id && c.sourceHash === j.sourceHash && b.approved,
      "Approve the current grounded brief first",
    );
    assert(
      c.qa.technical === "pass" &&
        c.rights.referencesChecked &&
        c.referenceIds.every((id) =>
          canUsePhoto(
            state.photos.find((p) => p.id === id) || {},
            "derivatives",
          ),
        ),
      "Technical or reference-rights hold",
    );
    assert(
      acknowledged === true,
      "Human must acknowledge visual and source review",
    );
    assert(
      Array.isArray(scores) &&
        scores.length === 6 &&
        scores.every((n) => Number.isInteger(n) && n >= 3 && n <= 5),
      "Six quality scores of at least 3/5 required; otherwise revise",
    );
    assert(
      !c.qa.visualHold || note.trim().length >= 12,
      "Explain how visual screening concerns were resolved",
    );
    c.review = { action, reviewer, note, scores, at: now(), acknowledged };
    j.approvedCandidate = c.id;
    j.status = "approved";
  } else if (["reject", "regenerate"].includes(action)) {
    assert(note.trim(), "A revision/rejection reason is required");
    c.review = { action, reviewer, note, at: now() };
    j.status = action === "reject" ? "rejected" : "needs_regeneration";
    // Revoking the currently approved image must remove it from export eligibility.
    if (j.approvedCandidate === c.id) j.approvedCandidate = null;
  } else throw new Error("Unknown review action");
  event(state, "review", {
    clubId: id,
    candidateId: c.id,
    action,
    reviewer,
    note,
  });
  return j;
}
export async function generate(state, home, id, provider, policy) {
  const j = state.jobs[id];
  assert(
    j && !j.frozen && j.status !== "keep_existing",
    "Frozen/kept club: generation blocked",
  );
  const b = activeBrief(j);
  assert(b && b.sourceHash === j.sourceHash, "Create a current brief first");
  if (provider.paid) {
    requirePaid(policy, "image");
    assert(
      b.approved,
      "Human brief approval required before paid image generation",
    );
  }
  const existing = j.candidates.find(
    (c) =>
      c.briefId === b.id &&
      c.provider === provider.name &&
      !["reject", "regenerate"].includes(c.review?.action),
  );
  if (existing) return { skipped: "existing candidate", candidate: existing };
  const attempts =
    j.candidates.filter((c) => c.briefId === b.id).length +
    (j.failures || []).filter((c) => c.briefId === b.id).length;
  assert(
    attempts < 3,
    "Retry limit reached (3 attempts per brief). Revise the brief and review it before trying again.",
  );
  assert(
    j.status !== "generating",
    "Interrupted generation detected. Run recover first; never retry an unknown paid result silently.",
  );
  assert(
    j.status !== "blocked" || policy?.retryFailed === true,
    "Failed/unknown job requires explicit --retry-failed after checking the provider result.",
  );
  if (j.candidates.length)
    assert(
      j.status === "needs_regeneration" ||
        !j.candidates.some((c) => c.briefId === b.id),
      "Request regeneration with a reason first",
    );
  j.status = "generating";
  await saveState(home, state);
  try {
    const references = b.referenceIds.map((id) =>
      state.photos.find((p) => p.id === id),
    );
    assert(
      references.every((p) => p && canUsePhoto(p, "derivatives")),
      "Reference permission expired or was revoked",
    );
    const revisionNote =
      j.candidates
        .filter((c) => c.briefId === b.id && c.review?.action === "regenerate")
        .at(-1)?.review.note || "";
    const run = () =>
      provider.generate({
        club: j.club,
        brief: b,
        style: STYLE,
        references,
        revisionNote,
      });
    const result = provider.paid
      ? await paidCall(state, home, policy, "image", run, {
          clubId: id,
          briefId: b.id,
          model: provider.model,
        })
      : await run();
    const candidate = await recordCandidate(
      state,
      home,
      id,
      result.bytes,
      provider.name,
      { ...result, revisionNote },
    );
    await saveState(home, state);
    return candidate;
  } catch (e) {
    j.status = "blocked";
    j.failures ||= [];
    j.failures.push({ at: now(), briefId: b.id, message: e.message });
    await saveState(home, state);
    throw e;
  }
}
export function exportable(state, j) {
  const c = j.candidates.find((c) => c.id === j.approvedCandidate),
    b = c && j.briefs.find((b) => b.id === c.briefId);
  return Boolean(
    !j.frozen &&
      j.status !== "keep_existing" &&
      c &&
      !c.mock &&
      c.review?.action === "approve" &&
      c.review.acknowledged &&
      c.sourceHash === j.sourceHash &&
      b?.approved &&
      c.qa.technical === "pass" &&
      c.rights.referencesChecked &&
      c.referenceIds.every((id) =>
        canUsePhoto(state.photos.find((p) => p.id === id) || {}, "derivatives"),
      ),
  );
}
export async function exportApproved(state, home) {
  const output = path.join(home, "exports", randomUUID());
  await fs.mkdir(path.join(output, "covers"), { recursive: true });
  const manifest = [],
    provenance = [];
  for (const j of Object.values(state.jobs).filter((j) =>
    exportable(state, j),
  )) {
    const c = j.candidates.find((c) => c.id === j.approvedCandidate);
    const filename = `${j.club.slug}-${c.id}.webp`;
    const bytes = await fs.readFile(path.join(home, "assets", c.id + ".webp"));
    assert(sha(bytes) === c.sha256, "Approved asset hash mismatch");
    await fs.writeFile(path.join(output, "covers", filename), bytes, {
      flag: "wx",
    });
    const sourceReferences = c.referenceIds.map((id) =>
      state.photos.find((p) => p.id === id),
    );
    manifest.push({
      clubId: j.club.id,
      slug: j.club.slug,
      src: "/covers/" + filename,
      alt: `Representative ClubMatch watercolor illustration for ${j.club.name}`,
      type: "generated_illustration",
      candidateId: c.id,
      approved: true,
      mock: false,
      review: c.review,
      sourceHash: c.sourceHash,
      sha256: c.sha256,
      rights: c.rights,
      referenceIds: c.referenceIds,
      attributions: sourceReferences
        .map((p) => p.rights.attribution)
        .filter(Boolean),
    });
    provenance.push({
      clubId: j.club.id,
      candidate: clone(c),
      brief: clone(j.briefs.find((b) => b.id === c.briefId)),
      references: sourceReferences.map(
        ({ id, filename, sha256, sourceUrl, rights }) => ({
          id,
          filename,
          sha256,
          sourceUrl,
          rights,
        }),
      ),
    });
  }
  await fs.writeFile(
    path.join(output, "cover-manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  await fs.writeFile(
    path.join(output, "private-provenance.json"),
    JSON.stringify(provenance, null, 2),
    { mode: 0o600 },
  );
  await fs.writeFile(
    path.join(output, "README.txt"),
    "Staging export only. No production files changed. After approval, copy covers/ to public/covers/ and cover-manifest.json to data/. Enable NEXT_PUBLIC_APPROVED_COVERS=true only in an authorized preview/deployment.\n",
  );
  event(state, "staging_export", { count: manifest.length });
  return { output, count: manifest.length };
}

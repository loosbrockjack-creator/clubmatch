import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  REPO, activeBrief, canUsePhoto, diversity, frozen, requirePaid,
  sha, sourceHash, validateRecipe,
} from "./core.mjs";

/** Inspect only: no provider requests, reservations, approvals or state writes. */
export async function preflight(state, records, {
  batchId, limit = 3, policy, env = process.env,
} = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50)
    throw new Error("Preflight limit must be 1–50");
  const blockers = [], warnings = [];
  const model = env.COVER_IMAGE_MODEL || "gpt-image-2.5-flare";
  const provider = "openai:" + model;
  const credentialsConfigured = Boolean(env.OPENAI_API_KEY?.trim());
  if (!credentialsConfigured) blockers.push("Configure OPENAI_API_KEY securely before rendering.");
  let validPolicy = true;
  try { requirePaid(policy, "image"); }
  catch (e) { validPolicy = false; blockers.push(e.message); }

  let styleReference = null;
  try {
    const bytes = await fs.readFile(path.join(REPO, "tools/covers/references/original-watercolor.png"));
    const metadata = await sharp(bytes).metadata();
    if (!metadata.width || !metadata.height) throw new Error("Invalid style image");
    styleReference = { sha256: sha(bytes), width: metadata.width, height: metadata.height };
  } catch { blockers.push("The original watercolor style reference is missing or unreadable."); }

  const batch = batchId ? state.batches.find((b) => b.id === batchId) : state.batches.at(-1);
  const current = new Map(records.map((c) => [String(c.id), c]));
  const selected = [], skipped = [];
  if (!batch) blockers.push("No matching batch; plan a batch first.");
  for (const id of batch?.ids || []) {
    const job = state.jobs[id], source = current.get(id);
    if (job && (job.frozen || frozen(job.club) || (source && frozen(source)) || job.status === "keep_existing")) {
      skipped.push({ clubId: id, reason: "keep_existing" });
      continue;
    }
    const brief = job && activeBrief(job);
    if (job?.candidates.some((c) => c.briefId === brief?.id && c.provider === provider && !["reject", "regenerate"].includes(c.review?.action))) {
      skipped.push({ clubId: id, reason: "existing candidate for this provider" });
      continue;
    }
    if (selected.length >= limit) continue;
    const issues = [];
    if (!job || !source) issues.push("Club is missing from the state or current source dataset.");
    else {
      if (sourceHash(source) !== job.sourceHash) issues.push("Source changed; re-plan and review before generation.");
      if (!brief || brief.sourceHash !== job.sourceHash) issues.push("Create a current grounded brief first.");
      else {
        try { validateRecipe(brief.recipe, source); }
        catch { issues.push("Brief no longer validates against the current club source."); }
        if (!brief.approved) issues.push("Human brief approval is required.");
        const attempts = job.candidates.filter((c) => c.briefId === brief.id).length +
          (job.failures || []).filter((f) => f.briefId === brief.id).length;
        if (attempts >= 3) issues.push("Three attempts already used; revise and reapprove the brief.");
        if (job.candidates.length && job.status !== "needs_regeneration" && job.candidates.some((c) => c.briefId === brief.id))
          issues.push("Request regeneration with a reason before replacing the current candidate.");
        const key = sha({ kind: "image", clubId: id, briefId: brief.id, model });
        if (!policy?.retryFailed && state.ledger.some((e) => e.requestKey === key && ["started", "failed_or_unknown"].includes(e.status)))
          issues.push("Prior paid result is unknown; inspect it before an explicit retry.");
        for (const refId of brief.referenceIds) {
          const photo = state.photos.find((p) => p.id === refId);
          if (!photo || !canUsePhoto(photo, "derivatives")) {
            issues.push(`Reference ${refId} lacks current documented permissions.`);
            continue;
          }
          try {
            if (sha(await fs.readFile(photo.path)) !== photo.sha256)
              issues.push(`Reference ${refId} bytes changed; re-index and review permissions.`);
          } catch { issues.push(`Reference ${refId} file is unavailable.`); }
        }
      }
      if (job.status === "generating") issues.push("Interrupted generation must be recovered after checking the provider.");
      if (job.status === "blocked" && !policy?.retryFailed) issues.push("Failed job requires inspection and an explicit retry.");
    }
    selected.push({ clubId: id, name: source?.name || job?.club.name || id,
      briefId: brief?.id || null, referenceCount: brief?.referenceIds.length || 0,
      ready: issues.length === 0, blockers: issues });
  }
  if (batch && !selected.length) blockers.push("No pending covers for this provider in the selected batch.");
  const reservedUsd = state.ledger.reduce((n, e) => n + e.reservedUsd, 0);
  const requiredReservationUsd = validPolicy ? selected.length * policy.reserveUsd.image : null;
  if (validPolicy && selected.length) {
    if (reservedUsd + requiredReservationUsd > policy.budgetUsd + 1e-8) blockers.push("Budget reservations cannot cover the selected render attempts.");
    if (state.ledger.length + selected.length > policy.maxCalls) blockers.push("Paid call cap cannot cover the selected render attempts.");
  }
  const report = batch ? diversity(state, batch.ids.filter((id) => state.jobs[id])) : null;
  if (report?.collisions.length) warnings.push("Scene collisions need human review before spending.");
  if (report?.warnings.length) warnings.push("Review the batch diversity and sparse-source warnings.");
  return {
    scope: "Read-only readiness check. No API calls, state changes or spending authorization created.",
    readyForPaidRender: blockers.length === 0 && selected.length > 0 && selected.every((j) => j.ready),
    batchId: batch?.id || null,
    configuration: { credentialsConfigured, imageModel: model,
      quality: env.COVER_IMAGE_QUALITY || "medium", styleReference,
      textModelConfigured: Boolean(env.COVER_TEXT_MODEL), visionModelConfigured: Boolean(env.COVER_VISION_MODEL) },
    budget: { policyValid: validPolicy, reservedUsd, priorPaidCalls: state.ledger.length,
      requiredReservationUsd, note: "Reservations are not measured charges or guaranteed invoice caps." },
    selected, skipped, blockers, warnings, diversity: report,
  };
}

import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { sha, now, canUsePhoto, paidCall, saveState } from "./core.mjs";
import { captionPhoto } from "./providers.mjs";

async function* files(folder) {
  for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
    const p = path.join(folder, entry.name);
    if (entry.isDirectory()) yield* files(p);
    else if (entry.isFile() && /\.(jpe?g|png|webp)$/i.test(entry.name)) yield p;
  }
}
export async function indexPhotos(state, folder, { limit = 20 } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000)
    throw new Error("Invalid photo index limit");
  let scanned = 0,
    added = 0,
    duplicates = 0;
  const errors = [];
  for await (const p of files(path.resolve(folder))) {
    if (scanned >= limit) break;
    scanned++;
    try {
      const bytes = await fs.readFile(p),
        hash = sha(bytes),
        filename = path.basename(p);
      const prior = state.photos.find((p) => p.sha256 === hash);
      if (prior) {
        duplicates++;
        prior.path = p;
        prior.aliases = [...new Set([...(prior.aliases || []), filename])];
        continue;
      }
      const m = await sharp(bytes).metadata();
      state.photos.push({
        id: hash.slice(0, 24),
        filename,
        path: p,
        sha256: hash,
        width: m.width,
        height: m.height,
        format: m.format,
        orientation: m.orientation || null,
        density: m.density || null,
        hasExif: Boolean(m.exif),
        exifHash: m.exif ? sha(m.exif) : null,
        sourceUrl: null,
        rights: {
          status: "unknown",
          holder: "",
          evidence: "",
          aiProcessing: false,
          derivatives: false,
          commercial: false,
          reviewedBy: "",
          reviewedAt: null,
          expiresAt: null,
          attribution: "",
        },
        tags: filename
          .replace(/\.[^.]+$/, "")
          .replace(/\d+/g, " ")
          .split(/[^A-Za-z]+/)
          .filter((s) => s.length > 2)
          .map((s) => s.toLowerCase()),
        caption: null,
        captionModel: null,
        verifiedLandmark: null,
        metadataIndexedAt: now(),
        consideredBy: [],
        usedBy: [],
      });
      added++;
    } catch {
      errors.push({
        filename: path.basename(p),
        error: "Unreadable image; skipped",
      });
    }
  }
  return {
    scanned,
    added,
    duplicates,
    errors,
    scope: "Local metadata only; no photo uploaded or derivative generated",
  };
}
export function applyRights(state, updates) {
  if (!Array.isArray(updates) || !updates.length)
    throw new Error("Rights update must be a nonempty array");
  for (const update of updates) {
    const p = state.photos.find((p) => p.id === update.id);
    if (!p) throw new Error("Unknown photo ID");
    const r = update.rights;
    if (
      !r ||
      !r.holder?.trim() ||
      !r.evidence?.trim() ||
      !r.reviewedBy?.trim() ||
      !Number.isFinite(Date.parse(r.reviewedAt))
    )
      throw new Error(
        "Rights require holder, permission evidence, reviewer and review date",
      );
    if (
      !["aiProcessing", "derivatives", "commercial"].every(
        (k) => typeof r[k] === "boolean",
      )
    )
      throw new Error("Explicit rights scopes required");
    if (r.expiresAt && !Number.isFinite(Date.parse(r.expiresAt)))
      throw new Error("Invalid rights expiry date");
  }
  for (const u of updates) {
    const p = state.photos.find((p) => p.id === u.id);
    p.rights = structuredClone(u.rights);
    p.rights.status = canUsePhoto(p, "derivatives")
      ? "authorized_for_derivatives"
      : canUsePhoto(p, "indexing")
        ? "authorized_for_indexing"
        : "restricted";
  }
  return updates.length;
}
export async function captionPhotos(
  state,
  home,
  policy,
  {
    limit = 10,
    provider = captionPhoto,
    model = process.env.COVER_VISION_MODEL,
  } = {},
) {
  if (!model) throw new Error("Configure COVER_VISION_MODEL");
  const eligible = state.photos.filter(
    (p) =>
      canUsePhoto(p, "indexing") && !(p.caption && p.captionModel === model),
  );
  const result = {
    eligible: eligible.length,
    captioned: 0,
    blocked: state.photos.filter((p) => !canUsePhoto(p, "indexing")).length,
  };
  for (const p of eligible.slice(0, limit)) {
    const { value, usage } = await paidCall(
      state,
      home,
      policy,
      "vision",
      () => provider(p),
      { photoId: p.id, model },
    );
    if (
      typeof value.caption !== "string" ||
      !Array.isArray(value.tags) ||
      value.tags.length < 5 ||
      value.tags.length > 12 ||
      !value.tags.every((x) => typeof x === "string")
    )
      throw new Error("Invalid caption output");
    Object.assign(p, value, {
      captionModel: model,
      captionedAt: now(),
      captionUsage: usage,
      verifiedLandmark: null,
    });
    result.captioned++;
    await saveState(home, state);
  }
  return result;
}

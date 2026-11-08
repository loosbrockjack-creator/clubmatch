#!/usr/bin/env node
/**
 * Sync watercolor club covers from the image generator's output folder into
 * the site.
 *
 *   npm run covers:sync    one pass, then exit
 *   npm run covers:watch   one pass now, then another every 30 minutes
 *                          (override with COVERS_INTERVAL_MIN)
 *
 * Source: every image under COVERS_SOURCE (default: the ChatGPT project's
 * ClubMatch_Claude_Import_15 folder), including all "batch N" subfolders.
 * The "production" and "candidates" folders are skipped.
 *
 * Each filename must start with the club's ID ("1710-ab-terris.png"). The
 * image is converted to a quality-95 JPG at public/photos/clubs/<slug>.jpg,
 * then lib/club-covers.json is rewritten (newest first), which is what the
 * site reads. Nothing is ever deleted: to drop a cover, delete its JPG and
 * run a sync.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SOURCE =
  process.env.COVERS_SOURCE ??
  path.join(
    os.homedir(),
    ".codex/.chatgpt-projects/g-p-6aac5a6622e88191b7b32ef4c6b1e47b/ClubMatch_Claude_Import_15",
  );
const OUT_DIR = path.join(ROOT, "public/photos/clubs");
const MANIFEST = path.join(ROOT, "lib/club-covers.json");
const SKIP_DIRS = new Set(["production", "candidates"]);
const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;
/** A file modified more recently than this may still be mid-write. */
const SETTLE_MS = 3000;

const clubs = JSON.parse(fs.readFileSync(path.join(ROOT, "data/clubs.json"), "utf8"));
const slugById = new Map(clubs.map((c) => [String(c.id), c.slug]));
const validSlugs = new Set(clubs.map((c) => c.slug));
// Longest ID first, so "3529" wins over a hypothetical "35".
const ids = [...slugById.keys()].sort((a, b) => b.length - a.length);

function clubIdFor(base) {
  return ids.find((id) => base === id || base.startsWith(`${id}-`));
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(full, out);
    } else if (IMAGE_EXT.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

const warned = new Set();
function warnOnce(key, msg) {
  if (warned.has(key)) return;
  warned.add(key);
  console.log(msg);
}

function sync() {
  if (!fs.existsSync(SOURCE)) {
    console.log(`[covers] source folder not found: ${SOURCE}`);
    return;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Newest file wins when one club appears in more than one batch.
  const pick = new Map();
  for (const file of walk(SOURCE)) {
    const base = path.basename(file).replace(IMAGE_EXT, "");
    const id = clubIdFor(base);
    if (!id) {
      warnOnce(file, `[covers] no club ID matches: ${path.relative(SOURCE, file)}`);
      continue;
    }
    const stat = fs.statSync(file);
    const prev = pick.get(id);
    if (!prev || stat.mtimeMs > prev.mtimeMs) pick.set(id, { file, mtimeMs: stat.mtimeMs });
  }

  let converted = 0;
  let failed = 0;
  const now = Date.now();
  for (const [id, { file, mtimeMs }] of pick) {
    if (now - mtimeMs < SETTLE_MS) continue; // still being written; next pass
    const target = path.join(OUT_DIR, `${slugById.get(id)}.jpg`);
    const targetMtime = fs.existsSync(target) ? fs.statSync(target).mtimeMs : 0;
    if (targetMtime >= mtimeMs) continue;
    try {
      execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "95", file, "--out", target], {
        stdio: "ignore",
      });
      converted++;
    } catch {
      failed++;
      console.log(`[covers] FAILED to convert ${path.relative(SOURCE, file)}`);
    }
  }

  // Manifest = every cover actually on disk, newest first.
  const covers = fs
    .readdirSync(OUT_DIR)
    .filter((f) => f.endsWith(".jpg") && validSlugs.has(f.slice(0, -4)))
    .map((f) => ({ slug: f.slice(0, -4), mtime: fs.statSync(path.join(OUT_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime || a.slug.localeCompare(b.slug))
    .map((c) => c.slug);
  const next = JSON.stringify(covers, null, 2) + "\n";
  const current = fs.existsSync(MANIFEST) ? fs.readFileSync(MANIFEST, "utf8") : "";
  if (next !== current) fs.writeFileSync(MANIFEST, next);

  if (converted || failed || next !== current) {
    const stamp = new Date().toLocaleTimeString();
    console.log(
      `[covers ${stamp}] +${converted} converted, ${failed} failed, ${covers.length} covers on site`,
    );
  }
}

sync();

if (process.argv.includes("--watch")) {
  // A plain timer rather than a file watcher: covers arrive in batches, and a
  // half-hourly pass is plenty for review on localhost.
  const INTERVAL_MIN = Number(process.env.COVERS_INTERVAL_MIN ?? 30);
  console.log(`[covers] checking ${SOURCE} every ${INTERVAL_MIN} min`);
  setInterval(sync, INTERVAL_MIN * 60_000);
}

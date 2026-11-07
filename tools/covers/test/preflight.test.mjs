import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { REPO, emptyState, ingest, addBrief, deterministicRecipe, activeBrief,
  review, generate, sha, saveState } from "../core.mjs";
import { preflight } from "../preflight.mjs";
import { mockImageProvider } from "../providers.mjs";

const club = { id: "a", name: "Paper Club", slug: "paper-club",
  summary: "Students learn paper folding.", categories: ["Design"], stuorgUrl: "https://www.stuorg.iastate.edu/a" };
const policy = { allowPaid: true, budgetUsd: 5, maxCalls: 5, reserveUsd: { image: 1 } };
const options = { policy, limit: 3, env: { OPENAI_API_KEY: "synthetic-secret-never-send" } };
function setup(records = [club]) {
  const state = emptyState();
  ingest(state, records, records.map((c) => c.id));
  for (const c of records.filter((c) => !c.greek)) addBrief(state, c.id, deterministicRecipe(c));
  return state;
}
function approve(state, id = "a") {
  review(state, id, "approve_brief", { briefId: activeBrief(state.jobs[id]).id, reviewer: "Fixture reviewer" });
}
async function temp(t) {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "cover-preflight-"));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  return home;
}

test("preflight reports preserved mock blockers without changing state or leaking credentials", async (t) => {
  const home = await temp(t), state = setup();
  await generate(state, home, "a", mockImageProvider);
  const before = JSON.stringify(state);
  const result = await preflight(state, [club], options);
  assert.equal(result.readyForPaidRender, false);
  assert.match(result.selected[0].blockers.join(" "), /brief approval/);
  assert.match(result.selected[0].blockers.join(" "), /regeneration/);
  assert.equal(JSON.stringify(state), before);
  assert.equal(JSON.stringify(result).includes(options.env.OPENAI_API_KEY), false);
  assert.equal(state.ledger.length, 0);
});

test("style-only readiness requires credentials, explicit policy, current source, and sufficient reservations", async () => {
  const state = setup();
  approve(state);
  const ready = await preflight(state, [club], options);
  assert.equal(ready.readyForPaidRender, true);
  assert.equal(ready.selected[0].referenceCount, 0);
  assert.equal(ready.budget.requiredReservationUsd, 1);
  assert.equal(ready.configuration.textModelConfigured, false);
  assert.equal(ready.configuration.visionModelConfigured, false);
  assert.equal((await preflight(state, [club], { ...options, env: {} })).readyForPaidRender, false);
  assert.equal((await preflight(state, [club], { ...options, policy: { ...policy, allowPaid: false } })).readyForPaidRender, false);
  const stale = await preflight(state, [{ ...club, summary: "New description" }], options);
  assert.match(stale.selected[0].blockers.join(" "), /Source changed/);
  assert.equal(stale.readyForPaidRender, false);
  state.ledger.push({ reservedUsd: 5, status: "failed_or_unknown" });
  const spent = await preflight(state, [club], options);
  assert.equal(spent.readyForPaidRender, false);
  assert.match(spent.blockers.join(" "), /Budget/);
});

test("preflight skips protected jobs and detects changed or revoked reference files before a proposed run", async (t) => {
  const home = await temp(t), greek = { ...club, id: "greek", greek: { kind: "fraternity" } };
  const state = setup([club, greek]);
  const photoPath = path.join(home, "reference.png");
  const bytes = await sharp({ create: { width: 100, height: 100, channels: 3, background: "#abc" } }).png().toBuffer();
  await fs.writeFile(photoPath, bytes);
  const photo = { id: "reference", path: photoPath, sha256: sha(bytes), rights: {
    evidence: "Synthetic fixture", holder: "Test", reviewedBy: "Tester", reviewedAt: new Date().toISOString(),
    aiProcessing: true, derivatives: true, commercial: true,
  } };
  state.photos.push(photo);
  addBrief(state, "a", deterministicRecipe(club), "fixture", [photo]);
  approve(state);
  const ready = await preflight(state, [club, greek], options);
  assert.equal(ready.readyForPaidRender, true);
  assert.equal(ready.skipped[0].clubId, "greek");
  await fs.writeFile(photoPath, "changed file");
  const changed = await preflight(state, [club, greek], options);
  assert.equal(changed.readyForPaidRender, false);
  assert.match(changed.selected[0].blockers.join(" "), /bytes changed/);
  photo.rights.derivatives = false;
  assert.match((await preflight(state, [club, greek], options)).selected[0].blockers.join(" "), /permissions/);
});

test("CLI preflight is read-only even for absent homes; an existing pilot file is byte-for-byte unchanged", async (t) => {
  const home = await temp(t), run = promisify(execFile);
  const cli = path.join(REPO, "tools/covers/cli.mjs");
  const missing = path.join(home, "absent");
  await assert.rejects(run(process.execPath, [cli, "preflight", "--home", missing]), (e) => {
    assert.equal(e.code, 1);
    assert.equal(JSON.parse(e.stdout).readyForPaidRender, false);
    return true;
  });
  await assert.rejects(fs.access(missing), { code: "ENOENT" });
  await saveState(home, setup());
  const before = await fs.readFile(path.join(home, "state.json"));
  await assert.rejects(run(process.execPath, [cli, "preflight", "--home", home]), { code: 1 });
  assert.deepEqual(await fs.readFile(path.join(home, "state.json")), before);
});

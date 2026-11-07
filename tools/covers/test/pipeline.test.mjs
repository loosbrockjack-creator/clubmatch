import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import {
  emptyState,
  clubs,
  ingest,
  activeBrief,
  deterministicRecipe,
  addBrief,
  diversity,
  generate,
  review,
  exportApproved,
  exportable,
  paidCall,
  canUsePhoto,
  searchPhotos,
  withStore,
  readState,
  sourceHash,
  imageHash,
  distance,
  validateRecipe,
} from "../core.mjs";
import { pilotRecipes } from "../pilot.mjs";
import {
  mockImageProvider,
  openaiImageProvider,
  structuredResponse,
} from "../providers.mjs";
import { indexPhotos, applyRights, captionPhotos } from "../photos.mjs";
import { serve } from "../server.mjs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { REPO } from "../core.mjs";

const temp = async (t) => {
  const p = await fs.mkdtemp(path.join(os.tmpdir(), "clubmatch-test-"));
  t.after(() => fs.rm(p, { recursive: true, force: true }));
  return p;
};
const record = {
  id: "a",
  name: "Paper Club",
  slug: "paper-club",
  summary: "Students learn paper folding.",
  categories: ["Design"],
  stuorgUrl: "https://www.stuorg.iastate.edu/a",
};
function setup(records = [record], ids = records.map((c) => c.id)) {
  const s = emptyState();
  ingest(s, records, ids);
  for (const id of ids)
    if (!s.jobs[id].frozen)
      addBrief(s, id, deterministicRecipe(s.jobs[id].club));
  return s;
}
const approveBrief = (s, id = "a") =>
  review(s, id, "approve_brief", {
    briefId: activeBrief(s.jobs[id]).id,
    reviewer: "Test reviewer",
  });
const approve = (s, c, id = "a") =>
  review(s, id, "approve", {
    candidateId: c.id,
    reviewer: "Test reviewer",
    scores: [4, 4, 4, 4, 4, 4],
    acknowledged: true,
    note: "Synthetic fixture for lifecycle testing only.",
  });
const policy = {
  allowPaid: true,
  budgetUsd: 2,
  maxCalls: 2,
  reserveUsd: { image: 1, text: 0.1, vision: 0.1 },
};
const synthetic = async (color) =>
  sharp({
    create: { width: 1200, height: 900, channels: 3, background: color },
  })
    .png()
    .toBuffer();

test("actual pilot uses 20 stable IDs, exact evidence and varied recipes; freezes all 59 chapters", async () => {
  const records = await clubs(),
    s = setup(
      records,
      pilotRecipes.map((p) => p.id),
    );
  assert.equal(Object.values(s.jobs).filter((j) => j.frozen).length, 59);
  const report = diversity(
    s,
    pilotRecipes.map((p) => p.id),
  );
  assert.equal(report.total, 20);
  assert.equal(report.collisions.length, 0);
  assert.equal(report.genericTableFraction, 0);
  assert.deepEqual(report.shotTypes, {
    object_closeup: 5,
    people_action: 6,
    symbolic: 2,
    environment: 4,
    community: 3,
  });
  assert(
    activeBrief(s.jobs.voice).recipe.avoid.some((x) => x.includes("clinical")),
  );
  assert.throws(() => ingest(s, records, ["2541", "2541"]), /Duplicate/);
  assert.throws(() => ingest(s, records, ["unknown"]), /Unknown/);
});
test("thin and missing source data use safe symbolic fallback; fabricated grounding rejected", () => {
  const c = { ...record, summary: "" },
    r = deterministicRecipe(c);
  assert.equal(r.shot_type, "symbolic");
  assert.equal(r.people_count, 0);
  assert.equal(r.grounding_confidence, "low");
  assert.throws(
    () =>
      validateRecipe({ ...r, grounded_evidence: ["A fabricated award"] }, c),
    /exactly/,
  );
  assert.throws(() => validateRecipe({ ...r, people_count: NaN }, c), /People/);
});
test("frozen Greek jobs cannot be planned, rendered, approved or exported", async (t) => {
  const home = await temp(t),
    c = {
      ...record,
      id: "greek",
      greek: { kind: "fraternity", photo: "/photos/existing.jpg" },
    },
    s = setup([c]);
  assert.throws(() => addBrief(s, c.id, deterministicRecipe(c)), /Frozen/);
  await assert.rejects(generate(s, home, c.id, mockImageProvider), /Frozen/);
  assert.throws(
    () => review(s, c.id, "approve", { reviewer: "Tester" }),
    /frozen/,
  );
  assert.equal((await exportApproved(s, home)).count, 0);
});
test("mock run resumes without duplicate images; mock approval and export are blocked", async (t) => {
  const home = await temp(t),
    s = setup();
  const c = await generate(s, home, "a", mockImageProvider);
  const again = await generate(s, home, "a", mockImageProvider);
  assert.equal(again.skipped, "existing candidate");
  assert.equal(s.jobs.a.candidates.length, 1);
  assert.equal(c.width / c.height, 4 / 3);
  assert.equal(s.ledger.length, 0);
  approveBrief(s);
  assert.throws(() => approve(s, c), /Test graphics/);
  assert.equal((await exportApproved(s, home)).count, 0);
});
test("small CLI render runs advance to pending clubs and full metadata indexing accepts 429 limit", async (t) => {
  const home = await temp(t),
    ids = path.join(home, "ids.json"),
    cli = path.join(REPO, "tools/covers/cli.mjs"),
    run = promisify(execFile);
  await fs.writeFile(ids, JSON.stringify(["2541", "3015", "voice"]));
  await run(process.execPath, [cli, "plan", "--home", home, "--ids", ids]);
  for (let i = 0; i < 2; i++)
    await run(process.execPath, [
      cli,
      "render",
      "--home",
      home,
      "--limit",
      "1",
    ]);
  const s = await readState(home);
  assert.equal(s.jobs["2541"].candidates.length, 1);
  assert.equal(s.jobs["3015"].candidates.length, 1);
  assert.equal(s.jobs.voice.candidates.length, 0);
  const folder = path.join(home, "photos");
  await fs.mkdir(folder);
  await fs.writeFile(path.join(folder, "sample.png"), await synthetic("#acd"));
  await run(process.execPath, [
    cli,
    "index",
    "--home",
    home,
    "--folder",
    folder,
    "--limit",
    "429",
  ]);
  assert.equal((await readState(home)).photos.length, 1);
});
test("explicit budget, call cap and brief approval gate every paid request", async (t) => {
  const home = await temp(t),
    s = setup();
  let calls = 0;
  const p = {
    name: "paid-fixture",
    paid: true,
    generate: async () => {
      calls++;
      return { bytes: await synthetic("#abc"), mock: false };
    },
  };
  await assert.rejects(generate(s, home, "a", p), /disabled/);
  assert.equal(calls, 0);
  await assert.rejects(generate(s, home, "a", p, policy), /brief approval/);
  assert.equal(calls, 0);
  approveBrief(s);
  await generate(s, home, "a", p, policy);
  assert.equal(calls, 1);
  assert.equal(s.ledger.length, 1);
  assert.equal(s.ledger[0].status, "completed");
});
test("failed/unknown paid calls keep reservations across restarts and cannot retry indefinitely", async (t) => {
  const home = await temp(t),
    s = setup();
  let calls = 0;
  const fail = () => {
    calls++;
    throw new Error("Simulated timeout");
  };
  await assert.rejects(paidCall(s, home, policy, "image", fail), /timeout/);
  const resumed = await readState(home);
  assert.equal(resumed.ledger[0].status, "failed_or_unknown");
  await assert.rejects(
    paidCall(resumed, home, policy, "image", fail),
    /retry-failed/,
  );
  await assert.rejects(
    paidCall(resumed, home, { ...policy, retryFailed: true }, "image", fail),
    /timeout/,
  );
  await assert.rejects(
    paidCall(resumed, home, { ...policy, retryFailed: true }, "image", fail),
    /limit/,
  );
  assert.equal(calls, 2);
});
test("retry limit counts rendering failures, and a kept club stays untouched", async (t) => {
  const home = await temp(t),
    s = setup();
  const fail = {
    name: "failing-fixture",
    paid: false,
    generate: async () => {
      throw new Error("fixture failure");
    },
  };
  await assert.rejects(generate(s, home, "a", fail), /failure/);
  await assert.rejects(generate(s, home, "a", fail), /retry-failed/);
  for (let i = 1; i < 3; i++)
    await assert.rejects(
      generate(s, home, "a", fail, { retryFailed: true }),
      /failure/,
    );
  await assert.rejects(generate(s, home, "a", fail), /Retry limit/);
  review(s, "a", "keep_existing", { reviewer: "Tester" });
  await assert.rejects(generate(s, home, "a", mockImageProvider), /kept/);
});
test("human approval, asset hash, current source and later revocation control export", async (t) => {
  const home = await temp(t),
    s = setup();
  approveBrief(s);
  const p = {
    name: "synthetic-lifecycle-fixture",
    paid: false,
    generate: async () => ({ bytes: await synthetic("#c43"), mock: false }),
  };
  const c = await generate(s, home, "a", p);
  assert.equal(exportable(s, s.jobs.a), false);
  assert.throws(
    () =>
      review(s, "a", "approve", {
        candidateId: c.id,
        reviewer: "Tester",
        scores: [2, 4, 4, 4, 4, 4],
        acknowledged: true,
      }),
    /scores/,
  );
  approve(s, c);
  assert.equal((await exportApproved(s, home)).count, 1);
  review(s, "a", "regenerate", {
    candidateId: c.id,
    reviewer: "Tester",
    note: "Revise the image for source accuracy",
  });
  assert.equal((await exportApproved(s, home)).count, 0);
  approve(s, c);
  const updated = { ...record, summary: "A new source description." };
  ingest(s, [updated], ["a"]);
  assert.notEqual(c.sourceHash, sourceHash(updated));
  assert.equal(exportable(s, s.jobs.a), false);
});
test("versioning keeps an approved older image while a replacement awaits review", async (t) => {
  const home = await temp(t),
    s = setup();
  approveBrief(s);
  const p = {
    name: "synthetic-fixture",
    paid: false,
    generate: async () => ({ bytes: await synthetic("#9ac"), mock: false }),
  };
  const c = await generate(s, home, "a", p);
  approve(s, c);
  addBrief(s, "a", {
    ...deterministicRecipe(record),
    framing: "different angle",
  });
  approveBrief(s);
  await generate(s, home, "a", {
    ...p,
    generate: async () => ({ bytes: await synthetic("#89a"), mock: false }),
  });
  assert.equal(s.jobs.a.candidates.length, 2);
  assert.equal(s.jobs.a.approvedCandidate, c.id);
  assert.equal(exportable(s, s.jobs.a), true);
  await fs.writeFile(path.join(home, "assets", c.id + ".webp"), "corrupted");
  await assert.rejects(exportApproved(s, home), /hash mismatch/);
});
test("a regeneration passes reviewer feedback through to the next candidate", async (t) => {
  const home = await temp(t),
    s = setup();
  let attempt = 0,
    received = "";
  const p = {
    name: "revision-fixture",
    paid: false,
    generate: async ({ revisionNote }) => {
      received = revisionNote;
      return {
        bytes: await synthetic(attempt++ ? "#567" : "#123"),
        mock: false,
      };
    },
  };
  const c = await generate(s, home, "a", p);
  review(s, "a", "regenerate", {
    candidateId: c.id,
    reviewer: "Tester",
    note: "Use a wider composition and fewer background objects.",
  });
  const revised = await generate(s, home, "a", p);
  assert.equal(
    received,
    "Use a wider composition and fewer background objects.",
  );
  assert.equal(revised.revisionNote, received);
});
test("metadata indexing deduplicates and photo permissions gate retrieval and captioning", async (t) => {
  const home = await temp(t),
    folder = path.join(home, "photos");
  await fs.mkdir(folder);
  await fs.writeFile(
    path.join(folder, "spring_campanile.png"),
    await synthetic("#dce"),
  );
  const s = emptyState();
  assert.equal((await indexPhotos(s, folder)).added, 1);
  assert.equal((await indexPhotos(s, folder)).duplicates, 1);
  assert.equal(searchPhotos(s, "campanile").length, 1);
  assert.equal(
    searchPhotos(s, "campanile", { scope: "derivatives" }).length,
    0,
  );
  let calls = 0;
  const provider = async () => {
    calls++;
    return {
      value: {
        caption: "A synthetic sample",
        tags: ["campus", "spring", "tree", "path", "cream"],
      },
    };
  };
  await captionPhotos(s, home, policy, { provider, model: "fixture" });
  assert.equal(calls, 0);
  assert.throws(
    () =>
      applyRights(s, [{ id: s.photos[0].id, rights: { aiProcessing: true } }]),
    /require/,
  );
  applyRights(s, [
    {
      id: s.photos[0].id,
      rights: {
        holder: "Synthetic fixture owner",
        evidence: "Synthetic test image created in test process",
        reviewedBy: "Test reviewer",
        reviewedAt: new Date().toISOString(),
        aiProcessing: true,
        derivatives: false,
        commercial: false,
      },
    },
  ]);
  assert.equal(canUsePhoto(s.photos[0], "indexing"), true);
  assert.equal(canUsePhoto(s.photos[0], "derivatives"), false);
  await captionPhotos(s, home, policy, { provider, model: "fixture" });
  await captionPhotos(s, home, policy, { provider, model: "fixture" });
  assert.equal(calls, 1);
  s.photos[0].rights.expiresAt = "2000-01-01";
  assert.equal(canUsePhoto(s.photos[0], "indexing"), false);
});
test("unauthorized references cannot enter a brief; later revocation blocks export", async (t) => {
  const home = await temp(t),
    s = setup(),
    p = { id: "photo", filename: "campus.jpg", rights: {} };
  s.photos = [p];
  assert.throws(
    () => addBrief(s, "a", deterministicRecipe(record), "fixture", [p]),
    /permission/,
  );
  p.rights = {
    holder: "Fixture",
    evidence: "Synthetic test permission",
    reviewedBy: "Tester",
    reviewedAt: new Date().toISOString(),
    aiProcessing: true,
    derivatives: true,
    commercial: true,
  };
  addBrief(s, "a", deterministicRecipe(record), "fixture", [p]);
  approveBrief(s);
  const c = await generate(s, home, "a", {
    name: "synthetic-fixture",
    paid: false,
    generate: async () => ({ bytes: await synthetic("#deb"), mock: false }),
  });
  approve(s, c);
  assert.equal(exportable(s, s.jobs.a), true);
  p.rights.derivatives = false;
  assert.equal(exportable(s, s.jobs.a), false);
});
test("perceptual hashes compare actual pixels; similarity remains a warning", async () => {
  const a = await imageHash(await synthetic("#abc"));
  assert.equal(distance(a, a), 0);
  assert.equal(distance("0000000000000000", "ffffffffffffffff"), 64);
});
test("structured text and reference-image adapters construct documented API requests without network", async () => {
  const result = await structuredResponse(
    {
      model: "test",
      instructions: "test",
      input: "test",
      schema: { type: "object" },
      name: "test",
    },
    async (endpoint, body) => {
      assert.equal(endpoint, "responses");
      assert.equal(body.store, false);
      assert.equal(body.text.format.type, "json_schema");
      return {
        status: "completed",
        output: [
          { content: [{ type: "output_text", text: '{"valid":true}' }] },
        ],
      };
    },
  );
  assert.deepEqual(result.value, { valid: true });
  const provider = openaiImageProvider(async (endpoint, form, options) => {
    assert.equal(endpoint, "images/edits");
    assert.equal(options.multipart, true);
    assert.equal(form.get("n"), "1");
    assert.equal(form.get("size"), "1536x1152");
    assert.equal(form.getAll("image[]").length, 1);
    return {
      data: [{ b64_json: Buffer.from("fixture").toString("base64") }],
      usage: { total_tokens: 1 },
    };
  });
  const r = await provider.generate({
    club: record,
    brief: { recipe: deterministicRecipe(record) },
    style: "test",
    references: [],
  });
  assert.equal(r.bytes.toString(), "fixture");
});
test("store lock prevents concurrent writers and saves atomic state", async (t) => {
  const home = await temp(t);
  let release, entered;
  const ready = new Promise((r) => (entered = r)),
    gate = new Promise((r) => (release = r));
  const first = withStore(home, async (s) => {
    entered();
    await gate;
    s.events.push({ type: "first" });
  });
  await ready;
  await assert.rejects(
    withStore(home, async () => {}),
    /Another/,
  );
  release();
  await first;
  assert.equal((await readState(home)).events.length, 1);
});
test("studio only accepts local nonce-protected writes; stale revisions cannot approve", async (t) => {
  const home = await temp(t);
  await withStore(home, async (s) => Object.assign(s, setup()));
  const port = 45000 + Math.floor(Math.random() * 10000),
    server = serve(home, port);
  await new Promise((r) => server.once("listening", r));
  t.after(() => new Promise((r) => server.close(r)));
  const origin = `http://127.0.0.1:${port}`;
  const state = await fetch(origin + "/api/state").then((r) => r.json());
  const response = await fetch(origin + "/api/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "export" }),
  });
  assert.equal(response.status, 403);
  const stale = await fetch(origin + "/api/review", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "X-Studio-Token": state.token,
    },
    body: JSON.stringify({ revision: -1, action: "export" }),
  });
  assert.equal(stale.status, 400);
  const accepted = await fetch(origin + "/api/review", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "X-Studio-Token": state.token,
    },
    body: JSON.stringify({
      revision: state.state.revision,
      clubId: "a",
      action: "approve_brief",
      briefId: activeBrief(state.state.jobs.a).id,
      reviewer: "UI test reviewer",
    }),
  });
  assert.equal(accepted.status, 200);
  assert.equal(
    activeBrief((await readState(home)).jobs.a).approved.reviewer,
    "UI test reviewer",
  );
  const asset = await fetch(
    origin + "/asset/00000000-0000-0000-0000-000000000000",
  );
  assert.equal(asset.status, 404);
});

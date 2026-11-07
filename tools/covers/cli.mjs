#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  DEFAULT_HOME,
  clubs,
  ingest,
  withStore,
  saveState,
  activeBrief,
  deterministicRecipe,
  addBrief,
  diversity,
  generate,
  searchPhotos,
  paidCall,
  exportApproved,
  readState,
  requirePaid,
  now,
} from "./core.mjs";
import { pilotRecipes } from "./pilot.mjs";
import {
  mockImageProvider,
  openaiImageProvider,
  textProvider,
  visualQA,
} from "./providers.mjs";
import { indexPhotos, applyRights, captionPhotos } from "./photos.mjs";
import { serve } from "./server.mjs";
import { preflight } from "./preflight.mjs";

const {
  values: v,
  positionals: [command = "help"],
} = parseArgs({
  allowPositionals: true,
  options: {
    home: { type: "string" },
    ids: { type: "string" },
    provider: { type: "string" },
    batch: { type: "string" },
    folder: { type: "string" },
    file: { type: "string" },
    query: { type: "string" },
    scope: { type: "string" },
    limit: { type: "string" },
    port: { type: "string" },
    "allow-paid": { type: "boolean" },
    "retry-failed": { type: "boolean" },
    "budget-usd": { type: "string" },
    "max-paid-calls": { type: "string" },
    "image-reserve-usd": { type: "string" },
    "text-reserve-usd": { type: "string" },
    "vision-reserve-usd": { type: "string" },
    "with-references": { type: "boolean" },
  },
});
const home = path.resolve(v.home || DEFAULT_HOME);
const policy = {
  allowPaid: v["allow-paid"] === true,
  retryFailed: v["retry-failed"] === true,
  budgetUsd: Number(v["budget-usd"] || 0),
  maxCalls: Number(v["max-paid-calls"] || 0),
  reserveUsd: {
    image: Number(v["image-reserve-usd"] || 1),
    text: Number(v["text-reserve-usd"] || 0.1),
    vision: Number(v["vision-reserve-usd"] || 0.1),
  },
};
const batchFor = (s) => {
  const b = v.batch
    ? s.batches.find((b) => b.id === v.batch)
    : s.batches.at(-1);
  if (!b) throw new Error("No batch: run plan first");
  return b;
};
const limit = Number(v.limit || 20);
const log = (x) => console.log(JSON.stringify(x, null, 2));
async function main() {
  const maxLimit = command === "index" ? 1000 : 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit)
    throw new Error(`--limit must be 1–${maxLimit} for ${command}`);
  if (command === "help") {
    console.log(
      "Cover Studio (local, no production writes)\nCommands: plan, preflight, render, qa, index, rights, caption, search, status, recover, export, serve\nDefault: deterministic briefs and diagnostic test images, no paid calls. Read tools/covers/README.md before real generation.",
    );
    return;
  }
  if (command === "serve") {
    serve(home, Number(v.port || 4317));
    return;
  }
  if (command === "preflight") {
    const result = await preflight(await readState(home), await clubs(), {
      batchId: v.batch, limit, policy,
    });
    log(result);
    if (!result.readyForPaidRender) process.exitCode = 1;
    return;
  }
  if (command === "status") {
    const s = await readState(home);
    log({
      home,
      revision: s.revision,
      batches: s.batches,
      briefs: Object.values(s.jobs).filter(activeBrief).length,
      frozen: Object.values(s.jobs).filter((j) => j.frozen).length,
      realCandidates: Object.values(s.jobs)
        .flatMap((j) => j.candidates)
        .filter((c) => !c.mock).length,
      photos: s.photos.length,
      paidCalls: s.ledger.length,
      reservedUsd: s.ledger.reduce((a, b) => a + b.reservedUsd, 0),
      credentialsConfigured: Boolean(process.env.OPENAI_API_KEY),
      textModel: process.env.COVER_TEXT_MODEL || null,
      imageModel: process.env.COVER_IMAGE_MODEL || "gpt-image-2.5-flare",
      visionModel: process.env.COVER_VISION_MODEL || null,
    });
    return;
  }
  if (command === "search") {
    log(
      searchPhotos(await readState(home), v.query || "", {
        scope: v.scope || "metadata",
      }).map((p) => ({
        id: p.id,
        filename: p.filename,
        caption: p.caption,
        rights: p.rights,
        score: p.score,
      })),
    );
    return;
  }
  if (
    ["render", "qa", "caption"].includes(command) &&
    (command !== "render" || v.provider === "openai")
  )
    requirePaid(policy, command === "render" ? "image" : "vision");
  if (command === "plan" && v.provider === "openai")
    requirePaid(policy, "text");
  if (
    (["qa", "caption"].includes(command) ||
      (["plan", "render"].includes(command) && v.provider === "openai")) &&
    !process.env.OPENAI_API_KEY
  )
    throw new Error(
      "OPENAI_API_KEY is not configured. No paid request was made.",
    );
  if (
    command === "plan" &&
    v.provider === "openai" &&
    !process.env.COVER_TEXT_MODEL
  )
    throw new Error("Configure COVER_TEXT_MODEL before paid planning.");
  if (["qa", "caption"].includes(command) && !process.env.COVER_VISION_MODEL)
    throw new Error("Configure COVER_VISION_MODEL before paid vision calls.");
  await withStore(home, async (state) => {
    if (command === "plan") {
      const records = await clubs();
      const ids = v.ids
        ? JSON.parse(await fs.readFile(v.ids, "utf8"))
        : pilotRecipes.map((p) => p.id);
      const batch = ingest(state, records, ids);
      for (const id of batch.ids) {
        const j = state.jobs[id];
        if (
          j.frozen ||
          j.status === "keep_existing" ||
          activeBrief(j)?.sourceHash === j.sourceHash
        )
          continue;
        const refs = v["with-references"]
          ? searchPhotos(
              state,
              j.club.name + " " + j.club.categories.join(" "),
              { scope: "derivatives" },
            )
          : [];
        let recipe;
        if (v.provider === "openai") {
          const recent = Object.values(state.jobs)
            .map(activeBrief)
            .filter(Boolean)
            .map((b) => b.recipe);
          const result = await paidCall(
            state,
            home,
            policy,
            "text",
            () => textProvider.plan(j.club, recent, refs),
            { clubId: id, model: process.env.COVER_TEXT_MODEL },
          );
          recipe = result.value;
        } else {
          if (v.provider && v.provider !== "deterministic")
            throw new Error("Unknown text provider");
          recipe = deterministicRecipe(j.club, batch.ids.indexOf(id));
        }
        addBrief(state, id, recipe, v.provider || "deterministic", refs);
        await saveState(home, state);
      }
      const report = diversity(state, batch.ids);
      await fs.writeFile(
        path.join(home, "diversity.json"),
        JSON.stringify(report, null, 2),
      );
      log({
        batch,
        report,
        mode: v.provider || "deterministic (not AI-generated)",
      });
    } else if (command === "render") {
      if (v.provider && !["mock", "openai"].includes(v.provider))
        throw new Error("Unknown image provider");
      const provider =
        v.provider === "openai" ? openaiImageProvider() : mockImageProvider;
      const batch = batchFor(state);
      const results = [];
      let processed = 0;
      for (const id of batch.ids) {
        if (processed >= limit) break;
        const j = state.jobs[id];
        if (j.frozen || j.status === "keep_existing") {
          results.push({ id, skipped: "keep_existing" });
          continue;
        }
        try {
          const r = await generate(state, home, id, provider, policy);
          results.push({
            id,
            candidateId: r.id || r.candidate?.id,
            skipped: r.skipped || null,
            mock: r.mock ?? r.candidate?.mock,
          });
          if (!r.skipped) processed++;
        } catch (e) {
          processed++;
          results.push({ id, error: e.message });
          if (provider.paid) break;
        }
      }
      log(results);
      if (results.some((r) => r.error)) process.exitCode = 1;
    } else if (command === "qa") {
      let count = 0;
      for (const id of batchFor(state).ids)
        for (const c of state.jobs[id].candidates) {
          if (count >= limit || c.mock || c.qa.visual === "completed") continue;
          const { value, usage } = await paidCall(
            state,
            home,
            policy,
            "vision",
            () => visualQA(state.jobs[id], c, home),
            {
              clubId: id,
              candidateId: c.id,
              model: process.env.COVER_VISION_MODEL,
            },
          );
          if (!Array.isArray(value.flags) || typeof value.hold !== "boolean")
            throw new Error("Invalid visual QA output");
          c.qa.visual = "completed";
          c.qa.visualHold = value.hold;
          c.qa.flags.push(...value.flags);
          c.qa.summary = value.summary;
          c.qa.usage = usage;
          count++;
          await saveState(home, state);
        }
      log({ screened: count });
    } else if (command === "index") {
      if (!v.folder)
        throw new Error("--folder required (extract ZIP locally first)");
      log(await indexPhotos(state, v.folder, { limit }));
    } else if (command === "rights") {
      if (!v.file) throw new Error("--file rights.json required");
      log({
        updated: applyRights(
          state,
          JSON.parse(await fs.readFile(v.file, "utf8")),
        ),
      });
    } else if (command === "caption")
      log(await captionPhotos(state, home, policy, { limit }));
    else if (command === "export") log(await exportApproved(state, home));
    else if (command === "recover") {
      const recovered = [];
      for (const j of Object.values(state.jobs))
        if (j.status === "generating") {
          j.status = "blocked";
          j.failures ||= [];
          j.failures.push({
            at: now(),
            briefId: j.activeBrief,
            message:
              "Interrupted request; result/cost unknown. Review provider dashboard before requesting retry.",
          });
          recovered.push(j.club.id);
        }
      log({ recovered });
    } else throw new Error("Unknown command: " + command);
  });
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});

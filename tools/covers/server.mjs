import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import {
  REPO,
  readState,
  withStore,
  activeBrief,
  review,
  addBrief,
  diversity,
  searchPhotos,
  exportApproved,
} from "./core.mjs";

export function serve(home, port = 4317) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("Invalid studio port");
  const token = randomBytes(32).toString("hex"),
    origin = `http://127.0.0.1:${port}`;
  const json = (res, status, value) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(value));
  };
  const server = http.createServer(async (req, res) => {
    try {
      // Loopback only, strict Host and Origin, session nonce on every write.
      if (req.headers.host !== `127.0.0.1:${port}`) {
        json(res, 403, { error: "Use the loopback URL printed by the studio" });
        return;
      }
      const url = new URL(req.url, origin);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
      );
      if (req.method === "GET" && url.pathname === "/api/state") {
        const state = await readState(home);
        const batch = state.batches.at(-1);
        const ids = batch?.ids || [];
        // Never send filesystem paths, credentials or raw source-photo bytes to the browser.
        const safe = structuredClone(state);
        for (const p of safe.photos) delete p.path;
        json(res, 200, {
          state: safe,
          batch,
          diversity: diversity(state, ids),
          token,
        });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/photos") {
        const photos = searchPhotos(
          await readState(home),
          url.searchParams.get("q") || "",
          { scope: url.searchParams.get("scope") || "metadata" },
        ).map(({ path: local, ...p }) => {
          void local;
          return p;
        });
        json(res, 200, photos);
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/review") {
        if (
          req.headers.origin !== origin ||
          req.headers["x-studio-token"] !== token
        ) {
          json(res, 403, { error: "Refresh the local studio before saving" });
          return;
        }
        let body = "";
        for await (const part of req) {
          body += part;
          if (body.length > 100000) throw new Error("Request too large");
        }
        const data = JSON.parse(body);
        const result = await withStore(home, async (state) => {
          if (data.revision !== state.revision)
            throw new Error("State changed. Refresh before saving.");
          if (data.action === "export") return exportApproved(state, home);
          const j = state.jobs[data.clubId];
          if (!j) throw new Error("Unknown club");
          if (data.action === "edit_brief") {
            if (!data.reviewer?.trim())
              throw new Error("Reviewer name required");
            const prior = activeBrief(j);
            if (prior?.id !== data.briefId) throw new Error("Brief changed");
            addBrief(
              state,
              data.clubId,
              data.recipe,
              "human:" + data.reviewer,
              (prior?.referenceIds || []).map((id) =>
                state.photos.find((p) => p.id === id),
              ),
            );
            return { saved: true };
          }
          review(state, data.clubId, data.action, data);
          return { saved: true };
        });
        json(res, 200, result);
        return;
      }
      if (req.method !== "GET") {
        json(res, 405, { error: "Method not allowed" });
        return;
      }
      if (/^\/asset\/[a-f0-9-]{36}$/.test(url.pathname)) {
        const id = url.pathname.split("/").at(-1);
        const s = await readState(home);
        if (
          !Object.values(s.jobs).some((j) =>
            j.candidates.some((c) => c.id === id),
          )
        ) {
          json(res, 404, { error: "Unknown candidate" });
          return;
        }
        const bytes = await fs.readFile(
          path.join(home, "assets", id + ".webp"),
        );
        res.writeHead(200, {
          "Content-Type": "image/webp",
          "Cache-Control": "private, max-age=3600",
        });
        res.end(bytes);
        return;
      }
      const routes = {
        "/": ["web/index.html", "text/html"],
        "/studio.js": ["web/studio.js", "text/javascript"],
        "/studio.css": ["web/studio.css", "text/css"],
        "/style-reference.png": [
          "references/original-watercolor.png",
          "image/png",
        ],
        "/prototype-review.jpg": [
          "references/prototype-review.jpg",
          "image/jpeg",
        ],
      };
      const route = routes[url.pathname];
      if (!route) {
        json(res, 404, { error: "Not found" });
        return;
      }
      const bytes = await fs.readFile(
        path.join(REPO, "tools/covers", route[0]),
      );
      res.writeHead(200, {
        "Content-Type": route[1],
        "Cache-Control": "no-store",
      });
      res.end(bytes);
    } catch (e) {
      json(res, 400, { error: e.message });
    }
  });
  server.listen(port, "127.0.0.1", () =>
    console.log(
      `ClubMatch Cover Studio: ${origin}\nLocal review only. No paid calls or production writes from this interface.`,
    ),
  );
  return server;
}

const $ = (s) => document.querySelector(s);
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let snapshot,
  selected,
  version,
  reviewer = sessionStorage.getItem("cover-reviewer") || "";
let currentView = "review";
const tell = (message) => {
  $("#notice").textContent = message;
};
const statusLabel = (j) =>
  j.frozen ? "Protected · keep existing" : j.status.replaceAll("_", " ");
const briefOf = (j) => j.briefs.find((b) => b.id === j.activeBrief);
const chosen = (j) =>
  j.candidates.find((c) => c.id === version) || j.candidates.at(-1);
const badge = (j) =>
  `<span class="tag ${j.status === "approved" ? "good" : j.status === "blocked" ? "hold" : ""}">${e(statusLabel(j))}</span>`;
const scores = [
  "Relevance",
  "Originality",
  "Plausibility",
  "Art style",
  "Composition",
  "Technical quality",
];
function table(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${e(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((c) => `<td>${e(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
async function load() {
  const response = await fetch("/api/state");
  if (!response.ok) throw new Error("Could not load studio state");
  snapshot = await response.json();
  if (!selected || !snapshot.state.jobs[selected])
    selected = snapshot.batch?.ids[0];
  render();
}
function render() {
  const s = snapshot.state,
    ids = snapshot.batch?.ids || [],
    jobs = ids.map((id) => s.jobs[id]),
    candidates = jobs.flatMap((j) => j.candidates),
    reserved = s.ledger.reduce((sum, x) => sum + x.reservedUsd, 0);
  const metrics = [
    [ids.length, "clubs in this batch"],
    [jobs.filter(briefOf).length, "scene briefs planned"],
    [candidates.filter((c) => !c.mock).length, "real artwork candidates"],
    [
      Object.values(s.jobs).filter((j) => j.frozen).length,
      "Greek chapters protected",
    ],
    ["$" + reserved.toFixed(2), "reserved API budget"],
  ];
  $("#metrics").innerHTML = metrics
    .map(
      ([n, label]) =>
        `<div class="metric"><strong>${e(n)}</strong><span>${e(label)}</span></div>`,
    )
    .join("");
  queue();
  detail();
  preview();
  photos();
  activity();
}
function queue() {
  const query = $("#club-search").value.toLowerCase();
  $("#queue").innerHTML =
    (snapshot.batch?.ids || [])
      .map((id) => snapshot.state.jobs[id])
      .filter((j) => j.club.name.toLowerCase().includes(query))
      .map(
        (j) =>
          `<button class="queue-item" data-club="${e(j.club.id)}" aria-current="${j.club.id === selected}"><strong>${e(j.club.name)}</strong><small>${e(statusLabel(j))}${j.candidates.at(-1)?.mock ? " · test graphic" : ""}</small></button>`,
      )
      .join("") || '<p class="small">No matching clubs.</p>';
  document.querySelectorAll("[data-club]").forEach(
    (b) =>
      (b.onclick = () => {
        selected = b.dataset.club;
        version = null;
        queue();
        detail();
      }),
  );
}
function detail() {
  const j = snapshot.state.jobs[selected];
  if (!j) {
    $("#detail").innerHTML =
      '<div class="panel"><h2>Start a pilot</h2><p>Run <code>npm run covers:plan</code> to select the 20 source organizations.</p></div>';
    return;
  }
  const b = briefOf(j),
    r = b?.recipe,
    c = chosen(j),
    hold =
      c?.mock ||
      !c ||
      !b?.approved ||
      j.frozen ||
      j.status === "keep_existing" ||
      c.briefId !== b?.id;
  const collisions =
    snapshot.diversity.collisions.find((x) => x.clubId === j.club.id)
      ?.similar || [];
  const media = c
    ? `<img src="/asset/${e(c.id)}" alt="${e(c.mock ? "Diagnostic test graphic; no artwork generated" : "Candidate representative illustration for " + j.club.name)}"><div class="caption">${c.mock ? "TEST OUTPUT · Not artwork · Cannot approve or publish" : "Unpublished candidate · Representative illustration"} · 1200 × 900</div>`
    : '<div class="no-art"><strong>No artwork yet</strong><span>The scene comes first. Approve a brief before real rendering.</span></div>';
  $("#detail").innerHTML =
    `<div class="detail-head"><div><p class="eyebrow">${e(j.club.categories.slice(0, 2).join(" / "))} · ID ${e(j.club.id)}</p><h2>${e(j.club.name)}</h2><p class="small">${e(b?.provider === "deterministic" ? "Development recipe · not AI-generated" : "Brief provider: " + (b?.provider || "not planned"))}</p></div>${badge(j)}</div>
  <div class="detail-columns"><div><div class="panel candidate">${media}</div>
  <div class="panel"><h3>Original club description</h3><p class="source">${e(j.club.summary || "No description provided.")}</p>${j.club.stuorgUrl ? `<a class="small" href="${e(j.club.stuorgUrl)}" target="_blank" rel="noopener noreferrer">Official directory source ↗</a>` : ""}<p class="small">Source fingerprint: ${e(j.sourceHash.slice(0, 16))}</p></div>
  <div class="panel"><h3>Quality & provenance</h3>${c?.mock ? '<div class="warning">This graphic only tests file storage, versioning and review controls. It provides no evidence of watercolor quality.</div>' : ""}<ul>${(c?.qa.flags || ["No candidate to screen yet."]).map((f) => `<li>${e(f)}</li>`).join("")}</ul><p class="small">Automated visual screening: ${e(c?.qa.visual || "not run")}. A human must check anatomy, realism, style and recurring characters.</p><p class="small">Reference photos: ${e((b?.referenceIds || []).length)}. Rights: ${e(c?.rights.type || "No candidate")}.</p>${collisions.map((x) => `<p class="warning">Plan overlap with ${e(snapshot.state.jobs[x.clubId]?.club.name)}: ${e(x.reason)}</p>`).join("")}${(c?.qa.similar || []).map((x) => `<div class="similar"><img src="/asset/${e(x.candidateId)}" alt="Possible similar cover"><p class="small">${e(snapshot.state.jobs[x.clubId]?.club.name)}<br>Perceptual difference: ${e(x.distance)} / 64. Compare visually.</p></div>`).join("")}</div>
  <div class="panel"><h3>Versions</h3><div class="versions">${j.candidates.map((c, i) => `<button data-version="${e(c.id)}">${i + 1} · ${e(c.mock ? "test" : "art")} · ${e(c.review?.action || "unreviewed")}</button>`).join("") || '<span class="small">No candidates yet.</span>'}</div></div></div>
  <div>${
    r
      ? `<div class="panel"><h3>Scene direction</h3>${[
          ["Subject", r.subject],
          ["Setting", r.setting],
          ["Composition", r.framing + " · " + r.people_count + " people"],
          ["Visual anchor", r.anchor],
          ["Why it fits", r.why_this_image],
        ]
          .map(
            ([label, value]) =>
              `<div class="field"><strong>${e(label)}</strong><p>${e(value)}</p></div>`,
          )
          .join(
            "",
          )}<div class="field"><strong>Grounding · ${e(r.grounding_confidence)}</strong>${r.grounded_evidence.map((q) => `<p>“${e(q)}”</p>`).join("")}</div><div class="field"><strong>Avoid</strong><p>${e(r.avoid.join(", "))}</p></div><button data-action="approve_brief" ${b.approved || j.frozen || j.status === "keep_existing" ? "disabled" : ""}>${b.approved ? "Brief approved by " + e(b.approved.reviewer) : "Approve this brief"}</button><details><summary>Edit scene recipe</summary><p class="small">Saving a change creates a new brief version and requires a fresh approval. Exact source evidence is validated.</p><textarea class="recipe" id="recipe" aria-label="Scene recipe JSON">${e(JSON.stringify(r, null, 2))}</textarea><button id="save-brief">Save revised brief</button></details></div>`
      : ""
  }
  <div class="panel"><h3>Your review</h3><label for="reviewer">Reviewer name</label><input id="reviewer" value="${e(reviewer)}" autocomplete="name"><label for="note">Feedback or revision request</label><textarea id="note" placeholder="What works, or what should change?"></textarea><div class="score-grid">${scores.map((s, i) => `<div><label for="score-${i}">${e(s)}</label><select id="score-${i}"><option value="">Choose 1–5</option>${[1, 2, 3, 4, 5].map((n) => `<option>${n}</option>`).join("")}</select></div>`).join("")}</div><label class="check"><input type="checkbox" id="ack"><span>I reviewed the original description, all source permissions, crop, visual quality and potential misrepresentation.</span></label><button class="primary" data-action="approve" ${hold ? "disabled" : ""}>Approve artwork</button><p class="small">Approval does not publish. ${c?.mock ? "Test graphics cannot be approved." : ""}</p><div class="actions"><button data-action="regenerate" ${!c || j.frozen || j.status === "keep_existing" ? "disabled" : ""}>Request revision</button><button data-action="reject" ${!c || j.frozen || j.status === "keep_existing" ? "disabled" : ""}>Reject</button><button data-action="keep_existing">Keep current cover</button></div></div>
  <div class="panel"><img class="style-ref" src="/style-reference.png" alt="Original warm campus watercolor style reference"><h3>Art direction</h3><p class="small">Original warm watercolor and gouache, cream paper, cardinal, gold and natural greens. Vary subjects and composition.</p><p class="small">Match the feeling of this artwork; do not repeat its cast or scene.</p></div></div></div>`;
  document.querySelectorAll("[data-version]").forEach(
    (el) =>
      (el.onclick = () => {
        version = el.dataset.version;
        detail();
      }),
  );
  document
    .querySelectorAll("[data-action]")
    .forEach((el) => (el.onclick = () => perform(el.dataset.action)));
  $("#reviewer").oninput = (ev) => {
    reviewer = ev.target.value;
    sessionStorage.setItem("cover-reviewer", reviewer);
  };
  if ($("#save-brief"))
    $("#save-brief").onclick = () => {
      try {
        perform("edit_brief", { recipe: JSON.parse($("#recipe").value) });
      } catch (err) {
        tell(err.message);
      }
    };
}
async function perform(action, extra = {}) {
  const j = snapshot.state.jobs[selected],
    b = j && briefOf(j),
    c = j && chosen(j);
  const payload = {
    revision: snapshot.state.revision,
    clubId: selected,
    action,
    reviewer,
    briefId: b?.id,
    candidateId: c?.id,
    note: $("#note")?.value || "",
    scores: scores.map((_, i) => Number($("#score-" + i)?.value)),
    acknowledged: $("#ack")?.checked === true,
    ...extra,
  };
  try {
    const response = await fetch("/api/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Studio-Token": snapshot.token,
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not save");
    await load();
    tell(
      action === "export"
        ? `Staging export prepared: ${result.count} approved images. No live site changed.`
        : action === "regenerate"
          ? "Revision queued. Rendering remains a separate, budget-controlled command."
          : "Review saved. No live site changed.",
    );
  } catch (err) {
    tell(err.message);
  }
}
function preview() {
  $("#preview-grid").innerHTML = (snapshot.batch?.ids || [])
    .map((id) => {
      const j = snapshot.state.jobs[id],
        c =
          j.candidates.find((c) => c.id === j.approvedCandidate) ||
          j.candidates.at(-1);
      return `<article class="panel preview-card">${c ? `<img src="/asset/${e(c.id)}" alt="${e(c.mock ? "Test graphic for " + j.club.name : "Representative illustration for " + j.club.name)}">` : '<div class="no-art"><strong>Awaiting artwork</strong></div>'}<div class="info"><span class="tag">${e(c?.mock ? "Test graphic · not artwork" : c?.review?.action === "approve" ? "Approved · unpublished" : "Awaiting approval")}</span><h3>${e(j.club.name)}</h3><p>${e(j.club.categories.slice(0, 2).join(" · "))}</p><p>${e(j.club.tagline)}</p></div></article>`;
    })
    .join("");
}
function photos() {
  const p = snapshot.state.photos;
  $("#photo-list").innerHTML =
    `<p class="small">${p.length} local records · ${p.filter((p) => p.caption).length} AI captions · Source-photo previews are not served by this pilot.</p>` +
    table(
      ["Filename", "Dimensions", "Caption", "Rights"],
      p.map((p) => [
        p.filename,
        `${p.width} × ${p.height}`,
        p.caption || "Not processed by AI",
        p.rights.status || "unknown",
      ]),
    );
}
function activity() {
  const s = snapshot.state;
  $("#activity-content").innerHTML =
    `<div class="panel"><h3>What is running</h3><p>Provider calls are made through the CLI with an explicit budget and call limit. This interface cannot initiate a paid generation or deployment.</p><p class="small">Text fixtures and diagnostic graphics cost $0. Real watercolor quality has not been evaluated until actual candidates are available.</p></div><h3>Paid request ledger</h3>${table(
      ["Started", "Kind", "Status", "Reserved USD"],
      s.ledger.map((x) => [x.at, x.kind, x.status, x.reservedUsd.toFixed(2)]),
    )}<h3>Recent decisions</h3>${table(
      ["When", "Action", "Club", "Reviewer / note"],
      s.events
        .slice(-40)
        .reverse()
        .map((x) => [
          x.at,
          x.type,
          x.clubId || "",
          (x.reviewer || "") + " " + (x.note || ""),
        ]),
    )}<h3>Brief diversity</h3>${table(["Scene type", "Planned"], Object.entries(snapshot.diversity.shotTypes))}<p class="small">${e(snapshot.diversity.limitation)}</p><p class="small">Generic table scenes: ${(snapshot.diversity.genericTableFraction * 100).toFixed(0)}%. ${snapshot.diversity.collisions.length} plan collisions.</p>`;
}
document.querySelectorAll("[data-view]").forEach(
  (button) =>
    (button.onclick = () => {
      currentView = button.dataset.view;
      for (const id of ["review", "preview", "photos", "activity"])
        $("#" + id).hidden = id !== currentView;
      document
        .querySelectorAll("[data-view]")
        .forEach((b) =>
          b.setAttribute(
            "aria-pressed",
            String(b.dataset.view === currentView),
          ),
        );
    }),
);
$("#club-search").oninput = queue;
$("#refresh").onclick = () => load().catch((err) => tell(err.message));
$("#export").onclick = () => perform("export");
$("#search-photos").onclick = async () => {
  try {
    const response = await fetch(
      "/api/photos?q=" +
        encodeURIComponent($("#photo-query").value) +
        "&scope=" +
        encodeURIComponent($("#photo-scope").value),
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    $("#photo-results").innerHTML = result.length
      ? table(
          ["Match", "Caption", "Scope"],
          result.map((p) => [
            p.filename,
            p.caption || "Filename match only",
            p.rights.status || "unknown",
          ]),
        )
      : '<p class="warning">No matching references for this permission scope. Zero references is a valid choice.</p>';
  } catch (err) {
    tell(err.message);
  }
};
load().catch((err) => tell(err.message));

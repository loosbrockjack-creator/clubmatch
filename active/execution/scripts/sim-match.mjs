// Simulate quiz takers against the old and new matching and print a markdown
// before/after report. Old code is a snapshot of HEAD in
// active/execution/logs/sim-old (see the Smart Match plan).
//
// Usage: node active/execution/scripts/sim-match.mjs [students=2000] > report.md
import { createJiti } from "jiti";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OLD = path.join(ROOT, "active/execution/logs/sim-old");
const N = Number(process.argv[2] ?? 2000);

const jNew = createJiti(import.meta.url, { alias: { "@": ROOT }, moduleCache: false });
const jOld = createJiti(import.meta.url, { alias: { "@": OLD }, moduleCache: false });
const NEW = await jNew.import(path.join(ROOT, "lib/matching.ts"));
const TAX = await jNew.import(path.join(ROOT, "lib/taxonomy.ts"));
const OLDM = await jOld.import(path.join(OLD, "lib/matching.ts"));
const { clubs } = await jNew.import(path.join(ROOT, "lib/clubs.ts"));
const byId = new Map(clubs.map((c) => [c.id, c]));

// Seeded RNG so runs are comparable.
let s = 42;
const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const sample = (arr, k) => [...arr].sort(() => rand() - 0.5).slice(0, k);

const AREAS = TAX.ACADEMIC_AREAS.map((a) => a.id).filter((a) => a !== "veterinary");
const CAREERS = TAX.CAREERS.map((c) => c.id);
const WANTS = TAX.WANTS.map((w) => w.id);
const COMMS = TAX.COMMUNITIES.map((c) => c.id);
const COMMITS = ["casual", "moderate", "involved", "high", "flexible"];
// Careers a student in each area is likely to pick (70% of the time).
const AREA_CAREERS = {
  business: ["finance", "accounting", "consulting", "marketing", "real-estate", "supply-chain", "entrepreneurship"],
  engineering: ["engineering-design", "software", "data-ai", "entrepreneurship"],
  computing: ["software", "data-ai", "cybersecurity", "entrepreneurship"],
  agriculture: ["agriculture-food", "healthcare", "marketing"],
  design: ["architecture", "media-comm", "marketing"],
  "liberal-arts": ["healthcare", "media-comm", "data-ai"],
  "human-sciences": ["healthcare", "marketing", "media-comm"],
};

function student() {
  const area = rand() < 0.1 ? "undecided" : pick(AREAS);
  const pool = area !== "undecided" && rand() < 0.7 ? AREA_CAREERS[area] : CAREERS;
  const careers = rand() < 0.08 ? ["other"] : sample(pool, 1 + Math.floor(rand() * 3));
  const wants = sample(WANTS, 1 + Math.floor(rand() * 3));
  return {
    gender: pick(["male", "female", "prefer-not"]),
    academicArea: area,
    careers,
    wants,
    goals: TAX.goalsFromWants(wants),
    experiences: TAX.experiencesFromWants(wants),
    commitment: pick(COMMITS),
    communities: rand() < 0.2 ? sample(COMMS, 1) : [],
    topics: [],
    greek: "no",
    completedAt: "",
  };
}

const COMMUNITY_AUD = new Set(["identity", "faith", "international"]);
const HIDDEN_AUD = new Set(["residence", "graduate"]);

function relevant(prefs, club) {
  return (
    TAX.areasFor(prefs).some((a) => club.academicAreas.includes(a)) ||
    prefs.careers.some((c) => club.careerPaths.includes(c))
  );
}

function measure(label, run) {
  const counts = [], tops = [], twentieth = [], ties = [];
  const inTop10 = new Map();
  let genderLeak = 0, irrelevantTop10 = 0, top10Total = 0, unaskedCommunity = 0, hiddenAud = 0, furry = 0, empty = 0;
  s = 42;
  for (let i = 0; i < N; i++) {
    const prefs = student();
    const results = run(prefs);
    counts.push(results.length);
    if (results.length === 0) { empty++; continue; }
    tops.push(results[0].score);
    if (results[19]) twentieth.push(results[19].score);
    ties.push(results.filter((r) => r.score === results[0].score).length);
    for (const r of results.slice(0, 10)) {
      inTop10.set(r.club.id, (inTop10.get(r.club.id) ?? 0) + 1);
      top10Total++;
      // Judge relevance with the reviewed tags for both versions.
      if (!relevant(prefs, byId.get(r.club.id) ?? r.club)) irrelevantTop10++;
    }
    const top20 = results.slice(0, 20).map((r) => byId.get(r.club.id) ?? r.club);
    if (top20.some((c) => COMMUNITY_AUD.has(c.audience) && !c.communityTags.some((t) => prefs.communities.includes(t)))) unaskedCommunity++;
    if (top20.some((c) => HIDDEN_AUD.has(c.audience))) hiddenAud++;
    if (top20.some((c) => (prefs.gender === "male" && c.genderFocus === "women") || (prefs.gender === "female" && c.genderFocus === "men"))) genderLeak++;
    if (top20.some((c) => c.id === "amesfurryclub")) furry++;
  }
  const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : "n/a");
  const pct = (a, p) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length * p)] : "n/a");
  const [topClub, topCount] = [...inTop10].sort((a, b) => b[1] - a[1])[0] ?? ["-", 0];
  return {
    label,
    "Results per student (median / p10 / p90)": `${med(counts)} / ${pct(counts, 0.1)} / ${pct(counts, 0.9)}`,
    "Students with zero results": empty,
    "Top-1 score (median)": med(tops),
    "20th result score (median)": med(twentieth),
    "Clubs that ever reach a top 10": inTop10.size,
    "Most common top-10 club (share of students)": `${byId.get(topClub)?.name ?? topClub} (${((topCount / N) * 100).toFixed(0)}%)`,
    "Ties for #1 (median / max)": `${med(ties)} / ${Math.max(...ties)}`,
    "Top-10 slots with no major or career match": `${((irrelevantTop10 / Math.max(top10Total, 1)) * 100).toFixed(0)}%`,
    "Students shown a faith/culture/identity club they did not ask for (top 20)": unaskedCommunity,
    "Students shown a residence-hall or grad-only club (top 20)": hiddenAud,
    "Students shown a club built for the other gender (top 20)": genderLeak,
    "Students shown Ames Furry Club (top 20)": furry,
  };
}

const oldRun = (p) => OLDM.matchClubs(p);
const newRun = (p) => NEW.matchClubs(p);
const before = measure("Before", oldRun);
const after = measure("After", newRun);

console.log(`## Simulation: ${N} students\n`);
console.log("| Metric | Before | After |\n|---|---|---|");
for (const key of Object.keys(before)) {
  if (key === "label") continue;
  console.log(`| ${key} | ${before[key]} | ${after[key]} |`);
}

const PERSONAS = [
  ["Finance student", { academicArea: "business", careers: ["finance"], wants: ["career", "networking"], commitment: "moderate" }],
  ["Accounting student", { academicArea: "business", careers: ["accounting"], wants: ["career"], commitment: "moderate" }],
  ["CS student who likes to build", { academicArea: "computing", careers: ["software", "data-ai"], wants: ["projects", "competition"], commitment: "involved" }],
  ["Agronomy student", { academicArea: "agriculture", careers: ["agriculture-food"], wants: ["community", "career"], commitment: "casual" }],
  ["Pre-med biology student", { academicArea: "liberal-arts", careers: ["healthcare"], wants: ["career", "service"], commitment: "moderate" }],
  ["Graphic design student", { academicArea: "design", careers: ["architecture", "media-comm"], wants: ["projects"], commitment: "flexible" }],
  ["Undecided freshman", { academicArea: "undecided", careers: ["entrepreneurship", "marketing"], wants: ["community", "leadership"], commitment: "casual" }],
  ["Marketing student who climbs", { academicArea: "business", careers: ["marketing"], wants: ["community"], commitment: "moderate", topics: ["rock climbing", "bouldering"] }],
  ["Undecided, accounting only", { academicArea: "undecided", careers: ["accounting"], wants: ["career"], commitment: "moderate" }],
  ["Finance student who typed K-pop dance", { academicArea: "business", careers: ["finance"], wants: ["career"], commitment: "moderate", topics: ["k-pop", "dance"] }],
  ["Finance resume listing volunteering", { academicArea: "business", careers: ["finance"], wants: ["career"], commitment: "moderate", resumeTopics: ["volunteering", "rock climbing"] }],
  ["Business + CS double major", { academicArea: "business", academicAreas: ["business", "computing"], careers: ["finance", "software"], wants: ["career", "projects"], commitment: "moderate" }],
  ["Vet Med (DVM) student", { academicArea: "veterinary", academicAreas: ["veterinary"], careers: ["healthcare"], wants: ["community", "service"], commitment: "casual" }],
  ["Male engineer", { gender: "male", academicArea: "engineering", careers: ["engineering-design"], wants: ["career", "networking"], commitment: "moderate" }],
  ["Female engineer", { gender: "female", academicArea: "engineering", careers: ["engineering-design"], wants: ["career", "networking"], commitment: "moderate" }],
  ["Prefers not to say, engineer", { gender: "prefer-not", academicArea: "engineering", careers: ["engineering-design"], wants: ["career", "networking"], commitment: "moderate" }],
  ["Business student, career Other only", { academicArea: "business", careers: ["other"], wants: ["career"], commitment: "moderate" }],
  ["Engineer seeking faith community", { academicArea: "engineering", careers: ["engineering-design"], wants: ["community"], commitment: "moderate", communities: ["faith"], topics: ["catholic"] }],
];

console.log("\n## Personas (top 5)\n");
for (const [name, partial] of PERSONAS) {
  const prefs = {
    goals: TAX.goalsFromWants(partial.wants),
    experiences: TAX.experiencesFromWants(partial.wants),
    greek: "no",
    completedAt: "",
    communities: [],
    topics: [],
    resumeTopics: [],
    ...partial,
  };
  const fmt = (r) => `${r.club.name} (${r.score})`;
  console.log(`**${name}**`);
  console.log(`- Before: ${OLDM.matchClubs(prefs).slice(0, 5).map(fmt).join("; ")}`);
  const now = NEW.matchClubs(prefs);
  console.log(`- After (${now.length} results): ${now.slice(0, 5).map(fmt).join("; ")}`);
  const topicRows = NEW.matchTopics(prefs);
  if (topicRows.length) console.log(`- Because you mentioned: ${topicRows.map((t) => `${t.topic}: ${t.results.map((r) => r.club.name).join(", ")}`).join("; ")}`);
  const comm = NEW.matchCommunities(prefs);
  if (comm.total > 0) console.log(`- Communities (${comm.total}): ${comm.results.slice(0, 3).map((r) => r.club.name).join("; ")}`);
  console.log();
}

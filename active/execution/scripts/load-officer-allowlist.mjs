// Loads officer emails into officer_allowlist from a spreadsheet kept outside git.
//
//   node active/execution/scripts/load-officer-allowlist.mjs <file.xlsx|file.csv> [--dry-run]
//
// Needs an Email column plus a Club column (club name) or a Slug column. For
// .xlsx it reads the "Contacts" tab (or the first tab) with Python's openpyxl.
// Prints counts and unmatched club names only, never an email address.
//
// Targets clubmatch-dev by default. For production, pass --production and set
// ALLOWLIST_SUPABASE_URL and ALLOWLIST_SUPABASE_SECRET_KEY in the shell.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadDevEnv } from "./dev-env.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const production = args.includes("--production");
const file = args.find((arg) => !arg.startsWith("--"));
if (!file) {
  console.error("Usage: load-officer-allowlist.mjs <file.xlsx|file.csv> [--dry-run] [--production]");
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const READ_XLSX = `
import json, sys, openpyxl
wb = openpyxl.load_workbook(sys.argv[1], read_only=True, data_only=True)
ws = wb["Contacts"] if "Contacts" in wb.sheetnames else wb.worksheets[0]
print(json.dumps([[("" if c is None else str(c)) for c in row] for row in ws.iter_rows(values_only=True)]))
`;

function readRows(path) {
  if (path.toLowerCase().endsWith(".csv")) return parseCsv(readFileSync(path, "utf8"));
  const out = execFileSync("python3", ["-I", "-c", READ_XLSX, path], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(out);
}

const norm = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const clubs = JSON.parse(readFileSync(resolve(process.cwd(), "data/clubs-index.json"), "utf8"));
const bySlug = new Set(clubs.map((club) => club.slug));
const byName = new Map(clubs.map((club) => [norm(club.name), club.slug]));

const rows = readRows(resolve(process.cwd(), file));
const header = (rows[0] ?? []).map(norm);
const emailCol = header.indexOf("email");
const slugCol = header.indexOf("slug");
const clubCol = header.indexOf("club");
if (emailCol < 0 || (slugCol < 0 && clubCol < 0)) {
  console.error("The sheet needs an Email column and a Club or Slug column.");
  process.exit(1);
}

const pairs = new Map();
const unmatched = new Map();
let badEmails = 0;
for (const row of rows.slice(1)) {
  const email = String(row[emailCol] ?? "").trim().toLowerCase();
  if (!email && !row[clubCol]) continue;
  if (!/^[a-z0-9._%+-]+@iastate\.edu$/.test(email)) {
    badEmails++;
    continue;
  }
  const slug = slugCol >= 0 && bySlug.has(row[slugCol]) ? row[slugCol] : byName.get(norm(row[clubCol]));
  if (!slug) {
    const name = String(row[clubCol] ?? row[slugCol] ?? "(blank)");
    unmatched.set(name, (unmatched.get(name) ?? 0) + 1);
    continue;
  }
  pairs.set(`${email}|${slug}`, { email, club_slug: slug });
}

console.log(`Rows read:          ${rows.length - 1}`);
console.log(`Allowlist pairs:    ${pairs.size}`);
console.log(`Skipped, bad email: ${badEmails}`);
console.log(`Skipped, no club:   ${Array.from(unmatched.values()).reduce((a, b) => a + b, 0)}`);
for (const [name, count] of Array.from(unmatched).slice(0, 25)) console.log(`  unmatched: ${name} (${count})`);

if (dryRun) {
  console.log("Dry run: nothing written.");
  process.exit(0);
}

let url;
let key;
if (production) {
  url = process.env.ALLOWLIST_SUPABASE_URL;
  key = process.env.ALLOWLIST_SUPABASE_SECRET_KEY;
} else {
  const env = loadDevEnv();
  url = env.NEXT_PUBLIC_SUPABASE_URL;
  key = env.SUPABASE_SECRET_KEY;
}
if (!url || !key) {
  console.error("Missing Supabase settings for this target.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const all = Array.from(pairs.values());
for (let i = 0; i < all.length; i += 500) {
  const { error } = await admin
    .from("officer_allowlist")
    .upsert(all.slice(i, i + 500), { onConflict: "email,club_slug", ignoreDuplicates: true });
  if (error) {
    console.error(`Upload failed: ${error.message}`);
    process.exit(1);
  }
}
console.log(`Loaded ${all.length} pairs into ${production ? "PRODUCTION" : "clubmatch-dev"}.`);

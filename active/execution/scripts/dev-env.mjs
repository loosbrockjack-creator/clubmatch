// Loads ClubMatch dev settings: process env first, then .env.local (worktrees),
// then active/config/.env.dev (main checkout). Refuses the production project.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROD_REF = "bvttohfhctvjkywjftby";

function parse(file) {
  const out = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[2] !== "") out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

export function loadDevEnv() {
  const env = {};
  for (const file of ["active/config/.env.dev", ".env.local"]) {
    const path = resolve(process.cwd(), file);
    if (existsSync(path)) Object.assign(env, parse(path));
  }
  for (const key of ["DEV_DB_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"]) {
    if (process.env[key]) env[key] = process.env[key];
  }

  const targets = [env.DEV_DB_URL, env.NEXT_PUBLIC_SUPABASE_URL].filter(Boolean).join(" ");
  if (targets.includes(PROD_REF)) {
    throw new Error("Refusing to run: these settings point at the PRODUCTION clubmatch project.");
  }
  return env;
}

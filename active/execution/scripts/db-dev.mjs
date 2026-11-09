// Runs SQL files against the clubmatch-dev database (never production).
// Usage: node active/execution/scripts/db-dev.mjs <file.sql> [more.sql ...]
//        node active/execution/scripts/db-dev.mjs --sql "select 1"
import { readFileSync } from "node:fs";
import pg from "pg";
import { loadDevEnv } from "./dev-env.mjs";

const env = loadDevEnv();
if (!env.DEV_DB_URL) {
  console.error("DEV_DB_URL is not set (active/config/.env.dev or .env.local).");
  process.exit(1);
}

const args = process.argv.slice(2);
const jobs =
  args[0] === "--sql"
    ? [{ name: "inline", sql: args.slice(1).join(" ") }]
    : args.map((file) => ({ name: file, sql: readFileSync(file, "utf8") }));
if (jobs.length === 0) {
  console.error("Pass one or more .sql files, or --sql \"...\".");
  process.exit(1);
}

const client = new pg.Client({ connectionString: env.DEV_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  for (const job of jobs) {
    await client.query("begin");
    try {
      const res = await client.query(job.sql);
      await client.query("commit");
      const last = Array.isArray(res) ? res.at(-1) : res;
      console.log(`ok  ${job.name}`);
      if (last?.rows?.length) console.table(last.rows.slice(0, 20));
    } catch (err) {
      await client.query("rollback");
      console.error(`FAIL ${job.name}: ${err.message}`);
      process.exitCode = 1;
      break;
    }
  }
} finally {
  await client.end();
}

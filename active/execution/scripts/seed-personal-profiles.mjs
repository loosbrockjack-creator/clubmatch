// Adds personal-profile test data on top of seed-dev.mjs, without resetting anything.
// Touches only the student-cs and student-design dev accounts. Safe to re-run.
// Usage: node active/execution/scripts/seed-personal-profiles.mjs
import { createClient } from "@supabase/supabase-js";
import { loadDevEnv } from "./dev-env.mjs";

const env = loadDevEnv();
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY for clubmatch-dev.");
  process.exit(1);
}
if (env.NEXT_PUBLIC_SUPABASE_URL.includes("bvttohfhctvjkywjftby")) {
  console.error("Refusing to run against production.");
  process.exit(1);
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;
const idFor = (email) => list.users.find((u) => u.email === email)?.id;

const SEEDS = [
  {
    email: "cm-dev-cs@iastate.edu",
    profile: {
      links: [
        { url: "https://github.com/caseycoder" },
        { url: "https://www.linkedin.com/in/casey-coder" },
        { url: "https://caseycoder.dev", label: "Side projects" },
      ],
    },
    // finance-club overlaps student-finance; 3d-printing-and-design has no watercolor cover.
    memberships: [
      { club_slug: "developer-group", role: "member", verified: true },
      { club_slug: "finance-club", role: "member", verified: false },
      { club_slug: "3d-printing-and-design", role: "member", verified: false },
    ],
  },
  {
    email: "cm-dev-design@iastate.edu",
    profile: {},
    // Officer, verified, and a shared club with student-cs.
    memberships: [
      { club_slug: "design-council", role: "officer", verified: true },
      { club_slug: "3d-printing-and-design", role: "member", verified: true },
    ],
  },
];

let failures = 0;
for (const seed of SEEDS) {
  const id = idFor(seed.email);
  if (!id) {
    failures++;
    console.error(`FAIL ${seed.email}: run seed:dev first`);
    continue;
  }
  if (Object.keys(seed.profile).length) {
    const { error } = await admin.from("profiles").update(seed.profile).eq("id", id);
    if (error) {
      failures++;
      console.error(`FAIL ${seed.email}: ${error.message}`);
    }
  }
  const { error } = await admin
    .from("memberships")
    .upsert(seed.memberships.map((m) => ({ ...m, user_id: id })), { onConflict: "user_id,club_slug" });
  if (error) {
    failures++;
    console.error(`FAIL ${seed.email}: ${error.message}`);
  }
}
console.log(`Seeded personal profile data for ${SEEDS.length - failures}/${SEEDS.length} accounts.`);
if (failures) process.exit(1);

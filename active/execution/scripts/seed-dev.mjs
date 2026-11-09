// Seeds clubmatch-dev with the test accounts in lib/dev-accounts.ts.
// Safe to re-run: existing users are reused and their rows reset.
// Usage: node active/execution/scripts/seed-dev.mjs
// Feature branches add their own seed steps at the end (e.g. officer allowlist rows).
import { createClient } from "@supabase/supabase-js";
import { loadDevEnv } from "./dev-env.mjs";

const env = loadDevEnv();
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY for clubmatch-dev.");
  process.exit(1);
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const prefs = (academicArea, careers, goals, experiences, commitment) => ({
  academicArea,
  careers,
  goals,
  experiences,
  commitment,
  greek: "no",
  completedAt: "2026-11-01T12:00:00.000Z",
});

// Keep emails in sync with lib/dev-accounts.ts.
const ACCOUNTS = [
  {
    email: "cm-dev-officer@iastate.edu",
    profile: { display_name: "Olivia Officer", major: "Data Science", class_year: "Senior", bio: "President of Data Science Club.", interests: ["area:computing", "career:data-ai", "goal:leadership"], looking_for: "browsing" },
    preferences: prefs("computing", ["data-ai", "software"], ["leadership", "skills"], ["projects"], "involved"),
    memberships: [{ club_slug: "data-science-club", role: "officer", verified: true }],
  },
  {
    email: "cm-dev-cs@iastate.edu",
    profile: { display_name: "Casey Coder", major: "Computer Science", class_year: "Sophomore", bio: "Building side projects and looking for a team.", interests: ["area:computing", "career:software", "goal:hands-on"], looking_for: "teammates", links: [{ url: "https://github.com/caseycoder" }] },
    preferences: prefs("computing", ["software", "data-ai"], ["hands-on", "skills"], ["projects", "competition"], "moderate"),
    memberships: [{ club_slug: "developer-group", role: "member", verified: false }],
  },
  {
    email: "cm-dev-finance@iastate.edu",
    profile: { display_name: "Frankie Finance", major: "Finance", class_year: "Junior", bio: "Into investing and markets.", interests: ["area:business", "career:finance", "goal:networking"], looking_for: "club", links: [{ url: "https://www.linkedin.com/in/frankie-finance" }] },
    preferences: prefs("business", ["finance", "consulting"], ["career", "networking"], ["professional"], "moderate"),
    memberships: [{ club_slug: "finance-club", role: "member", verified: false }],
  },
  {
    email: "cm-dev-design@iastate.edu",
    profile: { display_name: "Devon Design", major: "Graphic Design", class_year: "Freshman", bio: "Type nerd.", interests: ["area:design", "career:media-comm"], looking_for: "friends", links: [{ url: "https://www.behance.net/devondesign" }, { url: "https://instagram.com/devon.designs" }] },
    preferences: prefs("design", ["media-comm", "marketing"], ["community", "skills"], ["projects"], "casual"),
    memberships: [{ club_slug: "design-council", role: "member", verified: false }],
  },
  {
    email: "cm-dev-hidden@iastate.edu",
    profile: { display_name: "Harper Hidden", major: "Computer Science", class_year: "Junior", bio: "Prefers not to be contacted by clubs.", interests: ["area:computing", "career:data-ai"], discoverable: false },
    preferences: prefs("computing", ["data-ai"], ["skills"], ["academic"], "moderate"),
    memberships: [],
  },
  { email: "cm-dev-new@iastate.edu", profile: null, preferences: null, memberships: [] },
];

async function ensureUser(email) {
  const { data: list, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const found = list.users.find((u) => u.email === email);
  if (found) return found.id;
  const { data, error: createError } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (createError) throw createError;
  return data.user.id;
}

const users = {};
let failures = 0;
for (const account of ACCOUNTS) {
  try {
    const id = await ensureUser(account.email);
    users[account.email] = id;
    const reset = {
      display_name: null, major: null, class_year: null, bio: null, links: [], interests: [],
      looking_for: null, discoverable: true, policy_notice_seen: false, visible: true,
      onboarded: account.profile !== null,
    };
    const { error: pErr } = await admin.from("profiles").update({ ...reset, ...(account.profile ?? {}) }).eq("id", id);
    if (pErr) throw pErr;
    const { error: ppErr } = await admin.from("profile_private").upsert({ user_id: id, preferences: account.preferences });
    if (ppErr) throw ppErr;
    await admin.from("memberships").delete().eq("user_id", id);
    if (account.memberships.length) {
      const { error: mErr } = await admin.from("memberships").insert(account.memberships.map((m) => ({ ...m, user_id: id })));
      if (mErr) throw mErr;
    }
  } catch (err) {
    failures++;
    console.error(`FAIL ${account.email}: ${err.message}`);
  }
}
// ---- Feature seed steps go here (use `admin` and `users[email]`). ----

console.log(`Seeded ${ACCOUNTS.length - failures}/${ACCOUNTS.length} dev accounts.`);
if (failures) process.exit(1);

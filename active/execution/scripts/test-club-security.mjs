// Attacks the club features as real signed-in students, using only the publishable
// key a browser has. Dev only. Run with the dev server up for the HTTP checks.
//
//   node active/execution/scripts/test-club-security.mjs [http://localhost:3101]
//
// Prints one line per failed check and a summary. Exits 1 on any failure.
import { createClient } from "@supabase/supabase-js";
import { loadDevEnv } from "./dev-env.mjs";

const env = loadDevEnv();
const BASE = process.argv[2] ?? "http://localhost:3101";
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const PUB = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(URL_, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const options = { auth: { persistSession: false, autoRefreshToken: false } };

const CLUB = "data-science-club";
const OTHER = "finance-club";

async function signIn(email) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const client = createClient(URL_, PUB, options);
  const res = await client.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: "magiclink" });
  if (res.error) throw res.error;
  return { client, token: res.data.session.access_token, id: res.data.user.id };
}

let passed = 0;
let failed = 0;
function check(name, ok, detail = "") {
  if (ok) passed++;
  else {
    failed++;
    console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
  }
}

/** A write counts as blocked if it errors or changes zero rows. */
async function blocked(name, query) {
  const { data, error } = await query.select();
  check(name, Boolean(error) || (data ?? []).length === 0, error ? "" : `wrote ${data?.length} rows`);
}

async function unreadable(name, query) {
  const { data, error } = await query;
  check(name, Boolean(error) || (data ?? []).length === 0, `read ${data?.length} rows`);
}

const student = await signIn("cm-dev-finance@iastate.edu");
const anon = createClient(URL_, PUB, options);

// Can't make yourself an officer, verify yourself, or activate a club.
await admin.from("memberships").delete().eq("user_id", student.id).eq("club_slug", "cm-sec-test");
await blocked("insert self as officer", student.client.from("memberships").insert({ user_id: student.id, club_slug: "cm-sec-test", role: "officer" }));
await blocked("insert self verified", student.client.from("memberships").insert({ user_id: student.id, club_slug: "cm-sec-test", verified: true }));
await blocked("update own role", student.client.from("memberships").update({ role: "officer" }).eq("user_id", student.id));
await blocked("update own verified", student.client.from("memberships").update({ verified: true }).eq("user_id", student.id));
await blocked("insert for another student", student.client.from("memberships").insert({ user_id: "00000000-0000-0000-0000-000000000000", club_slug: CLUB }));
await blocked("activate a club", student.client.from("club_accounts").insert({ club_slug: OTHER, status: "active" }));
await blocked("edit a club account", student.client.from("club_accounts").update({ status: "active" }).eq("club_slug", CLUB));
await blocked("add self to allowlist", student.client.from("officer_allowlist").insert({ email: "cm-dev-finance@iastate.edu", club_slug: CLUB }));
await blocked("approve own claim", student.client.from("club_claims").update({ status: "approved" }).eq("user_id", student.id));
await blocked("file an approved claim", student.client.from("club_claims").insert({ club_slug: OTHER, user_id: student.id, email: "x@iastate.edu", role_title: "x", status: "approved" }));

// Can't write officer content.
await blocked("edit a club page", student.client.from("club_profiles").upsert({ club_slug: CLUB, tagline: "hacked" }));
await blocked("post an event", student.client.from("club_events").insert({ club_slug: CLUB, title: "hacked", starts_at: "2030-01-01T00:00:00Z" }));
await blocked("delete events", student.client.from("club_events").delete().eq("club_slug", CLUB));
await blocked("feature a club", student.client.from("club_accounts").update({ featured_opt_in: true }).eq("club_slug", CLUB));

// Can't send campaigns, directly or through the function.
await blocked("insert a campaign", student.client.from("club_campaigns").insert({ club_slug: CLUB, subject: "x", body: "x", audience: "both" }));
await blocked("insert a recipient", student.client.from("campaign_recipients").insert({ campaign_id: "00000000-0000-0000-0000-000000000000", user_id: student.id }));
{
  const { error } = await student.client.rpc("send_club_campaign", { p_slug: CLUB, p_sender: student.id, p_subject: "x", p_body: "x", p_audience: "both" });
  check("rpc send_club_campaign refused", Boolean(error));
}
await blocked("write analytics", student.client.from("club_activity").insert({ club_slug: CLUB, kind: "view", viewer_hash: "x" }));

// Can't read other people's data.
await unreadable("read club accounts", student.client.from("club_accounts").select("*"));
await unreadable("read allowlist", student.client.from("officer_allowlist").select("*"));
await unreadable("read analytics", student.client.from("club_activity").select("*"));
await unreadable("read others' private profiles", student.client.from("profile_private").select("*").neq("user_id", student.id));
await unreadable("read others' interest", student.client.from("club_interests").select("*").neq("user_id", student.id));
await unreadable("read others' claims", student.client.from("club_claims").select("*").neq("user_id", student.id));
await unreadable("read others' inbox", student.client.from("campaign_recipients").select("*").neq("user_id", student.id));
await unreadable("read others' mutes", student.client.from("club_mutes").select("*").neq("user_id", student.id));
{
  const { error } = await student.client.from("club_campaigns").select("sender");
  check("campaign sender column closed", Boolean(error));
}

// Signed out gets nothing private either.
for (const table of ["club_accounts", "officer_allowlist", "club_activity", "club_claims", "club_interests", "club_campaigns", "campaign_recipients", "club_mutes", "profile_private"]) {
  await unreadable(`anon read ${table}`, anon.from(table).select("*"));
}

// Interest on an unclaimed club is refused by the database.
{
  await admin.from("club_interests").delete().eq("user_id", student.id).eq("club_slug", "chess-club");
  const { data: active } = await admin.rpc("club_is_active", { p_slug: "chess-club" });
  if (!active) await blocked("interest on an unclaimed club", student.client.from("club_interests").insert({ user_id: student.id, club_slug: "chess-club" }));
}

// HTTP: every manage route refuses no token, a bad token, and a non-officer.
const routes = ["access", "profile", "events", "members", "leads", "campaigns", "analytics"];
for (const route of routes) {
  const url = `${BASE}/api/manage/${CLUB}/${route}`;
  const none = await fetch(url);
  check(`${route}: no token is 401`, none.status === 401, `got ${none.status}`);
  const bad = await fetch(url, { headers: { Authorization: "Bearer not-a-real-token" } });
  check(`${route}: bad token is 401`, bad.status === 401, `got ${bad.status}`);
  const nonOfficer = await fetch(url, { headers: { Authorization: `Bearer ${student.token}` } });
  check(`${route}: student is 403`, nonOfficer.status === 403, `got ${nonOfficer.status}`);
}
const auth = { Authorization: `Bearer ${student.token}`, "Content-Type": "application/json" };
const writes = [
  ["PUT", "profile", { tagline: "hacked" }],
  ["POST", "events", { title: "hacked", starts_at: "2030-01-01T00:00:00Z" }],
  ["PATCH", "members", { userId: student.id, action: "promote" }],
  ["POST", "campaigns", { subject: "x", body: "x", audience: "both" }],
  ["PATCH", "access", { featuredOptIn: true }],
  ["POST", "billing", {}],
];
for (const [method, route, body] of writes) {
  const res = await fetch(`${BASE}/api/manage/${CLUB}/${route}`, { method, headers: auth, body: JSON.stringify(body) });
  check(`${method} ${route}: student is 403`, res.status === 403, `got ${res.status}`);
}
{
  const res = await fetch(`${BASE}/api/clubs/chess-club/checkout`, { method: "POST", headers: auth });
  check("checkout for a club you don't run is 403", res.status === 403, `got ${res.status}`);
  const fake = await fetch(`${BASE}/api/manage/not-a-club/leads`, { headers: auth });
  check("unknown club is 404", fake.status === 404, `got ${fake.status}`);
}

// Webhooks need Stripe's signature.
for (const headers of [{}, { "stripe-signature": "t=1,v1=forged" }]) {
  const res = await fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers,
    body: JSON.stringify({ type: "checkout.session.completed", data: { object: { metadata: { club_slug: OTHER } } } }),
  });
  check("unsigned webhook is 400", res.status === 400, `got ${res.status}`);
}

// Analytics events can't claim actions a visitor didn't take.
{
  const res = await fetch(`${BASE}/api/activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "interested", slugs: [CLUB], visitor: crypto.randomUUID() }),
  });
  check("anon can't log interest", res.status === 401, `got ${res.status}`);
}

console.log(`\n${passed} passed, ${failed} failed.`);
process.exit(failed ? 1 : 0);

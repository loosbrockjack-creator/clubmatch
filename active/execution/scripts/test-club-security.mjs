// Attacks the club features as real signed-in students, using only the publishable
// key a browser has. Dev only. Run with the dev server up for the HTTP checks.
//
//   node active/execution/scripts/test-club-security.mjs [http://localhost:3101]
//
// Prints one line per failed check and a summary. Exits 1 on any failure.
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
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

// Can't create invites or read who was invited.
await blocked("insert an invite", student.client.from("club_invites").insert({ club_slug: CLUB, user_id: student.id }));
await unreadable("read invites", student.client.from("club_invites").select("*"));
{
  const { error } = await student.client.rpc("send_club_invite", { p_slug: CLUB, p_sender: student.id, p_student: student.id, p_subject: "x", p_body: "x" });
  check("rpc send_club_invite refused", Boolean(error));
}
{
  const res = await fetch(`${BASE}/api/manage/${CLUB}/invites`, { method: "POST", headers: { Authorization: `Bearer ${student.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ studentId: student.id }) });
  check("invite route: student is 403", res.status === 403, `got ${res.status}`);
}

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
  await admin.from("club_interests").delete().eq("user_id", student.id).eq("club_slug", "investment-group");
  const { data: active } = await admin.rpc("club_is_active", { p_slug: "investment-group" });
  if (!active) await blocked("interest on an unclaimed club", student.client.from("club_interests").insert({ user_id: student.id, club_slug: "investment-group" }));
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
  if (route === "access") {
    const answer = await nonOfficer.json();
    check("access: student is told no, with no club data", answer.allowed === false && answer.isPayer === false && Object.keys(answer).length === 2, JSON.stringify(answer));
  } else {
    check(`${route}: student is 403`, nonOfficer.status === 403, `got ${nonOfficer.status}`);
  }
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
  const res = await fetch(`${BASE}/api/clubs/investment-group/checkout`, { method: "POST", headers: auth });
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
  const save = await fetch(`${BASE}/api/activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "save", slugs: [CLUB], visitor: crypto.randomUUID() }),
  });
  check("anon can't log a save", save.status === 401, `got ${save.status}`);
  const signedIn = await fetch(`${BASE}/api/activity`, {
    method: "POST",
    headers: { Authorization: `Bearer ${student.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "save", slugs: ["investment-group"] }),
  });
  const { data: savedRow } = await admin.from("saved_clubs").select("club_slug").eq("user_id", student.id).eq("club_slug", "investment-group").maybeSingle();
  const logged = (await signedIn.json()).logged;
  check("a save with no saved_clubs row logs nothing", savedRow ? true : logged === 0, `logged ${logged}`);
}

// A club can't tell who muted it: same count and a normal send when everyone did.
{
  const MUTE_CLUB = "solar-car";
  await admin.from("memberships").upsert({ user_id: student.id, club_slug: MUTE_CLUB, role: "member" });
  await admin.from("club_mutes").upsert({ user_id: student.id, club_slug: MUTE_CLUB });
  const { data, error } = await admin.rpc("send_club_campaign", { p_slug: MUTE_CLUB, p_sender: null, p_subject: "Mute test", p_body: "x", p_audience: "members" });
  const row = data?.[0];
  check("all-muted audience sends normally", !error && row?.recipients === 1, error?.message ?? JSON.stringify(row));
  const { data: campaign } = await admin.from("club_campaigns").select("recipient_count").eq("id", row?.campaign_id).maybeSingle();
  check("recipient count ignores mutes", campaign?.recipient_count === 1, JSON.stringify(campaign));
  const { count } = await admin.from("campaign_recipients").select("user_id", { count: "exact", head: true }).eq("campaign_id", row?.campaign_id);
  check("the muted student gets nothing", count === 0, `delivered ${count}`);
  await admin.from("club_campaigns").delete().eq("club_slug", MUTE_CLUB);
  await admin.from("club_mutes").delete().eq("user_id", student.id).eq("club_slug", MUTE_CLUB);
  await admin.from("memberships").delete().eq("user_id", student.id).eq("club_slug", MUTE_CLUB);
  const { data: empty, error: emptyError } = await admin.rpc("send_club_campaign", { p_slug: MUTE_CLUB, p_sender: null, p_subject: "x", p_body: "x", p_audience: "members" });
  check("a truly empty audience is still refused", emptyError?.message.includes("no_recipients"), JSON.stringify(empty));
}

// Only http and https links can be saved on a profile.
{
  const { data: mine } = await student.client.from("profiles").select("links").eq("id", student.id).single();
  for (const url of ["javascript:alert(1)", "data:text/html,x", "  javascript:alert(1)", "https://bad link.com"]) {
    const { error } = await student.client.from("profiles").update({ links: [{ url }] }).eq("id", student.id);
    check(`profile link refused: ${url}`, Boolean(error));
  }
  const { error: good } = await student.client.from("profiles").update({ links: [{ url: "https://example.org/a", label: "Site" }] }).eq("id", student.id);
  check("a normal https link saves", !good, good?.message);
  const six = Array.from({ length: 6 }, (_, i) => ({ url: `https://example.org/${i}` }));
  const { error: tooMany } = await student.client.from("profiles").update({ links: six }).eq("id", student.id);
  check("the five link limit still holds", Boolean(tooMany));
  await student.client.from("profiles").update({ links: mine.links }).eq("id", student.id);
}

// Parallel webhooks must never refund the subscription on record. Real sandbox
// money flows, so this needs STRIPE_WEBHOOK_SECRET and the server's webhook.
{
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const RACE_CLUB = "solar-car";
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const { data: temp } = await admin.auth.admin.createUser({ email: `cm-dev-race-${Date.now()}@iastate.edu`, email_confirm: true });
  const customer = await stripe.customers.create({ email: temp.user.email, payment_method: "pm_card_visa", invoice_settings: { default_payment_method: "pm_card_visa" } });
  const price = await stripe.prices.create({ currency: "usd", unit_amount: 4900, recurring: { interval: "month", interval_count: 6 }, product_data: { name: "race test" } });
  const newSub = () => stripe.subscriptions.create({ customer: customer.id, items: [{ price: price.id }], metadata: { club_slug: RACE_CLUB, user_id: temp.user.id } });
  const fire = (sub) => {
    const payload = JSON.stringify({ id: `evt_${sub.id}`, object: "event", type: "customer.subscription.updated", data: { object: { id: sub.id } } });
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: env.STRIPE_WEBHOOK_SECRET });
    return fetch(`${BASE}/api/stripe/webhook`, { method: "POST", headers: { "stripe-signature": header }, body: payload });
  };
  const refunded = async (sub) => {
    const invoice = await stripe.invoices.retrieve(sub.latest_invoice, { expand: ["payments"] });
    const intent = invoice.payments?.data?.[0]?.payment?.payment_intent;
    return (await stripe.refunds.list({ payment_intent: typeof intent === "string" ? intent : intent.id })).data.length > 0;
  };
  const recorded = async () => (await admin.from("club_accounts").select("status, stripe_subscription_id").eq("club_slug", RACE_CLUB).maybeSingle()).data;
  const rounds = Number(process.env.RACE_ROUNDS ?? 3);
  await admin.from("club_accounts").delete().eq("club_slug", RACE_CLUB);
  const made = [];
  for (let round = 0; round < rounds; round++) {
    const sub = await newSub();
    made.push(sub.id);
    const codes = await Promise.all(Array.from({ length: 6 }, () => fire(sub).then((res) => res.status)));
    await sleep(1500);
    const live = await stripe.subscriptions.retrieve(sub.id);
    const row = await recorded();
    check(`renewal ${round}: parallel webhooks all succeed`, codes.every((code) => code === 200), codes.join(","));
    check(`renewal ${round}: subscription stays live`, live.status === "active", live.status);
    check(`renewal ${round}: club is on it`, row?.stripe_subscription_id === sub.id && row.status === "active", JSON.stringify(row));
    check(`renewal ${round}: not refunded`, !(await refunded(sub)));
    // Lapse for the next round, as an ended plan would.
    await stripe.subscriptions.cancel(sub.id);
    await fire(sub);
    await sleep(500);
    check(`renewal ${round}: cancel lapses the club`, (await recorded())?.status === "lapsed");
  }
  // A real duplicate is still refunded, and the original stays.
  const first = await newSub();
  const second = await newSub();
  made.push(first.id, second.id);
  await Promise.all([fire(first), fire(first), fire(second), fire(second), fire(first), fire(second)]);
  await sleep(4000);
  const [a, b] = await Promise.all([stripe.subscriptions.retrieve(first.id), stripe.subscriptions.retrieve(second.id)]);
  const row = await recorded();
  const winner = [a, b].find((sub) => sub.id === row?.stripe_subscription_id);
  const loser = [a, b].find((sub) => sub.id !== row?.stripe_subscription_id);
  check("two live payments: the one on record stays live", winner?.status === "active", `${a.status}/${b.status}`);
  check("two live payments: the one on record isn't refunded", winner ? !(await refunded(winner)) : false);
  check("two live payments: the other is cancelled", loser?.status === "canceled", loser?.status);
  check("two live payments: the other is refunded", loser ? await refunded(loser) : false);
  for (const id of made) await stripe.subscriptions.cancel(id).catch(() => {});
  await admin.from("club_accounts").delete().eq("club_slug", RACE_CLUB);
  await admin.from("club_profiles").delete().eq("club_slug", RACE_CLUB);
  await admin.auth.admin.deleteUser(temp.user.id);
}

console.log(`\n${passed} passed, ${failed} failed.`);
process.exit(failed ? 1 : 0);

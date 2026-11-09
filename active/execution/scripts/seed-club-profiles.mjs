// Seeds the club profiles feature on clubmatch-dev only. Test rows, no real people.
//
//   node active/execution/scripts/seed-club-profiles.mjs          allowlist, a test member, sample analytics
//   node active/execution/scripts/seed-club-profiles.mjs --reset  also returns the test clubs to unclaimed
//
// Only touches accounts this feature owns (officer, student-finance, student-hidden)
// and the two test clubs. Does not cancel Stripe subscriptions; a sandbox sub left
// behind is harmless because --reset clears the club's link to it.
import { randomBytes } from "node:crypto";
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

const OFFICER = "cm-dev-officer@iastate.edu";
const FINANCE = "cm-dev-finance@iastate.edu";
const HIDDEN = "cm-dev-hidden@iastate.edu";
const DS_CLUB = "data-science-club";
const FINANCE_CLUB = "finance-club";

const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;
const idOf = (email) => list.users.find((u) => u.email === email)?.id;
const officerId = idOf(OFFICER);
const financeId = idOf(FINANCE);
const hiddenId = idOf(HIDDEN);
if (!officerId || !financeId || !hiddenId) {
  console.error("Dev accounts are missing. Run npm run seed:dev once first.");
  process.exit(1);
}

async function must(promise, label) {
  const { error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
}

if (process.argv.includes("--reset")) {
  for (const slug of [DS_CLUB, FINANCE_CLUB]) {
    await must(admin.from("club_campaigns").delete().eq("club_slug", slug), "campaigns");
    await must(admin.from("club_invites").delete().eq("club_slug", slug), "invites");
    await must(admin.from("club_events").delete().eq("club_slug", slug), "events");
    await must(admin.from("club_interests").delete().eq("club_slug", slug), "interests");
    await must(admin.from("club_claims").delete().eq("club_slug", slug), "claims");
    await must(admin.from("club_profiles").delete().eq("club_slug", slug), "profiles");
    await must(admin.from("club_accounts").delete().eq("club_slug", slug), "accounts");
    await must(admin.from("club_activity").delete().eq("club_slug", slug), "activity");
    const { data: files } = await admin.storage.from("club-photos").list(slug);
    if (files?.length) {
      await admin.storage.from("club-photos").remove(files.map((file) => `${slug}/${file.name}`));
    }
  }
  // Decision messages for test claims on other clubs, then the claims themselves.
  for (const userId of [hiddenId, financeId]) {
    const { data: claims } = await admin.from("club_claims").select("club_slug").eq("user_id", userId);
    const claimed = (claims ?? []).map((row) => row.club_slug);
    if (claimed.length) {
      await must(admin.from("club_campaigns").delete().eq("audience", "system").in("club_slug", claimed), "messages");
    }
    await must(admin.from("club_claims").delete().eq("user_id", userId), "claims");
    await must(admin.from("club_invites").delete().eq("user_id", userId), "invites");
  }
  await must(admin.from("club_interests").delete().eq("user_id", financeId), "interests");
  await must(admin.from("club_interests").delete().eq("user_id", hiddenId), "interests");
  await must(admin.from("club_mutes").delete().eq("user_id", financeId), "mutes");
  await must(admin.from("club_mutes").delete().eq("user_id", hiddenId), "mutes");
  // Back to the state seed-dev leaves: the officer is on Data Science Club only.
  await must(
    admin.from("memberships").delete().eq("user_id", financeId).eq("club_slug", DS_CLUB),
    "memberships",
  );
  await must(
    admin.from("memberships").update({ role: "member", verified: false }).eq("user_id", financeId).eq("club_slug", FINANCE_CLUB),
    "memberships",
  );
  await must(
    admin.from("memberships").upsert({ user_id: officerId, club_slug: DS_CLUB, role: "officer", verified: true }),
    "memberships",
  );
  console.log("Reset: test clubs are unclaimed again.");
}

// Allowlist: the normal path, plus a second one for a different club.
await must(
  admin.from("officer_allowlist").upsert(
    [
      { email: OFFICER, club_slug: DS_CLUB },
      { email: FINANCE, club_slug: FINANCE_CLUB },
    ],
    { onConflict: "email,club_slug", ignoreDuplicates: true },
  ),
  "allowlist",
);

// A self-declared member so the Members tab has someone to confirm.
await must(
  admin
    .from("memberships")
    .upsert(
      { user_id: financeId, club_slug: DS_CLUB, role: "member", verified: false },
      { onConflict: "user_id,club_slug", ignoreDuplicates: true },
    ),
  "memberships",
);

// Sample analytics for Data Science Club only, so Finance Club shows the empty
// states. Hashes are random, so these rows belong to no account.
await must(
  admin.from("club_activity").delete().eq("club_slug", DS_CLUB).like("viewer_hash", "seed-%"),
  "activity",
);
const chicagoDay = (daysAgo) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(
    new Date(Date.now() - daysAgo * 86_400_000),
  );
const GROUPS = [
  { major: "Data Science", area: "computing", students: 26, save: 0.42 },
  { major: "Computer Science", area: "computing", students: 34, save: 0.24 },
  { major: "Statistics", area: "liberal-arts", students: 12, save: 0.33 },
  { major: "Finance", area: "business", students: 18, save: 0.03 },
  { major: "Marketing", area: "business", students: 2, save: 0 },
];
const rows = [];
GROUPS.forEach(({ major, area, students, save }, g) => {
  for (let i = 0; i < students; i++) {
    const viewer_hash = `seed-${randomBytes(12).toString("hex")}`;
    const seenAgo = (i * 3 + g * 5) % 28;
    const base = { club_slug: DS_CLUB, major, academic_area: area, viewer_hash };
    rows.push({ ...base, kind: "impression", day: chicagoDay(seenAgo) });
    if (i % 2 === 0) rows.push({ ...base, kind: "view", day: chicagoDay(Math.max(0, seenAgo - 1)) });
    if (i < Math.round(students * save)) rows.push({ ...base, kind: "save", day: chicagoDay(Math.max(0, seenAgo - 1)) });
    if (i % 9 === 0) rows.push({ ...base, kind: "lead", day: chicagoDay(Math.max(0, seenAgo - 1)) });
    if (i % 11 === 0) rows.push({ ...base, kind: "interested", day: chicagoDay(Math.max(0, seenAgo - 2)) });
    if (i % 17 === 0) rows.push({ ...base, kind: "join", day: chicagoDay(Math.max(0, seenAgo - 2)) });
  }
});
// A few signed-out visits, which the dashboard keeps apart from verified students.
for (let i = 0; i < 24; i++) {
  const viewer_hash = `seed-${randomBytes(12).toString("hex")}`;
  const base = { club_slug: DS_CLUB, viewer_hash, anonymous: true, day: chicagoDay(i) };
  rows.push({ ...base, kind: "impression", major: null, academic_area: null });
  if (i % 3 === 0) rows.push({ ...base, kind: "view", major: null, academic_area: null });
}
await must(admin.from("club_activity").insert(rows), "activity");

console.log(`Seeded 2 allowlist rows, 1 test member, ${rows.length} sample activity rows.`);

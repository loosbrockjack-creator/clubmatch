import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { allClubs, getClubSummary } from "./clubs";
import { authUsers, selectAll } from "./admin-server";
import type {
  AdminClaim,
  AdminClub,
  AdminDemand,
  AdminOverview,
  AdminReport,
  AdminStudent,
  ClaimStatus,
  ClubHealth,
  Count,
} from "./admin-types";

const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);
const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const clubName = (slug: string) => getClubSummary(slug)?.name ?? slug;

type ProfileRow = {
  id: string;
  display_name: string | null;
  major: string | null;
  class_year: string | null;
  onboarded: boolean;
  visible: boolean;
  created_at: string;
};
type UserClub = { user_id: string; club_slug: string; created_at: string };
type MembershipRow = { user_id: string; club_slug: string; role: string };
type AccountRow = {
  club_slug: string;
  status: "active" | "past_due" | "lapsed";
  claimed_by: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
};
type ClaimRow = {
  id: string;
  club_slug: string;
  email: string;
  role_title: string;
  note: string | null;
  status: ClaimStatus;
  created_at: string;
  reviewed_at: string | null;
};

function tally<T>(rows: T[], key: (row: T) => string | null | undefined): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = key(row);
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

const top = (counts: Map<string, number>, limit: number): Count[] =>
  [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);

async function claimViews(admin: SupabaseClient, days = 30) {
  const rows = await selectAll<{ club_slug: string; views: number }>(admin, "claim_page_views", "club_slug, views", {
    column: "day",
    iso: isoDay(daysAgo(days)),
  });
  const bySlug = new Map<string, number>();
  for (const row of rows) bySlug.set(row.club_slug, (bySlug.get(row.club_slug) ?? 0) + row.views);
  return bySlug;
}

async function pageViews(admin: SupabaseClient, days = 30) {
  const rows = await selectAll<{ club_slug: string; kind: string }>(admin, "club_activity", "club_slug, kind", {
    column: "day",
    iso: isoDay(daysAgo(days)),
  });
  return tally(
    rows.filter((row) => row.kind === "view"),
    (row) => row.club_slug,
  );
}

function clubHealth(row: AccountRow): ClubHealth {
  if (row.status === "lapsed") return "lapsed";
  if (row.status === "past_due") return "past_due";
  return row.cancel_at_period_end ? "canceling" : "active";
}

/* ---------- Claims ---------- */

export async function loadClaims(admin: SupabaseClient): Promise<AdminClaim[]> {
  const [rows, views] = await Promise.all([
    selectAll<ClaimRow>(admin, "club_claims", "id, club_slug, email, role_title, note, status, created_at, reviewed_at"),
    claimViews(admin),
  ]);
  const order = { pending: 0, approved: 1, rejected: 2 } as const;
  return rows
    .map((row) => ({
      id: row.id,
      clubSlug: row.club_slug,
      clubName: clubName(row.club_slug),
      email: row.email,
      role: row.role_title,
      note: row.note,
      status: row.status,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
      claimViews30d: views.get(row.club_slug) ?? 0,
    }))
    .sort((a, b) => order[a.status] - order[b.status] || b.createdAt.localeCompare(a.createdAt));
}

/* ---------- Students ---------- */

export async function loadStudents(admin: SupabaseClient): Promise<AdminStudent[]> {
  const [profiles, quiz, interests, saves, memberships, users] = await Promise.all([
    selectAll<ProfileRow>(admin, "profiles", "id, display_name, major, class_year, onboarded, visible, created_at"),
    selectAll<{ user_id: string }>(admin, "profile_private", "user_id, preferences").then((rows) =>
      new Set(
        (rows as { user_id: string; preferences: unknown }[])
          .filter((row) => row.preferences != null)
          .map((row) => row.user_id),
      ),
    ),
    selectAll<UserClub>(admin, "club_interests", "user_id, club_slug, created_at"),
    selectAll<UserClub>(admin, "saved_clubs", "user_id, club_slug, created_at"),
    selectAll<MembershipRow>(admin, "memberships", "user_id, club_slug, role"),
    authUsers(admin),
  ]);
  const interestCount = tally(interests, (row) => row.user_id);
  const saveCount = tally(saves, (row) => row.user_id);
  const officerOf = new Map<string, string[]>();
  for (const row of memberships) {
    if (row.role !== "officer") continue;
    officerOf.set(row.user_id, [...(officerOf.get(row.user_id) ?? []), clubName(row.club_slug)]);
  }
  return profiles
    .map((row) => {
      const auth = users.get(row.id);
      return {
        id: row.id,
        name: row.display_name,
        email: auth?.email ?? null,
        major: row.major,
        classYear: row.class_year,
        onboarded: row.onboarded,
        tookQuiz: quiz.has(row.id),
        visible: row.visible,
        interests: interestCount.get(row.id) ?? 0,
        saves: saveCount.get(row.id) ?? 0,
        officerOf: officerOf.get(row.id) ?? [],
        createdAt: row.created_at,
        lastSignIn: auth?.lastSignIn ?? null,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ---------- Clubs ---------- */

export async function loadClubs(admin: SupabaseClient): Promise<AdminClub[]> {
  const since = daysAgo(30).toISOString();
  const [accounts, profiles, events, memberships, interests, views] = await Promise.all([
    selectAll<AccountRow>(
      admin,
      "club_accounts",
      "club_slug, status, claimed_by, stripe_subscription_id, current_period_end, cancel_at_period_end, created_at",
    ),
    selectAll<{ club_slug: string; updated_at: string }>(admin, "club_profiles", "club_slug, updated_at"),
    selectAll<{ club_slug: string; created_at: string }>(admin, "club_events", "club_slug, created_at"),
    selectAll<MembershipRow>(admin, "memberships", "user_id, club_slug, role"),
    selectAll<UserClub>(admin, "club_interests", "user_id, club_slug, created_at", { column: "created_at", iso: since }),
    pageViews(admin),
  ]);
  const profileUpdated = new Map(profiles.map((row) => [row.club_slug, row.updated_at]));
  const lastEvent = new Map<string, string>();
  for (const row of events) {
    const prev = lastEvent.get(row.club_slug);
    if (!prev || row.created_at > prev) lastEvent.set(row.club_slug, row.created_at);
  }
  const officers = tally(
    memberships.filter((row) => row.role === "officer"),
    (row) => row.club_slug,
  );
  const members = tally(memberships, (row) => row.club_slug);
  const interestCount = tally(interests, (row) => row.club_slug);
  const soon = Date.now() + 14 * DAY;

  return accounts
    .map((row) => {
      const health = clubHealth(row);
      const lastEventAt = lastEvent.get(row.club_slug) ?? null;
      const profileUpdatedAt = profileUpdated.get(row.club_slug) ?? null;
      const recent = [lastEventAt, profileUpdatedAt].some((at) => at && at >= since);
      return {
        slug: row.club_slug,
        name: clubName(row.club_slug),
        health,
        paid: Boolean(row.stripe_subscription_id),
        payerGone: row.claimed_by === null,
        periodEnd: row.current_period_end,
        renewsSoon: Boolean(row.current_period_end && new Date(row.current_period_end).getTime() <= soon),
        lastEventAt,
        profileUpdatedAt,
        quiet: health !== "lapsed" && !recent,
        officers: officers.get(row.club_slug) ?? 0,
        members: members.get(row.club_slug) ?? 0,
        interests30d: interestCount.get(row.club_slug) ?? 0,
        views30d: views.get(row.club_slug) ?? 0,
        createdAt: row.created_at,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ---------- Demand ---------- */

export async function loadDemand(admin: SupabaseClient): Promise<AdminDemand[]> {
  const since = daysAgo(30).toISOString();
  const [accounts, interests, saves, views, claimViewCounts, pending] = await Promise.all([
    selectAll<{ club_slug: string; status: string }>(admin, "club_accounts", "club_slug, status"),
    selectAll<UserClub>(admin, "club_interests", "user_id, club_slug, created_at"),
    selectAll<UserClub>(admin, "saved_clubs", "user_id, club_slug, created_at"),
    pageViews(admin),
    claimViews(admin),
    selectAll<{ club_slug: string; status: string }>(admin, "club_claims", "club_slug, status"),
  ]);
  const running = new Set(accounts.filter((row) => row.status !== "lapsed").map((row) => row.club_slug));
  const pendingClaims = new Set(pending.filter((row) => row.status === "pending").map((row) => row.club_slug));
  const interestAll = tally(interests, (row) => row.club_slug);
  const interestRecent = tally(
    interests.filter((row) => row.created_at >= since),
    (row) => row.club_slug,
  );
  const saveAll = tally(saves, (row) => row.club_slug);
  const saveRecent = tally(
    saves.filter((row) => row.created_at >= since),
    (row) => row.club_slug,
  );

  return allClubs
    .filter((club) => !running.has(club.slug))
    .map((club) => {
      const row = {
        slug: club.slug,
        name: club.name,
        interests: interestAll.get(club.slug) ?? 0,
        interests30d: interestRecent.get(club.slug) ?? 0,
        saves: saveAll.get(club.slug) ?? 0,
        saves30d: saveRecent.get(club.slug) ?? 0,
        views30d: views.get(club.slug) ?? 0,
        claimViews30d: claimViewCounts.get(club.slug) ?? 0,
        pendingClaim: pendingClaims.has(club.slug),
      };
      // Interest is the strongest signal, a claim page visit means an officer is looking.
      const score = row.interests * 5 + row.saves * 3 + row.claimViews30d * 4 + row.views30d;
      return { ...row, score };
    })
    .filter((row) => row.score > 0 || row.pendingClaim)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 100);
}

/* ---------- Reports ---------- */

export async function loadReports(admin: SupabaseClient): Promise<AdminReport[]> {
  const rows = await selectAll<{ id: number; reporter: string; target: string; reason: string; created_at: string }>(
    admin,
    "reports",
    "id, reporter, target, reason, created_at",
  );
  if (rows.length === 0) return [];
  const ids = [...new Set(rows.flatMap((row) => [row.reporter, row.target]))];
  const [{ data: names }, users] = await Promise.all([
    admin.from("profiles").select("id, display_name").in("id", ids),
    authUsers(admin),
  ]);
  const nameById = new Map((names ?? []).map((row: { id: string; display_name: string | null }) => [row.id, row.display_name]));
  const person = (id: string) => ({ id, name: nameById.get(id) ?? null, email: users.get(id)?.email ?? null });
  return rows
    .map((row) => ({
      id: row.id,
      reason: row.reason,
      createdAt: row.created_at,
      reporter: person(row.reporter),
      target: person(row.target),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ---------- Overview ---------- */

function weekStart(date: Date) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7)); // Monday
  return day;
}

export async function loadOverview(admin: SupabaseClient): Promise<AdminOverview> {
  const [students, claims, clubs, views] = await Promise.all([
    loadStudents(admin),
    selectAll<{ status: ClaimStatus; created_at: string }>(admin, "club_claims", "status, created_at"),
    loadClubs(admin),
    claimViews(admin),
  ]);

  const now = Date.now();
  const last7 = students.filter((row) => now - new Date(row.createdAt).getTime() < 7 * DAY).length;
  const prev7 = students.filter((row) => {
    const age = now - new Date(row.createdAt).getTime();
    return age >= 7 * DAY && age < 14 * DAY;
  }).length;

  const thisWeek = weekStart(new Date());
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const start = new Date(thisWeek);
    start.setUTCDate(start.getUTCDate() - (11 - i) * 7);
    return isoDay(start);
  });
  const perWeek = tally(students, (row) => isoDay(weekStart(new Date(row.createdAt))));

  const pending = claims.filter((row) => row.status === "pending");
  return {
    generatedAt: new Date().toISOString(),
    students: {
      signedUp: students.length,
      onboarded: students.filter((row) => row.onboarded).length,
      tookQuiz: students.filter((row) => row.tookQuiz).length,
      interested: students.filter((row) => row.interests > 0).length,
      last7d: last7,
      prev7d: prev7,
    },
    weekly: weeks.map((week) => ({ weekStart: week, count: perWeek.get(week) ?? 0 })),
    majors: top(tally(students, (row) => row.major?.trim()), 10),
    classYears: top(tally(students, (row) => row.classYear), 6),
    claims: {
      pending: pending.length,
      approved: claims.filter((row) => row.status === "approved").length,
      rejected: claims.filter((row) => row.status === "rejected").length,
      oldestPendingAt: pending.map((row) => row.created_at).sort()[0] ?? null,
    },
    clubs: {
      active: clubs.filter((row) => row.health === "active").length,
      pastDue: clubs.filter((row) => row.health === "past_due").length,
      canceling: clubs.filter((row) => row.health === "canceling").length,
      lapsed: clubs.filter((row) => row.health === "lapsed").length,
      paid: clubs.filter((row) => row.paid && row.health !== "lapsed").length,
      quiet: clubs.filter((row) => row.quiet).length,
    },
    claimViews30d: [...views.values()].reduce((sum, n) => sum + n, 0),
  };
}

/* ---------- CSV ---------- */

function csvCell(value: unknown) {
  const text = value == null ? "" : Array.isArray(value) ? value.join("; ") : String(value);
  // Leading = + - @ would run as a formula in a spreadsheet.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: object[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) => headers.map((h) => csvCell((row as Record<string, unknown>)[h])).join(","));
  return [headers.join(","), ...lines].join("\n");
}

import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getClubSummary } from "./clubs";
import { getSupabaseAdmin } from "./supabase-admin";
import type { ClubStatus, LeadStudent } from "./club-types";

/**
 * Keep in sync with PUBLIC_PROFILE_COLUMNS in lib/account.ts. That module is a
 * client module ("use client"), so a route handler can't import a value from it.
 */
export const LEAD_COLUMNS =
  "id, display_name, major, class_year, avatar_url, avatar_preset, interests, looking_for";

export function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/** The verified user behind the request's token, or null. Never trusts client claims. */
export async function verifiedUser(request: Request, admin: SupabaseClient): Promise<User | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}

type Authed = { admin: SupabaseClient; user: User };

export async function requireUser(request: Request): Promise<Authed | Response> {
  const admin = getSupabaseAdmin();
  if (!admin) return fail(503, "Club tools aren't available right now.");
  const user = await verifiedUser(request, admin);
  if (!user) return fail(401, "Sign in to do that.");
  return { admin, user };
}

export type ClubAccountRow = {
  club_slug: string;
  status: "active" | "past_due" | "lapsed";
  claimed_by: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  featured_opt_in: boolean;
};

export async function getAccountRow(admin: SupabaseClient, slug: string) {
  const { data } = await admin.from("club_accounts").select("*").eq("club_slug", slug).maybeSingle();
  return (data as ClubAccountRow | null) ?? null;
}

/** The one definition of "paid up" lives in the database (club_is_active). */
export async function clubStatus(
  admin: SupabaseClient,
  slug: string,
  account: ClubAccountRow | null,
): Promise<ClubStatus> {
  if (!account) return "unclaimed";
  const { data } = await admin.rpc("club_is_active", { p_slug: slug });
  if (!data) return "lapsed";
  return account.status === "past_due" ? "past_due" : "active";
}

export async function isOfficer(admin: SupabaseClient, userId: string, slug: string) {
  const { data } = await admin
    .from("memberships")
    .select("role")
    .eq("user_id", userId)
    .eq("club_slug", slug)
    .maybeSingle();
  return data?.role === "officer";
}

type OfficerContext = Authed & {
  slug: string;
  account: ClubAccountRow | null;
  status: ClubStatus;
};

/**
 * The gate on every /api/manage route: a real token, a real club, an officer
 * row in the database, and a paid-up club. `allowLapsed` is only for the routes
 * a lapsed officer needs in order to see their status and renew.
 */
export async function requireOfficer(
  request: Request,
  slug: string,
  options: { allowLapsed?: boolean } = {},
): Promise<OfficerContext | Response> {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  if (!getClubSummary(slug)) return fail(404, "That club doesn't exist.");
  if (!(await isOfficer(auth.admin, auth.user.id, slug))) {
    return fail(403, "Only officers of this club can do that.");
  }
  const account = await getAccountRow(auth.admin, slug);
  const status = await clubStatus(auth.admin, slug, account);
  const active = status === "active" || status === "past_due";
  if (!active && !options.allowLapsed) {
    return fail(402, "This club's ClubMatch plan isn't active.");
  }
  return { ...auth, slug, account, status };
}

export async function readJson<T>(request: Request): Promise<Partial<T> | null> {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === "object" ? (body as Partial<T>) : null;
  } catch {
    return null;
  }
}

/** Fetches profiles by id in chunks, keeping only public columns. */
export async function publicProfiles(admin: SupabaseClient, ids: string[]) {
  const out = new Map<string, LeadStudent & { visible: boolean }>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await admin
      .from("profiles")
      .select(`${LEAD_COLUMNS}, visible`)
      .in("id", ids.slice(i, i + 200));
    for (const row of (data ?? []) as unknown as (LeadStudent & { visible: boolean })[]) {
      out.set(row.id, row);
    }
  }
  return out;
}

/** Drops the visibility flag so it never leaves the server. */
export function toLead(row: LeadStudent & { visible?: boolean }): LeadStudent {
  return {
    id: row.id,
    display_name: row.display_name,
    major: row.major,
    class_year: row.class_year,
    avatar_url: row.avatar_url,
    avatar_preset: row.avatar_preset,
    interests: row.interests,
    looking_for: row.looking_for,
  };
}

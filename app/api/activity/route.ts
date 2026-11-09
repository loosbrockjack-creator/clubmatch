import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getClubSummary } from "@/lib/clubs";
import { fail, readJson, verifiedUser } from "@/lib/club-server";
import { ACTIVITY_KINDS, RESULT_LIMIT, type ActivityKind } from "@/lib/club-types";
import { matchChapters, matchClubs } from "@/lib/matching";
import { ACADEMIC_AREA_BY_ID } from "@/lib/taxonomy";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Preferences } from "@/lib/types";

/**
 * Two kinds of numbers, kept apart on purpose.
 *
 * Signed in: the token proves who it is, each student counts once per club, and
 * the claim is checked (a match must really be in their results, a save really
 * in their list). These are the numbers clubs pay for.
 *
 * Signed out: anyone can invent a visitor id, so these can't be made
 * cheat-resistant. They're rate limited, flagged anonymous, limited to passive
 * kinds, and shown separately with a label saying they're unverified.
 */
const ANONYMOUS_KINDS: ActivityKind[] = ["impression", "view", "lead"];
const MAX_SLUGS = RESULT_LIMIT + 3;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const WINDOW_MS = 60_000;
const ANONYMOUS_PER_WINDOW = 8;
const SIGNED_IN_PER_WINDOW = 30;
const hits = new Map<string, { count: number; start: number }>();

/** Best effort per server instance, which is why signed-out numbers stay separate. */
function limited(key: string, max: number) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.start > WINDOW_MS) {
    if (hits.size > 5000) hits.clear();
    hits.set(key, { count: 1, start: now });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

/**
 * Vercel overwrites this header with the real client address and doesn't forward
 * external values (vercel.com/docs/headers/request-headers), so a client can't
 * set it there. Anywhere else nothing vouches for any header, so all signed-out
 * traffic shares one bucket rather than letting a client pick a new one.
 */
function anonymousBucket(request: Request) {
  if (!process.env.VERCEL) return "ip:shared";
  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim();
  return `ip:${ip || "unknown"}`;
}

/** Keyed per club, so it can't be reversed or joined across clubs. No user id is stored. */
function viewerHash(viewer: string, slug: string) {
  const secret = process.env.ACTIVITY_SALT || process.env.SUPABASE_SECRET_KEY || "";
  return createHmac("sha256", secret).update(`${slug}:${viewer}`).digest("hex").slice(0, 40);
}

/** The save reaches saved_clubs at about the same moment, so give it a moment to land. */
async function savedByUser(admin: SupabaseClient, userId: string, slugs: string[]) {
  for (let attempt = 0; ; attempt++) {
    const { data } = await admin
      .from("saved_clubs")
      .select("club_slug")
      .eq("user_id", userId)
      .in("club_slug", slugs);
    const saved = new Set((data ?? []).map((row) => row.club_slug as string));
    if (attempt >= 3 || slugs.every((slug) => saved.has(slug))) return saved;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}

type Body = { kind: string; slugs: unknown; visitor: unknown; area: unknown };

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return Response.json({ ok: false });

  const body = await readJson<Body>(request);
  const kind = body?.kind as ActivityKind;
  if (!ACTIVITY_KINDS.includes(kind)) return fail(400, "Unknown event.");
  if (!Array.isArray(body?.slugs) || body.slugs.length === 0 || body.slugs.length > MAX_SLUGS) {
    return fail(400, "Bad club list.");
  }
  const slugs = Array.from(new Set(body.slugs as unknown[])).filter(
    (slug): slug is string => typeof slug === "string" && Boolean(getClubSummary(slug)),
  );
  if (slugs.length === 0) return fail(400, "Unknown club.");

  const user = await verifiedUser(request, admin);

  if (!user) {
    if (!ANONYMOUS_KINDS.includes(kind)) return fail(401, "Sign in to do that.");
    const visitor = typeof body?.visitor === "string" && UUID.test(body.visitor) ? body.visitor : null;
    if (!visitor) return fail(400, "Missing visitor.");
    if (limited(anonymousBucket(request), ANONYMOUS_PER_WINDOW)) return fail(429, "Too many events.");
    const area = typeof body?.area === "string" && body.area in ACADEMIC_AREA_BY_ID ? body.area : null;
    return write(admin, slugs, kind, `v:${visitor}`, { major: null, area, anonymous: true });
  }

  if (limited(`user:${user.id}`, SIGNED_IN_PER_WINDOW)) return fail(429, "Too many events.");

  // The server reads major and answers itself instead of trusting the client.
  const [{ data: profile }, { data: priv }, { data: roles }] = await Promise.all([
    admin.from("profiles").select("major").eq("id", user.id).maybeSingle(),
    admin.from("profile_private").select("preferences").eq("user_id", user.id).maybeSingle(),
    admin.from("memberships").select("club_slug, role").eq("user_id", user.id).in("club_slug", slugs),
  ]);
  const prefs = (priv?.preferences as Preferences | null) ?? null;

  // Officers looking at their own club don't count toward their own numbers.
  const officerOf = new Set(
    (roles ?? []).filter((r) => r.role === "officer").map((r) => r.club_slug as string),
  );
  let counted = slugs.filter((slug) => !officerOf.has(slug));

  if (kind === "impression") {
    // Only clubs truly in this student's results count as a match.
    const shown = new Set(
      prefs
        ? [...matchClubs(prefs).slice(0, RESULT_LIMIT), ...matchChapters(prefs)].map((r) => r.club.slug)
        : [],
    );
    counted = counted.filter((slug) => shown.has(slug));
  } else if (kind === "join") {
    const joined = new Set((roles ?? []).map((r) => r.club_slug as string));
    counted = counted.filter((slug) => joined.has(slug));
  } else if (kind === "interested" && counted.length > 0) {
    const { data: interests } = await admin
      .from("club_interests")
      .select("club_slug")
      .eq("user_id", user.id)
      .in("club_slug", counted);
    const said = new Set((interests ?? []).map((r) => r.club_slug as string));
    counted = counted.filter((slug) => said.has(slug));
  } else if (kind === "save" && counted.length > 0) {
    const saved = await savedByUser(admin, user.id, counted);
    counted = counted.filter((slug) => saved.has(slug));
  }

  const area = prefs?.academicArea && prefs.academicArea in ACADEMIC_AREA_BY_ID ? prefs.academicArea : null;
  return write(admin, counted, kind, `u:${user.id}`, {
    major: (profile?.major as string | null) ?? null,
    area,
    anonymous: false,
  });
}

async function write(
  admin: SupabaseClient,
  slugs: string[],
  kind: ActivityKind,
  viewer: string,
  who: { major: string | null; area: string | null; anonymous: boolean },
) {
  if (slugs.length === 0) return Response.json({ ok: true, logged: 0 });
  const { error } = await admin.from("club_activity").upsert(
    slugs.map((slug) => ({
      club_slug: slug,
      kind,
      major: who.major,
      academic_area: who.area,
      anonymous: who.anonymous,
      viewer_hash: viewerHash(viewer, slug),
    })),
    { onConflict: "club_slug,kind,viewer_hash,day", ignoreDuplicates: true },
  );
  if (error) {
    console.error("club_activity insert failed:", error.message);
    return Response.json({ ok: false });
  }
  return Response.json({ ok: true, logged: slugs.length });
}

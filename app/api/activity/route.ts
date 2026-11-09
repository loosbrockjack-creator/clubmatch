import { createHmac } from "node:crypto";
import { getClubSummary } from "@/lib/clubs";
import { fail, readJson, verifiedUser } from "@/lib/club-server";
import { ACTIVITY_KINDS, type ActivityKind } from "@/lib/club-types";
import { ACADEMIC_AREA_BY_ID } from "@/lib/taxonomy";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MAX_SLUGS = 30;
const UUID = /^[0-9a-f-]{36}$/i;

/* Best effort per instance: keeps a loop from flooding the table. */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;
const hits = new Map<string, { count: number; start: number }>();

function limited(key: string) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.start > WINDOW_MS) {
    if (hits.size > 5000) hits.clear();
    hits.set(key, { count: 1, start: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

/**
 * Keyed per club, so the value counts distinct students for one club but can't
 * be reversed or joined across clubs. No user id is ever stored.
 */
function viewerHash(viewer: string, slug: string) {
  const secret = process.env.ACTIVITY_SALT || process.env.SUPABASE_SECRET_KEY || "";
  return createHmac("sha256", secret).update(`${slug}:${viewer}`).digest("hex").slice(0, 40);
}

type Body = { kind: string; slugs: unknown; visitor: unknown; area: unknown };

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return Response.json({ ok: false });

  const ip = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (limited(ip)) return fail(429, "Too many events.");

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
  const visitor = typeof body?.visitor === "string" && UUID.test(body.visitor) ? body.visitor : null;
  if (!user && !visitor) return fail(400, "Missing visitor.");

  let major: string | null = null;
  let area: string | null =
    typeof body?.area === "string" && body.area in ACADEMIC_AREA_BY_ID ? body.area : null;
  let counted = slugs;

  if (user) {
    // Signed in, the server reads major and area itself instead of trusting the client.
    const [{ data: profile }, { data: priv }, { data: roles }] = await Promise.all([
      admin.from("profiles").select("major").eq("id", user.id).maybeSingle(),
      admin.from("profile_private").select("preferences").eq("user_id", user.id).maybeSingle(),
      admin.from("memberships").select("club_slug, role").eq("user_id", user.id).in("club_slug", slugs),
    ]);
    major = (profile?.major as string | null) ?? null;
    const prefArea = (priv?.preferences as { academicArea?: string } | null)?.academicArea;
    if (prefArea && prefArea in ACADEMIC_AREA_BY_ID) area = prefArea;

    // Officers looking at their own club don't count toward their own numbers.
    const officerOf = new Set(
      (roles ?? []).filter((r) => r.role === "officer").map((r) => r.club_slug as string),
    );
    counted = slugs.filter((slug) => !officerOf.has(slug));

    if (kind === "join") {
      const joined = new Set((roles ?? []).map((r) => r.club_slug as string));
      counted = counted.filter((slug) => joined.has(slug));
    }
    if (kind === "interested") {
      const { data: interests } = await admin
        .from("club_interests")
        .select("club_slug")
        .eq("user_id", user.id)
        .in("club_slug", counted);
      const said = new Set((interests ?? []).map((r) => r.club_slug as string));
      counted = counted.filter((slug) => said.has(slug));
    }
  } else if (kind === "join" || kind === "interested") {
    return fail(401, "Sign in to do that.");
  }

  if (counted.length === 0) return Response.json({ ok: true, logged: 0 });

  const viewer = user ? `u:${user.id}` : `v:${visitor}`;
  const { error } = await admin.from("club_activity").upsert(
    counted.map((slug) => ({
      club_slug: slug,
      kind,
      major,
      academic_area: area,
      viewer_hash: viewerHash(viewer, slug),
    })),
    { onConflict: "club_slug,kind,viewer_hash,day", ignoreDuplicates: true },
  );
  if (error) {
    console.error("club_activity insert failed:", error.message);
    return Response.json({ ok: false });
  }
  return Response.json({ ok: true, logged: counted.length });
}

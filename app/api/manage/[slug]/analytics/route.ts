import { buildAnalytics, buildCompleteness, type ActivityRow } from "@/lib/club-insights";
import { fail, requireOfficer } from "@/lib/club-server";
import type { ClubOverlay } from "@/lib/club-types";
import { DEMO_INVITES, demoActivity, isDemoClub, withDemoProfile } from "@/lib/demo-club";

type Ctx = { params: Promise<{ slug: string }> };
const PAGE = 1000;
const ALLOWED_DAYS = [7, 30, 90];

const chicagoDay = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(date);

/** Aggregates only: viewer hashes stay on the server. */
export async function GET(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;
  const { admin } = ctx;

  const asked = Number(new URL(request.url).searchParams.get("days"));
  const days = ALLOWED_DAYS.includes(asked) ? asked : 30;
  const now = new Date();
  const since = chicagoDay(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000));

  const rows: ActivityRow[] = [];
  for (let from = 0; from < 100_000; from += PAGE) {
    const { data, error } = await admin
      .from("club_activity")
      .select("kind, major, academic_area, viewer_hash, day, anonymous")
      .eq("club_slug", slug)
      .gte("day", since)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) return fail(500, "Couldn't load analytics.");
    rows.push(...((data ?? []) as ActivityRow[]));
    if ((data?.length ?? 0) < PAGE) break;
  }

  const [{ data: overlay }, { data: upcoming }, { data: invites }, { data: interests }] = await Promise.all([
    admin
      .from("club_profiles")
      .select("tagline, description, meeting_info, photos, links")
      .eq("club_slug", slug)
      .maybeSingle(),
    admin.from("club_events").select("id").eq("club_slug", slug).gte("starts_at", now.toISOString()).limit(1),
    admin.from("club_invites").select("user_id, created_at").eq("club_slug", slug),
    admin.from("club_interests").select("user_id, created_at").eq("club_slug", slug),
  ]);
  if (isDemoClub(slug)) rows.push(...demoActivity(days, chicagoDay));
  const saidInterested = new Map((interests ?? []).map((row) => [row.user_id as string, row.created_at as string]));
  const inviteStats = {
    sent: invites?.length ?? 0,
    interested: (invites ?? []).filter((row) => {
      const at = saidInterested.get(row.user_id as string);
      return at !== undefined && at >= (row.created_at as string);
    }).length,
  };
  const profile = withDemoProfile(slug, overlay as { description?: string | null } | null) as Pick<
    ClubOverlay,
    "tagline" | "description" | "meeting_info" | "photos" | "links"
  > | null;

  return Response.json({
    ...buildAnalytics(
      rows,
      days,
      chicagoDay(now),
      buildCompleteness(profile, isDemoClub(slug) ? [{ id: "demo" }] : (upcoming ?? [])),
      Boolean(profile?.description),
    ),
    invites: isDemoClub(slug)
      ? { sent: inviteStats.sent + DEMO_INVITES.sent, interested: inviteStats.interested + DEMO_INVITES.interested }
      : inviteStats,
  });
}

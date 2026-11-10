import { getClubSummary } from "@/lib/clubs";
import { whyFit } from "@/lib/club-leads";
import { allowedForPrefs, MATCH_THRESHOLD, scoreForOfficers } from "@/lib/matching";
import {
  LEAD_COLUMNS,
  publicProfiles,
  requireOfficer,
  toLead,
} from "@/lib/club-server";
import { INVITE_DAILY_LIMIT, type GoodFitLead, type InterestedLead, type LeadStudent } from "@/lib/club-types";
import type { Preferences } from "@/lib/types";
import { demoGoodFit, demoInterested, isDemoClub } from "@/lib/demo-club";

type Ctx = { params: Promise<{ slug: string }> };
const PAGE = 500;
const MAX_LEADS = 60;

/**
 * Good-fit students are scored here with the secret key. Only public profile
 * columns and a whole-number match leave this route: never preferences, and
 * never scoreClub's reasons, which would spell out a student's quiz answers.
 */
export async function GET(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;
  const { admin } = ctx;
  const club = getClubSummary(slug)!;

  const { data: memberRows } = await admin.from("memberships").select("user_id").eq("club_slug", slug);
  const members = new Set((memberRows ?? []).map((row) => row.user_id as string));

  const { data: inviteRows } = await admin.from("club_invites").select("user_id, created_at").eq("club_slug", slug);
  const invited = new Set((inviteRows ?? []).map((row) => row.user_id as string));
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const sentToday = (inviteRows ?? []).filter((row) => new Date(row.created_at as string).getTime() > dayAgo).length;

  const goodFit: GoodFitLead[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data: rows, error } = await admin
      .from("profiles")
      .select(LEAD_COLUMNS)
      .eq("discoverable", true)
      .eq("visible", true)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) return Response.json({ error: "Couldn't load leads." }, { status: 500 });
    const page = (rows ?? []) as unknown as LeadStudent[];
    const candidates = page.filter((row) => !members.has(row.id));

    if (candidates.length > 0) {
      const { data: privateRows } = await admin
        .from("profile_private")
        .select("user_id, preferences")
        .in("user_id", candidates.map((row) => row.id));
      const prefs = new Map(
        (privateRows ?? []).map((row) => [row.user_id as string, row.preferences as Preferences | null]),
      );
      for (const student of candidates) {
        const answers = prefs.get(student.id);
        if (!answers?.academicArea || !allowedForPrefs(answers, club)) continue;
        const match = scoreForOfficers(answers, club);
        if (match >= MATCH_THRESHOLD) {
          goodFit.push({
            ...toLead(student),
            match,
            fit: whyFit(student.interests, club),
            invited: invited.has(student.id),
          });
        }
      }
    }
    if (page.length < PAGE) break;
  }
  goodFit.sort((a, b) => b.match - a.match || a.id.localeCompare(b.id));

  const { data: interestRows } = await admin
    .from("club_interests")
    .select("user_id, created_at")
    .eq("club_slug", slug)
    .order("created_at", { ascending: false })
    .limit(500);
  const interestProfiles = await publicProfiles(
    admin,
    (interestRows ?? []).map((row) => row.user_id as string),
  );
  const interested: InterestedLead[] = [];
  let hiddenInterested = 0;
  for (const row of interestRows ?? []) {
    const profile = interestProfiles.get(row.user_id as string);
    // A hidden profile is counted, so the officer knows, but never named.
    if (profile?.visible) {
      interested.push({
        ...toLead(profile),
        since: row.created_at as string,
        fit: whyFit(profile.interests, club),
      });
    }
    else hiddenInterested += 1;
  }

  if (isDemoClub(slug)) {
    goodFit.push(...demoGoodFit());
    goodFit.sort((a, b) => b.match - a.match || a.id.localeCompare(b.id));
    interested.push(...demoInterested());
  }

  return Response.json({
    goodFit: goodFit.slice(0, MAX_LEADS),
    goodFitTotal: goodFit.length,
    invitesLeftToday: Math.max(0, INVITE_DAILY_LIMIT - sentToday),
    interested,
    hiddenInterested,
  });
}

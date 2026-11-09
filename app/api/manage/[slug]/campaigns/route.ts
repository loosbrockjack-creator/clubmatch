import { fail, readJson, requireOfficer } from "@/lib/club-server";
import {
  CAMPAIGN_AUDIENCES,
  CAMPAIGN_DAILY_LIMIT,
  CAMPAIGN_WEEKLY_LIMIT,
  type CampaignAudience,
} from "@/lib/club-types";
import { cleanText, LIMITS } from "@/lib/club-validate";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;
  const { admin, user } = ctx;

  const [{ data: campaigns, error }, { data: members }, { data: interested }, { data: mutes }] =
    await Promise.all([
      admin
        .from("club_campaigns")
        .select("id, subject, body, audience, recipient_count, created_at")
        .eq("club_slug", slug)
        .order("created_at", { ascending: false })
        .limit(50),
      admin.from("memberships").select("user_id").eq("club_slug", slug),
      admin.from("club_interests").select("user_id").eq("club_slug", slug),
      admin.from("club_mutes").select("user_id").eq("club_slug", slug),
    ]);
  if (error) return fail(500, "Couldn't load campaigns.");

  const muted = new Set((mutes ?? []).map((row) => row.user_id as string));
  const reachable = (rows: { user_id: unknown }[] | null) =>
    new Set(
      (rows ?? [])
        .map((row) => row.user_id as string)
        .filter((id) => id !== user.id && !muted.has(id)),
    );
  const memberSet = reachable(members);
  const interestedSet = reachable(interested);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const inWeek = (campaigns ?? []).filter((c) => new Date(c.created_at as string).getTime() > weekAgo);
  const inDay = inWeek.filter((c) => new Date(c.created_at as string).getTime() > dayAgo);

  return Response.json({
    campaigns: campaigns ?? [],
    audienceCounts: {
      members: memberSet.size,
      interested: interestedSet.size,
      both: new Set([...memberSet, ...interestedSet]).size,
    },
    remaining: {
      day: Math.max(0, CAMPAIGN_DAILY_LIMIT - inDay.length),
      week: Math.max(0, CAMPAIGN_WEEKLY_LIMIT - inWeek.length),
    },
  });
}

export async function POST(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;

  const body = await readJson<{ subject: unknown; body: unknown; audience: unknown }>(request);
  const subject = cleanText(body?.subject, LIMITS.campaignSubject);
  const text = cleanText(body?.body, LIMITS.campaignBody);
  const audience = body?.audience as CampaignAudience;
  if (!subject) return fail(400, `Add a subject, up to ${LIMITS.campaignSubject} characters.`);
  if (!text) return fail(400, `Write a message, up to ${LIMITS.campaignBody} characters.`);
  if (!CAMPAIGN_AUDIENCES.includes(audience)) return fail(400, "Choose who should get this.");

  const { data, error } = await ctx.admin.rpc("send_club_campaign", {
    p_slug: slug,
    p_sender: ctx.user.id,
    p_subject: subject,
    p_body: text,
    p_audience: audience,
    p_daily_limit: CAMPAIGN_DAILY_LIMIT,
    p_weekly_limit: CAMPAIGN_WEEKLY_LIMIT,
  });
  if (error) {
    if (error.message.includes("rate_limit_day")) {
      return fail(429, `You've sent ${CAMPAIGN_DAILY_LIMIT} messages today. Try again tomorrow.`);
    }
    if (error.message.includes("rate_limit_week")) {
      return fail(429, `You've sent ${CAMPAIGN_WEEKLY_LIMIT} messages this week. Try again in a few days.`);
    }
    if (error.message.includes("no_recipients")) {
      return fail(409, "No one is in that audience yet, so nothing was sent.");
    }
    return fail(500, "Couldn't send that. Try again.");
  }
  const row = (data as { campaign_id: string; recipients: number }[])[0];
  return Response.json({ id: row.campaign_id, recipients: row.recipients });
}

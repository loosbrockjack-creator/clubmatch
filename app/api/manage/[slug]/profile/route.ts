import { getClub } from "@/lib/clubs-detail";
import { revalidateClub } from "@/lib/club-stripe";
import { fail, readJson, requireOfficer } from "@/lib/club-server";
import { cleanLinks, cleanText, LIMITS } from "@/lib/club-validate";

type Ctx = { params: Promise<{ slug: string }> };
const COLUMNS = "club_slug, tagline, description, meeting_info, photos, links, updated_at";

export async function GET(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;
  const { data } = await ctx.admin.from("club_profiles").select(COLUMNS).eq("club_slug", slug).maybeSingle();
  const club = getClub(slug);
  return Response.json({
    overlay: data ?? null,
    directory: {
      tagline: club?.tagline ?? "",
      description: club?.summary ?? "",
      meeting: club?.meetingDetail || club?.meetingFrequency || "",
    },
  });
}

type Body = { tagline: unknown; description: unknown; meeting_info: unknown; links: unknown };

export async function PUT(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;

  const body = await readJson<Body>(request);
  if (!body) return fail(400, "That didn't look right. Try again.");
  const tagline = cleanText(body.tagline, LIMITS.tagline);
  const description = cleanText(body.description, LIMITS.description);
  const meeting = cleanText(body.meeting_info, LIMITS.meetingInfo);
  if (tagline === false) return fail(400, `Keep the tagline to ${LIMITS.tagline} characters.`);
  if (description === false) return fail(400, `Keep the description to ${LIMITS.description} characters.`);
  if (meeting === false) return fail(400, `Keep meeting info to ${LIMITS.meetingInfo} characters.`);
  const links = cleanLinks(body.links ?? []);
  if (typeof links === "string") return fail(400, links);

  const { data, error } = await ctx.admin
    .from("club_profiles")
    .upsert({
      club_slug: slug,
      tagline,
      description,
      meeting_info: meeting,
      links,
      updated_by: ctx.user.id,
    })
    .select(COLUMNS)
    .single();
  if (error) return fail(500, "Couldn't save your changes. Try again.");
  revalidateClub(slug);
  return Response.json({ overlay: data });
}

import { fail, readJson, requireOfficer } from "@/lib/club-server";
import { cleanText, cleanUrl, LIMITS } from "@/lib/club-validate";

type Ctx = { params: Promise<{ slug: string }> };
const COLUMNS = "id, club_slug, title, description, location, link, starts_at, ends_at";
const MAX_UPCOMING = 40;

export async function GET(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;
  const { data, error } = await ctx.admin
    .from("club_events")
    .select(COLUMNS)
    .eq("club_slug", slug)
    .order("starts_at", { ascending: false })
    .limit(100);
  if (error) return fail(500, "Couldn't load events.");
  return Response.json({ events: data ?? [] });
}

type Body = {
  id: unknown;
  title: unknown;
  description: unknown;
  location: unknown;
  link: unknown;
  starts_at: unknown;
  ends_at: unknown;
};

function parseEvent(body: Partial<Body> | null, isNew: boolean) {
  const title = cleanText(body?.title, LIMITS.eventTitle);
  if (!title) return `Give the event a title, up to ${LIMITS.eventTitle} characters.`;
  const description = cleanText(body?.description, LIMITS.eventDescription);
  if (description === false) return `Keep the description to ${LIMITS.eventDescription} characters.`;
  const location = cleanText(body?.location, LIMITS.eventLocation);
  if (location === false) return `Keep the location to ${LIMITS.eventLocation} characters.`;

  let link: string | null = null;
  if (typeof body?.link === "string" && body.link.trim()) {
    link = cleanUrl(body.link);
    if (!link) return "That link isn't a valid web address.";
  }

  const start = new Date(typeof body?.starts_at === "string" ? body.starts_at : "");
  if (Number.isNaN(start.getTime())) return "Pick a start date and time.";
  if (isNew && start.getTime() < Date.now() - 5 * 60_000) return "The start time has already passed.";
  if (start.getTime() > Date.now() + 2 * 365 * 24 * 60 * 60_000) return "That date is too far out.";

  let endsAt: string | null = null;
  if (typeof body?.ends_at === "string" && body.ends_at) {
    const end = new Date(body.ends_at);
    if (Number.isNaN(end.getTime())) return "That end time isn't valid.";
    if (end < start) return "The event can't end before it starts.";
    endsAt = end.toISOString();
  }
  return { title, description, location, link, starts_at: start.toISOString(), ends_at: endsAt };
}

export async function POST(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;
  const event = parseEvent(await readJson<Body>(request), true);
  if (typeof event === "string") return fail(400, event);

  const { count } = await ctx.admin
    .from("club_events")
    .select("id", { count: "exact", head: true })
    .eq("club_slug", slug)
    .gte("starts_at", new Date().toISOString());
  if ((count ?? 0) >= MAX_UPCOMING) return fail(429, `A club can have ${MAX_UPCOMING} upcoming events at most.`);

  const { data, error } = await ctx.admin
    .from("club_events")
    .insert({ ...event, club_slug: slug, created_by: ctx.user.id })
    .select(COLUMNS)
    .single();
  if (error) return fail(500, "Couldn't save the event. Try again.");
  return Response.json({ event: data });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;
  const body = await readJson<Body>(request);
  if (typeof body?.id !== "string") return fail(400, "Which event?");
  const event = parseEvent(body, false);
  if (typeof event === "string") return fail(400, event);
  // Scoped to this club, so an id from another club's event matches nothing.
  const { data, error } = await ctx.admin
    .from("club_events")
    .update(event)
    .eq("id", body.id)
    .eq("club_slug", slug)
    .select(COLUMNS)
    .maybeSingle();
  if (error) return fail(400, "Couldn't save the event. Try again.");
  if (!data) return fail(404, "That event isn't on this club.");
  return Response.json({ event: data });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;
  const body = await readJson<{ id: unknown }>(request);
  if (typeof body?.id !== "string") return fail(400, "Which event?");
  const { data, error } = await ctx.admin
    .from("club_events")
    .delete()
    .eq("id", body.id)
    .eq("club_slug", slug)
    .select("id");
  if (error) return fail(400, "Couldn't remove the event. Try again.");
  if (!data?.length) return fail(404, "That event isn't on this club.");
  return Response.json({ ok: true });
}

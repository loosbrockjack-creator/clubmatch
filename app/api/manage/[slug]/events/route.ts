import { demoEvents, isDemoClub, isDemoId } from "@/lib/demo-club";
import { fail, readJson, requireOfficer } from "@/lib/club-server";
import { cleanText, cleanUrl, LIMITS } from "@/lib/club-validate";
import { EVENT_COLUMNS, EVENT_COLUMNS_LEGACY } from "@/lib/club-types";
import { eventPhotoPath, removeEventPhoto, type Admin } from "@/lib/event-photos";

type Ctx = { params: Promise<{ slug: string }> };
const MAX_UPCOMING = 40;
/** Postgres "undefined column": migration 0014 (event photos) hasn't run yet. */
const NO_PHOTO_COLUMN = "42703";

export async function GET(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;
  const run = (columns: string) =>
    ctx.admin
      .from("club_events")
      .select(columns)
      .eq("club_slug", slug)
      .order("starts_at", { ascending: false })
      .limit(100);
  let { data, error } = await run(EVENT_COLUMNS);
  if (error?.code === NO_PHOTO_COLUMN) ({ data, error } = await run(EVENT_COLUMNS_LEGACY));
  if (error) return fail(500, "Couldn't load events.");
  const events = [...((data ?? []) as unknown as { starts_at: string }[]), ...(isDemoClub(slug) ? demoEvents(slug) : [])].sort((a, b) =>
    b.starts_at.localeCompare(a.starts_at),
  );
  return Response.json({ events });
}

type Body = {
  id: unknown;
  title: unknown;
  description: unknown;
  location: unknown;
  link: unknown;
  starts_at: unknown;
  ends_at: unknown;
  photo: unknown;
};

function parseEvent(body: Partial<Body> | null, isNew: boolean, slug: string) {
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

  // Only a photo uploaded into this club's own events folder is accepted.
  let photo: string | null = null;
  if (typeof body?.photo === "string" && body.photo) {
    if (!eventPhotoPath(body.photo, slug)) return "That photo didn't upload correctly. Add it again.";
    photo = body.photo;
  }
  return { title, description, location, link, starts_at: start.toISOString(), ends_at: endsAt, photo };
}

type ParsedEvent = Exclude<ReturnType<typeof parseEvent>, string>;

/**
 * Runs an insert or update with the photo column, falling back to the
 * columns that existed before migration 0014 when it hasn't run yet. An event
 * with a photo can't be saved until then, so that case says so.
 */
async function writeEvent(
  event: ParsedEvent,
  write: (row: Partial<ParsedEvent>, columns: string) => PromiseLike<{ data: unknown; error: { code?: string } | null }>,
) {
  const first = await write(event, EVENT_COLUMNS);
  if (first.error?.code !== NO_PHOTO_COLUMN) return { ...first, photoUnsupported: false };
  if (event.photo) return { data: null, error: null, photoUnsupported: true };
  const { photo: _photo, ...legacy } = event;
  void _photo;
  return { ...(await write(legacy, EVENT_COLUMNS_LEGACY)), photoUnsupported: false };
}

async function currentPhoto(admin: Admin, slug: string, id: string) {
  const { data } = await admin.from("club_events").select("photo").eq("id", id).eq("club_slug", slug).maybeSingle();
  return (data?.photo as string | null | undefined) ?? null;
}

const PHOTO_PENDING = "Event photos aren't switched on yet. Remove the photo to post this now.";

export async function POST(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;
  const event = parseEvent(await readJson<Body>(request), true, slug);
  if (typeof event === "string") return fail(400, event);

  const { count } = await ctx.admin
    .from("club_events")
    .select("id", { count: "exact", head: true })
    .eq("club_slug", slug)
    .gte("starts_at", new Date().toISOString());
  if ((count ?? 0) >= MAX_UPCOMING) return fail(429, `A club can have ${MAX_UPCOMING} upcoming events at most.`);

  const { data, error, photoUnsupported } = await writeEvent(event, (row, columns) =>
    ctx.admin
      .from("club_events")
      .insert({ ...row, club_slug: slug, created_by: ctx.user.id })
      .select(columns)
      .single(),
  );
  if (photoUnsupported) return fail(409, PHOTO_PENDING);
  if (error) return fail(500, "Couldn't save the event. Try again.");
  return Response.json({ event: data });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;
  const body = await readJson<Body>(request);
  if (typeof body?.id !== "string") return fail(400, "Which event?");
  if (isDemoId(body.id)) return fail(409, "This is a sample from the demo, so it can't be changed.");
  const event = parseEvent(body, false, slug);
  if (typeof event === "string") return fail(400, event);
  const id = body.id;
  const previousPhoto = await currentPhoto(ctx.admin, slug, id);
  // Scoped to this club, so an id from another club's event matches nothing.
  const { data, error, photoUnsupported } = await writeEvent(event, (row, columns) =>
    ctx.admin.from("club_events").update(row).eq("id", id).eq("club_slug", slug).select(columns).maybeSingle(),
  );
  if (photoUnsupported) return fail(409, PHOTO_PENDING);
  if (error) return fail(400, "Couldn't save the event. Try again.");
  if (!data) return fail(404, "That event isn't on this club.");
  if (previousPhoto && previousPhoto !== event.photo) await removeEventPhoto(ctx.admin, previousPhoto, slug);
  return Response.json({ event: data });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;
  const body = await readJson<{ id: unknown }>(request);
  if (typeof body?.id !== "string") return fail(400, "Which event?");
  if (isDemoId(body.id)) return fail(409, "This is a sample from the demo, so it can't be changed.");
  const photo = await currentPhoto(ctx.admin, slug, body.id);
  const { data, error } = await ctx.admin
    .from("club_events")
    .delete()
    .eq("id", body.id)
    .eq("club_slug", slug)
    .select("id");
  if (error) return fail(400, "Couldn't remove the event. Try again.");
  if (!data?.length) return fail(404, "That event isn't on this club.");
  if (photo) await removeEventPhoto(ctx.admin, photo, slug);
  return Response.json({ ok: true });
}

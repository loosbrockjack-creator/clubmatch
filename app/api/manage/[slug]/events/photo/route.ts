import { randomUUID } from "node:crypto";
import { fail, requireOfficer } from "@/lib/club-server";
import { sniffImage } from "@/lib/club-validate";
import { EVENT_PHOTO_BUCKET } from "@/lib/event-photos";

type Ctx = { params: Promise<{ slug: string }> };
/** Matches the club-photos bucket's own file size limit. */
const MAX_BYTES = 3 * 1024 * 1024;
const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

/**
 * Uploads a photo for an event that's being written. It only returns the URL:
 * the photo goes on the event when the officer saves it, and the events route
 * checks the URL is in this club's folder before accepting it.
 */
export async function POST(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;

  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) return fail(400, "Choose a photo first.");
  if (file.size > MAX_BYTES) return fail(400, "That photo is over 3 MB. Try a smaller one.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = sniffImage(bytes);
  if (!ext) return fail(400, "Use a JPG, PNG, or WebP image.");

  const path = `${slug}/events/${randomUUID()}.${ext}`;
  const { error } = await ctx.admin.storage.from(EVENT_PHOTO_BUCKET).upload(path, bytes, {
    contentType: TYPES[ext],
    cacheControl: "31536000",
  });
  if (error) return fail(500, "Couldn't upload that photo. Try again.");
  return Response.json({ url: ctx.admin.storage.from(EVENT_PHOTO_BUCKET).getPublicUrl(path).data.publicUrl });
}

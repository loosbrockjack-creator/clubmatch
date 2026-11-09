import { randomUUID } from "node:crypto";
import { revalidateClub } from "@/lib/club-stripe";
import { fail, readJson, requireOfficer } from "@/lib/club-server";
import { LIMITS, sniffImage } from "@/lib/club-validate";

type Ctx = { params: Promise<{ slug: string }> };
const BUCKET = "club-photos";
const MAX_BYTES = 3 * 1024 * 1024;
const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

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

  const { data: row } = await ctx.admin.from("club_profiles").select("photos").eq("club_slug", slug).maybeSingle();
  const photos = (row?.photos as string[] | undefined) ?? [];
  if (photos.length >= LIMITS.photos) return fail(400, `You can have up to ${LIMITS.photos} photos. Remove one first.`);

  const path = `${slug}/${randomUUID()}.${ext}`;
  const { error: uploadError } = await ctx.admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: TYPES[ext],
    cacheControl: "31536000",
  });
  if (uploadError) return fail(500, "Couldn't upload that photo. Try again.");

  const url = ctx.admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const next = [...photos, url];
  const { error } = await ctx.admin
    .from("club_profiles")
    .upsert({ club_slug: slug, photos: next, updated_by: ctx.user.id });
  if (error) {
    await ctx.admin.storage.from(BUCKET).remove([path]);
    return fail(500, "Couldn't save that photo. Try again.");
  }
  revalidateClub(slug);
  return Response.json({ photos: next });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;

  const body = await readJson<{ url: unknown }>(request);
  const { data: row } = await ctx.admin.from("club_profiles").select("photos").eq("club_slug", slug).maybeSingle();
  const photos = (row?.photos as string[] | undefined) ?? [];
  // Only a photo already on this club's list can be removed.
  if (typeof body?.url !== "string" || !photos.includes(body.url)) return fail(404, "That photo isn't on this page.");

  const next = photos.filter((url) => url !== body.url);
  const { error } = await ctx.admin.from("club_profiles").update({ photos: next }).eq("club_slug", slug);
  if (error) return fail(500, "Couldn't remove that photo. Try again.");
  const marker = `/${BUCKET}/`;
  const path = body.url.slice(body.url.indexOf(marker) + marker.length);
  if (path.startsWith(`${slug}/`)) await ctx.admin.storage.from(BUCKET).remove([path]);
  revalidateClub(slug);
  return Response.json({ photos: next });
}

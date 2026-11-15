import type { SupabaseClient } from "@supabase/supabase-js";

export type Admin = SupabaseClient;

/** Event photos share the club-photos bucket, in each club's events/ folder. */
export const EVENT_PHOTO_BUCKET = "club-photos";

/**
 * The storage path inside the bucket for a public event-photo URL, or null
 * when the URL isn't one of this club's event photos. Used both to accept a
 * photo on an event and to make sure cleanup only ever deletes the club's own.
 */
export function eventPhotoPath(url: string, slug: string): string | null {
  const marker = `/storage/v1/object/public/${EVENT_PHOTO_BUCKET}/`;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : null;
  if (parsed.protocol !== "https:" || parsed.host !== supabaseHost) return null;
  if (!parsed.pathname.startsWith(marker) || parsed.search || parsed.hash) return null;
  const path = parsed.pathname.slice(marker.length);
  return /^[a-z0-9-]+\/events\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path) && path.startsWith(`${slug}/events/`)
    ? path
    : null;
}

/** Deletes an event photo file. Failure is ignored: the event change already saved. */
export async function removeEventPhoto(admin: Admin, url: string, slug: string) {
  const path = eventPhotoPath(url, slug);
  if (path) await admin.storage.from(EVENT_PHOTO_BUCKET).remove([path]);
}

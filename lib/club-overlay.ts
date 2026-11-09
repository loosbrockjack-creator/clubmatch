import type { ClubOverlay } from "./club-types";

/**
 * Reads a club's officer edits for the server-rendered club page, through the
 * public REST API with the publishable key, so row-level security applies: a
 * row comes back only while the club is active. A lapsed club returns nothing
 * and its page falls back to the directory record, with the data kept.
 *
 * fetch() rather than supabase-js so Next's data cache and tags apply: pages
 * stay statically generated (ISR), refresh every REVALIDATE_SECONDS, and an
 * officer's save revalidates its page straight away (see revalidateClub).
 * Never throws, because a Supabase outage must not fail a build or blank a page.
 */
export const REVALIDATE_SECONDS = 60;

export const overlayTag = (slug: string) => `club-overlay:${slug}`;

const COLUMNS = "club_slug,tagline,description,meeting_info,photos,links,updated_at";

function endpoint() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { base: `${url}/rest/v1/club_profiles`, key } : null;
}

let buildOverlays: Promise<Map<string, ClubOverlay>> | null = null;

/** One query per build worker instead of one per page across 731 pages. */
function allOverlaysForBuild() {
  buildOverlays ??= (async () => {
    const api = endpoint();
    const map = new Map<string, ClubOverlay>();
    if (!api) return map;
    try {
      const res = await fetch(`${api.base}?select=${COLUMNS}`, {
        headers: { apikey: api.key, Authorization: `Bearer ${api.key}` },
        next: { revalidate: REVALIDATE_SECONDS },
      });
      if (res.ok) for (const row of (await res.json()) as ClubOverlay[]) map.set(row.club_slug, row);
    } catch {
      // Build carries on with the directory data.
    }
    return map;
  })();
  return buildOverlays;
}

export async function getClubOverlay(slug: string): Promise<ClubOverlay | null> {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return (await allOverlaysForBuild()).get(slug) ?? null;
  }
  const api = endpoint();
  if (!api) return null;
  try {
    const res = await fetch(
      `${api.base}?select=${COLUMNS}&club_slug=eq.${encodeURIComponent(slug)}&limit=1`,
      {
        headers: { apikey: api.key, Authorization: `Bearer ${api.key}` },
        next: { revalidate: REVALIDATE_SECONDS, tags: [overlayTag(slug)] },
      },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as ClubOverlay[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

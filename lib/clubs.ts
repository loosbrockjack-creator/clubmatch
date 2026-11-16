import clubIndex from "@/data/clubs-index.json";
import { localDemo } from "@/lib/local-demo";
import type { ClubSummary } from "./types";

/**
 * Every registered Iowa State student organization, scraped from
 * stuorg.iastate.edu. Regenerate with `npm run build:clubs`.
 *
 * This is the light record the browser gets: enough for search, filtering, and
 * match scoring. Full club prose lives in data/clubs.json and is reachable only
 * through lib/clubs-detail.ts, which server components import. Keeping the two
 * apart is what stops roughly a megabyte of text from shipping to the client.
 */
// Plus any local-only demo club (empty on the live site, see lib/local-demo.ts).
export const clubs = [...(clubIndex as ClubSummary[]), ...localDemo.clubs];

export const clubBySlug = new Map(clubs.map((club) => [club.slug, club]));

export function getClubSummary(slug: string): ClubSummary | undefined {
  return clubBySlug.get(slug);
}

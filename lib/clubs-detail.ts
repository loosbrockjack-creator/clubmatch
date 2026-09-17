import fullClubs from "@/data/clubs.json";
import type { Club } from "./types";

/**
 * The full club records, including every prose field the club page renders.
 *
 * Import this from server components only. A client component that pulls it in
 * drags the whole dataset into the browser bundle; use lib/clubs.ts there.
 */
const bySlug = new Map((fullClubs as Club[]).map((club) => [club.slug, club]));

export function getClub(slug: string): Club | undefined {
  return bySlug.get(slug);
}

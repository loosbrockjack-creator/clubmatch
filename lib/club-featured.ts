/** How many Featured clubs Explore shows at once. */
export const FEATURED_SLOTS = 3;
const WINDOW_MS = 6 * 60 * 60 * 1000;

/**
 * Fair rotation: every opted-in club gets the same share of Explore over time.
 * Each six hour window moves the slots along one club, in a fixed order, so no
 * one is favored and nothing depends on who paid first or on match scores.
 */
export function rotateFeatured<T extends { club_slug: string }>(
  clubs: T[],
  now: number,
  slots = FEATURED_SLOTS,
): T[] {
  if (clubs.length <= slots) return clubs;
  const sorted = [...clubs].sort((a, b) => a.club_slug.localeCompare(b.club_slug));
  const start = Math.floor(now / WINDOW_MS) % sorted.length;
  return Array.from({ length: slots }, (_, i) => sorted[(start + i) % sorted.length]);
}

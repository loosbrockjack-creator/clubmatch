/** Share and search text. Used by the club page and the panel's share preview, so they agree. */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://clubmatch-puce.vercel.app";

const MAX_DESCRIPTION = 160;

function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= MAX_DESCRIPTION) return flat;
  const head = flat.slice(0, MAX_DESCRIPTION);
  const sentence = head.match(/^.*[.!?](?=\s)/)?.[0];
  if (sentence && sentence.length >= 60) return sentence;
  return `${head.slice(0, head.lastIndexOf(" ")).replace(/[,;:]$/, "")}...`;
}

/** The officer's tagline, then their description, then the directory's line. */
export function shareDescription(
  tagline: string | null | undefined,
  description: string | null | undefined,
  directory: string,
): string {
  return tagline?.trim() || (description?.trim() ? excerpt(description) : directory);
}

export const shareTitle = (clubName: string) => `${clubName} at Iowa State`;
export const clubUrl = (slug: string) => `${SITE_URL}/clubs/${slug}`;

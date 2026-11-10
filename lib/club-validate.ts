/** Input cleaning for officer-entered content. Pure, so server and forms agree. */
import type { ClubLink } from "./club-types";

export const LIMITS = {
  tagline: 160,
  description: 4000,
  meetingInfo: 500,
  links: 6,
  linkLabel: 40,
  photos: 6,
  eventTitle: 120,
  eventDescription: 1000,
  eventLocation: 160,
  campaignSubject: 120,
  campaignBody: 2000,
  claimRole: 80,
  claimNote: 500,
  inviteNote: 200,
} as const;

/** Trimmed text or null. Reports `false` when it's over the limit. */
export function cleanText(value: unknown, max: number): string | null | false {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return false;
  const text = value.replace(/\r\n/g, "\n").trim();
  if (text.length > max) return false;
  return text || null;
}

/** http(s) URLs only, so no javascript: or data: links can reach a club page. */
export function cleanUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || raw.length > 500) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function cleanLinks(value: unknown): ClubLink[] | string {
  if (!Array.isArray(value)) return "Links weren't in the right format.";
  if (value.length > LIMITS.links) return `Add up to ${LIMITS.links} links.`;
  const links: ClubLink[] = [];
  for (const entry of value as { label?: unknown; url?: unknown }[]) {
    const url = cleanUrl(entry?.url);
    if (!url) return `"${String(entry?.url ?? "").slice(0, 60)}" isn't a valid web address.`;
    const label = cleanText(entry?.label, LIMITS.linkLabel);
    if (label === false) return `Link labels can be ${LIMITS.linkLabel} characters at most.`;
    links.push({ label: label ?? new URL(url).hostname.replace(/^www\./, ""), url });
  }
  return links;
}

/** Sniffs real image bytes, so a renamed SVG or HTML file can't become a club photo. */
export function sniffImage(bytes: Uint8Array): "jpg" | "png" | "webp" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

/**
 * Profile links: parsing, validation, and display. `links` is student-written
 * JSON that any client can write straight to the database, so everything that
 * renders a link goes through resolveProfileLinks and nothing else.
 */

export type LinkKind = "github" | "linkedin" | "instagram" | "handshake" | "behance" | "site";

export const LINK_LABEL_MAX = 40;
const URL_MAX = 500;

const BRANDS: { kind: LinkKind; domain: string; name: string }[] = [
  { kind: "github", domain: "github.com", name: "GitHub" },
  { kind: "linkedin", domain: "linkedin.com", name: "LinkedIn" },
  { kind: "instagram", domain: "instagram.com", name: "Instagram" },
  { kind: "handshake", domain: "joinhandshake.com", name: "Handshake" },
  { kind: "behance", domain: "behance.net", name: "Behance" },
];

/** Whitespace, control characters, and backslashes never appear in a real link. */
const UNSAFE_CHARS = /[\s\u0000-\u001f\u007f\\]/;
const HTTP_PREFIX = /^https?:\/\//i;
const TOP_LEVEL_LABEL = /^(xn--[a-z0-9-]+|[a-z]{2,})$/;

/**
 * Returns a clean https URL, or null for anything else: javascript:, data:,
 * mailto:, relative paths, embedded credentials, bare hosts, non-strings.
 * http links are upgraded rather than dropped, since older profiles have them.
 */
export function safeLinkUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > URL_MAX) return null;
  if (UNSAFE_CHARS.test(value) || !HTTP_PREFIX.test(value)) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (parsed.username || parsed.password) return null;
  const labels = parsed.hostname.split(".");
  if (labels.length < 2 || !TOP_LEVEL_LABEL.test(labels[labels.length - 1])) return null;
  parsed.protocol = "https:";
  return parsed.href;
}

/** Turns what a student typed into a stored URL, or a message saying what's wrong. */
export function normalizeLinkInput(raw: string): { url: string } | { error: string } {
  const value = raw.trim();
  if (value.startsWith("@")) {
    return { error: "Paste the full link, like instagram.com/you." };
  }
  // "name.com:8080/x" looks like a scheme but is a host with a port.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) && !/^[^/:]+\.[^/:]+:\d+(\/|$)/.test(value);
  if (hasScheme && !HTTP_PREFIX.test(value)) {
    return { error: "Links need to start with https://." };
  }
  const url = safeLinkUrl(HTTP_PREFIX.test(value) ? value : `https://${value}`);
  return url ? { url } : { error: "That link doesn't look right. Try something like yoursite.com." };
}

function brandFor(hostname: string) {
  const host = hostname.toLowerCase();
  return BRANDS.find((b) => host === b.domain || host.endsWith(`.${b.domain}`));
}

/** The icon to show for a link, matched on the real hostname only. */
export function linkKind(url: string | null): LinkKind {
  if (!url) return "site";
  return brandFor(new URL(url).hostname)?.kind ?? "site";
}

export function linkKindName(kind: LinkKind): string {
  return BRANDS.find((b) => b.kind === kind)?.name ?? "Website";
}

export type ResolvedLink = {
  href: string;
  kind: LinkKind;
  /** The student's label, or the service name. */
  title: string;
  /** Where the link really goes. Always derived from the URL, never the label. */
  detail: string;
};

function linkDetail(url: URL, isBrand: boolean): string {
  const host = url.hostname.replace(/^www\./, "");
  const path = url.pathname.replace(/\/+$/, "");
  if (!isBrand) return `${host}${path}`;
  const handle = path.replace(/^\/(in|company)\//, "/").replace(/^\//, "");
  return handle || host;
}

function cleanLabel(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const label = value.trim().slice(0, LINK_LABEL_MAX);
  return label || undefined;
}

/** Reads `profiles.links` defensively. Anything unsafe or malformed is dropped. */
export function resolveProfileLinks(value: unknown): ResolvedLink[] {
  if (!Array.isArray(value)) return [];
  const links: ResolvedLink[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const { url, label } = entry as { url?: unknown; label?: unknown };
    const href = safeLinkUrl(url);
    if (!href) continue;
    const parsed = new URL(href);
    const brand = brandFor(parsed.hostname);
    links.push({
      href,
      kind: brand?.kind ?? "site",
      title: cleanLabel(label) ?? brand?.name ?? "Website",
      detail: linkDetail(parsed, Boolean(brand)),
    });
    if (links.length === 5) break;
  }
  return links;
}

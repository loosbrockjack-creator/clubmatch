/**
 * Server-only AI plumbing for Smart Match: the resume reader, the
 * "Anything specific?" box, and AI-written "why it fits" lines.
 *
 * Everything here is optional. With no ANTHROPIC_API_KEY the quiz hides the AI
 * parts and the routes answer 404, so the site works the same without a key.
 * AI never ranks clubs; lib/matching.ts does, deterministically.
 */
import Anthropic from "@anthropic-ai/sdk";
import { clubs } from "./clubs";

export const AI_MODEL = "claude-haiku-5-5";

/** Vercel rejects function bodies over 4.5 MB, so uploads stop at 4. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/**
 * Per IP per hour. Generous because a whole class on campus Wi-Fi can share
 * one IP; the Anthropic console spend cap is the real ceiling.
 */
export const RATE_LIMITS = { resume: 40, interests: 120, reasons: 120 } as const;

/** Reads a JSON body, refusing anything larger than `maxBytes`. */
export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return null;
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;

export function aiClient(): Anthropic {
  // 15s per attempt, one retry: a student is waiting on every one of these.
  client ??= new Anthropic({ timeout: 15_000, maxRetries: 1 });
  return client;
}

/** Every topic keyword any club carries. The text box can only map onto these. */
export const TOPIC_VOCAB: string[] = Array.from(
  new Set(clubs.flatMap((club) => club.topics.map((t) => t.toLowerCase()))),
).sort();

const TOPIC_SET = new Set(TOPIC_VOCAB);

export function knownTopics(topics: unknown[]): string[] {
  return Array.from(
    new Set(
      topics
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.toLowerCase().trim()),
    ),
  ).filter((t) => TOPIC_SET.has(t));
}

/* ---- rate limiting ---------------------------------------------------------
 * Best effort and per server instance: enough to stop one person from looping
 * a request and running up the bill. The Anthropic console spend cap is the
 * hard backstop.
 */
const buckets = new Map<string, number[]>();

export function rateLimited(request: Request, route: string, limit: number, windowMs: number) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const key = `${route}:${ip}`;
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 5000) {
    for (const [k, times] of buckets) {
      if (times.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return false;
}

/** House style: no em or en dashes in anything shown to students. */
export function noDashes(text: string): string {
  return text
    .replace(/(\d)\s*[—–]\s*(\d)/g, "$1-$2")
    .replace(/\s*[—–]\s*/g, ", ")
    .trim();
}

export function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

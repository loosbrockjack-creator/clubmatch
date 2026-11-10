import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  AI_MODEL,
  RATE_LIMITS,
  aiClient,
  aiEnabled,
  json,
  knownTopics,
  noDashes,
  rateLimited,
  readJsonBody,
} from "@/lib/ai";
import { getClub } from "@/lib/clubs-detail";
import { resumeTopicsFor, scoreClub, topicsFor, wantsFor } from "@/lib/matching";
import {
  ACADEMIC_AREA_BY_ID,
  CAREER_BY_ID,
  COMMITMENT_BY_ID,
  COMMITMENT_TEXT,
  WANT_BY_ID,
  areasFor,
} from "@/lib/taxonomy";
import type { AcademicAreaId, Club, Preferences } from "@/lib/types";

/**
 * One personal "why it fits" line per club on the first page of results.
 * Results render the rule-based reasons first and swap these in when they
 * arrive, so a slow or failed call costs the student nothing.
 *
 * The model only sees the student's quiz answers and each club's own text and
 * tags, and is told to use nothing else. Lines that cite a number the club's
 * text doesn't contain are dropped.
 */

const MAX_CLUBS = 20;

export const maxDuration = 30;
const BATCH = 5;

const Lines = z.object({
  reasons: z.array(z.object({ slug: z.string(), text: z.string() })),
});

const SYSTEM = `You write one short line per club telling an Iowa State student why that club fits them, for a club-matching app.

Rules:
- One sentence per club, 12 to 26 words, second person ("you"), plain and specific, with contractions ("you're", "it's"). No hype, no exclamation marks, no dashes.
- Lead with the strongest real connection: something the student asked for (major area, a career, what they want from a club, a topic) that THIS club actually offers. If a want doesn't fit the club, don't force it; use their major or career instead.
- Use ONLY facts in the club's own text and tags given to you. Never invent events, numbers, companies, awards, or outcomes.
- Do not mention fit scores or percentages, and don't open with the time commitment.
- Do not mention faith, culture, ethnicity, gender, sexuality, or identity.
- Avoid generic phrases like "unlock your potential", "elevate", "journey", "seamlessly".
- Return one entry per club slug you were given, using the exact slug.`;

const cache = new Map<string, Record<string, string>>();

function studentSummary(prefs: Preferences) {
  const picked = areasFor(prefs).map((a) => ACADEMIC_AREA_BY_ID[a]?.label).filter(Boolean);
  const area = picked.length > 0 ? picked.join(" and ") : "Still deciding on a major";
  const lines = [
    `Studying: ${area}`,
    `Career interests: ${prefs.careers.map((c) => CAREER_BY_ID[c]?.label).filter(Boolean).join(", ") || "none given"}`,
    `Wants from a club: ${wantsFor(prefs).map((w) => WANT_BY_ID[w]?.label).filter(Boolean).join(", ") || "none given"}`,
    `Time: ${prefs.commitment && prefs.commitment !== "flexible" ? COMMITMENT_BY_ID[prefs.commitment]?.label : "flexible"}`,
  ];
  // Opt-in communities never leave the server: the ranked list this writes
  // for never includes community clubs, so the model has no use for them.
  const topics = knownTopics([...topicsFor(prefs), ...resumeTopicsFor(prefs)]).slice(0, 6);
  if (topics.length) lines.push(`Into: ${topics.join(", ")}`);
  return lines.join("\n");
}

function clubBlock(club: Club, prefs: Preferences) {
  const { reasons } = scoreClub(prefs, club);
  return [
    `<club slug="${club.slug}">`,
    `Name: ${club.name}`,
    `About: ${club.summary.slice(0, 600)}`,
    club.whatYouDo.length ? `What members do: ${club.whatYouDo.join("; ").slice(0, 300)}` : "",
    `Topics: ${club.topics.join(", ")}`,
    `Careers: ${club.careerPaths.map((c) => CAREER_BY_ID[c]?.label).join(", ") || "none"}`,
    `Time: ${COMMITMENT_TEXT[club.commitmentLevel]}`,
    `Why it matched: ${reasons.join(" ")}`,
    `</club>`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function writeLines(prefs: Preferences, batch: Club[]): Promise<Record<string, string>> {
  const response = await aiClient().messages.parse({
    model: AI_MODEL,
    max_tokens: 2048,
    output_config: { effort: "low", format: zodOutputFormat(Lines) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `<student>\n${studentSummary(prefs)}\n</student>\n\n${batch
          .map((club) => clubBlock(club, prefs))
          .join("\n\n")}`,
      },
    ],
  });
  const bySlug = new Map(batch.map((c) => [c.slug, c]));
  const out: Record<string, string> = {};
  for (const entry of response.parsed_output?.reasons ?? []) {
    const club = bySlug.get(entry.slug);
    if (!club || out[entry.slug]) continue;
    const text = noDashes(entry.text);
    if (text.length < 20 || text.length > 220 || citesUnknownNumber(text, club)) continue;
    out[entry.slug] = text;
  }
  return out;
}

function isPreferences(value: unknown): value is Preferences {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Partial<Preferences>;
  return Array.isArray(p.careers) && Array.isArray(p.goals) && Array.isArray(p.experiences);
}

/**
 * Only known ids and vocabulary topics reach the prompt, so a hand-built
 * request can't smuggle instructions in through a free-form field.
 */
function cleanPreferences(raw: Preferences): Preferences {
  const pick = <T extends string>(values: unknown, known: Record<string, unknown>, max: number) =>
    (Array.isArray(values) ? values : [])
      .filter((v): v is T => typeof v === "string" && Object.hasOwn(known, v))
      .slice(0, max);
  return {
    academicArea: "undecided",
    academicAreas: pick<AcademicAreaId>(raw.academicAreas, ACADEMIC_AREA_BY_ID, 3),
    careers: pick(raw.careers, CAREER_BY_ID, 15),
    wants: pick(raw.wants, WANT_BY_ID, 9),
    goals: [],
    experiences: [],
    commitment:
      typeof raw.commitment === "string" && Object.hasOwn(COMMITMENT_BY_ID, raw.commitment)
        ? raw.commitment
        : "flexible",
    topics: knownTopics(Array.isArray(raw.topics) ? raw.topics.slice(0, 10) : []),
    resumeTopics: knownTopics(Array.isArray(raw.resumeTopics) ? raw.resumeTopics.slice(0, 10) : []),
    greek: "no",
    completedAt: "",
  };
}

/** A number in the line that the club's own text never mentions is invented. */
function citesUnknownNumber(text: string, club: Club) {
  const source = `${club.summary} ${club.whatYouDo.join(" ")} ${COMMITMENT_TEXT[club.commitmentLevel]}`;
  return (text.match(/\d+/g) ?? []).some((n) => !source.includes(n));
}

export async function POST(request: Request) {
  if (!aiEnabled()) return json({ error: "Not available." }, 404);
  if (rateLimited(request, "reasons", RATE_LIMITS.reasons, 60 * 60 * 1000)) return json({ reasons: {} }, 429);

  const body = (await readJsonBody(request, 8192)) as { prefs?: unknown; slugs?: unknown } | null;
  if (!body || !isPreferences(body.prefs) || !Array.isArray(body.slugs)) {
    return json({ reasons: {} }, 400);
  }
  const prefs = cleanPreferences(body.prefs);
  const slugs = body.slugs.filter((s): s is string => typeof s === "string").slice(0, MAX_CLUBS);

  const found = slugs.map((slug) => getClub(slug)).filter((c): c is Club => Boolean(c));
  if (found.length === 0) return json({ reasons: {} });

  const key = createHash("sha256")
    .update(
      JSON.stringify([
        areasFor(prefs),
        prefs.careers,
        wantsFor(prefs),
        prefs.commitment,
        topicsFor(prefs),
        resumeTopicsFor(prefs),
        found.map((c) => c.slug),
      ]),
    )
    .digest("hex");
  const cached = cache.get(key);
  if (cached) return json({ reasons: cached });

  // One call over 20 clubs is slow enough to time out. Five at a time, in
  // parallel, comes back in a few seconds; a failed batch just keeps its
  // rule-based reasons.
  const batches: Club[][] = [];
  for (let i = 0; i < found.length; i += BATCH) batches.push(found.slice(i, i + BATCH));
  const settled = await Promise.allSettled(batches.map((batch) => writeLines(prefs, batch)));

  const out: Record<string, string> = {};
  let failed = 0;
  for (const result of settled) {
    if (result.status === "fulfilled") Object.assign(out, result.value);
    else failed++;
  }
  if (failed === batches.length) {
    const error = (settled[0] as PromiseRejectedResult).reason;
    return json({ reasons: {} }, error instanceof Anthropic.APIError ? 502 : 500);
  }

  if (cache.size > 500) cache.clear();
  if (failed === 0) cache.set(key, out);
  return json({ reasons: out });
}

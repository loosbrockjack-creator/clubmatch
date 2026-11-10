import { clubs } from "./clubs";
import {
  ACADEMIC_AREA_BY_ID,
  COUNCIL_BY_ID,
  CAREER_BY_ID,
  COMMITMENT_BY_ID,
  COMMITMENT_ORDER,
  COMMITMENT_TEXT,
  COMMUNITY_PHRASE,
  WANT_PHRASE,
  joinWithAnd,
  wantsFromLegacy,
} from "./taxonomy";
import type {
  ClubSummary,
  CommunityId,
  GreekInterest,
  MatchResult,
  Preferences,
  WantId,
} from "./types";

/*
 * Smart Match scoring. Deterministic and explainable: AI only shapes the
 * inputs (resume upload, "Anything specific?" box) and the wording of reasons.
 *
 * Three rules do most of the work:
 * 1. Relevance gate. A club is only a match if it lines up with something
 *    specific the student picked: their academic area, a career, or a topic
 *    they typed. Being open to all majors or meeting weekly is not a match.
 * 2. Opt-in audiences. Faith, culture, identity, and international clubs only
 *    appear for students who asked for that community, in their own section.
 *    Residence halls and grad-only groups never appear in quiz results.
 * 3. Rarity. A "what you want" answer that most clubs offer ("friends and
 *    community") counts for less than one few clubs offer ("compete").
 */

const WEIGHTS = {
  academic: 30,
  career: 30,
  wants: 15,
  commitment: 10,
} as const;

/**
 * A typed topic that hits a club's topics is the strongest signal there is.
 * Topics read from a resume count for less: the student didn't say them here,
 * and a resume lists plenty of things nobody wants a club for.
 */
const TOPIC_POINTS = [45, 15] as const;
const RESUME_TOPIC_POINTS = [20, 8] as const;

/** A general club that also serves a community the student opted in to. */
const COMMUNITY_BONUS = 15;

/** A club in the area a student's careers point to, when it isn't their own. */
const NEAR_AREA_SHARE = 0.4;

/** Which academic area each career usually sits in. */
const CAREER_AREAS: Record<string, string[]> = {
  finance: ["business"],
  accounting: ["business"],
  consulting: ["business"],
  marketing: ["business"],
  "real-estate": ["business"],
  "supply-chain": ["business"],
  entrepreneurship: ["business"],
  software: ["computing"],
  "data-ai": ["computing"],
  cybersecurity: ["computing"],
  "engineering-design": ["engineering"],
  architecture: ["design"],
  "agriculture-food": ["agriculture"],
  healthcare: ["liberal-arts", "human-sciences"],
  "media-comm": ["liberal-arts"],
};

/** Chapters: opting in to Greek life is the main signal. */
const GREEK_BONUS = { exact: 22, either: 16 } as const;
const GREEK_FOCUS_BONUS = 10;

/** How many chapters Results suggests; /greek is where to browse every one. */
export const GREEK_SUGGESTIONS = 3;

/** How many opt-in community clubs Results suggests. */
export const COMMUNITY_SUGGESTIONS = 6;

/** Results show this many, then "Show more" adds this many at a time. */
export const RESULTS_PAGE = 20;

/** Below this a club matched something, but too little to recommend. */
export const MATCH_THRESHOLD = 40;

/** Distance in commitment steps -> share of the commitment weight awarded. */
const COMMITMENT_FALLOFF = [1, 0.6, 0.25, 0];

const RANKED_AUDIENCES = new Set(["general", "honor", "governance"]);
const COMMUNITY_AUDIENCES = new Set(["identity", "faith", "international"]);

/** Which SFE affiliation tag lines up with each quiz academic area. */
const AFFILIATION_FOR_AREA: Partial<Record<string, string>> = {
  engineering: "STEM",
  computing: "STEM",
  agriculture: "Agriculture",
  design: "Architecture",
};

const FOCUS_PHRASE: Record<string, string> = {
  STEM: "A STEM-focused chapter",
  Agriculture: "An agriculture-focused chapter",
  Architecture: "An architecture-focused chapter",
};

/**
 * Rarity weight per "want", from how many rankable clubs offer it. The most
 * common want is worth 0.35 of the rarest. Computed once from the directory.
 */
const WANT_WEIGHT: Record<WantId, number> = (() => {
  const pool = clubs.filter((c) => RANKED_AUDIENCES.has(c.audience));
  const counts = new Map<WantId, number>();
  for (const club of pool) {
    for (const want of club.wants) counts.set(want, (counts.get(want) ?? 0) + 1);
  }
  const idf = new Map<WantId, number>();
  for (const [want, count] of counts) idf.set(want, Math.log(pool.length / count));
  const values = Array.from(idf.values());
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const out = {} as Record<WantId, number>;
  for (const [want, value] of idf) {
    out[want] = hi === lo ? 1 : 0.35 + (0.65 * (value - lo)) / (hi - lo);
  }
  return out;
})();

function wantWeight(want: WantId): number {
  return WANT_WEIGHT[want] ?? 0.35;
}

/**
 * Rarity per topic. A topic two clubs share ("k-pop") is a strong signal; one
 * fifteen clubs share ("volunteering") is barely one. 1 down to 0.4.
 */
const TOPIC_COUNT: Map<string, number> = (() => {
  const counts = new Map<string, number>();
  for (const club of clubs) {
    for (const topic of club.topics) {
      const key = topic.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
})();

function topicWeight(topic: string): number {
  const count = TOPIC_COUNT.get(topic) ?? 1;
  return Math.max(0.4, Math.min(1, 1 - (count - 2) / 15));
}

/** Topic keywords display with their usual capitals ("K-pop", "MCAT"). */
const TOPIC_CASE: [RegExp, string][] = [
  [/\bk-pop\b/g, "K-pop"],
  [/\bai\b/g, "AI"],
  [/\bml\b/g, "ML"],
  [/\bnasa\b/g, "NASA"],
  [/\bcpa\b/g, "CPA"],
  [/\bmcat\b/g, "MCAT"],
  [/\blgbtq\+?/g, "LGBTQ+"],
  [/\besports\b/g, "esports"],
  [/\bstem\b/g, "STEM"],
  [/\bdei\b/g, "DEI"],
];

export function displayTopic(topic: string): string {
  return TOPIC_CASE.reduce((text, [rx, to]) => text.replace(rx, to), topic);
}

/** The student's merged answer, reading answers saved before it existed. */
export function wantsFor(prefs: Preferences): WantId[] {
  if (prefs.wants && prefs.wants.length > 0) return prefs.wants;
  return wantsFromLegacy(prefs.goals ?? [], prefs.experiences ?? []);
}

export function communitiesFor(prefs: Preferences): CommunityId[] {
  return prefs.communities ?? [];
}

export function topicsFor(prefs: Preferences): string[] {
  return (prefs.topics ?? []).map((t) => t.toLowerCase());
}

export function resumeTopicsFor(prefs: Preferences): string[] {
  const typed = new Set(topicsFor(prefs));
  return (prefs.resumeTopics ?? []).map((t) => t.toLowerCase()).filter((t) => !typed.has(t));
}

export function greekInterest(prefs: Preferences): GreekInterest {
  return prefs.greek ?? "no";
}

/** Whether a chapter can appear for this student at all. */
export function allowedForPrefs(prefs: Preferences, club: ClubSummary): boolean {
  if (!club.greek) return true;
  const interest = greekInterest(prefs);
  if (interest === "no") return false;
  return interest === "either" || interest === club.greek.kind;
}

/* ---- components ---------------------------------------------------------- */

function hasArea(prefs: Preferences) {
  return Boolean(prefs.academicArea && prefs.academicArea !== "undecided");
}

function academicPart(prefs: Preferences, club: ClubSummary) {
  // A club tagged with many areas is general, not built for this one.
  const focus = club.academicAreas.length > 2 ? 0.7 : 1;
  const hit = hasArea(prefs) && club.academicAreas.includes(prefs.academicArea as never);
  if (hit) return { points: WEIGHTS.academic * focus, hit: true, near: false };
  // Careers point at an area too: an undecided student who wants accounting,
  // or an engineer who wants finance, should see business clubs, a step down.
  const implied = new Set(prefs.careers.flatMap((c) => CAREER_AREAS[c] ?? []));
  const near = club.academicAreas.some((a) => implied.has(a));
  return { points: near ? WEIGHTS.academic * NEAR_AREA_SHARE * focus : 0, hit: false, near };
}

function careerPart(prefs: Preferences, club: ClubSummary) {
  const hits = prefs.careers.filter((c) => club.careerPaths.includes(c));
  if (hits.length === 0) return { points: 0, hits };
  const base = hits.length >= 2 ? 1 : 0.75;
  const focus = club.careerPaths.length >= 3 ? 0.92 : 1;
  return { points: WEIGHTS.career * base * focus, hits };
}

function wantsPart(wants: WantId[], club: ClubSummary) {
  if (wants.length === 0) return { points: 0, hits: [] as WantId[] };
  const hits = wants.filter((w) => club.wants.includes(w));
  // Full credit for matching the student's two most distinctive answers.
  const target = [...wants]
    .map(wantWeight)
    .sort((a, b) => b - a)
    .slice(0, 2)
    .reduce((sum, w) => sum + w, 0);
  const got = hits.map(wantWeight).reduce((sum, w) => sum + w, 0);
  return { points: WEIGHTS.wants * Math.min(1, got / target), hits };
}

function commitmentPart(prefs: Preferences, club: ClubSummary) {
  const pref = prefs.commitment;
  // SFE publishes no time commitment for chapters, so don't pretend to match it.
  if (!pref || pref === "flexible" || club.greek) {
    return { points: WEIGHTS.commitment * 0.8, exact: false };
  }
  const distance = Math.abs(
    COMMITMENT_ORDER.indexOf(pref) - COMMITMENT_ORDER.indexOf(club.commitmentLevel),
  );
  const falloff = COMMITMENT_FALLOFF[Math.min(distance, COMMITMENT_FALLOFF.length - 1)];
  return { points: WEIGHTS.commitment * falloff, exact: distance === 0 };
}

function topicHits(topics: string[], club: ClubSummary): string[] {
  if (topics.length === 0) return [];
  return club.topics
    .map((t) => t.toLowerCase())
    .filter((t) => topics.includes(t))
    .sort((a, b) => topicWeight(b) - topicWeight(a));
}

function topicPoints(hits: string[], points: readonly number[]) {
  return hits
    .slice(0, points.length)
    .reduce((sum, topic, i) => sum + points[i] * topicWeight(topic), 0);
}

/** What a perfect club would score for this student. */
function denominator(prefs: Preferences) {
  return (
    (hasArea(prefs) ? WEIGHTS.academic : 0) +
    (prefs.careers.length > 0 ? WEIGHTS.career : 0) +
    WEIGHTS.wants +
    WEIGHTS.commitment
  );
}

/* ---- reasons -------------------------------------------------------------- */

interface Parts {
  academic: ReturnType<typeof academicPart>;
  career: ReturnType<typeof careerPart>;
  wants: ReturnType<typeof wantsPart>;
  commitment: ReturnType<typeof commitmentPart>;
  topics: string[];
  resumeTopics: string[];
  communities: CommunityId[];
}

function buildReasons(prefs: Preferences, club: ClubSummary, parts: Parts): string[] {
  const candidates: { text: string; weight: number }[] = [];

  if (club.greek) {
    const interest = greekInterest(prefs);
    const council = club.greek.council ? COUNCIL_BY_ID[club.greek.council].name : "";
    const kindPlural = club.greek.kind === "fraternity" ? "fraternities" : "sororities";
    if (interest !== "no") {
      candidates.push({
        text: council
          ? `${council} chapter, and you said you're open to ${kindPlural}.`
          : `You said you're open to ${kindPlural}.`,
        weight: 100,
      });
    }
    const focus = prefs.academicArea ? AFFILIATION_FOR_AREA[prefs.academicArea] : undefined;
    if (focus && club.greek.affiliations.includes(focus)) {
      candidates.push({ text: `${FOCUS_PHRASE[focus]}, which fits your major.`, weight: 90 });
    }
  }

  if (parts.topics.length > 0) {
    candidates.push({
      text: `You're into ${joinWithAnd(parts.topics.slice(0, 2).map(displayTopic))}, and that's what this club does.`,
      weight: 200,
    });
  } else if (parts.resumeTopics.length > 0) {
    candidates.push({
      text: `Your resume mentions ${joinWithAnd(parts.resumeTopics.slice(0, 2).map(displayTopic))}, and that's what this club does.`,
      weight: 50,
    });
  }

  if (parts.career.hits.length > 0) {
    const labels = parts.career.hits
      .slice(0, 2)
      .map((id) => CAREER_BY_ID[id].label.toLowerCase().replace(/\bai\b/, "AI"));
    candidates.push({
      text: `Matches your interest in ${joinWithAnd(labels)}.`,
      weight: parts.career.points + 1,
    });
  }

  if (parts.academic.hit && hasArea(prefs) && !club.greek) {
    const label = ACADEMIC_AREA_BY_ID[prefs.academicArea as keyof typeof ACADEMIC_AREA_BY_ID].label;
    candidates.push({
      text: `Built for ${label.toLowerCase()} students.`,
      weight: parts.academic.points,
    });
  }

  if (parts.academic.near && !parts.academic.hit && parts.career.hits.length === 0) {
    const area = club.academicAreas.find((a) =>
      prefs.careers.some((c) => (CAREER_AREAS[c] ?? []).includes(a)),
    );
    if (area) {
      candidates.push({
        text: `A ${ACADEMIC_AREA_BY_ID[area as keyof typeof ACADEMIC_AREA_BY_ID].label.toLowerCase()} club, close to the careers you picked.`,
        weight: parts.academic.points,
      });
    }
  }

  if (parts.communities.length > 0) {
    candidates.push({
      text: `A place to find ${COMMUNITY_PHRASE[parts.communities[0]]}, which you asked for.`,
      weight: 60,
    });
  }

  if (parts.wants.hits.length > 0) {
    const phrases = [...parts.wants.hits]
      .sort((a, b) => wantWeight(b) - wantWeight(a))
      .slice(0, 2)
      .map((id) => WANT_PHRASE[id]);
    candidates.push({
      text: `Good for ${joinWithAnd(phrases)}.`,
      weight: parts.wants.points,
    });
  }

  if (parts.commitment.exact && prefs.commitment && prefs.commitment !== "flexible") {
    const label = COMMITMENT_BY_ID[prefs.commitment].label.toLowerCase();
    candidates.push({
      text: `Fits the ${label} you have.`,
      weight: parts.commitment.points,
    });
  }

  // Honor societies always say how you get in, so two reasons plus the note.
  const honor = club.audience === "honor";
  const reasons = candidates
    .sort((a, b) => b.weight - a.weight)
    .slice(0, honor ? 2 : 3)
    .map((c) => c.text);

  if (honor) reasons.push("Membership is by invitation or academic standing.");

  if (reasons.length === 0) {
    reasons.push(
      `${club.categories[0] ?? "Student"} organization, ${COMMITMENT_TEXT[club.commitmentLevel].toLowerCase()}.`,
    );
  }

  return reasons;
}

/* ---- scoring -------------------------------------------------------------- */

function scoreChapter(prefs: Preferences, club: ClubSummary): MatchResult {
  const wants = wantsPart(wantsFor(prefs), club);
  const commitment = commitmentPart(prefs, club);
  const interest = greekInterest(prefs);
  const greek = !club.greek
    ? 0
    : interest === club.greek.kind
      ? GREEK_BONUS.exact
      : interest === "either"
        ? GREEK_BONUS.either
        : 0;
  const focus = prefs.academicArea ? AFFILIATION_FOR_AREA[prefs.academicArea] : undefined;
  const focusPoints =
    focus && club.greek?.affiliations.includes(focus) ? GREEK_FOCUS_BONUS : 0;
  const total = wants.points + commitment.points + greek + focusPoints;
  const max = WEIGHTS.wants + WEIGHTS.commitment + GREEK_BONUS.exact;
  return {
    club,
    score: Math.min(98, Math.round((total / max) * 100)),
    eligible: allowedForPrefs(prefs, club),
    reasons: buildReasons(prefs, club, {
      academic: { points: 0, hit: false, near: false },
      career: { points: 0, hits: [] },
      wants,
      commitment,
      topics: [],
      resumeTopics: [],
      communities: [],
    }),
  };
}

export function scoreClub(prefs: Preferences, club: ClubSummary): MatchResult {
  if (club.greek) return scoreChapter(prefs, club);

  const academic = academicPart(prefs, club);
  const career = careerPart(prefs, club);
  const wants = wantsPart(wantsFor(prefs), club);
  const commitment = commitmentPart(prefs, club);
  const topics = topicHits(topicsFor(prefs), club);
  const resumeTopics = topicHits(resumeTopicsFor(prefs), club);
  const communities = club.communityTags.filter((t) => communitiesFor(prefs).includes(t));

  let total =
    academic.points +
    career.points +
    wants.points +
    commitment.points +
    topicPoints(topics, TOPIC_POINTS) +
    topicPoints(resumeTopics, RESUME_TOPIC_POINTS) +
    (communities.length > 0 ? COMMUNITY_BONUS : 0);

  // A club limited to one major is a poor fit for a student in another.
  if (!club.openToAllMajors && hasArea(prefs) && !academic.hit) total *= 0.5;
  if (club.audience === "honor") total *= 0.9;

  const specific =
    academic.hit ||
    academic.near ||
    career.hits.length > 0 ||
    topics.length > 0 ||
    resumeTopics.length > 0;
  const eligible = COMMUNITY_AUDIENCES.has(club.audience)
    ? communities.length > 0
    : RANKED_AUDIENCES.has(club.audience) && specific;

  const max = denominator(prefs);
  const score = max > 0 ? Math.min(98, Math.round((total / max) * 100)) : 0;

  return {
    club,
    score,
    eligible,
    reasons: buildReasons(prefs, club, {
      academic,
      career,
      wants,
      commitment,
      topics,
      resumeTopics,
      communities,
    }),
  };
}

/**
 * The fit an officer may see in their leads list. Opt-in communities and
 * typed topics are private: a faith or culture club must never learn who asked
 * for that community, so both are dropped before scoring, and a club the
 * student would only see because of them scores 0.
 */
export function scoreForOfficers(prefs: Preferences, club: ClubSummary): number {
  const shared: Preferences = {
    ...prefs,
    communities: [],
    topics: [],
    resumeTopics: [],
    interestText: "",
  };
  if (club.greek) return allowedForPrefs(shared, club) ? scoreClub(shared, club).score : 0;
  const result = scoreClub(shared, club);
  return result.eligible ? result.score : 0;
}

/** djb2, for a stable tie-break that differs from student to student. */
function hash(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
  return h >>> 0;
}

function seedFor(prefs: Preferences) {
  return [
    prefs.academicArea,
    ...wantsFor(prefs),
    ...prefs.careers,
    prefs.commitment,
    prefs.greek,
    ...topicsFor(prefs),
    ...resumeTopicsFor(prefs),
  ].join("|");
}

/** Fewer tags means a club built for something, which beats a catch-all. */
function specificity(club: ClubSummary) {
  return club.academicAreas.length + club.careerPaths.length;
}

/**
 * Ranked clubs for the main results list. Chapters and opt-in community clubs
 * are suggested separately (matchChapters, matchCommunities).
 */
export function matchClubs(prefs: Preferences, pool: ClubSummary[] = clubs): MatchResult[] {
  const seed = seedFor(prefs);
  const ranked = pool
    .filter((club) => !club.greek && RANKED_AUDIENCES.has(club.audience))
    .map((club) => scoreClub(prefs, club))
    .filter((result) => result.eligible && result.score >= MATCH_THRESHOLD)
    .sort(
      (a, b) =>
        b.score - a.score ||
        specificity(a.club) - specificity(b.club) ||
        hash(seed + a.club.slug) - hash(seed + b.club.slug),
    );
  // Clubs that only sit near a career's area are filler past a handful: an
  // engineer who picked finance needs a few business clubs, not forty.
  let nearOnly = 0;
  return ranked.filter((result) => {
    if (!isNearOnly(prefs, result.club)) return true;
    nearOnly += 1;
    return nearOnly <= MAX_NEAR_ONLY;
  });
}

const MAX_NEAR_ONLY = 5;

function isNearOnly(prefs: Preferences, club: ClubSummary) {
  const academic = academicPart(prefs, club);
  return (
    academic.near &&
    !academic.hit &&
    careerPart(prefs, club).hits.length === 0 &&
    topicHits([...topicsFor(prefs), ...resumeTopicsFor(prefs)], club).length === 0
  );
}

/**
 * Faith, culture, identity, and international clubs for a student who asked
 * for that community. Typed topics ("catholic", "korean") rank first. With more
 * than one community picked, suggestions take turns so each one shows up.
 */
export function matchCommunities(
  prefs: Preferences,
  limit = COMMUNITY_SUGGESTIONS,
  pool: ClubSummary[] = clubs,
): { results: MatchResult[]; total: number } {
  const wanted = communitiesFor(prefs);
  if (wanted.length === 0) return { results: [], total: 0 };
  const topics = [...topicsFor(prefs), ...resumeTopicsFor(prefs)];
  const wants = wantsFor(prefs);
  const seed = seedFor(prefs);
  const all = pool
    .filter(
      (club) =>
        COMMUNITY_AUDIENCES.has(club.audience) &&
        club.communityTags.some((t) => wanted.includes(t)),
    )
    .map((club) => ({
      result: scoreClub(prefs, club),
      topicCount: topicHits(topics, club).length,
      wantCount: wants.filter((w) => club.wants.includes(w)).length,
    }))
    .sort(
      (a, b) =>
        b.topicCount - a.topicCount ||
        b.wantCount - a.wantCount ||
        hash(seed + a.result.club.slug) - hash(seed + b.result.club.slug),
    );

  // Clubs that match a typed topic go first; then take turns by community.
  const picked: MatchResult[] = [];
  const used = new Set<string>();
  for (const entry of all) {
    if (picked.length >= limit || entry.topicCount === 0) break;
    picked.push(entry.result);
    used.add(entry.result.club.id);
  }
  const queues = wanted.map((community) =>
    all.filter((e) => e.result.club.communityTags.includes(community)),
  );
  let added = true;
  while (picked.length < limit && added) {
    added = false;
    for (const queue of queues) {
      const next = queue.find((e) => !used.has(e.result.club.id));
      if (next && picked.length < limit) {
        picked.push(next.result);
        used.add(next.result.club.id);
        added = true;
      }
    }
  }
  return { results: picked, total: all.length };
}

/**
 * The best clubs for each topic the student typed, so a niche interest
 * ("K-pop dance") always gets a visible answer even when career-matched clubs
 * outscore it in the main list.
 */
export function matchTopics(
  prefs: Preferences,
  perTopic = 2,
  pool: ClubSummary[] = clubs,
): { topic: string; results: MatchResult[] }[] {
  const typed = topicsFor(prefs).slice(0, 3);
  if (typed.length === 0) return [];
  const seed = seedFor(prefs);
  const used = new Set<string>();
  const out: { topic: string; results: MatchResult[] }[] = [];
  for (const topic of typed) {
    const results = pool
      .filter(
        (club) =>
          !club.greek &&
          RANKED_AUDIENCES.has(club.audience) &&
          club.topics.some((t) => t.toLowerCase() === topic),
      )
      .map((club) => scoreClub(prefs, club))
      .filter((r) => r.eligible && !used.has(r.club.id))
      .sort((a, b) => b.score - a.score || hash(seed + a.club.slug) - hash(seed + b.club.slug))
      .slice(0, perTopic);
    results.forEach((r) => used.add(r.club.id));
    if (results.length > 0) out.push({ topic, results });
  }
  return out;
}

/**
 * A few chapters for a student who opted in to Greek life. Chapters look
 * alike to the quiz, so most tie; hashing the student's answers with the slug
 * spreads suggestions across all of them while staying stable for one student.
 */
export function matchChapters(
  prefs: Preferences,
  limit = GREEK_SUGGESTIONS,
  pool: ClubSummary[] = clubs,
): MatchResult[] {
  if (greekInterest(prefs) === "no") return [];
  const seed = seedFor(prefs);
  return pool
    .filter((club) => club.greek && allowedForPrefs(prefs, club))
    .map((club) => scoreClub(prefs, club))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(Boolean(b.club.greek?.photo)) - Number(Boolean(a.club.greek?.photo)) ||
        hash(seed + a.club.slug) - hash(seed + b.club.slug),
    )
    .slice(0, limit);
}

import { clubs } from "./clubs";
import {
  ACADEMIC_AREA_BY_ID,
  COUNCIL_BY_ID,
  CAREER_BY_ID,
  COMMITMENT_BY_ID,
  COMMITMENT_ORDER,
  COMMITMENT_TEXT,
  EXPERIENCE_PHRASE,
  GOAL_PHRASE,
  joinWithAnd,
} from "./taxonomy";
import type { ClubSummary, GreekInterest, MatchResult, Preferences } from "./types";

const WEIGHTS = {
  academic: 30,
  career: 25,
  goals: 20,
  commitment: 15,
  experience: 10,
} as const;

/**
 * Chapters have no career tags, so on the base weights alone they rarely clear
 * the threshold even for a student who asked for them. Opting in to Greek life
 * is a strong, explicit signal, so it earns a flat bonus. Naming the kind
 * (fraternity or sorority) is a stronger signal than "either".
 */
const GREEK_BONUS = { exact: 22, either: 16 } as const;

/** How many chapters Results suggests; /greek is where to browse every one. */
export const GREEK_SUGGESTIONS = 3;

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

export function greekInterest(prefs: Preferences): GreekInterest {
  return prefs.greek ?? "no";
}

/** Whether a club can appear in this student's results at all. */
export function allowedForPrefs(prefs: Preferences, club: ClubSummary): boolean {
  if (!club.greek) return true;
  const interest = greekInterest(prefs);
  if (interest === "no") return false;
  return interest === "either" || interest === club.greek.kind;
}

function greekPoints(prefs: Preferences, club: ClubSummary) {
  if (!club.greek) return 0;
  const interest = greekInterest(prefs);
  if (interest === club.greek.kind) return GREEK_BONUS.exact;
  if (interest === "either") return GREEK_BONUS.either;
  return 0;
}

/** Distance in commitment steps -> share of the commitment weight awarded. */
const COMMITMENT_FALLOFF = [1, 0.6, 0.25, 0.1];

interface Overlap {
  points: number;
  hits: string[];
}

function overlap<T extends string>(
  selected: T[],
  clubValues: T[],
  weight: number,
  fullCreditAt: number,
): Overlap {
  if (selected.length === 0) {
    return { points: weight * 0.6, hits: [] };
  }
  const hits = selected.filter((value) => clubValues.includes(value));
  const target = Math.min(selected.length, fullCreditAt);
  const ratio = Math.min(1, hits.length / target);
  return { points: weight * ratio, hits };
}

function academicPoints(prefs: Preferences, club: ClubSummary) {
  const weight = WEIGHTS.academic;
  const area = prefs.academicArea;

  if (!area || area === "undecided") {
    return {
      points: club.openToAllMajors ? weight * 0.85 : weight * 0.6,
      direct: false,
    };
  }
  if (club.academicAreas.includes(area)) {
    return { points: weight, direct: true };
  }
  if (club.openToAllMajors) {
    return { points: weight * 0.55, direct: false };
  }
  return { points: weight * 0.15, direct: false };
}

function commitmentPoints(prefs: Preferences, club: ClubSummary) {
  const weight = WEIGHTS.commitment;
  const pref = prefs.commitment;

  // SFE publishes no time commitment for chapters, so don't pretend to match it.
  if (!pref || pref === "flexible" || club.greek) {
    return { points: weight * 0.8, exact: false };
  }
  const distance = Math.abs(
    COMMITMENT_ORDER.indexOf(pref) - COMMITMENT_ORDER.indexOf(club.commitmentLevel),
  );
  const falloff = COMMITMENT_FALLOFF[Math.min(distance, COMMITMENT_FALLOFF.length - 1)];
  return { points: weight * falloff, exact: distance === 0 };
}

function buildReasons(
  prefs: Preferences,
  club: ClubSummary,
  parts: {
    academic: ReturnType<typeof academicPoints>;
    career: Overlap;
    goals: Overlap;
    commitment: ReturnType<typeof commitmentPoints>;
    experience: Overlap;
  },
): string[] {
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
      candidates.push({
        text: `${FOCUS_PHRASE[focus]}, which fits your major.`,
        weight: 90,
      });
    }
  }

  if (parts.career.hits.length > 0) {
    const labels = parts.career.hits
      .slice(0, 2)
      .map((id) => CAREER_BY_ID[id as keyof typeof CAREER_BY_ID].label.toLowerCase());
    candidates.push({
      text: `Matches your interest in ${joinWithAnd(labels)}.`,
      weight: parts.career.points,
    });
  }

  // A chapter's academic match only ever comes from its SFE affiliation, which
  // the focus reason above already names.
  if (
    parts.academic.direct &&
    !club.greek &&
    prefs.academicArea &&
    prefs.academicArea !== "undecided"
  ) {
    const label = ACADEMIC_AREA_BY_ID[prefs.academicArea].label.toLowerCase();
    candidates.push({
      text: `Built for ${label} students.`,
      weight: parts.academic.points,
    });
  } else if (club.openToAllMajors && !club.greek) {
    candidates.push({
      text: "Open to students from any major.",
      weight: parts.academic.points * 0.6,
    });
  }

  if (parts.goals.hits.length > 0) {
    const labels = parts.goals
      .hits.slice(0, 2)
      .map((id) => GOAL_PHRASE[id as keyof typeof GOAL_PHRASE]);
    candidates.push({
      text: `Strong for ${joinWithAnd(labels)}.`,
      weight: parts.goals.points,
    });
  }

  if (parts.commitment.exact && prefs.commitment && prefs.commitment !== "flexible") {
    const label = COMMITMENT_BY_ID[prefs.commitment].label.toLowerCase();
    candidates.push({
      text: `Fits the ${label} you asked for.`,
      weight: parts.commitment.points,
    });
  }

  // Every chapter is tagged "community", which the goals reason already says,
  // so for chapters only service (from listed philanthropy) adds anything.
  const experienceHits = club.greek
    ? parts.experience.hits.filter((id) => id === "service")
    : parts.experience.hits;
  if (experienceHits.length > 0) {
    const labels = experienceHits
      .slice(0, 2)
      .map((id) => EXPERIENCE_PHRASE[id as keyof typeof EXPERIENCE_PHRASE]);
    candidates.push({
      text: `Centered on ${joinWithAnd(labels)}.`,
      weight: parts.experience.points,
    });
  }

  const reasons = candidates
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((c) => c.text);

  if (reasons.length === 0) {
    reasons.push(
      `${club.categories[0]} organization, ${COMMITMENT_TEXT[club.commitmentLevel].toLowerCase()}.`,
    );
  }

  return reasons;
}

export function scoreClub(prefs: Preferences, club: ClubSummary): MatchResult {
  const academic = academicPoints(prefs, club);
  const career = overlap(prefs.careers, club.careerPaths, WEIGHTS.career, 2);
  const goals = overlap(prefs.goals, club.goalsServed, WEIGHTS.goals, 2);
  const commitment = commitmentPoints(prefs, club);
  const experience = overlap(prefs.experiences, club.experienceTypes, WEIGHTS.experience, 2);

  const total =
    academic.points +
    career.points +
    goals.points +
    commitment.points +
    experience.points +
    greekPoints(prefs, club);

  return {
    club,
    // Capped below 100: this is a ranking heuristic, not a measurement.
    score: Math.min(98, Math.round(total)),
    reasons: buildReasons(prefs, club, {
      academic,
      career,
      goals,
      commitment,
      experience,
    }),
  };
}

export const MATCH_THRESHOLD = 45;

/** Ranked clubs. Greek chapters are suggested separately, see matchChapters. */
export function matchClubs(prefs: Preferences, pool: ClubSummary[] = clubs): MatchResult[] {
  return pool
    .filter((club) => !club.greek)
    .map((club) => scoreClub(prefs, club))
    .filter((result) => result.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score || a.club.name.localeCompare(b.club.name));
}

/** djb2, for a stable tie-break that differs from student to student. */
function hash(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
  return h >>> 0;
}

/**
 * A few chapters for a student who opted in to Greek life. Chapters look
 * alike to the quiz (no careers, same goals, same time commitment), so most
 * tie. Breaking ties alphabetically would hand every student the same three
 * "Alpha" chapters; hashing the student's answers with the slug spreads
 * suggestions across all of them while staying stable for one student.
 */
export function matchChapters(
  prefs: Preferences,
  limit = GREEK_SUGGESTIONS,
  pool: ClubSummary[] = clubs,
): MatchResult[] {
  if (greekInterest(prefs) === "no") return [];
  const seed = [prefs.academicArea, ...prefs.goals, ...prefs.careers, prefs.commitment, prefs.greek].join("|");
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

/**
 * Three complementary picks rather than three variations of the same club:
 * one career-leaning, one hands-on, one community-leaning.
 */
export function buildInvolvementStack(results: MatchResult[]) {
  const lenses = [
    {
      key: "career",
      label: "Career",
      note: "Builds your professional track record",
      test: (club: ClubSummary) =>
        club.experienceTypes.includes("professional") ||
        club.goalsServed.includes("career"),
    },
    {
      key: "hands-on",
      label: "Hands-on",
      note: "Where you actually build something",
      test: (club: ClubSummary) =>
        club.experienceTypes.includes("projects") ||
        club.experienceTypes.includes("competition"),
    },
    {
      key: "community",
      label: "Community",
      note: "People you will keep after graduation",
      test: (club: ClubSummary) =>
        club.experienceTypes.includes("community") ||
        club.goalsServed.includes("community"),
    },
  ] as const;

  const used = new Set<string>();
  const stack: { label: string; note: string; result: MatchResult }[] = [];

  for (const lens of lenses) {
    const pick = results.find(
      (result) => !used.has(result.club.id) && lens.test(result.club),
    );
    if (pick) {
      used.add(pick.club.id);
      stack.push({ label: lens.label, note: lens.note, result: pick });
    }
  }

  return stack.length === lenses.length ? stack : [];
}

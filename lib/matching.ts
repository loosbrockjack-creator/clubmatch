import { clubs } from "./clubs";
import {
  ACADEMIC_AREA_BY_ID,
  CAREER_BY_ID,
  COMMITMENT_BY_ID,
  COMMITMENT_ORDER,
  EXPERIENCE_PHRASE,
  GOAL_PHRASE,
  joinWithAnd,
} from "./taxonomy";
import type { Club, MatchResult, Preferences } from "./types";

const WEIGHTS = {
  academic: 30,
  career: 25,
  goals: 20,
  commitment: 15,
  experience: 10,
} as const;

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

function academicPoints(prefs: Preferences, club: Club) {
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

function commitmentPoints(prefs: Preferences, club: Club) {
  const weight = WEIGHTS.commitment;
  const pref = prefs.commitment;

  if (!pref || pref === "flexible") {
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
  club: Club,
  parts: {
    academic: ReturnType<typeof academicPoints>;
    career: Overlap;
    goals: Overlap;
    commitment: ReturnType<typeof commitmentPoints>;
    experience: Overlap;
  },
): string[] {
  const candidates: { text: string; weight: number }[] = [];

  if (parts.career.hits.length > 0) {
    const labels = parts.career.hits
      .slice(0, 2)
      .map((id) => CAREER_BY_ID[id as keyof typeof CAREER_BY_ID].label.toLowerCase());
    candidates.push({
      text: `Matches your interest in ${joinWithAnd(labels)}.`,
      weight: parts.career.points,
    });
  }

  if (parts.academic.direct && prefs.academicArea && prefs.academicArea !== "undecided") {
    const label = ACADEMIC_AREA_BY_ID[prefs.academicArea].label.toLowerCase();
    candidates.push({
      text: `Built for ${label} students.`,
      weight: parts.academic.points,
    });
  } else if (club.openToAllMajors) {
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

  if (parts.experience.hits.length > 0) {
    const labels = parts.experience.hits
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
    reasons.push(`${club.categories[0]} organization with a ${club.commitmentText.toLowerCase()} commitment.`);
  }

  return reasons;
}

export function scoreClub(prefs: Preferences, club: Club): MatchResult {
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
    experience.points;

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

export function matchClubs(prefs: Preferences, pool: Club[] = clubs): MatchResult[] {
  return pool
    .map((club) => scoreClub(prefs, club))
    .filter((result) => result.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score || a.club.name.localeCompare(b.club.name));
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
      test: (club: Club) =>
        club.experienceTypes.includes("professional") ||
        club.goalsServed.includes("career"),
    },
    {
      key: "hands-on",
      label: "Hands-on",
      note: "Where you actually build something",
      test: (club: Club) =>
        club.experienceTypes.includes("projects") ||
        club.experienceTypes.includes("competition"),
    },
    {
      key: "community",
      label: "Community",
      note: "People you will keep after graduation",
      test: (club: Club) =>
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

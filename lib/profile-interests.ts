/**
 * Interest chips come from the quiz taxonomy and are stored namespaced in
 * `profiles.interests`, because some ids repeat across lists ("entrepreneurship"
 * is both a career and a goal): "area:<id>", "career:<id>", "goal:<id>".
 *
 * Only labels are shown, never the taxonomy hints, which were written for the
 * quiz and don't belong on a profile.
 */
import { ACADEMIC_AREAS, CAREERS, GOALS } from "./taxonomy";
import type { Preferences } from "./types";

export const MAX_INTERESTS = 12;

export const INTEREST_GROUPS = [
  {
    key: "area",
    legend: "What you study",
    heading: "Studying",
    options: ACADEMIC_AREAS.map((o) => ({ id: `area:${o.id}`, label: o.label })),
  },
  {
    key: "career",
    legend: "Fields you're into",
    heading: "Into",
    options: CAREERS.map((o) => ({ id: `career:${o.id}`, label: o.label })),
  },
  {
    key: "goal",
    legend: "What you want from a club",
    heading: "Here to",
    options: GOALS.map((o) => ({ id: `goal:${o.id}`, label: o.label })),
  },
] as const;

const LABELS = new Map<string, string>(
  INTEREST_GROUPS.flatMap((group) => group.options.map((o) => [o.id, o.label] as const)),
);

/** Null for ids that aren't in the taxonomy, including ones written directly to the database. */
export function interestLabel(id: string): string | null {
  return LABELS.get(id) ?? null;
}

export function knownInterests(ids: readonly string[] | null | undefined): string[] {
  if (!Array.isArray(ids)) return [];
  return Array.from(new Set(ids.filter((id) => LABELS.has(id))));
}

/** Suggested chips for a student who has quiz answers. */
export function interestsFromPreferences(prefs: Preferences | null | undefined): string[] {
  if (!prefs) return [];
  const area = prefs.academicArea && prefs.academicArea !== "undecided" ? [`area:${prefs.academicArea}`] : [];
  return knownInterests([
    ...area,
    ...(prefs.careers ?? []).map((id) => `career:${id}`),
    ...(prefs.goals ?? []).map((id) => `goal:${id}`),
  ]).slice(0, MAX_INTERESTS);
}

/** What the student has picked, or what the quiz suggests until they first save. */
export function effectiveInterests(profile: {
  interests: string[];
  interests_chosen?: boolean;
  preferences: Preferences | null;
}): string[] {
  const saved = knownInterests(profile.interests);
  if (profile.interests_chosen || saved.length > 0) return saved;
  return interestsFromPreferences(profile.preferences);
}

/** Groups saved ids for display, in taxonomy order, dropping unknown ids. */
export function groupInterests(ids: readonly string[] | null | undefined) {
  const set = new Set(knownInterests(ids));
  return INTEREST_GROUPS.map((group) => ({
    key: group.key,
    heading: group.heading,
    items: group.options.filter((o) => set.has(o.id)),
  })).filter((group) => group.items.length > 0);
}

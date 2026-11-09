/**
 * Why a student fits, in plain words. Built only from the interests the student
 * chose to show on their public profile, so it can never reveal a quiz answer
 * they kept private. Students who show none simply get no reason line.
 */
import { ACADEMIC_AREA_BY_ID, CAREER_BY_ID, GOAL_PHRASE } from "./taxonomy";
import type { AcademicAreaId, CareerId, ClubSummary, GoalId } from "./types";

const MAX_REASONS = 3;

export function whyFit(interests: string[] | null | undefined, club: ClubSummary): string[] {
  const careers: string[] = [];
  const areas: string[] = [];
  const goals: string[] = [];
  for (const interest of interests ?? []) {
    const [kind, id] = interest.split(":");
    if (kind === "career" && club.careerPaths.includes(id as CareerId)) {
      const label = CAREER_BY_ID[id as CareerId]?.label;
      if (label) careers.push(`Into ${label}`);
    } else if (kind === "area" && club.academicAreas.includes(id as AcademicAreaId)) {
      const label = ACADEMIC_AREA_BY_ID[id as AcademicAreaId]?.label;
      if (label) areas.push(`Interested in ${label}`);
    } else if (kind === "goal" && club.goalsServed.includes(id as GoalId)) {
      const phrase = GOAL_PHRASE[id as GoalId];
      if (phrase) goals.push(`Wants ${phrase}`);
    }
  }
  return [...careers, ...areas, ...goals].slice(0, MAX_REASONS);
}

export const LOOKING_FOR_LABEL: Record<string, string> = {
  club: "Looking for a club",
  teammates: "Looking for teammates",
  study_group: "Looking for a study group",
  friends: "Looking for friends",
  browsing: "Just browsing",
};

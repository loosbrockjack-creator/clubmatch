import raw from "@/data/interests.json";
import type { InterestPick } from "./types";

/**
 * Broad, student-friendly interests ("Investing", "Rock Climbing"), each mapped
 * to the specific topic keywords clubs carry. Built offline from the club
 * topics (data/interests.json); faith, culture, gender, sexuality, and politics
 * are left out on purpose, since those have their own opt-in question.
 */
export interface Interest extends InterestPick {
  aliases: string[];
}

export const INTERESTS = raw as Interest[];

export const MAX_INTERESTS = 6;

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9+#\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const SEARCHABLE = INTERESTS.map((interest) => ({
  interest,
  label: normalize(interest.label),
  aliases: interest.aliases.map(normalize),
}));

/** How well one interest matches what was typed. 0 means it doesn't. */
function rank(query: string, entry: (typeof SEARCHABLE)[number]): number {
  const words = (text: string) => text.split(" ");
  if (entry.label === query) return 100;
  if (entry.aliases.includes(query)) return 95;
  // One or two letters ("ai") only count as a whole word, or "aid" and
  // "aircraft" would drag in unrelated interests.
  if (query.length <= 2) {
    const whole = [entry.label, ...entry.aliases].some((t) => words(t).includes(query));
    return whole ? 75 : 0;
  }
  if (entry.label.startsWith(query)) return 90;
  if (entry.aliases.some((a) => a.startsWith(query))) return 80;
  if (words(entry.label).some((w) => w.startsWith(query))) return 70;
  if (entry.aliases.some((a) => words(a).some((w) => w.startsWith(query)))) return 60;
  // Several words ("ai software"): each one has to start a word somewhere in
  // the label or its aliases.
  const tokens = words(query);
  if (tokens.length > 1) {
    const pool = words([entry.label, ...entry.aliases].join(" "));
    if (tokens.every((t) => pool.some((w) => w.startsWith(t)))) return 50;
    // No interest has every word ("ai software"), so offer the broad match for
    // each word on its own, below the ones that fit them all.
    const best = Math.max(...tokens.map((t) => rank(t, entry)));
    if (best >= 60) return Math.round(best / 3);
  }
  if (entry.label.includes(query)) return 40;
  if (entry.aliases.some((a) => a.includes(query))) return 30;
  return 0;
}

/** Suggestions for what a student has typed so far, best first. */
export function searchInterests(query: string, exclude: string[] = [], limit = 7): Interest[] {
  const q = normalize(query);
  if (q.length === 0) return [];
  const taken = new Set(exclude);
  return SEARCHABLE.filter((e) => !taken.has(e.interest.id))
    .map((e) => ({ interest: e.interest, score: rank(q, e) }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score || a.interest.label.localeCompare(b.interest.label))
    .slice(0, limit)
    .map((e) => e.interest);
}

/** The compact form saved with the student's answers. */
export function toPick(interest: Interest): InterestPick {
  return { id: interest.id, label: interest.label, topics: interest.topics };
}

/** The club topics a set of picks stands for, without repeats. */
export function topicsOf(picks: InterestPick[]): string[] {
  return Array.from(new Set(picks.flatMap((p) => p.topics.map((t) => t.toLowerCase()))));
}

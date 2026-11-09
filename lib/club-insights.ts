/** Pure analytics and insight logic, so the rules are easy to read and test. */
import { ACTIVITY_KINDS } from "./club-types";
import type {
  ActivityKind,
  ClubAnalytics,
  ClubEvent,
  ClubOverlay,
  CompletenessItem,
  FunnelStage,
  MajorGap,
  WeekPoint,
} from "./club-types";

export type ActivityRow = {
  kind: ActivityKind;
  major: string | null;
  academic_area: string | null;
  viewer_hash: string;
  day: string;
  anonymous: boolean;
};

const FUNNEL: { kind: ActivityKind; label: string }[] = [
  { kind: "impression", label: "Saw you in their matches" },
  { kind: "view", label: "Viewed your page" },
  { kind: "save", label: "Saved your club" },
  { kind: "lead", label: "Clicked a club link" },
  { kind: "interested", label: "Told officers they're interested" },
  { kind: "join", label: "Said they're a member" },
];

/** A group smaller than this could point at one person, so it isn't shown. */
export const MIN_GROUP = 3;
/** Below this many matches a save rate is noise, so no advice is given. */
const MIN_FOR_ADVICE = 5;

function mondayOf(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

const emptyCounts = () =>
  Object.fromEntries(ACTIVITY_KINDS.map((kind) => [kind, 0])) as Record<ActivityKind, number>;

export function buildWeeks(rows: ActivityRow[], days: number, today: string): WeekPoint[] {
  const start = new Date(`${today}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const weeks = new Map<string, Record<ActivityKind, number>>();
  const cursor = new Date(`${mondayOf(start.toISOString().slice(0, 10))}T12:00:00Z`);
  const end = mondayOf(today);
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    weeks.set(key, emptyCounts());
    if (key >= end) break;
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  const seen = new Set<string>();
  for (const row of rows) {
    const week = mondayOf(row.day);
    const counts = weeks.get(week);
    const key = `${week}|${row.kind}|${row.viewer_hash}`;
    if (counts && !seen.has(key)) {
      seen.add(key);
      counts[row.kind] += 1;
    }
  }
  return Array.from(weeks, ([week, counts]) => ({ week, counts }));
}

export function buildFunnel(rows: ActivityRow[]): FunnelStage[] {
  return FUNNEL.map(({ kind, label }) => ({
    kind,
    label,
    students: new Set(rows.filter((row) => row.kind === kind).map((row) => row.viewer_hash)).size,
  }));
}

function groupOf(row: ActivityRow): string | null {
  return row.major?.trim() || null;
}

function advice(group: string, saveRate: number, overall: number, hasDescription: boolean): string | null {
  if (saveRate >= overall * 0.75 && saveRate >= 0.1) return null;
  if (!hasDescription) {
    return `${group} students see you in their matches, but your page still shows the directory text. Add a description that says what ${group} students do in your club.`;
  }
  return `${group} students see you but rarely save you. Add a line to your description about what ${group} students get out of joining, or post an event aimed at them.`;
}

export function buildGaps(rows: ActivityRow[], hasDescription: boolean) {
  const groups = new Map<string, { matches: Set<string>; saves: Set<string> }>();
  for (const row of rows) {
    const group = groupOf(row);
    if (!group || (row.kind !== "impression" && row.kind !== "save")) continue;
    const entry = groups.get(group) ?? { matches: new Set(), saves: new Set() };
    (row.kind === "impression" ? entry.matches : entry.saves).add(row.viewer_hash);
    groups.set(group, entry);
  }

  const totals = Array.from(groups.values());
  const allMatches = totals.reduce((sum, g) => sum + g.matches.size, 0);
  const allSaves = totals.reduce((sum, g) => sum + g.saves.size, 0);
  const overall = allMatches ? allSaves / allMatches : 0;

  const gaps: MajorGap[] = [];
  let smallGroupStudents = 0;
  for (const [group, { matches, saves }] of groups) {
    if (matches.size < MIN_GROUP) {
      smallGroupStudents += matches.size;
      continue;
    }
    const saveRate = Math.min(1, saves.size / matches.size);
    gaps.push({
      group,
      matches: matches.size,
      saves: saves.size,
      saveRate,
      suggestion:
        matches.size >= MIN_FOR_ADVICE ? advice(group, saveRate, overall, hasDescription) : null,
    });
  }
  gaps.sort((a, b) => b.matches - a.matches || a.group.localeCompare(b.group));
  return { gaps, smallGroupStudents };
}

export function buildCompleteness(
  overlay: Pick<ClubOverlay, "tagline" | "description" | "meeting_info" | "photos" | "links"> | null,
  upcomingEvents: Pick<ClubEvent, "id">[],
): { score: number; items: CompletenessItem[] } {
  const items: CompletenessItem[] = [
    {
      id: "tagline",
      label: "Tagline",
      hint: "One line that says who the club is for.",
      done: Boolean(overlay?.tagline),
    },
    {
      id: "description",
      label: "Description of at least 150 characters",
      hint: "What you do in a normal week, in your own words.",
      done: (overlay?.description?.length ?? 0) >= 150,
    },
    {
      id: "photo",
      label: "A club photo",
      hint: "Your own photo replaces the stock banner.",
      done: (overlay?.photos.length ?? 0) > 0,
    },
    {
      id: "meeting",
      label: "Meeting info",
      hint: "When and where a new student can show up.",
      done: Boolean(overlay?.meeting_info),
    },
    {
      id: "links",
      label: "A link",
      hint: "Your Instagram, GroupMe, or website.",
      done: (overlay?.links.length ?? 0) > 0,
    },
    {
      id: "event",
      label: "An upcoming event",
      hint: "Events also show on Explore's This week row.",
      done: upcomingEvents.length > 0,
    },
  ];
  const score = Math.round((items.filter((item) => item.done).length / items.length) * 100);
  return { score, items };
}

export function buildAnalytics(
  rows: ActivityRow[],
  days: number,
  today: string,
  completeness: ClubAnalytics["completeness"],
  hasDescription: boolean,
): ClubAnalytics {
  // Everything clubs pay for comes from verified, signed-in students only.
  const verified = rows.filter((row) => !row.anonymous);
  const anonymous = rows.filter((row) => row.anonymous);
  const distinct = (kind: ActivityKind) =>
    new Set(anonymous.filter((row) => row.kind === kind).map((row) => row.viewer_hash)).size;
  const funnel = buildFunnel(verified);
  const { gaps, smallGroupStudents } = buildGaps(verified, hasDescription);
  return {
    days,
    matchedStudents: funnel[0].students,
    anonymous: { impressions: distinct("impression"), views: distinct("view"), clicks: distinct("lead") },
    funnel,
    weeks: buildWeeks(verified, days, today),
    gaps,
    smallGroupStudents,
    completeness,
  };
}

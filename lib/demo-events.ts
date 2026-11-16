import type { ClubEvent } from "./club-types";
import { localDemo } from "@/lib/local-demo";

/**
 * Sample upcoming events for demo clubs, shown on Explore's This week row, on
 * the club page, and in the admin panel. Unlike the rest of demo mode these
 * appear on public pages, because they're what a demo has to show. Dates are
 * worked out from today, so the events always fall on weekdays in the coming
 * week. Demo clubs exist only on Jack's machine (see lib/local-demo.ts).
 */
const DEMO_EVENT_CLUBS = Object.keys(localDemo.content);

const ZONE = "America/Chicago";

/** A wall-clock time in Ames, `daysAhead` days from today, as an ISO string. */
function amesTime(daysAhead: number, hour: number, minute = 0) {
  const target = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE })
    .format(target)
    .split("-")
    .map(Number);
  const guess = Date.UTC(y, m - 1, d, hour, minute);
  // How far Ames is from UTC at that moment (handles daylight saving).
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(new Date(guess));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const shown = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(guess + (guess - shown)).toISOString();
}

/** Days from today to the nth upcoming weekday in Ames (0 is the next one). */
function weekdayOffset(nth: number) {
  let found = -1;
  for (let days = 1; days < 14; days++) {
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, weekday: "short" }).format(
      new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    );
    if (weekday !== "Sat" && weekday !== "Sun" && ++found === nth) return days;
  }
  return nth + 1;
}

const addHours = (iso: string, hours: number) =>
  new Date(new Date(iso).getTime() + hours * 60 * 60 * 1000).toISOString();

export function demoUpcomingEvents(slug: string): ClubEvent[] {
  const upcoming = localDemo.content[slug]?.upcoming ?? [];
  return upcoming.map((e, i) => {
    const starts_at = amesTime(weekdayOffset(e.weekday), e.hour, e.minute ?? 0);
    return {
      id: `de300000-0000-4000-8000-${String(901 + i).padStart(12, "0")}`,
      club_slug: slug,
      title: e.title,
      description: e.description,
      location: e.location,
      link: null,
      starts_at,
      ends_at: addHours(starts_at, e.hours),
    };
  });
}

/** Adds demo events to a list from the database, keeping the caller's filters. */
export function withDemoEvents(
  rows: ClubEvent[],
  options: { slug?: string; withinDays?: number; limit?: number },
): ClubEvent[] {
  const slugs = options.slug ? [options.slug] : DEMO_EVENT_CLUBS;
  const latest = options.withinDays ? Date.now() + options.withinDays * 24 * 60 * 60 * 1000 : Infinity;
  const extra = slugs
    .flatMap(demoUpcomingEvents)
    .filter((event) => new Date(event.starts_at).getTime() <= latest);
  if (extra.length === 0) return rows;
  return [...rows, ...extra]
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, options.limit ?? 40);
}

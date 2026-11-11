import type { ClubEvent } from "./club-types";

/**
 * Sample upcoming events for demo clubs, shown on Explore's This week row, on
 * the club page, and in the admin panel. Unlike the rest of demo mode these
 * appear on public pages, because they're what a demo has to show. Dates are
 * worked out from today, so the events always fall on weekdays in the coming
 * week. Empty the set to take them down.
 */
export const DEMO_EVENT_CLUBS = new Set(["entrepreneurial-product-development-club"]);

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
  if (!DEMO_EVENT_CLUBS.has(slug)) return [];
  const event = (n: number, e: Omit<ClubEvent, "id" | "club_slug" | "ends_at">, hours: number): ClubEvent => ({
    id: `de300000-0000-4000-8000-${String(900 + n).padStart(12, "0")}`,
    club_slug: slug,
    ends_at: addHours(e.starts_at, hours),
    ...e,
  });
  return [
    event(
      1,
      {
        title: "Fall Pitch Night",
        description:
          "Five student product teams pitch what they built this semester to a panel of Ames founders and investors. Vote for your favorite, stay for pizza, and meet the teams if you want to join one in the spring.",
        location: "Student Innovation Center, Room 0102",
        link: null,
        starts_at: amesTime(weekdayOffset(0), 18, 0),
      },
      2,
    ),
    event(
      2,
      {
        title: "Prototype Lab: 3D Printing and Laser Cutting",
        description:
          "Bring an idea and leave with a physical part. We'll cover CAD export, slicing, and laser cutter safety, then you'll print your own piece. No experience needed, and materials are free.",
        location: "Student Innovation Center Makerspace",
        link: null,
        starts_at: amesTime(weekdayOffset(1), 18, 30),
      },
      1.5,
    ),
    event(
      3,
      {
        title: "Founder Panel: Building a Company at Iowa State",
        description:
          "Three Iowa State alumni founders share how a class project or side idea became a real company: finding a co-founder, first customers, and what they'd do differently. Open Q&A after.",
        location: "Gerdin Business Building, Room 1148",
        link: null,
        starts_at: amesTime(weekdayOffset(3), 17, 30),
      },
      1.5,
    ),
  ];
}

/** Adds demo events to a list from the database, keeping the caller's filters. */
export function withDemoEvents(
  rows: ClubEvent[],
  options: { slug?: string; withinDays?: number; limit?: number },
): ClubEvent[] {
  const slugs = options.slug ? [options.slug] : [...DEMO_EVENT_CLUBS];
  const latest = options.withinDays ? Date.now() + options.withinDays * 24 * 60 * 60 * 1000 : Infinity;
  const extra = slugs
    .flatMap(demoUpcomingEvents)
    .filter((event) => new Date(event.starts_at).getTime() <= latest);
  if (extra.length === 0) return rows;
  return [...rows, ...extra]
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, options.limit ?? 40);
}

import "server-only";
import { demoUpcomingEvents } from "./demo-events";
import type { ActivityRow } from "./club-insights";
import type { DemoContent } from "./demo-types";
import { localDemo } from "@/lib/local-demo";
import type {
  ClubEvent,
  GoodFitLead,
  InterestedLead,
  LeadStudent,
  RosterMember,
} from "./club-types";

/**
 * Demo mode for showing the admin panel to prospective clients. For demo clubs
 * only, the panel's read views mix sample students, events, campaigns, and
 * activity in with the real data. Nothing here is written to the database.
 * The live site has no demo clubs: their content comes from lib/local-demo.ts,
 * which is empty in the repo and swapped for a gitignored file on Jack's machine.
 */
const content = (slug: string): DemoContent | undefined => localDemo.content[slug];

export const isDemoClub = (slug: string) => content(slug) !== undefined;

/** Sample ids share one prefix, so routes can tell them apart from real users. */
const DEMO_PREFIX = "de300000-0000-4000-8000-";
export const isDemoId = (id: unknown) => typeof id === "string" && id.startsWith(DEMO_PREFIX);
const demoId = (n: number) => `${DEMO_PREFIX}${String(n).padStart(12, "0")}`;

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number, hour = 15) => {
  const date = new Date(Date.now() - n * DAY);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
};

const student = (slug: string, n: number): LeadStudent => {
  const [name, major, year, interests, lookingFor] = content(slug)!.people[n];
  return {
    id: demoId(n + 1),
    display_name: name,
    major,
    class_year: year,
    avatar_url: null,
    avatar_preset: n % 8,
    interests,
    looking_for: lookingFor,
    links: [],
  };
};

/** Members: the first 14 people, three of them officers. */
export function demoMembers(slug: string): RosterMember[] {
  return Array.from({ length: 14 }, (_, n) => ({
    id: demoId(n + 1),
    profile: student(slug, n),
    role: n < 3 ? "officer" : "member",
    verified: n < 11,
    since: daysAgo(4 + n * 9),
  }));
}

const fitFor = (slug: string, i: number) => {
  const fit = content(slug)!.fit;
  return fit[i % fit.length];
};

export function demoGoodFit(slug: string): GoodFitLead[] {
  const matches = [94, 91, 89, 87, 86, 84, 82, 80, 78, 76];
  return matches.map((match, i) => ({
    ...student(slug, 14 + i),
    match,
    fit: fitFor(slug, i),
    invited: i === 2 || i === 6,
  }));
}

export function demoInterested(slug: string): InterestedLead[] {
  return [14, 16, 18, 20, 22, 23].map((n, i) => ({
    ...student(slug, n),
    since: daysAgo(1 + i * 3, 13 + i),
    fit: fitFor(slug, i),
  }));
}

export function demoEvents(slug: string): ClubEvent[] {
  const past = (content(slug)?.past ?? []).map(
    (e, i): ClubEvent => {
      const starts = daysAgo(e.daysAgo, e.hourUtc);
      return {
        id: demoId(950 + i),
        club_slug: slug,
        title: e.title,
        description: e.description,
        location: e.location,
        link: null,
        starts_at: starts,
        ends_at: new Date(new Date(starts).getTime() + e.hours * 60 * 60 * 1000).toISOString(),
      };
    },
  );
  return [...demoUpcomingEvents(slug), ...past];
}

export function demoCampaigns(slug: string) {
  return (content(slug)?.campaigns ?? []).map((c, i) => ({
    id: demoId(801 + i),
    subject: c.subject,
    body: c.body,
    audience: c.audience,
    recipient_count: c.recipient_count,
    created_at: daysAgo(c.daysAgo, c.hourUtc),
  }));
}

/** Shown in the Profile tab until officers save their own. Saving makes it real. */
export function demoProfile(slug: string) {
  return {
    club_slug: slug,
    ...content(slug)!.profile,
    photos: [],
    links: [] as { label: string; url: string }[],
    updated_at: daysAgo(3),
  };
}

/** The demo profile fills in until officers write a description of their own. */
export function withDemoProfile<T extends { description?: string | null; photos?: string[] } | null>(
  slug: string,
  saved: T,
) {
  if (!isDemoClub(slug) || saved?.description) return saved;
  return { ...demoProfile(slug), photos: saved?.photos ?? [] };
}

export const DEMO_AUDIENCE = { members: 14, interested: 6 };
export const DEMO_INVITES = { sent: 9, interested: 4 };

/** Small deterministic generator, so the charts don't change on every refresh. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** About 90 days of sample activity, growing a little week over week. */
export function demoActivity(slug: string, days: number, chicagoDay: (date: Date) => string): ActivityRow[] {
  const majors = content(slug)?.majors ?? [];
  if (majors.length === 0) return [];
  const rand = seeded(42);
  const rows: ActivityRow[] = [];
  let viewer = 0;
  for (let ago = 89; ago >= 0; ago--) {
    const day = chicagoDay(new Date(Date.now() - ago * DAY));
    const growth = 1 + (89 - ago) / 120;
    const impressions = Math.round((14 + rand() * 12) * growth);
    for (let i = 0; i < impressions; i++) {
      const [major, area] = majors[Math.floor(rand() * majors.length)];
      const anonymous = rand() < 0.2;
      const hash = `demo-${viewer++}`;
      const add = (kind: ActivityRow["kind"]) =>
        rows.push({ kind, major: anonymous ? null : major, academic_area: anonymous ? null : area, viewer_hash: hash, day, anonymous });
      add("impression");
      if (rand() < 0.34) {
        add("view");
        if (rand() < 0.3) add("lead");
        if (!anonymous && rand() < 0.28) {
          add("save");
          if (rand() < 0.22) add("interested");
          if (rand() < 0.08) add("join");
        }
      }
    }
  }
  const since = chicagoDay(new Date(Date.now() - (days - 1) * DAY));
  return rows.filter((row) => row.day >= since);
}

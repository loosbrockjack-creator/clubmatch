import type { CampaignAudience } from "./club-types";
import type { Club } from "./types";

/** A sample student: name, major, class year, interest tags, looking for. */
export type DemoPerson = [name: string, major: string, year: string, interests: string[], lookingFor: string];

/** Everything a demo club shows in its admin panel and public pages. */
export type DemoContent = {
  /** 24 sample students: the first 14 are members, the rest are leads. */
  people: DemoPerson[];
  /** "Why they fit" chips, cycled across the sample leads. */
  fit: string[][];
  profile: { tagline: string; description: string; meeting_info: string };
  /** Upcoming events: `weekday` is the nth weekday from today (0 is the next one). */
  upcoming: { title: string; description: string; location: string; weekday: number; hour: number; minute?: number; hours: number }[];
  past: { title: string; description: string; location: string; daysAgo: number; hourUtc: number; hours: number }[];
  campaigns: { subject: string; body: string; audience: CampaignAudience; recipient_count: number; daysAgo: number; hourUtc: number }[];
  /** Majors (with academic area) the sample analytics traffic is drawn from. */
  majors: [major: string, area: string][];
};

/**
 * Local-only demo data. The repo ships an empty one (lib/local-demo.ts). On
 * Jack's machine, next.config.ts swaps in a gitignored file with a fake club,
 * so the demo never reaches the live site.
 */
export type LocalDemo = {
  clubs: Club[];
  content: Record<string, DemoContent>;
  devAccounts: { key: string; email: string; label: string }[];
};


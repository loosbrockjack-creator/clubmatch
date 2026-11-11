import "server-only";
import { demoUpcomingEvents } from "./demo-events";
import type { ActivityRow } from "./club-insights";
import type {
  ClubEvent,
  GoodFitLead,
  InterestedLead,
  LeadStudent,
  RosterMember,
} from "./club-types";

/**
 * Demo mode for showing the admin panel to prospective clients. For these clubs
 * only, the panel's read views mix sample students, events, campaigns, and
 * activity in with the real data. Nothing here is written to the database, so
 * the public site and other clubs never see it. Remove a slug to switch it off.
 */
export const DEMO_CLUBS = new Set(["entrepreneurial-product-development-club"]);

export const isDemoClub = (slug: string) => DEMO_CLUBS.has(slug);

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

type Person = [name: string, major: string, year: string, interests: string[], lookingFor: string];

const PEOPLE: Person[] = [
  ["Maya Patel", "Industrial Engineering", "Junior", ["career:entrepreneurship", "goal:hands-on"], "teammates"],
  ["Ethan Brooks", "Mechanical Engineering", "Senior", ["career:engineering-design", "goal:skills"], "club"],
  ["Sofia Ramirez", "Marketing", "Sophomore", ["career:marketing", "goal:entrepreneurship"], "teammates"],
  ["Noah Kim", "Computer Engineering", "Junior", ["career:software", "goal:hands-on"], "club"],
  ["Ava Johnson", "Entrepreneurship", "Senior", ["career:entrepreneurship", "area:business"], "teammates"],
  ["Liam Nguyen", "Industrial Design", "Junior", ["area:design", "goal:hands-on"], "club"],
  ["Olivia Chen", "Management Information Systems", "Sophomore", ["career:consulting", "goal:skills"], "club"],
  ["Lucas Meyer", "Mechanical Engineering", "Freshman", ["career:engineering-design", "goal:entrepreneurship"], "browsing"],
  ["Emma Schultz", "Supply Chain Management", "Junior", ["area:business", "goal:skills"], "friends"],
  ["Jackson Lee", "Software Engineering", "Senior", ["career:software", "career:entrepreneurship"], "teammates"],
  ["Isabella Torres", "Graphic Design", "Sophomore", ["area:design", "goal:entrepreneurship"], "club"],
  ["Owen Fischer", "Electrical Engineering", "Junior", ["area:engineering", "goal:hands-on"], "study_group"],
  ["Chloe Anderson", "Finance", "Senior", ["career:finance", "career:entrepreneurship"], "club"],
  ["Daniel Okafor", "Aerospace Engineering", "Sophomore", ["career:engineering-design", "goal:skills"], "teammates"],
  ["Grace Wilson", "Business Analytics", "Junior", ["career:data-ai", "goal:entrepreneurship"], "club"],
  ["Ryan Hoffman", "Agricultural Engineering", "Senior", ["area:engineering", "goal:hands-on"], "browsing"],
  ["Zoe Martinez", "Marketing", "Freshman", ["career:marketing", "goal:skills"], "friends"],
  ["Henry Larson", "Industrial Engineering", "Junior", ["career:consulting", "goal:hands-on"], "club"],
  ["Lily Nelson", "Computer Science", "Sophomore", ["career:software", "goal:entrepreneurship"], "teammates"],
  ["Mason Clark", "Mechanical Engineering", "Graduate", ["career:engineering-design", "career:entrepreneurship"], "club"],
  ["Harper Davis", "Entrepreneurship", "Sophomore", ["career:entrepreneurship", "goal:skills"], "club"],
  ["Elijah Brown", "Construction Engineering", "Junior", ["area:engineering", "goal:entrepreneurship"], "browsing"],
  ["Amelia Thompson", "Apparel, Merchandising, and Design", "Senior", ["area:design", "career:marketing"], "club"],
  ["Benjamin Wright", "Management", "Junior", ["career:consulting", "career:entrepreneurship"], "teammates"],
];

const student = (n: number): LeadStudent => {
  const [name, major, year, interests, lookingFor] = PEOPLE[n];
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
export function demoMembers(): RosterMember[] {
  return Array.from({ length: 14 }, (_, n) => ({
    id: demoId(n + 1),
    profile: student(n),
    role: n < 3 ? "officer" : "member",
    verified: n < 11,
    since: daysAgo(4 + n * 9),
  }));
}

const FIT: string[][] = [
  ["Into Entrepreneurship", "Wants hands-on projects"],
  ["Into Engineering design", "Wants to build skills"],
  ["Interested in Business", "Wants to start something"],
  ["Into Entrepreneurship", "Interested in Engineering"],
];

export function demoGoodFit(): GoodFitLead[] {
  const matches = [94, 91, 89, 87, 86, 84, 82, 80, 78, 76];
  return matches.map((match, i) => ({
    ...student(14 + i),
    match,
    fit: FIT[i % FIT.length],
    invited: i === 2 || i === 6,
  }));
}

export function demoInterested(): InterestedLead[] {
  return [14, 16, 18, 20, 22, 23].map((n, i) => ({
    ...student(n),
    since: daysAgo(1 + i * 3, 13 + i),
    fit: FIT[i % FIT.length],
  }));
}

export function demoEvents(slug: string): ClubEvent[] {
  const event = (
    n: number,
    title: string,
    description: string,
    location: string,
    starts: string,
    hours: number,
  ): ClubEvent => ({
    id: demoId(900 + n),
    club_slug: slug,
    title,
    description,
    location,
    link: null,
    starts_at: starts,
    ends_at: new Date(new Date(starts).getTime() + hours * 60 * 60 * 1000).toISOString(),
  });
  return [
    ...demoUpcomingEvents(slug),
    event(4, "Kickoff Meeting and Team Matching", "Meet the club, hear this semester's project ideas, and find a team.", "Student Innovation Center, Room 0102", daysAgo(24, 23), 1.5),
    event(5, "Customer Discovery Bootcamp", "How to run interviews that tell you whether anyone wants what you're building.", "Pearson Hall, Room 1110", daysAgo(10, 23), 2),
  ];
}

export function demoCampaigns() {
  return [
    {
      id: demoId(801),
      subject: "Pitch Night is next Thursday",
      body: "Teams, slides are due Monday. Everyone else, come watch and vote for your favorite product. Pizza at 6.",
      audience: "both",
      recipient_count: 20,
      created_at: daysAgo(2, 18),
    },
    {
      id: demoId(802),
      subject: "Makerspace hours for prototype week",
      body: "We booked the makerspace Tuesday and Wednesday nights. Sign up for a printer slot in the group chat.",
      audience: "members",
      recipient_count: 14,
      created_at: daysAgo(9, 16),
    },
    {
      id: demoId(803),
      subject: "Thanks for your interest in EPDC",
      body: "Our next kickoff is open to everyone. Come meet the teams and see if there's a project you'd like to join.",
      audience: "interested",
      recipient_count: 6,
      created_at: daysAgo(21, 17),
    },
  ];
}

/** Shown in the Profile tab until officers save their own. Saving makes it real. */
export function demoProfile(slug: string) {
  return {
    club_slug: slug,
    tagline: "Build real products with a team, from first sketch to working prototype.",
    description:
      "EPDC is where Iowa State students turn product ideas into things people can hold. Each semester we form small cross-functional teams of engineers, designers, and business majors, and each team takes one idea through customer discovery, prototyping, and a final pitch.\n\nNo experience needed. New members join a team in their first week, learn the tools in our makerspace workshops, and leave the semester with a real project for their resume. Past teams have gone on to the CYstarters accelerator and the Iowa State pitch competition.",
    meeting_info: "Thursdays, 6:00 to 7:30 PM, Student Innovation Center, Room 0102. About 2 to 3 hours a week with team work.",
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

const MAJORS: [string, string][] = [
  ["Industrial Engineering", "engineering"],
  ["Mechanical Engineering", "engineering"],
  ["Entrepreneurship", "business"],
  ["Marketing", "business"],
  ["Management Information Systems", "business"],
  ["Computer Engineering", "engineering"],
  ["Industrial Design", "design"],
  ["Finance", "business"],
  ["Software Engineering", "computing"],
  ["Supply Chain Management", "business"],
];

/** About 90 days of sample activity, growing a little week over week. */
export function demoActivity(days: number, chicagoDay: (date: Date) => string): ActivityRow[] {
  const rand = seeded(42);
  const rows: ActivityRow[] = [];
  let viewer = 0;
  for (let ago = 89; ago >= 0; ago--) {
    const day = chicagoDay(new Date(Date.now() - ago * DAY));
    const growth = 1 + (89 - ago) / 120;
    const impressions = Math.round((14 + rand() * 12) * growth);
    for (let i = 0; i < impressions; i++) {
      const [major, area] = MAJORS[Math.floor(rand() * MAJORS.length)];
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

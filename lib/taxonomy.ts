import type {
  AcademicAreaId,
  CareerId,
  CommitmentId,
  ExperienceId,
  GoalId,
} from "./types";

export interface Option<T extends string> {
  id: T;
  label: string;
  hint: string;
}

export const ACADEMIC_AREAS: Option<AcademicAreaId>[] = [
  {
    id: "business",
    label: "Business",
    hint: "Finance, marketing, accounting, supply chain, MIS",
  },
  {
    id: "engineering",
    label: "Engineering",
    hint: "Mechanical, civil, electrical, chemical, aerospace",
  },
  {
    id: "computing",
    label: "Computing & Data",
    hint: "Computer science, software, data science, cybersecurity",
  },
  {
    id: "agriculture",
    label: "Agriculture & Life Sciences",
    hint: "Agronomy, animal science, agribusiness, food science",
  },
  {
    id: "design",
    label: "Design & Architecture",
    hint: "Architecture, industrial design, graphic design",
  },
  {
    id: "liberal-arts",
    label: "Liberal Arts & Sciences",
    hint: "Communication, political science, biology, psychology",
  },
  {
    id: "human-sciences",
    label: "Human Sciences",
    hint: "Education, kinesiology, dietetics, event management",
  },
];

export const UNDECIDED_OPTION: Option<"undecided"> = {
  id: "undecided",
  label: "Still deciding",
  hint: "Show me strong options across every college",
};

export const CAREERS: Option<CareerId>[] = [
  { id: "finance", label: "Finance", hint: "Markets, banking, investing" },
  { id: "accounting", label: "Accounting", hint: "Audit, tax, assurance" },
  {
    id: "consulting",
    label: "Consulting",
    hint: "Strategy and problem solving",
  },
  { id: "marketing", label: "Marketing", hint: "Brand, growth, content" },
  {
    id: "real-estate",
    label: "Real Estate",
    hint: "Development and investment",
  },
  {
    id: "supply-chain",
    label: "Supply Chain",
    hint: "Logistics and operations",
  },
  { id: "software", label: "Software", hint: "Apps, systems, developer tools" },
  { id: "data-ai", label: "Data & AI", hint: "Analytics, modeling, research" },
  {
    id: "cybersecurity",
    label: "Cybersecurity",
    hint: "Security, defense, forensics",
  },
  {
    id: "engineering-design",
    label: "Engineering & Hardware",
    hint: "Mechanical, civil, electrical work",
  },
  {
    id: "architecture",
    label: "Architecture & Design",
    hint: "Buildings, products, visual design",
  },
  {
    id: "agriculture-food",
    label: "Agriculture & Food",
    hint: "Agronomy, agribusiness, animal science",
  },
  {
    id: "healthcare",
    label: "Healthcare",
    hint: "Medicine, veterinary, public health",
  },
  {
    id: "media-comm",
    label: "Media & Communication",
    hint: "Journalism, PR, public speaking",
  },
  {
    id: "entrepreneurship",
    label: "Entrepreneurship",
    hint: "Startups and building things",
  },
];

export const GOALS: Option<GoalId>[] = [
  {
    id: "career",
    label: "Advance my career",
    hint: "Internships, recruiting, industry exposure",
  },
  {
    id: "networking",
    label: "Meet people in my field",
    hint: "Alumni, employers, upperclassmen",
  },
  {
    id: "community",
    label: "Find friends and community",
    hint: "A group that feels like mine",
  },
  {
    id: "leadership",
    label: "Lead something",
    hint: "Officer roles and real responsibility",
  },
  {
    id: "hands-on",
    label: "Get hands-on experience",
    hint: "Build, test, and ship real work",
  },
  {
    id: "skills",
    label: "Build practical skills",
    hint: "Things I can put on a resume",
  },
  {
    id: "entrepreneurship",
    label: "Try entrepreneurship",
    hint: "Start something of my own",
  },
];

export const EXPERIENCES: Option<ExperienceId>[] = [
  {
    id: "professional",
    label: "Professional development",
    hint: "Speakers, company visits, career prep",
  },
  {
    id: "projects",
    label: "Hands-on projects",
    hint: "Design, build, and test as a team",
  },
  {
    id: "competition",
    label: "Competition teams",
    hint: "Case competitions and contests",
  },
  {
    id: "academic",
    label: "Academic and technical",
    hint: "Go deeper in the subject itself",
  },
  {
    id: "community",
    label: "Community and social",
    hint: "People first, low pressure",
  },
  {
    id: "service",
    label: "Service and volunteering",
    hint: "Outreach and giving back",
  },
];

export const COMMITMENTS: Option<CommitmentId>[] = [
  {
    id: "casual",
    label: "Under 2 hours a week",
    hint: "Drop in when I can",
  },
  {
    id: "moderate",
    label: "2 to 4 hours a week",
    hint: "Regular member, steady pace",
  },
  {
    id: "involved",
    label: "5 to 8 hours a week",
    hint: "Deeply involved, maybe an officer",
  },
  {
    id: "high",
    label: "As much as it takes",
    hint: "Competition teams and big projects",
  },
];

export const FLEXIBLE_OPTION: Option<"flexible"> = {
  id: "flexible",
  label: "I'm flexible",
  hint: "Show me the best fit regardless of hours",
};

export const COMMITMENT_ORDER: CommitmentId[] = [
  "casual",
  "moderate",
  "involved",
  "high",
];

function toLookup<T extends string>(options: Option<T>[]) {
  return Object.fromEntries(options.map((o) => [o.id, o])) as Record<
    T,
    Option<T>
  >;
}

export const ACADEMIC_AREA_BY_ID = toLookup(ACADEMIC_AREAS);
export const CAREER_BY_ID = toLookup(CAREERS);
export const GOAL_BY_ID = toLookup(GOALS);
export const EXPERIENCE_BY_ID = toLookup(EXPERIENCES);
export const COMMITMENT_BY_ID = toLookup(COMMITMENTS);

export const GOAL_PHRASE: Record<GoalId, string> = {
  career: "career development",
  networking: "networking",
  community: "finding community",
  leadership: "leadership",
  "hands-on": "hands-on experience",
  skills: "building practical skills",
  entrepreneurship: "entrepreneurship",
};

export const EXPERIENCE_PHRASE: Record<ExperienceId, string> = {
  professional: "professional development",
  projects: "hands-on projects",
  competition: "competition",
  academic: "technical depth",
  community: "community",
  service: "service",
};

export const COMMITMENT_SHORT: Record<CommitmentId, string> = {
  casual: "Under 2 hr/wk",
  moderate: "2-4 hr/wk",
  involved: "5-8 hr/wk",
  high: "8+ hr/wk",
};

export const COMMITMENT_TEXT: Record<CommitmentId, string> = {
  casual: "About 1 to 2 hours a week",
  moderate: "About 2 to 4 hours a week",
  involved: "About 5 to 8 hours a week",
  high: "8 or more hours a week",
};

/**
 * Representative majors per academic area. Derived rather than stored so the
 * club index stays small; these are the majors a student in that area would
 * recognize, not a roster of who actually joins.
 */
const MAJORS_BY_AREA: Record<AcademicAreaId, string[]> = {
  business: ["Finance", "Marketing", "Accounting", "Supply Chain", "Management"],
  engineering: [
    "Mechanical Engineering",
    "Civil Engineering",
    "Electrical Engineering",
    "Aerospace Engineering",
    "Industrial Engineering",
  ],
  computing: [
    "Computer Science",
    "Software Engineering",
    "Data Science",
    "Cybersecurity",
    "Management Information Systems",
  ],
  agriculture: [
    "Agronomy",
    "Animal Science",
    "Agricultural Business",
    "Food Science",
    "Horticulture",
  ],
  design: [
    "Architecture",
    "Graphic Design",
    "Industrial Design",
    "Interior Design",
    "Landscape Architecture",
  ],
  "liberal-arts": [
    "Biology",
    "Psychology",
    "Political Science",
    "Communication",
    "English",
  ],
  "human-sciences": [
    "Kinesiology",
    "Dietetics",
    "Education",
    "Event Management",
    "Apparel Merchandising",
  ],
};

export function majorsForAreas(areas: AcademicAreaId[]): string[] {
  const out: string[] = [];
  for (const area of areas) {
    for (const major of MAJORS_BY_AREA[area] ?? []) {
      if (!out.includes(major)) out.push(major);
    }
  }
  return out.slice(0, 5);
}

export function joinWithAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

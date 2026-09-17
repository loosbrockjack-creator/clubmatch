export type AcademicAreaId =
  | "business"
  | "engineering"
  | "computing"
  | "agriculture"
  | "design"
  | "liberal-arts"
  | "human-sciences";

export type CareerId =
  | "finance"
  | "accounting"
  | "consulting"
  | "marketing"
  | "real-estate"
  | "supply-chain"
  | "software"
  | "data-ai"
  | "cybersecurity"
  | "engineering-design"
  | "architecture"
  | "agriculture-food"
  | "healthcare"
  | "media-comm"
  | "entrepreneurship";

export type GoalId =
  | "career"
  | "networking"
  | "community"
  | "leadership"
  | "hands-on"
  | "skills"
  | "entrepreneurship";

export type ExperienceId =
  | "professional"
  | "projects"
  | "competition"
  | "academic"
  | "community"
  | "service";

export type CommitmentId = "casual" | "moderate" | "involved" | "high";

/**
 * What a card, a filter, and a match score need. Every club in the directory
 * ships this to the browser, so it stays small on purpose.
 */
export interface ClubSummary {
  id: string;
  name: string;
  mark: string;
  slug: string;
  /** Empty for organizations that do not belong to a college. */
  college: string;
  tagline: string;
  categories: string[];
  academicAreas: AcademicAreaId[];
  openToAllMajors: boolean;
  careerPaths: CareerId[];
  goalsServed: GoalId[];
  experienceTypes: ExperienceId[];
  commitmentLevel: CommitmentId;
  freshmenWelcome: boolean;
}

/**
 * The full record behind one club page. Registry prose is often thin, so the
 * text fields can be empty and the page is expected to handle that.
 */
export interface Club extends ClubSummary {
  summary: string;
  meetingFrequency: string;
  meetingDetail: string;
  bestFor: string;
  whatYouDo: string[];
  whatYouGain: string[];
  beginnerFriendly: boolean;
  applicationRequired: boolean;
  /** The organization's page in Iowa State's official directory. */
  stuorgUrl: string;
  memberCount: number | null;
}

export interface Preferences {
  academicArea: AcademicAreaId | "undecided" | null;
  goals: GoalId[];
  careers: CareerId[];
  commitment: CommitmentId | "flexible" | null;
  experiences: ExperienceId[];
  completedAt: string;
}

export interface MatchResult {
  club: ClubSummary;
  score: number;
  reasons: string[];
}

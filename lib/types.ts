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

export interface Club {
  id: string;
  name: string;
  mark: string;
  slug: string;
  college: string;
  tagline: string;
  summary: string;
  academicAreas: AcademicAreaId[];
  openToAllMajors: boolean;
  majors: string[];
  categories: string[];
  careerPaths: CareerId[];
  goalsServed: GoalId[];
  experienceTypes: ExperienceId[];
  commitmentLevel: CommitmentId;
  commitmentText: string;
  meetingFrequency: string;
  bestFor: string;
  whatYouDo: string[];
  whatYouGain: string[];
  beginnerFriendly: boolean;
  freshmenWelcome: boolean;
  applicationRequired: boolean;
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
  club: Club;
  score: number;
  reasons: string[];
}

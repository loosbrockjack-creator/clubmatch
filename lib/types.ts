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

/** Iowa State's four Greek governing councils. */
export type CouncilId = "cpc" | "ifc" | "mgc" | "nphc";

export type GreekKind = "fraternity" | "sorority";

/** Quiz answer for Greek life. "no" keeps every chapter out of results. */
export type GreekInterest = "fraternity" | "sorority" | "either" | "no";

/**
 * The card-and-filter half of a chapter's SFE record. Only chapters on the
 * Office of Sorority and Fraternity Engagement's list carry this.
 */
export interface GreekSummary {
  kind: GreekKind;
  /** Null for the two chapters SFE lists without a council. */
  council: CouncilId | null;
  /** "ΑΓΡ" when the name is all Greek letters, otherwise empty. */
  letters: string;
  /** SFE's academic, identity, and religious tags, e.g. "STEM", "Catholic". */
  affiliations: string[];
  /** What students actually call it ("Tri Delta"), for search. */
  nickname: string;
  /** Null when the chapter's SFE page is empty, so housing is unknown. */
  housed: boolean | null;
  /** The chapter's own photo from its SFE page, or null. */
  photo: string | null;
}

/** Chapter text from the SFE page. Empty strings where SFE says nothing. */
export interface GreekDetail {
  sfeUrl: string;
  nickname: string;
  motto: string;
  philanthropy: string;
  foundedLocal: string;
  foundedNational: string;
  quote: string;
  quoteAuthor: string;
  address: string;
  parking: string;
  living: string;
  alcoholStatus: "" | "Prohibited" | "Limited" | "Permitted";
  chapterWebsite: string;
  nationalWebsite: string;
  socialUrl: string;
}

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
  greek?: GreekSummary;
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
  /** The organization's page in Iowa State's official directory. Empty for
   * the few Greek chapters only SFE lists. */
  stuorgUrl: string;
  memberCount: number | null;
  greekDetail?: GreekDetail;
}

export interface Preferences {
  academicArea: AcademicAreaId | "undecided" | null;
  goals: GoalId[];
  careers: CareerId[];
  commitment: CommitmentId | "flexible" | null;
  experiences: ExperienceId[];
  /** Missing on preferences saved before the Greek life step existed. */
  greek?: GreekInterest | null;
  completedAt: string;
}

export interface MatchResult {
  club: ClubSummary;
  score: number;
  reasons: string[];
}

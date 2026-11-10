export type AcademicAreaId =
  | "business"
  | "engineering"
  | "computing"
  | "agriculture"
  | "design"
  | "liberal-arts"
  | "human-sciences"
  | "veterinary";

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
  | "entrepreneurship"
  /** "Something not listed". No club carries it; it just means the list didn't fit. */
  | "other";

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
 * What a student wants from a club. The quiz used to ask this as two
 * overlapping questions (goals and experience); this one list replaces both.
 */
export type WantId =
  | "career"
  | "networking"
  | "community"
  | "leadership"
  | "projects"
  | "competition"
  | "academic"
  | "service"
  | "entrepreneurship";

/**
 * Communities a student can opt in to. Nobody is asked who they are; clubs
 * built around a faith, culture, or identity only show up for students who
 * ask for that kind of community.
 */
/** Private. Only decides which clubs built for one gender are shown. */
export type GenderId = "male" | "female" | "prefer-not";

/** A broad interest the student picked, with the club topics it stands for. */
export interface InterestPick {
  id: string;
  label: string;
  topics: string[];
}

export type CommunityId =
  | "faith"
  | "culture-heritage"
  | "international"
  | "lgbtq"
  | "women-in-field"
  | "disability";

/** Who a club is for. Drives which clubs the quiz can recommend at all. */
export type Audience =
  | "general"
  | "identity"
  | "faith"
  | "international"
  | "residence"
  | "graduate"
  | "honor"
  | "governance"
  | "greek";

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
  /** Derived from `wants`; kept for profile interests and older code paths. */
  goalsServed: GoalId[];
  /** Derived from `wants`; kept for older code paths. */
  experienceTypes: ExperienceId[];
  wants: WantId[];
  /** Short lowercase keywords a student might type ("rock climbing"). */
  topics: string[];
  audience: Audience;
  communityTags: CommunityId[];
  /** Built for women or men (a gendered team, a Women in X group), else null. */
  genderFocus: "women" | "men" | null;
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
  /**
   * The student's main area, or "undecided". Kept (as the first pick of
   * `academicAreas`) so older answers, officer checks, and totals still work.
   */
  academicArea: AcademicAreaId | "undecided" | null;
  /** Everything they picked, up to 3 (a double major, a minor). Missing on older answers. */
  academicAreas?: AcademicAreaId[];
  /** Legacy: kept in sync from `wants` so saved profiles keep working. */
  goals: GoalId[];
  careers: CareerId[];
  commitment: CommitmentId | "flexible" | null;
  /** Legacy: kept in sync from `wants`. */
  experiences: ExperienceId[];
  /** Missing on answers saved before the merged question existed. */
  wants?: WantId[];
  /** Opt-in communities. Missing or empty means none. */
  communities?: CommunityId[];
  /** Broad interests picked in "Anything specific?". */
  interests?: InterestPick[];
  /** The interests' club topics, flattened. What scoring reads. */
  topics?: string[];
  /** Private. Missing on older answers, which show every club. */
  gender?: GenderId | null;
  /** Topic keywords read from an uploaded resume. Weaker than typed ones. */
  resumeTopics?: string[];
  /** Missing on preferences saved before the Greek life step existed. */
  greek?: GreekInterest | null;
  completedAt: string;
}

export interface MatchResult {
  club: ClubSummary;
  score: number;
  reasons: string[];
  /** False when the club matched nothing specific or is opt-in only. */
  eligible: boolean;
}

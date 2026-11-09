/** Shapes shared by the club routes and the screens that call them. */

export const CLAIM_PRICE_LABEL = "$49";
export const CLAIM_PRICE_CENTS = 4900;
export const CLAIM_INTERVAL_MONTHS = 6;
export const CLAIM_RENEWAL_TEXT = "Renews at $49 every 6 months until you cancel.";

export type ClubStatus = "unclaimed" | "active" | "past_due" | "lapsed";

export type ClubLink = { label: string; url: string };

/** What a club page shows on top of the static directory record. */
export interface ClubOverlay {
  club_slug: string;
  tagline: string | null;
  description: string | null;
  meeting_info: string | null;
  photos: string[];
  links: ClubLink[];
  updated_at: string;
}

export interface ClubEvent {
  id: string;
  club_slug: string;
  title: string;
  description: string | null;
  location: string | null;
  link: string | null;
  starts_at: string;
  ends_at: string | null;
}

export interface ClaimState {
  status: ClubStatus;
  isOfficer: boolean;
  /** Allowed to go straight to checkout: allowlisted, approved, or a lapsed officer. */
  canCheckout: boolean;
  claim: { status: "pending" | "approved" | "rejected"; created_at: string } | null;
  /** This student's checkout lost a race for the club, so Stripe refunded it. */
  duplicatePayment: boolean;
}

export interface ManageAccess {
  allowed: true;
  slug: string;
  status: ClubStatus;
  role: "officer";
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  featuredOptIn: boolean;
}

/** Only ever public profile columns plus a score. Never quiz answers or reasons. */
export interface LeadStudent {
  id: string;
  display_name: string | null;
  major: string | null;
  class_year: string | null;
  avatar_url: string | null;
  avatar_preset: number | null;
  interests: string[];
  looking_for: string | null;
  links: { url: string; label?: string }[];
}

export type GoodFitLead = LeadStudent & { match: number; fit: string[] };
export type InterestedLead = LeadStudent & { since: string; fit: string[] };

export interface RosterMember {
  id: string;
  /** Null when the student's profile is hidden. */
  profile: LeadStudent | null;
  role: "member" | "officer";
  verified: boolean;
  since: string;
}

export interface CampaignSummary {
  id: string;
  subject: string;
  body: string;
  audience: CampaignAudience;
  recipient_count: number;
  created_at: string;
}

export const CAMPAIGN_AUDIENCES = ["members", "interested", "both"] as const;
export type CampaignAudience = (typeof CAMPAIGN_AUDIENCES)[number];
export const CAMPAIGN_AUDIENCE_LABEL: Record<CampaignAudience, string> = {
  members: "Members",
  interested: "Interested students",
  both: "Members and interested students",
};
export const CAMPAIGN_DAILY_LIMIT = 2;
export const CAMPAIGN_WEEKLY_LIMIT = 5;

/** How many ranked matches Results shows, and so what counts as showing up in them. */
export const RESULT_LIMIT = 9;

export const ACTIVITY_KINDS = ["impression", "view", "save", "interested", "lead", "join"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export interface FunnelStage {
  kind: ActivityKind;
  label: string;
  students: number;
}

export interface WeekPoint {
  /** Monday of the week, YYYY-MM-DD. */
  week: string;
  counts: Record<ActivityKind, number>;
}

export interface MajorGap {
  group: string;
  matches: number;
  saves: number;
  saveRate: number;
  suggestion: string | null;
}

export interface CompletenessItem {
  id: string;
  label: string;
  hint: string;
  done: boolean;
}

export interface ClubAnalytics {
  days: number;
  /** Signed-in students only: token verified and counted once each. */
  matchedStudents: number;
  /** Signed-out visitors. Can't be verified, so never part of the numbers above. */
  anonymous: { impressions: number; views: number; clicks: number };
  funnel: FunnelStage[];
  weeks: WeekPoint[];
  gaps: MajorGap[];
  /** Students left out of the per-major table because their group is too small to show. */
  smallGroupStudents: number;
  completeness: { score: number; items: CompletenessItem[] };
}

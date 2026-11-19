/** Shapes the owner dashboard (/admin) gets from /api/admin/*. Client safe. */

export type Count = { label: string; count: number };

export type AdminOverview = {
  generatedAt: string;
  students: {
    signedUp: number;
    onboarded: number;
    tookQuiz: number;
    interested: number;
    last7d: number;
    prev7d: number;
  };
  weekly: { weekStart: string; count: number }[];
  majors: Count[];
  classYears: Count[];
  claims: { pending: number; approved: number; rejected: number; oldestPendingAt: string | null };
  clubs: { active: number; pastDue: number; canceling: number; lapsed: number; paid: number; quiet: number };
  claimViews30d: number;
};

export type ClaimStatus = "pending" | "approved" | "rejected";

export type AdminClaim = {
  id: string;
  clubSlug: string;
  clubName: string;
  email: string;
  role: string;
  note: string | null;
  status: ClaimStatus;
  createdAt: string;
  reviewedAt: string | null;
  claimViews30d: number;
};

export type AdminStudent = {
  id: string;
  name: string | null;
  email: string | null;
  major: string | null;
  classYear: string | null;
  onboarded: boolean;
  tookQuiz: boolean;
  visible: boolean;
  interests: number;
  saves: number;
  officerOf: string[];
  createdAt: string;
  lastSignIn: string | null;
};

export type ClubHealth = "active" | "past_due" | "canceling" | "lapsed";

export type AdminClub = {
  slug: string;
  name: string;
  health: ClubHealth;
  paid: boolean;
  payerGone: boolean;
  periodEnd: string | null;
  renewsSoon: boolean;
  lastEventAt: string | null;
  profileUpdatedAt: string | null;
  quiet: boolean;
  officers: number;
  members: number;
  interests30d: number;
  views30d: number;
  createdAt: string;
};

export type AdminDemand = {
  slug: string;
  name: string;
  interests: number;
  interests30d: number;
  saves: number;
  saves30d: number;
  views30d: number;
  claimViews30d: number;
  pendingClaim: boolean;
  score: number;
};

export type AdminReport = {
  id: number;
  reason: string;
  createdAt: string;
  reporter: { id: string; name: string | null; email: string | null };
  target: { id: string; name: string | null; email: string | null };
};

export const ADMIN_SECTIONS = ["overview", "claims", "students", "clubs", "demand", "reports"] as const;
export type AdminSection = (typeof ADMIN_SECTIONS)[number];
export const EXPORTABLE = ["students", "clubs", "claims", "demand"] as const;
export type Exportable = (typeof EXPORTABLE)[number];

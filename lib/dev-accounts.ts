/**
 * Seeded test accounts for local development and the Playwright evaluators.
 * They exist only in the clubmatch-dev Supabase project (see
 * active/execution/scripts/seed-dev.mjs). Sign in at /dev-login on localhost.
 */
export const DEV_ACCOUNTS = [
  { key: "officer", email: "cm-dev-officer@iastate.edu", label: "Club officer (Data Science Club)" },
  { key: "student-cs", email: "cm-dev-cs@iastate.edu", label: "Student: computer science" },
  { key: "student-finance", email: "cm-dev-finance@iastate.edu", label: "Student: finance" },
  { key: "student-design", email: "cm-dev-design@iastate.edu", label: "Student: graphic design" },
  { key: "student-hidden", email: "cm-dev-hidden@iastate.edu", label: "Student: 'Let clubs find me' off" },
  { key: "student-new", email: "cm-dev-new@iastate.edu", label: "Student: brand new, no profile" },
] as const;

export type DevAccountKey = (typeof DEV_ACCOUNTS)[number]["key"];

/** Dev sign-in works only in `next dev`, with DEV_LOGIN=1, on localhost. */
export function devLoginEnabled(host?: string | null): boolean {
  if (process.env.NODE_ENV !== "development" || process.env.DEV_LOGIN !== "1") return false;
  if (host === undefined) return true;
  const hostname = (host ?? "").split(":")[0];
  return hostname === "localhost" || hostname === "127.0.0.1";
}

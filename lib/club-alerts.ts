import "server-only";

/**
 * Emails the owner when a manual claim request comes in, through Resend's HTTP
 * API. Optional by design: with no keys it logs a warning and does nothing, and
 * it never throws, so a claim request can't fail because of an email.
 * Addresses come only from the environment. CLAIM_ALERT_FROM needs a domain
 * verified in Resend; without one, Resend's shared test sender is used.
 */
export async function sendClaimAlert(claim: {
  slug: string;
  clubName: string;
  email: string;
  role: string;
  note: string | null;
}) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CLAIM_ALERT_EMAIL;
  if (!key || !to) {
    console.warn("Claim alert skipped: RESEND_API_KEY or CLAIM_ALERT_EMAIL isn't set.");
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        from: process.env.CLAIM_ALERT_FROM || "ClubMatch <onboarding@resend.dev>",
        to: [to],
        subject: `Claim request: ${claim.clubName}`,
        text: [
          `${claim.email} asked to claim ${claim.clubName} (${claim.slug}).`,
          `Role: ${claim.role}`,
          claim.note ? `Note: ${claim.note}` : null,
          "",
          "To decide, set status to approved or rejected on this row of club_claims in the Supabase dashboard. They get an inbox message either way.",
        ]
          .filter((line) => line !== null)
          .join("\n"),
      }),
    });
    if (!res.ok) console.warn(`Claim alert failed: Resend answered ${res.status}.`);
  } catch (err) {
    console.warn("Claim alert failed:", err instanceof Error ? err.name : "unknown");
  }
}

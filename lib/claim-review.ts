import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export type ClaimDecision = "approved" | "rejected";

/**
 * Signs the Approve / Reject links in the claim alert email. The key is the
 * Supabase secret key, which production already has, so the links need no new
 * setup. A signature only covers one claim and one decision.
 */
function key() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY isn't set.");
  return secret;
}

export function signClaimReview(claimId: string, decision: ClaimDecision) {
  return createHmac("sha256", key()).update(`claim-review:${claimId}:${decision}`).digest("base64url");
}

export function verifyClaimReview(claimId: string, decision: string, signature: string) {
  if (decision !== "approved" && decision !== "rejected") return false;
  const expected = Buffer.from(signClaimReview(claimId, decision));
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function claimReviewUrl(origin: string, claimId: string, decision: ClaimDecision) {
  const params = new URLSearchParams({ id: claimId, d: decision, sig: signClaimReview(claimId, decision) });
  return `${origin}/api/claims/review?${params}`;
}

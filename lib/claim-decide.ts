import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getClubSummary } from "./clubs";
import { activateClub } from "./club-activate";
import { sendClaimDecision } from "./club-alerts";
import type { ClaimDecision } from "./claim-review";

export type ClaimRow = {
  id: string;
  user_id: string;
  club_slug: string;
  email: string;
  role_title: string;
  note: string | null;
  status: string;
};

export type DecideResult =
  | { ok: true; claim: ClaimRow; clubName: string }
  | { ok: false; reason: "not_found" | "already_decided" | "save_failed"; status?: string };

/**
 * Approves or rejects one pending claim. Shared by the email links
 * (app/api/claims/review) and the owner dashboard, so both behave the same.
 * Only a pending row changes, so a double submit can't send two emails. The
 * database trigger posts the matching ClubMatch inbox message.
 */
export async function decideClaim(
  admin: SupabaseClient,
  claimId: string,
  decision: ClaimDecision,
  origin: string,
): Promise<DecideResult> {
  const { data } = await admin
    .from("club_claims")
    .select("id, user_id, club_slug, email, role_title, note, status")
    .eq("id", claimId)
    .maybeSingle();
  if (!data) return { ok: false, reason: "not_found" };
  const claim = data as ClaimRow;
  if (claim.status !== "pending") return { ok: false, reason: "already_decided", status: claim.status };

  const { data: updated, error } = await admin
    .from("club_claims")
    .update({ status: decision, reviewed_at: new Date().toISOString() })
    .eq("id", claim.id)
    .eq("status", "pending")
    .select("id");
  if (error) return { ok: false, reason: "save_failed" };
  if (!updated?.length) return { ok: false, reason: "already_decided" };

  const approved = decision === "approved";
  if (approved) {
    try {
      await activateClub(admin, claim.club_slug, claim.user_id);
    } catch (err) {
      // The claim stays approved, and opening the claim page retries this.
      console.error("Activation failed:", err instanceof Error ? err.message : "unknown");
    }
  }

  const clubName = getClubSummary(claim.club_slug)?.name ?? claim.club_slug;
  await sendClaimDecision({
    to: claim.email,
    clubName,
    decision,
    url: approved ? `${origin}/manage/${claim.club_slug}` : `${origin}/clubs/${claim.club_slug}/claim`,
  });

  return { ok: true, claim: { ...claim, status: decision }, clubName };
}

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidateClub } from "./club-stripe";

/**
 * Turns a club on for a confirmed officer, with no payment. While pricing is
 * undecided, approval is what grants the admin panel. A club row with no
 * period end counts as active indefinitely (see club_is_active). The Stripe
 * checkout code stays in the repo, unused, for when a price is set.
 */
export async function activateClub(admin: SupabaseClient, slug: string, userId: string) {
  const { data: existing } = await admin
    .from("club_accounts")
    .select("status")
    .eq("club_slug", slug)
    .maybeSingle();

  if (!existing) {
    const { error } = await admin
      .from("club_accounts")
      .insert({ club_slug: slug, status: "active", claimed_by: userId });
    // 23505: a parallel request created it first, which is the same outcome.
    if (error && error.code !== "23505") throw new Error(`club_accounts: ${error.message}`);
  } else if (existing.status === "lapsed") {
    const { error } = await admin
      .from("club_accounts")
      .update({ status: "active", claimed_by: userId, current_period_end: null, cancel_at_period_end: false })
      .eq("club_slug", slug);
    if (error) throw new Error(`club_accounts: ${error.message}`);
  }

  const { error: memberError } = await admin
    .from("memberships")
    .upsert({ user_id: userId, club_slug: slug, role: "officer", verified: true }, { onConflict: "user_id,club_slug" });
  if (memberError) throw new Error(`memberships: ${memberError.message}`);

  await admin.from("club_profiles").upsert({ club_slug: slug }, { onConflict: "club_slug", ignoreDuplicates: true });
  revalidateClub(slug);
}

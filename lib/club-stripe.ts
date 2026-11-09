import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { overlayTag } from "./club-overlay";
import { getAccountRow } from "./club-server";

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

/** Newer Stripe API versions report the period on the subscription item. */
export function periodEnd(sub: Stripe.Subscription): string | null {
  const unix = sub.items.data[0]?.current_period_end;
  const end = unix && sub.cancel_at ? Math.min(unix, sub.cancel_at) : (unix ?? sub.cancel_at);
  return end ? new Date(end * 1000).toISOString() : null;
}

/** The portal can schedule a cancel through cancel_at and leave the older flag false. */
export function isEnding(sub: Stripe.Subscription): boolean {
  return sub.cancel_at_period_end || sub.cancel_at !== null;
}

function mapStatus(sub: Stripe.Subscription): "active" | "past_due" | "lapsed" | null {
  switch (sub.status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
    case "paused":
      return "lapsed";
    default:
      // "incomplete": not paid yet, so nothing changes.
      return null;
  }
}

export function revalidateClub(slug: string) {
  revalidateTag(overlayTag(slug), { expire: 0 });
  revalidatePath(`/clubs/${slug}`);
}

const ALREADY_DONE = new Set(["charge_already_refunded", "idempotency_key_in_use"]);

/**
 * Refunds and cancels a second subscription when two officers pay for one club.
 * Refund first: once it's cancelled, a retry sees a dead subscription and stops,
 * so a failed refund after a cancel would never be tried again. Several events
 * arrive for one payment, so every step has to be safe to repeat.
 */
async function refundDuplicate(stripe: Stripe, sub: Stripe.Subscription) {
  const invoiceId = typeof sub.latest_invoice === "string" ? sub.latest_invoice : sub.latest_invoice?.id;
  if (invoiceId) {
    const invoice = await stripe.invoices.retrieve(invoiceId, { expand: ["payments"] });
    for (const entry of invoice.payments?.data ?? []) {
      const intent = entry.payment.payment_intent;
      if (!intent) continue;
      const id = typeof intent === "string" ? intent : intent.id;
      await stripe.refunds
        .create({ payment_intent: id }, { idempotencyKey: `duplicate-club-refund-${id}` })
        .catch((err: Stripe.errors.StripeError) => {
          if (!ALREADY_DONE.has(err.code ?? "") && err.type !== "StripeIdempotencyError") throw err;
        });
    }
  }
  // Stripe answers "No such subscription" when one is cancelled twice.
  await stripe.subscriptions.cancel(sub.id).catch((err: Stripe.errors.StripeError) => {
    if (err.code !== "resource_missing") throw err;
  });
}

/**
 * Brings a club in line with one subscription. Always re-reads the subscription
 * from Stripe, so duplicate and out-of-order webhooks all land on the same state.
 */
export async function applySubscription(
  stripe: Stripe,
  admin: SupabaseClient,
  subscriptionId: string,
) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const slug = sub.metadata.club_slug;
  const userId = sub.metadata.user_id;
  if (!slug) return;
  const status = mapStatus(sub);
  if (!status) return;

  const account = await getAccountRow(admin, slug);
  const isCurrent = account?.stripe_subscription_id === sub.id;

  if (status === "lapsed") {
    // An old subscription ending must not lapse a club that has since renewed.
    if (!isCurrent) return;
    await admin
      .from("club_accounts")
      .update({ status: "lapsed", cancel_at_period_end: false, needs_stripe_cancel: false })
      .eq("club_slug", slug);
    revalidateClub(slug);
    return;
  }

  // The last officer deleted their account and the cancel is queued. A renewal
  // event landing first must not bring the club back to life.
  if (isCurrent && account?.needs_stripe_cancel) {
    await stripe.subscriptions.cancel(sub.id);
    return;
  }

  if (!isCurrent) {
    const { data: stillActive } = await admin.rpc("club_is_active", { p_slug: slug });
    if (account && stillActive && account.stripe_subscription_id) {
      await refundDuplicate(stripe, sub);
      return;
    }
  }

  // A new claim replaces a subscription still waiting to be cancelled, so cancel it now.
  if (!isCurrent && account?.needs_stripe_cancel && account.stripe_subscription_id) {
    await stripe.subscriptions.cancel(account.stripe_subscription_id);
  }

  const { error } = await admin.from("club_accounts").upsert({
    club_slug: slug,
    status,
    claimed_by: isCurrent ? account?.claimed_by : userId || null,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    current_period_end: periodEnd(sub),
    cancel_at_period_end: isEnding(sub),
    needs_stripe_cancel: false,
    featured_opt_in: account?.featured_opt_in ?? false,
  });
  if (error) throw new Error(`club_accounts: ${error.message}`);

  // Runs once per subscription, so renewals can't re-promote a demoted officer.
  if (!isCurrent) {
    if (userId) {
      const { error: roleError } = await admin
        .from("memberships")
        .upsert({ user_id: userId, club_slug: slug, role: "officer", verified: true });
      if (roleError) throw new Error(`memberships: ${roleError.message}`);
    }
    const { error: profileError } = await admin
      .from("club_profiles")
      .upsert({ club_slug: slug }, { onConflict: "club_slug", ignoreDuplicates: true });
    if (profileError) throw new Error(`club_profiles: ${profileError.message}`);
  }
  revalidateClub(slug);
}

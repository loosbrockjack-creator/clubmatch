import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { overlayTag } from "./club-overlay";

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

const isDead = (sub: Stripe.Subscription) => mapStatus(sub) === "lapsed";

/** Stops a replaced subscription billing. No refund: it was a real, earlier period. */
async function stopIfLive(stripe: Stripe, subscriptionId: string) {
  const old = await stripe.subscriptions.retrieve(subscriptionId);
  if (old.status === "canceled" || old.status === "incomplete_expired") return;
  await stripe.subscriptions.cancel(old.id).catch((err: Stripe.errors.StripeError) => {
    if (err.code !== "resource_missing") throw err;
  });
}

/** Lapses a club only while this subscription is still the one on record. */
async function lapseIfCurrent(admin: SupabaseClient, slug: string, subscriptionId: string) {
  const { error, data } = await admin
    .from("club_accounts")
    .update({ status: "lapsed", cancel_at_period_end: false, needs_stripe_cancel: false })
    .eq("club_slug", slug)
    .eq("stripe_subscription_id", subscriptionId)
    .select("club_slug");
  if (error) throw new Error(`club_accounts: ${error.message}`);
  if (data?.length) revalidateClub(slug);
}

type Decision = { outcome: "current" | "adopted" | "cancel_self" | "duplicate"; other_sub: string | null };

/**
 * Brings a club in line with one subscription. Always re-reads the subscription
 * from Stripe, and the decision itself is made under a lock in the database
 * (apply_club_subscription), so duplicate, parallel, and out-of-order webhooks
 * all land on the same state.
 */
export async function applySubscription(
  stripe: Stripe,
  admin: SupabaseClient,
  subscriptionId: string,
) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const slug = sub.metadata.club_slug;
  if (!slug) return;
  const status = mapStatus(sub);
  if (!status) return;

  if (status === "lapsed") {
    // An old subscription ending can't lapse a club that has since renewed.
    await lapseIfCurrent(admin, slug, sub.id);
    return;
  }

  const decide = async (replaceDead: string | null) => {
    const { data, error } = await admin.rpc("apply_club_subscription", {
      p_slug: slug,
      p_sub: sub.id,
      p_user: sub.metadata.user_id || null,
      p_customer: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      p_status: status,
      p_period_end: periodEnd(sub),
      p_ending: isEnding(sub),
      p_replace_dead: replaceDead,
    });
    if (error) throw new Error(`apply_club_subscription: ${error.message}`);
    return (data as Decision[])[0];
  };

  let decision = await decide(null);

  if (decision.outcome === "duplicate" && decision.other_sub) {
    // A duplicate means a different subscription that's really still live. If
    // Stripe says the one on record has ended, this payment takes its place.
    const recorded = await stripe.subscriptions.retrieve(decision.other_sub);
    if (isDead(recorded)) {
      decision = await decide(decision.other_sub);
    } else {
      await refundDuplicate(stripe, sub);
      return;
    }
  }

  if (decision.outcome === "duplicate") return; // Replaced again meanwhile; a retry settles it.

  if (decision.outcome === "cancel_self") {
    // The last officer deleted their account and the cancel is queued.
    await stopIfLive(stripe, sub.id);
    return;
  }

  if (decision.outcome === "adopted" && decision.other_sub && decision.other_sub !== sub.id) {
    await stopIfLive(stripe, decision.other_sub);
  }

  // A cancel can land while this runs, and parallel events can finish in any order.
  const latest = await stripe.subscriptions.retrieve(sub.id);
  if (isDead(latest)) await lapseIfCurrent(admin, slug, sub.id);
  revalidateClub(slug);
}

import { timingSafeEqual } from "node:crypto";
import { getStripe, revalidateClub } from "@/lib/club-stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Daily. Cancels the subscription of any club whose last officer deleted their
 * account (see protect_last_officer in the 0006 migration), so nobody is billed
 * for a page no one can run. Vercel Cron sends CRON_SECRET as a bearer token.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  const stripe = getStripe();
  const admin = getSupabaseAdmin();
  if (!stripe || !admin) return new Response("Not configured", { status: 503 });

  const { data, error } = await admin
    .from("club_accounts")
    .select("club_slug, stripe_subscription_id")
    .eq("needs_stripe_cancel", true);
  if (error) return new Response("Couldn't read accounts", { status: 500 });

  let cancelled = 0;
  let failed = 0;
  for (const row of data ?? []) {
    try {
      if (row.stripe_subscription_id) {
        const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
        if (sub.status !== "canceled") await stripe.subscriptions.cancel(sub.id);
      }
      await admin.from("club_accounts").update({ needs_stripe_cancel: false }).eq("club_slug", row.club_slug);
      revalidateClub(row.club_slug);
      cancelled += 1;
    } catch (err) {
      failed += 1;
      console.error("Couldn't cancel a club subscription:", err instanceof Error ? err.message : "unknown");
    }
  }
  return Response.json({ cancelled, failed });
}

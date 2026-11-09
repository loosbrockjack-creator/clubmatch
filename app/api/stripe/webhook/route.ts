import type Stripe from "stripe";
import { applySubscription, getStripe } from "@/lib/club-stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Stripe's word is the only thing that activates a club. The signature is
 * checked against the raw body before anything else runs, and the handler then
 * re-reads the subscription from Stripe, so a replayed event changes nothing.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const admin = getSupabaseAdmin();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !admin || !secret) {
    return new Response("Webhook not configured", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.payment_status === "paid" && session.subscription) {
          const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          await applySubscription(stripe, admin, id);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await applySubscription(stripe, admin, event.data.object.id);
        break;
      default:
        break;
    }
  } catch (err) {
    // A 500 makes Stripe retry later, which is what a failed write needs.
    console.error("Stripe webhook failed:", event.type, err instanceof Error ? err.message : "unknown");
    return new Response("Webhook handler failed", { status: 500 });
  }

  return Response.json({ received: true });
}

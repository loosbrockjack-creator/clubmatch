import { getClubSummary } from "@/lib/clubs";
import { getStripe } from "@/lib/club-stripe";
import { clubStatus, fail, getAccountRow, requireUser } from "@/lib/club-server";
import { CLAIM_INTERVAL_MONTHS, CLAIM_PRICE_CENTS } from "@/lib/club-types";

type Ctx = { params: Promise<{ slug: string }> };

/**
 * Starts Stripe Checkout. Any signed-in student (sign-in is @iastate.edu only)
 * can claim an unclaimed club: paying is what makes them its officer, with no
 * manual review. Whether the club is still open is re-checked here, never taken
 * from the client, and a second payer loses the race and is refunded.
 */
export async function POST(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const club = getClubSummary(slug);
  if (!club) return fail(404, "That club doesn't exist.");
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const { admin, user } = auth;

  const stripe = getStripe();
  if (!stripe) return fail(503, "Payments aren't available right now.");

  const account = await getAccountRow(admin, slug);
  const status = await clubStatus(admin, slug, account);
  if (status === "active" || status === "past_due") {
    return fail(409, "This club has already been claimed.");
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin") || new URL(request.url).origin;
  const claimUrl = `${origin}/clubs/${slug}/claim`;
  const metadata = { club_slug: slug, user_id: user.id };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      // Cards settle at once. Bank debits and pay-later can fail after the page
      // has already told the officer they're active. Stripe SDK 23's name for
      // what older versions called payment_method_types.
      allowed_payment_method_types: ["card"],
      // Link's wallet adds its own bank option even on a card-only session.
      wallet_options: { link: { display: "never" } },
      client_reference_id: user.id,
      // Reuse a Stripe customer only for the student who paid before. A new payer
      // must never inherit a former officer's email, card, or invoices.
      ...(account?.stripe_customer_id && account.claimed_by === user.id
        ? { customer: account.stripe_customer_id }
        : { customer_email: user.email }),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: CLAIM_PRICE_CENTS,
            recurring: { interval: "month", interval_count: CLAIM_INTERVAL_MONTHS },
            product_data: {
              name: `ClubMatch page for ${club.name}`,
              description: "Billed every 6 months until you cancel.",
            },
          },
        },
      ],
      metadata,
      subscription_data: { metadata },
      success_url: `${claimUrl}?status=success&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${claimUrl}?status=cancelled`,
    });
    if (!session.url) return fail(502, "Stripe didn't return a checkout page. Try again.");
    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Checkout failed:", err instanceof Error ? err.message : "unknown");
    return fail(502, "Couldn't start checkout. Try again.");
  }
}

import { getClubSummary } from "@/lib/clubs";
import { getStripe } from "@/lib/club-stripe";
import { clubStatus, fail, getAccountRow, isOfficer, requireUser } from "@/lib/club-server";
import { CLAIM_INTERVAL_MONTHS, CLAIM_PRICE_CENTS } from "@/lib/club-types";

type Ctx = { params: Promise<{ slug: string }> };

/** Starts Stripe Checkout. Eligibility is re-checked here, never taken from the client. */
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

  const email = (user.email ?? "").toLowerCase();
  const [officer, { data: listed }, { data: approved }] = await Promise.all([
    isOfficer(admin, user.id, slug),
    admin.from("officer_allowlist").select("email").eq("email", email).eq("club_slug", slug).maybeSingle(),
    admin
      .from("club_claims")
      .select("id")
      .eq("club_slug", slug)
      .eq("user_id", user.id)
      .eq("status", "approved")
      .limit(1),
  ]);
  if (!officer && !listed && !approved?.length) {
    return fail(403, "We haven't confirmed you as an officer of this club yet.");
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
    // Stripe's error code (never the key or message) goes in the reply, so a
    // setup problem in production can be named from the page itself.
    const stripeErr = err as { type?: string; code?: string; param?: string; message?: string };
    console.error("Checkout failed:", stripeErr.type, stripeErr.code, stripeErr.param, stripeErr.message);
    const code = [stripeErr.code ?? stripeErr.type, stripeErr.param].filter(Boolean).join(", ");
    return fail(502, `Couldn't start checkout${code ? ` (${code})` : ""}. Try again.`);
  }
}

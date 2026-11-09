import { getStripe } from "@/lib/club-stripe";
import { fail, getAccountRow, requireUser } from "@/lib/club-server";

type Ctx = { params: Promise<{ slug: string }> };

/**
 * Opens Stripe's customer portal, which shows a card and invoices, so only for the
 * student who paid. Other officers see the plan's status in the panel, not this. A
 * payer who's no longer an officer can still get in, to cancel what they pay for.
 */
export async function POST(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const account = await getAccountRow(auth.admin, slug);
  if (!account || account.claimed_by !== auth.user.id) {
    return fail(403, "Only the officer who pays for this club can open billing.");
  }

  const stripe = getStripe();
  if (!stripe) return fail(503, "Billing isn't available right now.");
  const customer = account.stripe_customer_id;
  if (!customer) return fail(404, "There's no billing account for this club yet.");

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin") || new URL(request.url).origin;
  try {
    // A brand new Stripe account has no portal settings until something creates them.
    const existing = await stripe.billingPortal.configurations.list({ limit: 1, active: true });
    const configuration =
      existing.data[0]?.id ??
      (
        await stripe.billingPortal.configurations.create({
          business_profile: { headline: "Manage your ClubMatch club page" },
          features: {
            invoice_history: { enabled: true },
            payment_method_update: { enabled: true },
            subscription_cancel: { enabled: true, mode: "at_period_end" },
          },
        })
      ).id;
    const session = await stripe.billingPortal.sessions.create({
      customer,
      configuration,
      return_url: `${origin}/manage/${slug}?tab=billing`,
    });
    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Billing portal failed:", err instanceof Error ? err.message : "unknown");
    return fail(502, "Couldn't open billing. Try again.");
  }
}

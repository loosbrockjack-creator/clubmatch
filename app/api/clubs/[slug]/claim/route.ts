import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getClubSummary } from "@/lib/clubs";
import { getStripe } from "@/lib/club-stripe";
import { clubStatus, fail, getAccountRow, isOfficer, requireUser } from "@/lib/club-server";
import type { ClaimState } from "@/lib/club-types";

type Ctx = { params: Promise<{ slug: string }> };

/**
 * True when this student's own checkout lost the race for the club. The session
 * must be theirs, for this club, and on a subscription that isn't the club's.
 */
async function lostTheRace(user: User, slug: string, sessionId: string | null, current: string | null) {
  if (!sessionId?.startsWith("cs_") || !current) return false;
  try {
    const session = await getStripe()?.checkout.sessions.retrieve(sessionId);
    if (session?.metadata?.user_id !== user.id || session.metadata.club_slug !== slug) return false;
    const sub = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    return Boolean(sub && sub !== current);
  } catch {
    return false;
  }
}

async function claimState(
  admin: SupabaseClient,
  user: User,
  slug: string,
  sessionId: string | null = null,
): Promise<ClaimState> {
  const account = await getAccountRow(admin, slug);
  const status = await clubStatus(admin, slug, account);
  const officer = await isOfficer(admin, user.id, slug);
  const paidUp = status === "active" || status === "past_due";
  const duplicatePayment =
    paidUp && (await lostTheRace(user, slug, sessionId, account?.stripe_subscription_id ?? null));
  return {
    duplicatePayment,
    status,
    isOfficer: officer,
    canCheckout: !paidUp,
  };
}

export async function GET(request: Request, { params }: Ctx) {
  const { slug } = await params;
  if (!getClubSummary(slug)) return fail(404, "That club doesn't exist.");
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const session = new URL(request.url).searchParams.get("session");
  return Response.json(await claimState(auth.admin, auth.user, slug, session));
}

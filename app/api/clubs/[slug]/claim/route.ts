import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getClubSummary } from "@/lib/clubs";
import {
  clubStatus,
  fail,
  getAccountRow,
  isOfficer,
  readJson,
  requireUser,
} from "@/lib/club-server";
import type { ClaimState } from "@/lib/club-types";
import { cleanText, LIMITS } from "@/lib/club-validate";

type Ctx = { params: Promise<{ slug: string }> };

/** Exported through the checkout route too, so both apply the same rule. */
async function claimState(admin: SupabaseClient, user: User, slug: string): Promise<ClaimState> {
  const account = await getAccountRow(admin, slug);
  const status = await clubStatus(admin, slug, account);
  const email = (user.email ?? "").toLowerCase();
  const [officer, { data: listed }, { data: claims }] = await Promise.all([
    isOfficer(admin, user.id, slug),
    admin.from("officer_allowlist").select("email").eq("email", email).eq("club_slug", slug).maybeSingle(),
    admin
      .from("club_claims")
      .select("status, created_at")
      .eq("club_slug", slug)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  const claim = (claims?.[0] as ClaimState["claim"]) ?? null;
  const paidUp = status === "active" || status === "past_due";
  return {
    status,
    isOfficer: officer,
    canCheckout: !paidUp && (Boolean(listed) || claim?.status === "approved" || officer),
    claim,
  };
}

export async function GET(request: Request, { params }: Ctx) {
  const { slug } = await params;
  if (!getClubSummary(slug)) return fail(404, "That club doesn't exist.");
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  return Response.json(await claimState(auth.admin, auth.user, slug));
}

/** No allowlist match: file a request Jack reviews in the Supabase dashboard. */
export async function POST(request: Request, { params }: Ctx) {
  const { slug } = await params;
  if (!getClubSummary(slug)) return fail(404, "That club doesn't exist.");
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const { admin, user } = auth;

  const state = await claimState(admin, user, slug);
  if (state.status === "active" || state.status === "past_due") {
    return fail(409, "This club has already been claimed.");
  }
  if (state.claim?.status === "pending" || state.claim?.status === "approved") {
    return Response.json(state);
  }

  const body = await readJson<{ role: unknown; note: unknown }>(request);
  const role = cleanText(body?.role, LIMITS.claimRole);
  const note = cleanText(body?.note, LIMITS.claimNote);
  if (!role) return fail(400, `Tell us your officer role, in ${LIMITS.claimRole} characters or fewer.`);
  if (note === false) return fail(400, `Keep the note to ${LIMITS.claimNote} characters.`);

  const { error } = await admin.from("club_claims").insert({
    club_slug: slug,
    user_id: user.id,
    email: (user.email ?? "").toLowerCase(),
    role_title: role,
    note,
  });
  // 23505: a second tab beat this one to it, and the request is already on file.
  if (error && error.code !== "23505") return fail(500, "Couldn't send your request. Try again.");
  return Response.json(await claimState(admin, user, slug));
}

import { getClubSummary } from "@/lib/clubs";
import { allowedForPrefs, MATCH_THRESHOLD, scoreClub } from "@/lib/matching";
import { fail, readJson, requireOfficer } from "@/lib/club-server";
import { INVITE_DAILY_LIMIT } from "@/lib/club-types";
import { cleanText, LIMITS } from "@/lib/club-validate";
import type { Preferences } from "@/lib/types";

type Ctx = { params: Promise<{ slug: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_ELIGIBLE = "This student isn't on your good-fit list right now.";

/**
 * One in-app invite to one good-fit student. The student id comes from the
 * client, so every rule behind that list is checked again here. All the reasons
 * a student might not qualify get the same answer, so the route can't be used to
 * find out anything about a student, and a muted student looks like any other.
 */
export async function POST(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;
  const { admin, user } = ctx;
  const club = getClubSummary(slug)!;

  const body = await readJson<{ studentId: unknown; note: unknown }>(request);
  const studentId = body?.studentId;
  if (typeof studentId !== "string" || !UUID.test(studentId)) return fail(400, NOT_ELIGIBLE);
  const note = cleanText(body?.note, LIMITS.inviteNote);
  if (note === false) return fail(400, `Keep the note to ${LIMITS.inviteNote} characters.`);

  const [{ data: profile }, { data: priv }, { data: membership }] = await Promise.all([
    admin.from("profiles").select("discoverable, visible").eq("id", studentId).maybeSingle(),
    admin.from("profile_private").select("preferences").eq("user_id", studentId).maybeSingle(),
    admin.from("memberships").select("user_id").eq("club_slug", slug).eq("user_id", studentId).maybeSingle(),
  ]);
  const answers = (priv?.preferences as Preferences | null) ?? null;
  const fits =
    profile?.discoverable === true &&
    profile.visible === true &&
    !membership &&
    Boolean(answers?.academicArea) &&
    answers !== null &&
    allowedForPrefs(answers, club) &&
    scoreClub(answers, club).score >= MATCH_THRESHOLD;
  if (!fits) return fail(404, NOT_ELIGIBLE);

  const message = [
    `An officer of ${club.name} thinks you'd be a good fit and invited you to check out the club.`,
    note ? `They wrote: "${note}"` : null,
    "If you want to hear more, open the club's page and tap I'm interested, let the officers know. They don't see whether you read this.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const { error } = await admin.rpc("send_club_invite", {
    p_slug: slug,
    p_sender: user.id,
    p_student: studentId,
    p_subject: `${club.name} invited you`,
    p_body: message,
    p_daily_limit: INVITE_DAILY_LIMIT,
  });
  if (error) {
    if (error.message.includes("already_invited")) return fail(409, "You've already invited this student.");
    if (error.message.includes("rate_limit_day")) {
      return fail(429, `You've sent ${INVITE_DAILY_LIMIT} invites today. You can send more tomorrow.`);
    }
    return fail(500, "Couldn't send that invite. Try again.");
  }
  return Response.json({ ok: true });
}

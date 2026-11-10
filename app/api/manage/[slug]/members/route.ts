import { fail, publicProfiles, readJson, requireOfficer, toLead } from "@/lib/club-server";
import type { RosterMember } from "@/lib/club-types";
import { demoMembers, isDemoClub, isDemoId } from "@/lib/demo-club";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;

  const { data, error } = await ctx.admin
    .from("memberships")
    .select("user_id, role, verified, created_at")
    .eq("club_slug", slug)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) return fail(500, "Couldn't load members.");

  const rows = data ?? [];
  const profiles = await publicProfiles(ctx.admin, rows.map((row) => row.user_id as string));
  const members: RosterMember[] = rows.map((row) => {
    const profile = profiles.get(row.user_id as string);
    return {
      id: row.user_id as string,
      // A hidden profile stays hidden from officers too. It can only be removed.
      profile: profile?.visible ? toLead(profile) : null,
      role: row.role as RosterMember["role"],
      verified: row.verified as boolean,
      since: row.created_at as string,
    };
  });
  if (isDemoClub(slug)) members.push(...demoMembers());
  return Response.json({ members, you: ctx.user.id });
}

const ACTIONS = ["verify", "unverify", "promote", "demote", "remove"] as const;
type Action = (typeof ACTIONS)[number];

export async function PATCH(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;
  const { admin } = ctx;

  const body = await readJson<{ userId: unknown; action: unknown }>(request);
  const action = body?.action as Action;
  const userId = body?.userId;
  if (typeof userId !== "string" || !ACTIONS.includes(action)) return fail(400, "That didn't look right.");
  if (isDemoId(userId)) return fail(409, "This is a sample from the demo, so it can't be changed.");

  const { data: target } = await admin
    .from("memberships")
    .select("role")
    .eq("club_slug", slug)
    .eq("user_id", userId)
    .maybeSingle();
  if (!target) return fail(404, "That student isn't on this club's list.");

  if ((action === "demote" || action === "remove") && target.role === "officer") {
    const { count } = await admin
      .from("memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("club_slug", slug)
      .eq("role", "officer");
    if ((count ?? 0) <= 1) {
      return fail(409, "Your club needs at least one officer. Promote someone else first.");
    }
  }

  const query = admin.from("memberships");
  const scoped = <T extends { eq: (column: string, value: string) => T }>(q: T) =>
    q.eq("club_slug", slug).eq("user_id", userId);
  const { error } =
    action === "remove"
      ? await scoped(query.delete())
      : await scoped(
          query.update(
            action === "verify"
              ? { verified: true }
              : action === "unverify"
                ? { verified: false }
                : action === "promote"
                  ? { role: "officer", verified: true }
                  : { role: "member" },
          ),
        );
  if (error) return fail(500, "Couldn't update that. Try again.");
  return Response.json({ ok: true });
}

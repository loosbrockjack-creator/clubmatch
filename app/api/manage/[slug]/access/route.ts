import { readJson, requireOfficer, fail } from "@/lib/club-server";
import type { ManageAccess } from "@/lib/club-types";

type Ctx = { params: Promise<{ slug: string }> };

/** What the panel asks first. Lapsed officers get an answer too, so they can renew. */
export async function GET(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug, { allowLapsed: true });
  // A student opening this page is an expected case, not an error. No club data here.
  if (ctx instanceof Response && ctx.status === 403) return Response.json({ allowed: false });
  if (ctx instanceof Response) return ctx;
  const access: ManageAccess = {
    allowed: true,
    slug,
    status: ctx.status,
    role: "officer",
    currentPeriodEnd: ctx.account?.current_period_end ?? null,
    cancelAtPeriodEnd: ctx.account?.cancel_at_period_end ?? false,
    featuredOptIn: ctx.account?.featured_opt_in ?? false,
  };
  return Response.json(access);
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const ctx = await requireOfficer(request, slug);
  if (ctx instanceof Response) return ctx;
  const body = await readJson<{ featuredOptIn: unknown }>(request);
  if (typeof body?.featuredOptIn !== "boolean") return fail(400, "Nothing to change.");
  const { error } = await ctx.admin
    .from("club_accounts")
    .update({ featured_opt_in: body.featuredOptIn })
    .eq("club_slug", slug);
  if (error) return fail(500, "Couldn't save that. Try again.");
  return Response.json({ featuredOptIn: body.featuredOptIn });
}

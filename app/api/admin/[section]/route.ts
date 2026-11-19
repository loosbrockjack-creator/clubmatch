import { decideClaim } from "@/lib/claim-decide";
import { readJson } from "@/lib/club-server";
import { json, NO_STORE, requireAdmin } from "@/lib/admin-server";
import { loadClaims, loadClubs, loadDemand, loadOverview, loadReports, loadStudents, toCsv } from "@/lib/admin-data";
import { ADMIN_SECTIONS, EXPORTABLE, type AdminSection, type Exportable } from "@/lib/admin-types";

/**
 * The owner dashboard's data. Every request is checked against ADMIN_EMAILS
 * first (lib/admin-server.ts); anyone else gets a 404.
 *   GET  /api/admin/<section>            JSON for one dashboard tab
 *   GET  /api/admin/<section>?format=csv a spreadsheet of that table
 *   POST /api/admin/claims {id, decision} approve or reject a claim
 */

type Ctx = { params: Promise<{ section: string }> };

const LOADERS = {
  overview: loadOverview,
  claims: loadClaims,
  students: loadStudents,
  clubs: loadClubs,
  demand: loadDemand,
  reports: loadReports,
} satisfies Record<AdminSection, unknown>;

export async function GET(request: Request, { params }: Ctx) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof Response) return ctx;
  const { section } = await params;
  if (!(ADMIN_SECTIONS as readonly string[]).includes(section)) return json({ error: "Not found." }, 404);

  try {
    const data = await LOADERS[section as AdminSection](ctx.admin);
    const format = new URL(request.url).searchParams.get("format");
    if (format === "csv") {
      if (!(EXPORTABLE as readonly string[]).includes(section)) return json({ error: "Not exportable." }, 400);
      const day = new Date().toISOString().slice(0, 10);
      return new Response(toCsv(data as object[]), {
        headers: {
          ...NO_STORE,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="clubmatch-${section as Exportable}-${day}.csv"`,
        },
      });
    }
    return json(data);
  } catch (err) {
    console.error(`Admin ${section} failed:`, err instanceof Error ? err.message : "unknown");
    return json({ error: "Couldn't load this. Try again." }, 500);
  }
}

export async function POST(request: Request, { params }: Ctx) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof Response) return ctx;
  const { section } = await params;
  if (section !== "claims") return json({ error: "Not found." }, 404);

  const body = await readJson<{ id: unknown; decision: unknown }>(request);
  const id = typeof body?.id === "string" ? body.id : "";
  const decision = body?.decision;
  if (!/^[0-9a-f-]{36}$/i.test(id) || (decision !== "approved" && decision !== "rejected")) {
    return json({ error: "Pick approve or reject." }, 400);
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const result = await decideClaim(ctx.admin, id, decision, origin);
  if (!result.ok) {
    const message =
      result.reason === "not_found"
        ? "That request no longer exists."
        : result.reason === "already_decided"
          ? "Already decided. Refresh to see it."
          : "Couldn't save that. Try again.";
    return json({ error: message }, result.reason === "save_failed" ? 500 : 409);
  }
  return json({ id, status: decision });
}

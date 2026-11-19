import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { fail, requireUser } from "./club-server";

/**
 * The owner dashboard at /admin. Only accounts listed in ADMIN_EMAILS (comma
 * separated) get in. Anyone else, signed in or not, gets a 404, so the routes
 * don't confirm they exist. With ADMIN_EMAILS unset, nobody gets in.
 */
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      // Tolerate a value pasted with quotes around it.
      .map((email) => email.trim().replace(/^["']|["']$/g, "").trim().toLowerCase())
      .filter(Boolean),
  );
}

export type AdminCtx = { admin: SupabaseClient; user: User };

export async function requireAdmin(request: Request): Promise<AdminCtx | Response> {
  const allowed = adminEmails();
  if (allowed.size === 0) return fail(404, "Not found.");
  const auth = await requireUser(request);
  if (auth instanceof Response) return fail(404, "Not found.");
  const email = auth.user.email?.toLowerCase();
  if (!email || !allowed.has(email)) return fail(404, "Not found.");
  return auth;
}

export const NO_STORE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } as const;

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

/**
 * Every row of a select. PostgREST caps one response (1000 rows by default), so
 * this pages through. Fine at ClubMatch's size; aggregate in SQL if it grows.
 */
export async function selectAll<T>(
  admin: SupabaseClient,
  table: string,
  columns: string,
  since?: { column: string; iso: string },
): Promise<T[]> {
  const size = 1000;
  const rows: T[] = [];
  for (let from = 0; from < 200_000; from += size) {
    const base = admin.from(table).select(columns);
    const query = since ? base.gte(since.column, since.iso) : base;
    const { data, error } = await query.range(from, from + size - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < size) break;
  }
  return rows;
}

/** Every auth user's email and last sign-in, by id. */
export async function authUsers(admin: SupabaseClient) {
  const byId = new Map<string, { email: string | null; lastSignIn: string | null; createdAt: string }>();
  for (let page = 1; page < 200; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`auth users: ${error.message}`);
    for (const user of data.users) {
      byId.set(user.id, {
        email: user.email ?? null,
        lastSignIn: user.last_sign_in_at ?? null,
        createdAt: user.created_at,
      });
    }
    if (data.users.length < 1000) break;
  }
  return byId;
}

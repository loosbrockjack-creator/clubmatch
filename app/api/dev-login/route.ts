import { DEV_ACCOUNTS, devLoginEnabled } from "@/lib/dev-accounts";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Localhost-only test sign-in. Returns a one-time token hash for a seeded dev
 * account; the /dev-login page exchanges it for a session in the browser.
 * 404 everywhere except `next dev` on localhost with DEV_LOGIN=1.
 */
export async function POST(request: Request) {
  if (!devLoginEnabled(request.headers.get("host"))) {
    return new Response("Not found", { status: 404 });
  }

  const { account } = (await request.json().catch(() => ({}))) as { account?: string };
  const match = DEV_ACCOUNTS.find((a) => a.key === account);
  if (!match) return Response.json({ error: "Unknown dev account" }, { status: 400 });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: "SUPABASE_SECRET_KEY is not set" }, { status: 500 });
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: match.email,
  });
  if (error || !data.properties?.hashed_token) {
    return Response.json(
      { error: error?.message ?? "Couldn't create a sign-in link. Run the seed script first." },
      { status: 500 },
    );
  }
  return Response.json({ tokenHash: data.properties.hashed_token });
}

import { getClubSummary } from "@/lib/clubs";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * One view of a club's claim page, for the owner dashboard's "who's looking"
 * signal. Counts only: nothing about the visitor is stored. The page sends one
 * per club per browser session; this caps each address on top of that.
 */

const WINDOW_MS = 60_000;
const PER_WINDOW = 10;
const hits = new Map<string, { count: number; start: number }>();

function limited(key: string) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.start > WINDOW_MS) {
    if (hits.size > 5000) hits.clear();
    hits.set(key, { count: 1, start: now });
    return false;
  }
  entry.count += 1;
  return entry.count > PER_WINDOW;
}

/** Same reasoning as app/api/activity: only trust Vercel's own header. */
function bucket(request: Request) {
  if (!process.env.VERCEL) return "ip:shared";
  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim();
  return `ip:${ip || "unknown"}`;
}

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { slug } = await params;
  if (!getClubSummary(slug)) return Response.json({ ok: false }, { status: 404 });
  if (limited(bucket(request))) return Response.json({ ok: false }, { status: 429 });
  const admin = getSupabaseAdmin();
  if (!admin) return Response.json({ ok: false });
  const { error } = await admin.rpc("log_claim_view", { p_slug: slug });
  if (error) console.error("Claim view failed:", error.message);
  return Response.json({ ok: !error });
}

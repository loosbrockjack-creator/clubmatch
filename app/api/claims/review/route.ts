import { getClubSummary } from "@/lib/clubs";
import { sendClaimDecision } from "@/lib/club-alerts";
import { verifyClaimReview, type ClaimDecision } from "@/lib/claim-review";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * The Approve / Reject links in the claim alert email. GET only shows a confirm
 * page, because mail scanners open links on their own; the decision happens on
 * the POST from that page. The signature in the link is the only credential.
 */

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function page(title: string, inner: string, status = 200) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${escapeHtml(title)} | ClubMatch</title></head>
<body style="margin:0;background:#f7f5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a">
  <div style="max-width:480px;margin:0 auto;padding:64px 16px">
    <div style="background:#fff;border:1px solid #e7e3dd;border-radius:14px;padding:32px 28px">
      <p style="margin:0 0 4px;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:#8a8580">ClubMatch</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:600">${escapeHtml(title)}</h1>
      ${inner}
    </div>
  </div>
</body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

const p = (text: string) =>
  `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#4a4642">${text}</p>`;

type Claim = { id: string; club_slug: string; email: string; role_title: string; note: string | null; status: string };

async function load(id: string, decision: string, sig: string) {
  if (!id || !verifyClaimReview(id, decision, sig)) {
    return { error: page("This link doesn't work", p("It may have been changed or cut off. Open it again from the email."), 403) };
  }
  const admin = getSupabaseAdmin();
  if (!admin) return { error: page("Not available", p("The database isn't configured."), 503) };
  const { data } = await admin
    .from("club_claims")
    .select("id, club_slug, email, role_title, note, status")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { error: page("Request not found", p("This claim request no longer exists."), 404) };
  const claim = data as Claim;
  const clubName = getClubSummary(claim.club_slug)?.name ?? claim.club_slug;
  if (claim.status !== "pending") {
    return { error: page("Already decided", p(`This request was already <strong>${escapeHtml(claim.status)}</strong>. Nothing changed.`)) };
  }
  return { admin, claim, clubName, decision: decision as ClaimDecision };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const decision = url.searchParams.get("d") ?? "";
  const sig = url.searchParams.get("sig") ?? "";
  const result = await load(id, decision, sig);
  if ("error" in result) return result.error;
  const { claim, clubName } = result;
  const approve = decision === "approved";
  return page(
    `${approve ? "Approve" : "Reject"} this claim?`,
    `${p(`<strong style="color:#1a1a1a">${escapeHtml(claim.email)}</strong> wants to claim ${escapeHtml(clubName)}.`)}
     ${p(`Role: ${escapeHtml(claim.role_title)}`)}
     ${claim.note ? p(`Note: ${escapeHtml(claim.note)}`) : ""}
     <form method="post" style="margin:24px 0 0">
       <input type="hidden" name="id" value="${escapeHtml(id)}">
       <input type="hidden" name="d" value="${escapeHtml(decision)}">
       <input type="hidden" name="sig" value="${escapeHtml(sig)}">
       <button type="submit" style="padding:11px 20px;border-radius:4px;font-size:15px;font-weight:600;cursor:pointer;${
         approve ? "background:#c8102e;color:#fff;border:1px solid #c8102e" : "background:#fff;color:#1a1a1a;border:1px solid #d6d1ca"
       }">${approve ? "Approve and email them" : "Reject and email them"}</button>
     </form>`,
  );
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const id = String(form?.get("id") ?? "");
  const decision = String(form?.get("d") ?? "");
  const sig = String(form?.get("sig") ?? "");
  const result = await load(id, decision, sig);
  if ("error" in result) return result.error;
  const { admin, claim, clubName } = result;

  // Only a pending row changes, so a double submit can't send two emails.
  // The database trigger posts the matching ClubMatch inbox message.
  const { data: updated, error } = await admin
    .from("club_claims")
    .update({ status: result.decision, reviewed_at: new Date().toISOString() })
    .eq("id", claim.id)
    .eq("status", "pending")
    .select("id");
  if (error) return page("Couldn't save that", p("Try the link again in a minute."), 500);
  if (!updated?.length) return page("Already decided", p("Someone decided this request a moment ago. Nothing changed."));

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  await sendClaimDecision({
    to: claim.email,
    clubName,
    decision: result.decision,
    claimUrl: `${origin}/clubs/${claim.club_slug}/claim`,
  });

  const approved = result.decision === "approved";
  return page(
    approved ? "Approved" : "Rejected",
    p(
      approved
        ? `${escapeHtml(claim.email)} can now pay to claim ${escapeHtml(clubName)}. We emailed them and left a message in their ClubMatch inbox.`
        : `We let ${escapeHtml(claim.email)} know, by email and in their ClubMatch inbox.`,
    ),
  );
}

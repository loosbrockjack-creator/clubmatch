import "server-only";

/**
 * Claim emails, sent through Resend's HTTP API. Optional by design: with no key
 * they log a warning and do nothing, and they never throw, so a claim request or
 * a decision can't fail because of an email. CLAIM_ALERT_FROM needs a domain
 * verified in Resend; without one, Resend's shared test sender is used.
 */

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function from() {
  return process.env.CLAIM_ALERT_FROM || "ClubMatch <noreply@clubmatch.fit>";
}

/** The shared card layout the sign-in email uses. */
function layout(title: string, inner: string) {
  return `<!doctype html>
<html><body style="margin:0;background:#f7f5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px">
    <div style="background:#ffffff;border:1px solid #e7e3dd;border-radius:14px;padding:32px 28px">
      <p style="margin:0 0 4px;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:#8a8580">ClubMatch</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:600">${escapeHtml(title)}</h1>
      ${inner}
    </div>
  </div>
</body></html>`;
}

function button(href: string, label: string, primary: boolean) {
  const style = primary
    ? "background:#c8102e;color:#ffffff;border:1px solid #c8102e"
    : "background:#ffffff;color:#1a1a1a;border:1px solid #d6d1ca";
  return `<a href="${escapeHtml(href)}" style="display:inline-block;padding:11px 20px;border-radius:4px;font-size:15px;font-weight:600;text-decoration:none;${style}">${escapeHtml(label)}</a>`;
}

async function send(payload: { to: string; subject: string; html: string; text: string }, what: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`${what} skipped: RESEND_API_KEY isn't set.`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ from: from(), ...payload, to: [payload.to] }),
    });
    if (!res.ok) console.warn(`${what} failed: Resend answered ${res.status}.`);
  } catch (err) {
    console.warn(`${what} failed:`, err instanceof Error ? err.name : "unknown");
  }
}

/** To the owner: a new request, with one-click Approve and Reject links. */
export async function sendClaimAlert(claim: {
  slug: string;
  clubName: string;
  email: string;
  role: string;
  note: string | null;
  approveUrl: string;
  rejectUrl: string;
}) {
  const to = process.env.CLAIM_ALERT_EMAIL;
  if (!to) {
    console.warn("Claim alert skipped: CLAIM_ALERT_EMAIL isn't set.");
    return;
  }
  const html = layout(
    `Claim request: ${claim.clubName}`,
    `<p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#4a4642"><strong style="color:#1a1a1a">${escapeHtml(claim.email)}</strong> asked to claim ${escapeHtml(claim.clubName)}.</p>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#4a4642">Role: ${escapeHtml(claim.role)}</p>
      ${claim.note ? `<p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#4a4642">Note: ${escapeHtml(claim.note)}</p>` : ""}
      <p style="margin:24px 0 0">${button(claim.approveUrl, "Approve", true)}&nbsp;&nbsp;${button(claim.rejectUrl, "Reject", false)}</p>
      <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#8a8580">Each button opens a page to confirm. The student gets an email and an inbox message either way.</p>`,
  );
  const text = [
    `${claim.email} asked to claim ${claim.clubName} (${claim.slug}).`,
    `Role: ${claim.role}`,
    claim.note ? `Note: ${claim.note}` : null,
    "",
    `Approve: ${claim.approveUrl}`,
    `Reject: ${claim.rejectUrl}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
  await send({ to, subject: `Claim request: ${claim.clubName}`, html, text }, "Claim alert");
}

/** To the student: the answer to their request. */
export async function sendClaimDecision(claim: {
  to: string;
  clubName: string;
  decision: "approved" | "rejected";
  claimUrl: string;
}) {
  const approved = claim.decision === "approved";
  const subject = approved
    ? `You're approved to claim ${claim.clubName}`
    : `We couldn't confirm your claim for ${claim.clubName}`;
  const body = approved
    ? `We confirmed you're an officer of ${claim.clubName}. Open the claim page to finish up: $49 per semester, and your club's page and admin panel turn on right away.`
    : `We couldn't confirm you're an officer of ${claim.clubName}, so you weren't charged. If that's a mistake, you can send a new request from the claim page.`;
  const html = layout(
    approved ? "You're approved" : "We couldn't confirm your claim",
    `<p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#4a4642">${escapeHtml(body)}</p>
      <p style="margin:0">${button(claim.claimUrl, approved ? "Finish claiming" : "Open the claim page", true)}</p>`,
  );
  await send({ to: claim.to, subject, html, text: `${body}\n\n${claim.claimUrl}` }, "Claim decision email");
}

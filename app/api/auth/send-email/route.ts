import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Supabase "Send Email" auth hook. Supabase creates the sign-in code, then calls
 * this route instead of sending its own email, and we send it through Resend.
 * That keeps the email a 6-digit code with no link, which matters for Iowa State
 * Outlook: its link scanner opens one-time links before the student can.
 *
 * Requests are signed with the Standard Webhooks scheme using
 * SEND_EMAIL_HOOK_SECRET ("v1,whsec_<base64>"), set in Supabase and Vercel.
 */

type HookPayload = {
  user?: { email?: string; new_email?: string };
  email_data?: {
    token?: string;
    token_new?: string;
    email_action_type?: string;
  };
};

const MAX_AGE_SECONDS = 5 * 60;

function hookError(status: number, message: string) {
  return Response.json({ error: { http_code: status, message } }, { status });
}

function verifySignature(secret: string, id: string, timestamp: string, body: string, header: string) {
  const key = Buffer.from(secret.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  // The header may hold several space-separated "v1,<base64>" signatures.
  return header.split(" ").some((part) => {
    const [version, signature] = part.split(",");
    if (version !== "v1" || !signature) return false;
    const given = Buffer.from(signature, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function codeEmail(code: string) {
  const safe = escapeHtml(code);
  const html = `<!doctype html>
<html><body style="margin:0;background:#f7f5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a">
  <div style="max-width:440px;margin:0 auto;padding:40px 24px">
    <div style="background:#ffffff;border:1px solid #e7e3dd;border-radius:14px;padding:32px 28px">
      <p style="margin:0 0 4px;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:#8a8580">ClubMatch</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:600">Your sign-in code</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#4a4642">Enter this code on ClubMatch to sign in. It expires in 10 minutes.</p>
      <p style="margin:0 0 24px;font-size:32px;font-weight:700;letter-spacing:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${safe}</p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#8a8580">If you didn't ask for this code, you can ignore this email.</p>
    </div>
  </div>
</body></html>`;
  const text = `Your ClubMatch sign-in code: ${code}\n\nEnter it on ClubMatch to sign in. It expires in 10 minutes.\nIf you didn't ask for this code, you can ignore this email.`;
  return { subject: `${code} is your ClubMatch code`, html, text };
}

async function sendViaResend(to: string, code: string) {
  const { subject, html, text } = codeEmail(code);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.AUTH_EMAIL_FROM ?? "ClubMatch <noreply@clubmatch.fit>",
      to: [to],
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    console.error("Resend refused the sign-in email", res.status, (await res.text()).slice(0, 300));
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!secret || !process.env.RESEND_API_KEY) {
    console.error("Send email hook is missing SEND_EMAIL_HOOK_SECRET or RESEND_API_KEY");
    return hookError(500, "Email sending isn't configured.");
  }

  const body = await request.text();
  const id = request.headers.get("webhook-id");
  const timestamp = request.headers.get("webhook-timestamp");
  const signature = request.headers.get("webhook-signature");
  if (!id || !timestamp || !signature) return hookError(401, "Missing signature.");

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > MAX_AGE_SECONDS) return hookError(401, "Stale request.");
  if (!verifySignature(secret, id, timestamp, body, signature)) return hookError(401, "Bad signature.");

  let payload: HookPayload;
  try {
    payload = JSON.parse(body) as HookPayload;
  } catch {
    return hookError(400, "Invalid body.");
  }

  const email = payload.user?.email;
  const token = payload.email_data?.token;
  if (!email || !token) return hookError(400, "Missing email or code.");

  if (!(await sendViaResend(email, token))) return hookError(502, "Couldn't send the email.");

  // Email changes send a second code to the new address. ClubMatch doesn't offer
  // email changes today, but handle it rather than fail silently.
  const newEmail = payload.user?.new_email;
  const tokenNew = payload.email_data?.token_new;
  if (newEmail && tokenNew && !(await sendViaResend(newEmail, tokenNew))) {
    return hookError(502, "Couldn't send the email.");
  }

  return Response.json({});
}

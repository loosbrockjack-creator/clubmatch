"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { apiFetch } from "@/lib/club-client";
import { CLAIM_RENEWAL_TEXT, type ManageAccess } from "@/lib/club-types";
import { CONTACT_EMAIL } from "@/lib/site";
import { FormStatus, SectionTitle } from "./shared";

export function BillingTab({ slug, access }: { slug: string; access: ManageAccess }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setBusy(true);
    setError(null);
    const { data, error: failure } = await apiFetch<{ url: string }>(`/api/manage/${slug}/billing`, { method: "POST" });
    if (data?.url) {
      window.location.assign(data.url);
      return;
    }
    setError(failure);
    setBusy(false);
  }

  const until = access.currentPeriodEnd
    ? new Date(access.currentPeriodEnd).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="max-w-2xl">
      <SectionTitle title="Your plan" />
      <div className="card px-5 py-6 sm:px-7">
        {access.status === "past_due" && (
          <p role="alert" className="mb-5 rounded-[4px] bg-gold-tint px-4 py-3 text-[14px] leading-relaxed text-ink">
            Your last payment didn&apos;t go through. Update your card so your page stays on.
          </p>
        )}
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-[13px] text-ink-muted">Plan</dt>
            <dd className="mt-0.5 text-[15.5px] font-semibold text-ink">$49 per semester</dd>
            <dd className="mt-0.5 text-[13.5px] text-ink-muted">
              {access.cancelAtPeriodEnd ? "Cancelled. It won't renew." : CLAIM_RENEWAL_TEXT}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-ink-muted">{access.cancelAtPeriodEnd ? "Ends on" : "Renews on"}</dt>
            <dd className="mt-0.5 text-[15.5px] font-semibold text-ink">{until ?? "Not available"}</dd>
          </div>
        </dl>
        {access.cancelAtPeriodEnd && (
          <p className="mt-5 text-[14px] leading-relaxed text-ink-soft">
            Your plan won&apos;t renew. Your page stays on until then, then goes back to the directory listing. Your
            content is saved if you come back.
          </p>
        )}
        {access.isPayer ? (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-line pt-5">
              <button type="button" onClick={() => void openPortal()} disabled={busy} className="btn btn-secondary">
                <CreditCard size={16} strokeWidth={1.75} aria-hidden />
                {busy ? "Opening Stripe..." : "Manage billing"}
              </button>
              <FormStatus error={error} />
            </div>
            <p className="mt-3 text-[13px] text-ink-muted">Change your card, see receipts, or cancel on Stripe.</p>
          </>
        ) : access.payerLeft ? (
          <p className="mt-6 border-t border-line pt-5 text-[14px] leading-relaxed text-ink-soft" data-payer-left>
            The officer who paid for this plan has left ClubMatch, so it won&apos;t renew. Your page stays on until
            then. When it ends, any officer can renew it from the club page with their own card.
          </p>
        ) : (
          <p className="mt-6 border-t border-line pt-5 text-[14px] leading-relaxed text-ink-soft" data-not-payer>
            Another officer pays for this plan, so its card and receipts stay private to them. Ask them to make
            changes. If they&apos;ve left the club, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="link-isu">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}

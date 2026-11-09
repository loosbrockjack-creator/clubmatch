"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  Megaphone,
  PencilLine,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useAccount } from "@/lib/account";
import { apiFetch } from "@/lib/club-client";
import { CLAIM_PRICE_LABEL, CLAIM_RENEWAL_TEXT, type ClaimState } from "@/lib/club-types";
import { LIMITS } from "@/lib/club-validate";

const PERKS = [
  { icon: PencilLine, title: "Your own page", body: "Your words, photos, links, and meeting info, with a Verified by officers badge." },
  { icon: BarChart3, title: "Recruitment analytics", body: "How many students matched with you, viewed your page, saved you, and asked about you." },
  { icon: Users, title: "Good-fit students", body: "A list of students who fit your club and said clubs can find them." },
  { icon: CalendarDays, title: "Events and Featured spots", body: "Post events to your page and Explore, and opt in to the Featured row." },
  { icon: Megaphone, title: "Campaigns", body: "Message your members and interested students in their ClubMatch inbox." },
  { icon: BadgeCheck, title: "A real roster", body: "Confirm who's actually a member, and add other officers." },
];

/** Webhooks usually land in seconds. After this, say so rather than spin forever. */
const POLL_MS = 2000;
const POLL_TRIES = 15;

export function ClaimView({ slug, clubName }: { slug: string; clubName: string }) {
  const account = useAccount();
  const params = useSearchParams();
  const returned = params.get("status");
  const signedIn = account.status === "signed-in";

  const [state, setState] = useState<ClaimState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activating, setActivating] = useState(returned === "success");

  const load = useCallback(async () => {
    const { data, error } = await apiFetch<ClaimState>(`/api/clubs/${slug}/claim`);
    if (data) {
      setState(data);
      setLoadError(null);
    } else setLoadError(error);
    return data;
  }, [slug]);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    void (async () => {
      let current = await load();
      if (returned !== "success") return;
      for (let i = 0; i < POLL_TRIES && !cancelled; i++) {
        if (current?.status === "active" && current.isOfficer) break;
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        current = await load();
      }
      if (!cancelled) setActivating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, load, returned]);

  return (
    <>
      <PageHeader
        crumbs={[{ href: `/clubs/${slug}`, label: clubName }]}
        title="Claim this club"
        intro={`Run ${clubName}'s ClubMatch page, and see which students it reaches.`}
      />
      <div className="shell grid gap-10 pb-12 pt-10 lg:grid-cols-[1fr_400px] lg:items-start">
        <section aria-label="What you get">
          <h2 className="display gold-rule text-[26px] text-ink">What you get</h2>
          <ul className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {PERKS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3.5">
                <Icon size={20} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 text-cardinal" />
                <div>
                  <p className="text-[15px] font-semibold text-ink">{title}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-xl text-[13.5px] leading-relaxed text-ink-muted">
            Paying never changes anyone&apos;s match score. Featured spots are always labeled, and officers
            never see a student&apos;s quiz answers.
          </p>
        </section>

        <aside className="card px-6 py-7 lg:sticky lg:top-[96px]" aria-live="polite">
          <p className="flex items-baseline gap-2">
            <span className="display text-[38px] text-ink">{CLAIM_PRICE_LABEL}</span>
            <span className="text-[15px] font-medium text-ink-soft">per semester</span>
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
            {CLAIM_RENEWAL_TEXT} Cancel any time.{" "}
            <Link href="/terms" className="link-isu">
              Terms
            </Link>
          </p>
          <div className="mt-6 border-t border-line pt-6">
            {account.status === "loading" ? (
              <div className="skeleton h-12 rounded-[4px]" />
            ) : !signedIn ? (
              <SignInStep slug={slug} />
            ) : loadError ? (
              <p role="alert" className="text-[14.5px] text-ink-soft">
                {loadError}{" "}
                <button type="button" onClick={() => void load()} className="link-isu">
                  Try again
                </button>
              </p>
            ) : !state ? (
              <div className="skeleton h-12 rounded-[4px]" />
            ) : (
              <Step
                slug={slug}
                clubName={clubName}
                state={state}
                email={account.email}
                returned={returned}
                activating={activating}
                onChange={setState}
              />
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

function SignInStep({ slug }: { slug: string }) {
  return (
    <>
      <p className="text-[14.5px] leading-relaxed text-ink-soft">
        Sign in with your @iastate.edu email so we can check you&apos;re an officer.
      </p>
      <Link
        href={`/login?next=${encodeURIComponent(`/clubs/${slug}/claim`)}`}
        className="btn btn-primary mt-4 w-full"
      >
        Sign in to continue
      </Link>
    </>
  );
}

function Step({
  slug,
  clubName,
  state,
  email,
  returned,
  activating,
  onChange,
}: {
  slug: string;
  clubName: string;
  state: ClaimState;
  email: string | null;
  returned: string | null;
  activating: boolean;
  onChange: (next: ClaimState) => void;
}) {
  const paidUp = state.status === "active" || state.status === "past_due";

  if (paidUp && state.isOfficer) {
    return (
      <>
        <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <CheckCircle2 size={18} strokeWidth={2} aria-hidden className="text-cardinal" />
          {returned === "success" ? `You've claimed ${clubName}.` : "You run this club's page."}
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
          Add your description, photos, and first event from the admin panel.
        </p>
        <Link href={`/manage/${slug}`} className="btn btn-primary mt-4 w-full">
          Open the admin panel
        </Link>
      </>
    );
  }

  if (returned === "success" && !paidUp) {
    return activating ? (
      <>
        <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <Clock size={18} strokeWidth={2} aria-hidden className="text-ink-muted" />
          Payment received. Activating your club...
        </p>
        <div className="skeleton mt-4 h-2 rounded-full" />
      </>
    ) : (
      <>
        <p className="text-[15px] font-semibold text-ink">This is taking longer than usual.</p>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
          If Stripe took your payment, your club turns on as soon as we hear from them. Refresh in a minute,
          or email us and we&apos;ll sort it out.
        </p>
      </>
    );
  }

  if (paidUp) {
    return (
      <>
        <p className="text-[15px] font-semibold text-ink">{clubName} has already been claimed.</p>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
          If you&apos;re an officer, ask whoever runs the page to add you. First tap I&apos;m a member on the
          club&apos;s page so they can promote you.
        </p>
        <Link href={`/clubs/${slug}`} className="btn btn-secondary mt-4 w-full">
          Back to the club
        </Link>
      </>
    );
  }

  return (
    <>
      {returned === "cancelled" && (
        <p role="status" className="mb-5 rounded-[4px] bg-muted px-3.5 py-3 text-[14px] text-ink-soft">
          Checkout cancelled. You weren&apos;t charged.
        </p>
      )}
      {state.status === "lapsed" && (
        <p className="mb-5 rounded-[4px] bg-gold-tint px-3.5 py-3 text-[14px] leading-relaxed text-ink-soft">
          This club&apos;s plan has ended, so its page is back to the directory listing. Everything officers
          added is saved and comes back on renewal.
        </p>
      )}
      {state.canCheckout ? (
        <CheckoutStep slug={slug} email={email} renewing={state.status === "lapsed"} />
      ) : state.claim?.status === "pending" ? (
        <>
          <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <Clock size={18} strokeWidth={2} aria-hidden className="text-ink-muted" />
            We&apos;re checking your request
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
            We&apos;ll confirm you&apos;re an officer of {clubName}. Once you&apos;re approved, you&apos;ll see
            the payment step right here. You won&apos;t be charged before then.
          </p>
          <p className="mt-3 text-[13px] text-ink-muted">
            Sent {new Date(state.claim.created_at).toLocaleDateString()} from {email}
          </p>
        </>
      ) : (
        <RequestStep slug={slug} clubName={clubName} email={email} rejected={state.claim?.status === "rejected"} onChange={onChange} />
      )}
    </>
  );
}

function CheckoutStep({ slug, email, renewing }: { slug: string; email: string | null; renewing: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    const { data, error: failure } = await apiFetch<{ url: string }>(`/api/clubs/${slug}/checkout`, {
      method: "POST",
    });
    if (data?.url) {
      window.location.assign(data.url);
      return;
    }
    setError(failure);
    setBusy(false);
  }

  return (
    <>
      <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        <BadgeCheck size={18} strokeWidth={2} aria-hidden className="text-cardinal" />
        You&apos;re confirmed as an officer
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">Signed in as {email}.</p>
      <button type="button" onClick={start} disabled={busy} className="btn btn-primary mt-4 w-full">
        {busy ? "Opening Stripe..." : renewing ? `Renew for ${CLAIM_PRICE_LABEL}` : `Claim for ${CLAIM_PRICE_LABEL}`}
      </button>
      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">
        Secure checkout by Stripe. {CLAIM_RENEWAL_TEXT}
      </p>
      {error && (
        <p role="alert" className="mt-3 text-[14px] font-medium text-cardinal">
          {error}
        </p>
      )}
    </>
  );
}

function RequestStep({
  slug,
  clubName,
  email,
  rejected,
  onChange,
}: {
  slug: string;
  clubName: string;
  email: string | null;
  rejected: boolean;
  onChange: (next: ClaimState) => void;
}) {
  const [role, setRole] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!role.trim()) {
      setError("Tell us your officer role.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: failure } = await apiFetch<ClaimState>(`/api/clubs/${slug}/claim`, {
      method: "POST",
      body: JSON.stringify({ role, note }),
    });
    setBusy(false);
    if (data) onChange(data);
    else setError(failure);
  }

  return (
    <form onSubmit={submit} noValidate>
      <p className="text-[15px] font-semibold text-ink">
        {rejected ? "We couldn't confirm your last request" : "We don't have you on file yet"}
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
        {email} isn&apos;t on our officer list for {clubName}. Send a request and we&apos;ll check it by hand.
        No charge until you&apos;re approved.
      </p>
      <label htmlFor="claim-role" className="field-label mt-5">
        Your officer role
      </label>
      <input
        id="claim-role"
        className="field"
        value={role}
        maxLength={LIMITS.claimRole}
        onChange={(event) => setRole(event.target.value)}
        placeholder="President"
        aria-invalid={Boolean(error)}
      />
      <label htmlFor="claim-note" className="field-label mt-4">
        Anything that helps us check <span className="font-normal text-ink-muted">(optional)</span>
      </label>
      <textarea
        id="claim-note"
        className="field h-auto py-3"
        rows={3}
        value={note}
        maxLength={LIMITS.claimNote}
        onChange={(event) => setNote(event.target.value)}
      />
      {error && (
        <p role="alert" className="mt-3 text-[14px] font-medium text-cardinal">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn btn-primary mt-4 w-full">
        {busy ? "Sending..." : "Send request"}
      </button>
    </form>
  );
}

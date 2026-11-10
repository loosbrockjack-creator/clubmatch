"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  Megaphone,
  PencilLine,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useAccount } from "@/lib/account";
import { apiFetch } from "@/lib/club-client";
import type { ClaimState } from "@/lib/club-types";
import { LIMITS } from "@/lib/club-validate";

const PERKS = [
  { icon: PencilLine, title: "Your own page", body: "Your words, photos, links, and meeting info, with a Verified by officers badge." },
  { icon: BarChart3, title: "Recruitment analytics", body: "How many students matched with you, viewed your page, saved you, and asked about you." },
  { icon: Users, title: "Good-fit students", body: "See students who fit your club and said clubs can find them, and invite the ones you'd like to meet." },
  { icon: CalendarDays, title: "Events", body: "Post events to your page and to Explore's This week row." },
  { icon: Sparkles, title: "Featured spots", body: "Opt in to take turns in the labeled Featured row on Explore. Included in the plan." },
  { icon: Share2, title: "Search and share", body: "A public page with its own search listing, plus a link and share preview to post anywhere." },
  { icon: Megaphone, title: "Campaigns", body: "Message your members and interested students in their ClubMatch inbox." },
  { icon: BadgeCheck, title: "A real roster", body: "Confirm who's actually a member, and add other officers." },
];

export function ClaimView({ slug, clubName }: { slug: string; clubName: string }) {
  const account = useAccount();
  const signedIn = account.status === "signed-in";

  const [state, setState] = useState<ClaimState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await apiFetch<ClaimState>(`/api/clubs/${slug}/claim`);
    if (data) {
      setState(data);
      setLoadError(null);
    } else setLoadError(error);
  }, [slug]);

  useEffect(() => {
    if (!signedIn) return;
    void (async () => {
      await load();
    })();
  }, [signedIn, load]);

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
            Running a page never changes anyone&apos;s match score. Featured spots are always labeled, and officers
            never see a student&apos;s quiz answers.
          </p>
        </section>

        <aside className="card px-6 py-7 lg:sticky lg:top-[96px]" aria-live="polite">
          <p className="text-[17px] font-semibold text-ink">How claiming works</p>
          <ol className="mt-3 space-y-1.5 text-[14px] leading-relaxed text-ink-soft">
            <li>1. Sign in and tell us your officer role.</li>
            <li>2. We confirm you&apos;re an officer, usually within a day.</li>
            <li>3. Your admin panel turns on and we email you.</li>
          </ol>
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
  onChange,
}: {
  slug: string;
  clubName: string;
  state: ClaimState;
  email: string | null;
  onChange: (next: ClaimState) => void;
}) {
  const paidUp = state.status === "active" || state.status === "past_due";

  if (paidUp && state.isOfficer) {
    return (
      <>
        <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <CheckCircle2 size={18} strokeWidth={2} aria-hidden className="text-cardinal" />
          You run {clubName}&apos;s page.
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
      {state.status === "lapsed" && (
        <p className="mb-5 rounded-[4px] bg-gold-tint px-3.5 py-3 text-[14px] leading-relaxed text-ink-soft">
          This club&apos;s page was turned off, so it&apos;s back to the directory listing. Everything officers
          added is saved and comes back once a claim is confirmed.
        </p>
      )}
      {state.claim?.status === "pending" ? (
        <>
          <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <Clock size={18} strokeWidth={2} aria-hidden className="text-ink-muted" />
            We&apos;re checking your request
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
            We check each request by hand to confirm you&apos;re an officer of {clubName}. You&apos;ll get a message
            in your{" "}
            <Link href="/inbox" className="link-isu">
              ClubMatch inbox
            </Link>{" "}
            with the answer. If you&apos;re approved, your admin panel turns on right away.
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

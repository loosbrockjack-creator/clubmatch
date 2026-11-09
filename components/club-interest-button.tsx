"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, Check } from "lucide-react";
import { useAccount } from "@/lib/account";
import { logActivity, useOfficerClubs } from "@/lib/club-client";
import { getSupabase } from "@/lib/supabase";

/**
 * "I'm interested": the one action that tells a claimed club's officers, unlike
 * Save, which is private. It works even with Let clubs find me off, because it's
 * the student's own request for this one club.
 */
export function ClubInterestButton({ slug, clubName }: { slug: string; clubName: string }) {
  const account = useAccount();
  const userId = account.userId;
  const [state, setState] = useState<{ userId: string; interested: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOfficer = useOfficerClubs().includes(slug);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !userId) return;
    let cancelled = false;
    void sb
      .from("club_interests")
      .select("club_slug")
      .eq("user_id", userId)
      .eq("club_slug", slug)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (cancelled) return;
        if (loadError) setError("Couldn't check this. Refresh and try again.");
        else setState({ userId, interested: Boolean(data) });
      });
    return () => {
      cancelled = true;
    };
  }, [slug, userId]);

  if (account.status !== "signed-in") {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/clubs/${slug}`)}`}
        className="btn btn-primary w-full sm:w-auto"
        data-interest-button
      >
        <BellRing size={16} strokeWidth={2} aria-hidden />
        I&'apos;m interested
        <span className="sr-only"> in {clubName} (sign in first)</span>
      </Link>
    );
  }

  if (isOfficer) return null;

  const interested = state?.userId === userId && state.interested;
  const loaded = state?.userId === userId;

  async function toggle() {
    const sb = getSupabase();
    if (!sb || !userId || busy) return;
    setBusy(true);
    setError(null);
    const { error: writeError } = interested
      ? await sb.from("club_interests").delete().eq("user_id", userId).eq("club_slug", slug)
      : await sb.from("club_interests").insert({ user_id: userId, club_slug: slug });
    setBusy(false);
    if (writeError) {
      setError("Couldn't update that. Try again.");
      return;
    }
    setState({ userId: userId, interested: !interested });
    if (!interested) logActivity("interested", [slug]);
  }

  return (
    <div className="w-full sm:w-auto">
      <button
        type="button"
        onClick={toggle}
        disabled={!loaded || busy}
        aria-pressed={interested}
        data-interest-button
        className={`btn h-auto min-h-12 w-full py-3 leading-snug sm:w-auto ${interested ? "btn-outline-cardinal" : "btn-primary"} disabled:opacity-70`}
      >
        {interested ? (
          <Check size={16} strokeWidth={2.25} aria-hidden />
        ) : (
          <BellRing size={16} strokeWidth={2} aria-hidden />
        )}
        {interested ? "Officers know you're interested" : "I'm interested"}
        <span className="sr-only"> in {clubName}</span>
      </button>
      {interested && (
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className="link-isu mt-1 inline-flex min-h-11 items-center text-[13.5px] font-medium sm:min-h-8"
        >
          Take it back
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[13px] font-medium text-cardinal">
          {error}
        </p>
      )}
    </div>
  );
}

/** Says plainly what the two buttons do. Officers don't need it on their own club. */
export function ClubInterestNote({ slug }: { slug: string }) {
  const account = useAccount();
  const isOfficer = useOfficerClubs().includes(slug);
  if (isOfficer) return null;
  const hidden = account.profile?.visible === false;
  return (
    <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-muted" data-interest-note>
      {hidden
        ? "I'm interested tells the officers. Your profile is hidden, so they only see that one more student is interested, not who. They can message you in your inbox. Save is private."
        : "I'm interested tells the officers: they'll see your profile and can message you in your inbox, but never your quiz answers. Save is private."}
    </p>
  );
}

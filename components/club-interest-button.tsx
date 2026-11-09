"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, Check } from "lucide-react";
import { useAccount } from "@/lib/account";
import { logActivity } from "@/lib/club-client";
import { getSupabase } from "@/lib/supabase";

/**
 * "Tell the officers": a student opting in for this one club. It works even with
 * Let clubs find me off, because it's their own request. A hidden profile is
 * shown to officers only as a count, and the note here says so.
 */
export function ClubInterestButton({ slug, clubName }: { slug: string; clubName: string }) {
  const account = useAccount();
  const userId = account.userId;
  const [state, setState] = useState<{ userId: string; interested: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hidden = account.profile?.visible === false;

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
      <div className="mt-6 border-t border-white/20 pt-6">
        <Link
          href={`/login?next=${encodeURIComponent(`/clubs/${slug}`)}`}
          className="link-on-cardinal inline-flex items-center gap-2 text-[14.5px] font-semibold"
        >
          <BellRing size={15} strokeWidth={2} aria-hidden />
          Sign in to tell the officers you&apos;re interested
        </Link>
      </div>
    );
  }

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
    <div className="mt-6 border-t border-white/20 pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={toggle}
          disabled={!loaded || busy}
          aria-pressed={interested}
          className={`btn w-full sm:w-auto ${interested ? "btn-ghost-on-cardinal" : "btn-on-cardinal"} disabled:opacity-70`}
        >
          {interested ? (
            <Check size={16} strokeWidth={2.25} aria-hidden />
          ) : (
            <BellRing size={16} strokeWidth={2} aria-hidden />
          )}
          {interested ? "Officers know you're interested" : "I'm interested, let the officers know"}
          <span className="sr-only"> ({clubName})</span>
        </button>
        {interested && (
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            className="link-on-cardinal self-start text-[13.5px] font-medium sm:self-center"
          >
            Take it back
          </button>
        )}
      </div>
      <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-white/80">
        {hidden
          ? "Your profile is hidden, so officers only see that one more student is interested, not who. They can send you messages in your inbox."
          : "Officers see your public profile and can send you messages in your inbox. They never see your quiz answers."}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-[13px] font-medium text-gold">
          {error}
        </p>
      )}
    </div>
  );
}

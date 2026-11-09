"use client";

import { useState } from "react";
import Link from "next/link";
import { updateProfile } from "@/lib/account";

/** One-time notice for students who signed up before clubs could find them. */
export function PolicyNotice({ onOpenSetting }: { onOpenSetting: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section
      aria-labelledby="policy-notice-title"
      data-policy-notice
      className="card rise mb-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
    >
      <div className="min-w-0">
        <h2 id="policy-notice-title" className="text-[15.5px] font-semibold text-ink">
          Clubs can find you now
        </h2>
        <p className="mt-1 max-w-2xl text-[14.5px] leading-relaxed text-ink-soft">
          Club officers on ClubMatch can now see your public profile and a match %, unless you
          turn off Let clubs find me. Your quiz answers stay private, and nothing is shared outside
          ClubMatch.
        </p>
        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[14px]">
          <button type="button" onClick={onOpenSetting} className="link-isu">
            Change this setting
          </button>
          <Link href="/privacy" className="link-isu">
            Read the privacy page
          </Link>
        </p>
        {error && (
          <p role="alert" className="mt-2 text-[14px] font-medium text-cardinal">
            {error}
          </p>
        )}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(await updateProfile({ policy_notice_seen: true }));
          setBusy(false);
        }}
        className="btn btn-secondary h-10 shrink-0 self-start px-4 text-[14px]"
      >
        Got it
      </button>
    </section>
  );
}

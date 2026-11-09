"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { updateProfile, useAccount } from "@/lib/account";

/**
 * One-time notice for students who signed up before clubs could find them, shown
 * wherever they land after signing in. It sits in the page flow under the header
 * rather than floating, so it never covers anything. Students who signed up since
 * read this during onboarding, which marks it seen.
 */
export function PolicyNotice() {
  const { status, profile } = useAccount();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "signed-in" || !profile?.onboarded || profile.policy_notice_seen) return null;

  return (
    <section
      aria-labelledby="policy-notice-title"
      data-policy-notice
      className="rise border-b border-line bg-white"
    >
      <div className="shell flex flex-col gap-2 py-4 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
        <div className="min-w-0 max-w-3xl">
          <h2 id="policy-notice-title" className="text-[15px] font-semibold text-ink">
            Clubs can find you now
          </h2>
          <p className="mt-0.5 text-[14px] leading-relaxed text-ink-soft">
            Club officers on ClubMatch can now see your public profile and a match %, even if
            you&apos;ve never contacted their club, unless you turn off Let clubs find me. Your quiz
            answers stay private, and we never sell your information.
          </p>
          {error && (
            <p role="alert" className="mt-1 text-[14px] font-medium text-cardinal">
              {error}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-x-5 text-[14px]">
          <Link
            href="/account#settings"
            onClick={(event) => {
              // Next's Link doesn't fire hashchange, which is what the account
              // page listens for when it's already open.
              if (pathname === "/account") {
                event.preventDefault();
                window.location.hash = "settings";
              }
            }}
            className="link-isu inline-flex min-h-10 items-center"
          >
            Change setting
          </Link>
          <Link href="/privacy" className="link-isu inline-flex min-h-10 items-center">
            Privacy
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(await updateProfile({ policy_notice_seen: true }));
              setBusy(false);
            }}
            className="btn btn-secondary h-10 px-4 text-[14px]"
          >
            Got it
          </button>
        </div>
      </div>
    </section>
  );
}

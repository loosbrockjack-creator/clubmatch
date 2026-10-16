"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { allowedForPrefs, greekInterest, scoreClub } from "@/lib/matching";
import { useStoredPreferences } from "@/lib/preferences";
import type { ClubSummary } from "@/lib/types";

export function WhyItFits({ club }: { club: ClubSummary }) {
  const prefs = useStoredPreferences();

  if (prefs === null || prefs === false) return null;

  // A fit score for a chapter means nothing to someone who opted out of Greek
  // life (or never saw that question). Say why instead of showing a low number.
  if (!allowedForPrefs(prefs, club)) {
    const interest = greekInterest(prefs);
    return (
      <section className="rise mt-10 border-l-[3px] border-line-strong bg-muted p-6 sm:p-7">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          {prefs.greek == null
            ? "Your answers are from before we added Greek life. Answer one more question to see how this chapter fits."
            : interest === "no"
              ? "Your quiz answers keep Greek chapters out of your matches, so this one is not scored."
              : `Your quiz answers only include ${interest === "fraternity" ? "fraternities" : "sororities"}, so this chapter is not scored.`}{" "}
          <Link href="/match?step=greek" className="link-isu">
            {prefs.greek == null ? "Answer it" : "Change your answer"}
          </Link>
        </p>
      </section>
    );
  }

  const { score, reasons } = scoreClub(prefs, club);

  return (
    <section className="rise mt-10 border-l-[3px] border-gold bg-gold-tint p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="display flex items-center gap-2.5 text-[22px] text-ink">
          <Sparkles
            size={18}
            strokeWidth={1.75}
            aria-hidden
            className="text-cardinal"
          />
          Why it fits you
        </h2>
        <span className="text-[22px] font-bold tabular-nums text-cardinal">
          {score}% fit
        </span>
      </div>

      <ul className="mt-5 space-y-2.5">
        {reasons.map((reason) => (
          <li
            key={reason}
            className="flex gap-3 text-[15px] leading-relaxed text-ink-soft"
          >
            <span
              aria-hidden
              className="mt-[9px] h-1.5 w-1.5 shrink-0 bg-cardinal"
            />
            {reason}
          </li>
        ))}
      </ul>

      <p className="mt-6 text-[13px] text-ink-muted">
        Based on the answers you gave.{" "}
        <Link href="/match" className="link-isu">
          Change them
        </Link>
        .
      </p>
    </section>
  );
}

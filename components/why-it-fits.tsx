"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { scoreClub } from "@/lib/matching";
import { useStoredPreferences } from "@/lib/preferences";
import type { ClubSummary } from "@/lib/types";

export function WhyItFits({ club }: { club: ClubSummary }) {
  const prefs = useStoredPreferences();

  if (prefs === null || prefs === false) return null;

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

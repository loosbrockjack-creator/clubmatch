"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { scoreClub } from "@/lib/matching";
import { useStoredPreferences } from "@/lib/preferences";
import type { Club } from "@/lib/types";

export function WhyItFits({ club }: { club: Club }) {
  const prefs = useStoredPreferences();

  if (prefs === null || prefs === false) return null;

  const { score, reasons } = scoreClub(prefs, club);

  return (
    <section className="card rise mt-10 p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[20px] font-bold tracking-tight text-ink">
          <Sparkles size={18} strokeWidth={1.75} aria-hidden className="text-cardinal" />
          Why it fits you
        </h2>
        <span className="text-[20px] font-bold tabular-nums text-cardinal">
          {score}% fit
        </span>
      </div>

      <ul className="mt-4 space-y-2">
        {reasons.map((reason) => (
          <li
            key={reason}
            className="flex gap-2.5 text-[15px] leading-relaxed text-ink-soft"
          >
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cardinal" />
            {reason}
          </li>
        ))}
      </ul>

      <p className="mt-5 text-[13px] text-ink-muted">
        Based on the answers you gave.{" "}
        <Link href="/match" className="font-semibold text-ink underline underline-offset-2">
          Change them
        </Link>
        .
      </p>
    </section>
  );
}

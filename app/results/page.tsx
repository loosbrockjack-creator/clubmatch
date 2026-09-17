"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { MatchRow } from "@/components/match-row";
import { ClubMark } from "@/components/club-mark";
import { buildInvolvementStack, matchClubs } from "@/lib/matching";
import { useStoredPreferences } from "@/lib/preferences";
import {
  ACADEMIC_AREA_BY_ID,
  CAREER_BY_ID,
  COMMITMENT_BY_ID,
} from "@/lib/taxonomy";
import type { Preferences } from "@/lib/types";

const RESULT_LIMIT = 9;

function answerChips(prefs: Preferences) {
  const chips: string[] = [];

  if (prefs.academicArea && prefs.academicArea !== "undecided") {
    chips.push(ACADEMIC_AREA_BY_ID[prefs.academicArea].label);
  } else if (prefs.academicArea === "undecided") {
    chips.push("Still deciding");
  }

  prefs.careers
    .slice(0, 3)
    .forEach((id) => chips.push(CAREER_BY_ID[id].label));

  if (prefs.careers.length > 3) {
    chips.push(`+${prefs.careers.length - 3} more`);
  }

  if (prefs.commitment && prefs.commitment !== "flexible") {
    chips.push(COMMITMENT_BY_ID[prefs.commitment].label);
  } else if (prefs.commitment === "flexible") {
    chips.push("Flexible on time");
  }

  return chips;
}

function ResultsSkeleton() {
  return (
    <div className="shell py-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-[15px] font-medium text-ink-muted">
          Finding your best fits...
        </p>
        <div className="mt-8 space-y-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="card flex gap-5 p-6">
              <div className="skeleton h-[72px] w-[72px] shrink-0 rounded-[16px]" />
              <div className="flex-1 space-y-3 py-1">
                <div className="skeleton h-4 w-24 rounded" />
                <div className="skeleton h-5 w-2/5 rounded" />
                <div className="skeleton h-4 w-4/5 rounded" />
                <div className="flex gap-2 pt-2">
                  <div className="skeleton h-8 w-24 rounded-full" />
                  <div className="skeleton h-8 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const prefs = useStoredPreferences();
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(true), 650);
    return () => window.clearTimeout(timer);
  }, []);

  const results = useMemo(
    () => (prefs ? matchClubs(prefs) : []),
    [prefs],
  );
  const stack = useMemo(() => buildInvolvementStack(results), [results]);

  if (prefs === null || !settled) {
    return <ResultsSkeleton />;
  }

  if (prefs === false) {
    return (
      <div className="shell py-24">
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-[28px] font-bold tracking-tight text-ink">
            No answers yet
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
            Answer five quick questions and we will rank the clubs that fit you.
          </p>
          <Link href="/match" className="btn btn-primary mt-7">
            Start the match quiz
            <ArrowRight size={16} strokeWidth={2} aria-hidden />
          </Link>
        </div>
      </div>
    );
  }

  const top = results.slice(0, RESULT_LIMIT);

  return (
    <div className="shell pb-8 pt-12 sm:pt-16">
      <div className="mx-auto max-w-4xl">
        <header>
          <h1 className="text-[32px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[40px]">
            Your best matches
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-muted sm:text-[16px]">
            {top.length > 0
              ? `${top.length} clubs ranked from the answers you gave us. Fit scores are a guide, not a grade.`
              : "Nothing cleared the bar with these answers."}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {answerChips(prefs).map((chip) => (
              <span key={chip} className="chip">
                {chip}
              </span>
            ))}
            <Link
              href="/match"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-[13px] font-semibold text-ink transition-colors hover:bg-muted"
            >
              <SlidersHorizontal size={13} strokeWidth={2} aria-hidden />
              Adjust answers
            </Link>
          </div>
        </header>

        {top.length === 0 ? (
          <div className="card mt-10 px-6 py-16 text-center">
            <h2 className="text-[20px] font-bold tracking-tight text-ink">
              No strong matches yet.
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-ink-muted">
              Try widening your time commitment or adding a second career area.
              You can also browse everything and filter it yourself.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/match" className="btn btn-primary">
                Adjust my answers
              </Link>
              <Link href="/explore" className="btn btn-secondary">
                Browse all clubs
              </Link>
            </div>
          </div>
        ) : (
          <>
            {stack.length > 0 && (
              <section className="mt-10">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  A balanced start
                </h2>
                <p className="mt-2 text-[14px] text-ink-muted">
                  Three clubs that cover different things, rather than three
                  versions of the same one.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {stack.map(({ label, note, result }) => (
                    <Link
                      key={result.club.id}
                      href={`/clubs/${result.club.slug}`}
                      className="card card-interactive flex flex-col p-5"
                    >
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-cardinal">
                        {label}
                      </span>
                      <span className="mt-3 flex items-center gap-3">
                        <ClubMark mark={result.club.mark} size="sm" />
                        <span className="text-[15px] font-bold leading-snug tracking-tight text-ink">
                          {result.club.name}
                        </span>
                      </span>
                      <span className="mt-3 text-[13px] leading-relaxed text-ink-muted">
                        {note}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-12">
              <h2 className="sr-only">Ranked matches</h2>
              <div className="space-y-4">
                {top.map((result, index) => (
                  <MatchRow
                    key={result.club.id}
                    result={result}
                    rank={index + 1}
                  />
                ))}
              </div>
            </section>

            <div className="mt-10 rounded-[16px] border border-line bg-surface px-6 py-8 text-center">
              <p className="text-[15px] font-semibold text-ink">
                Want to see everything else?
              </p>
              <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-muted">
                These were the strongest fits. The full list is searchable and
                filterable.
              </p>
              <Link href="/explore" className="btn btn-secondary mt-5">
                Browse all clubs
                <ArrowRight size={16} strokeWidth={2} aria-hidden />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

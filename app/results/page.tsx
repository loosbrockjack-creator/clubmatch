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
              <div className="skeleton h-[68px] w-[68px] shrink-0 rounded-[6px]" />
              <div className="flex-1 space-y-3 py-1">
                <div className="skeleton h-4 w-24 rounded-[3px]" />
                <div className="skeleton h-5 w-2/5 rounded-[3px]" />
                <div className="skeleton h-4 w-4/5 rounded-[3px]" />
                <div className="flex gap-2 pt-2">
                  <div className="skeleton h-[30px] w-24 rounded-[3px]" />
                  <div className="skeleton h-[30px] w-20 rounded-[3px]" />
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
          <h1 className="display text-[32px] text-cardinal">No answers yet</h1>
          <div className="mx-auto mt-5 h-1 w-[54px] bg-gold" />
          <p className="mt-5 text-[15.5px] leading-relaxed text-ink-soft">
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
    <>
      <div className="border-b border-line bg-muted">
        <div className="shell py-10 sm:py-14">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Your results</p>
            <h1 className="display mt-4 text-[34px] text-cardinal sm:text-[46px]">
              Your best matches
            </h1>
            <div className="mt-5 h-1 w-[54px] bg-gold" />
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-ink-soft">
              {top.length > 0
                ? `Your top ${top.length} of ${results.length} clubs that fit your answers. Fit scores are a guide, not a grade.`
                : "Nothing cleared the bar with these answers."}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2">
              {answerChips(prefs).map((chip) => (
                <span key={chip} className="chip">
                  {chip}
                </span>
              ))}
              <Link
                href="/match"
                className="inline-flex h-[30px] items-center gap-1.5 rounded-[3px] border border-ink px-3 text-[12.5px] font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
              >
                <SlidersHorizontal size={13} strokeWidth={2} aria-hidden />
                Adjust answers
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="shell pb-8 pt-12">
        <div className="mx-auto max-w-4xl">

        {top.length === 0 ? (
          <div className="card px-6 py-16 text-center">
            <h2 className="display text-[24px] text-ink">
              No strong matches yet.
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-ink-soft">
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
              <section>
                <h2 className="display gold-rule text-[26px] text-ink">
                  A balanced start
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                  Three clubs that cover different things, rather than three
                  versions of the same one.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {stack.map(({ label, note, result }) => (
                    <Link
                      key={result.club.id}
                      href={`/clubs/${result.club.slug}`}
                      className="card card-interactive flex flex-col border-t-2 border-t-cardinal p-5"
                    >
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-cardinal">
                        {label}
                      </span>
                      <span className="mt-3 flex items-center gap-3">
                        <ClubMark mark={result.club.mark} size="sm" />
                        <span className="text-[15px] font-bold leading-snug tracking-[-0.01em] text-ink">
                          {result.club.name}
                        </span>
                      </span>
                      <span className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
                        {note}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-14">
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

            <div className="on-cardinal panel-cardinal mt-12 px-6 py-10 text-center">
              <p className="display text-[24px] text-white">
                Want to see everything else?
              </p>
              <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-white/85">
                These were the strongest fits. The full list is searchable and
                filterable.
              </p>
              <Link href="/explore" className="btn btn-on-cardinal mt-7">
                Browse all clubs
                <ArrowRight size={16} strokeWidth={2} aria-hidden />
              </Link>
            </div>
          </>
        )}
        </div>
      </div>
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { MatchRow } from "@/components/match-row";
import { ClubCard } from "@/components/club-card";
import { ClubMark } from "@/components/club-mark";
import {
  RESULTS_PAGE,
  communitiesFor,
  displayTopic,
  matchChapters,
  matchClubs,
  matchCommunities,
  matchTopics,
  resumeTopicsFor,
  topicsFor,
} from "@/lib/matching";
import { logActivity } from "@/lib/club-client";
import { RESULT_LIMIT } from "@/lib/club-types";
import { useStoredPreferences } from "@/lib/preferences";
import {
  ACADEMIC_AREA_BY_ID,
  CAREER_BY_ID,
  COMMITMENT_BY_ID,
  COMMUNITY_BY_ID,
  GREEK_OPTION_BY_ID,
} from "@/lib/taxonomy";
import type { CommunityId, Preferences } from "@/lib/types";

/** Where "See all" for a community section points in Explore. */
function communityCategory(ids: CommunityId[]) {
  return ids.length === 1 && ids[0] === "faith" ? "Faith & Spirituality" : "Culture & Identity";
}

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

  [...topicsFor(prefs), ...resumeTopicsFor(prefs)]
    .slice(0, 3)
    .forEach((topic) => {
      const label = displayTopic(topic);
      chips.push(label.charAt(0).toUpperCase() + label.slice(1));
    });

  if (prefs.commitment && prefs.commitment !== "flexible") {
    chips.push(COMMITMENT_BY_ID[prefs.commitment].label);
  } else if (prefs.commitment === "flexible") {
    chips.push("Flexible on time");
  }

  if (prefs.greek && prefs.greek !== "no") {
    chips.push(
      prefs.greek === "either"
        ? "Open to Greek life"
        : `Open to ${GREEK_OPTION_BY_ID[prefs.greek].label.toLowerCase()}`,
    );
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

export function ResultsView({ ai }: { ai: boolean }) {
  const prefs = useStoredPreferences();
  const [settled, setSettled] = useState(false);
  const [visible, setVisible] = useState(RESULTS_PAGE);
  const [aiReasons, setAiReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(true), 650);
    return () => window.clearTimeout(timer);
  }, []);

  const results = useMemo(
    () => (prefs ? matchClubs(prefs) : []),
    [prefs],
  );
  const chapters = useMemo(() => (prefs ? matchChapters(prefs) : []), [prefs]);
  const byTopic = useMemo(() => {
    if (!prefs) return [];
    // Only worth a row when the main list doesn't already show it up top.
    const shown = new Set(results.slice(0, 10).map((r) => r.club.id));
    return matchTopics(prefs)
      .map((row) => ({ ...row, results: row.results.filter((r) => !shown.has(r.club.id)) }))
      .filter((row) => row.results.length > 0);
  }, [prefs, results]);
  const community = useMemo(
    () => (prefs ? matchCommunities(prefs) : { results: [], total: 0 }),
    [prefs],
  );

  // A club's "You showed up in N students' matches" counts what's on screen here.
  // Community picks are left out on purpose: they come from a private opt-in,
  // and a faith or culture club should not learn who asked for it, even as a
  // count broken down by major.
  useEffect(() => {
    if (!settled || !prefs) return;
    const shown = [...results.slice(0, RESULT_LIMIT), ...chapters].map((r) => r.club.slug);
    if (shown.length > 0) logActivity("impression", shown);
  }, [settled, prefs, results, chapters]);

  // Personal one-liners for the first page. The rule-based reasons show first;
  // these replace them card by card when they arrive. Failure changes nothing.
  useEffect(() => {
    if (!ai || !prefs || results.length === 0) return;
    const controller = new AbortController();
    fetch("/api/ai/reasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prefs,
        slugs: results.slice(0, RESULTS_PAGE).map((r) => r.club.slug),
      }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : { reasons: {} }))
      .then((data: { reasons?: Record<string, string> }) => setAiReasons(data.reasons ?? {}))
      .catch(() => {});
    return () => controller.abort();
  }, [ai, prefs, results]);

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
            Answer a few quick questions and we will rank the clubs that fit you.
          </p>
          <Link href="/match" className="btn btn-primary mt-7">
            Start the match quiz
            <ArrowRight size={16} strokeWidth={2} aria-hidden />
          </Link>
        </div>
      </div>
    );
  }

  const top = results.slice(0, visible);
  const wanted = communitiesFor(prefs);

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
                ? results.length > RESULTS_PAGE
                  ? `${results.length} clubs line up with your answers. Here are the strongest. Fit scores are a guide, not a grade.`
                  : `${results.length} ${results.length === 1 ? "club lines" : "clubs line"} up with your answers. Fit scores are a guide, not a grade.`
                : "Nothing lined up closely with these answers."}
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

            {prefs.greek == null && (
              <p className="mt-5 text-[14px] text-ink-soft">
                New: your results can now include fraternities and sororities.{" "}
                <Link href="/match?step=greek" className="link-isu">
                  Answer one more question
                </Link>
              </p>
            )}
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
              Try adding a second career area, or tell us something specific
              you&apos;re into. You can also browse everything and filter it yourself.
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
            <section>
              <h2 className="sr-only">Ranked matches</h2>
              <div className="space-y-4">
                {top.map((result, index) => (
                  <MatchRow
                    key={result.club.id}
                    result={result}
                    rank={index + 1}
                    aiReason={aiReasons[result.club.slug]}
                  />
                ))}
              </div>
              {results.length < 8 && results[0]?.club.categories[0] && (
                <p className="mt-6 text-[14px] text-ink-soft">
                  Only a few clubs line up closely with these answers.{" "}
                  <Link
                    href={`/explore?category=${encodeURIComponent(results[0].club.categories[0])}`}
                    className="link-isu"
                  >
                    Browse all {results[0].club.categories[0]} clubs
                  </Link>
                  , or try adding another career area.
                </p>
              )}
              {results.length > visible && (
                <div className="mt-8 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + RESULTS_PAGE)}
                    className="btn btn-secondary"
                  >
                    Show {Math.min(RESULTS_PAGE, results.length - visible)} more
                  </button>
                  <p className="text-[13px] text-ink-muted">
                    Showing {top.length} of {results.length}
                  </p>
                </div>
              )}
            </section>

            {byTopic.length > 0 && (
              <section className="mt-14">
                <h2 className="display gold-rule text-[26px] text-ink">
                  Because you mentioned
                </h2>
                <div className="mt-6 space-y-6">
                  {byTopic.map((row) => (
                    <div key={row.topic}>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cardinal">
                        {displayTopic(row.topic)}
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {row.results.map((result) => (
                          <Link
                            key={result.club.id}
                            href={`/clubs/${result.club.slug}`}
                            className="card card-interactive flex min-w-0 items-center gap-3 p-4"
                          >
                            <ClubMark mark={result.club.mark} size="sm" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[15px] font-bold tracking-[-0.01em] text-ink">
                                {result.club.name}
                              </span>
                              <span className="block truncate text-[13px] text-ink-muted">
                                {result.club.tagline}
                              </span>
                            </span>
                            <ArrowRight size={15} strokeWidth={2} aria-hidden className="shrink-0 text-ink-muted" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}


          </>
        )}

            {community.results.length > 0 && (
              <section className="mt-16">
                <h2 className="display gold-rule text-[26px] text-ink">
                  Communities you asked about
                </h2>
                <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
                  {wanted.length === 1
                    ? `${COMMUNITY_BY_ID[wanted[0]].label}: a few to start with.`
                    : "A few to start with."}{" "}
                  {ai &&
                    topicsFor(prefs).length === 0 &&
                    (wanted.includes("faith") || wanted.includes("culture-heritage")) &&
                    `Mention a specific ${wanted.includes("faith") && wanted.includes("culture-heritage") ? "faith or culture" : wanted.includes("faith") ? "faith" : "culture"} in the quiz to narrow these down.`}
                </p>
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {community.results.map((result) => (
                    <ClubCard key={result.club.id} club={result.club} />
                  ))}
                </div>
                {community.total > community.results.length && (
                  <Link
                    href={`/explore?category=${encodeURIComponent(communityCategory(wanted))}`}
                    className="link-isu mt-5 inline-flex items-center gap-1 text-[14px]"
                  >
                    See all {community.total}
                    <ArrowRight size={14} strokeWidth={2} aria-hidden />
                  </Link>
                )}
              </section>
            )}

            {chapters.length > 0 && (
              <section className="mt-16">
                <h2 className="display gold-rule text-[26px] text-ink">
                  Chapters to look at
                </h2>
                <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
                  You said Greek life is on the table. These{" "}
                  {prefs.greek === "fraternity"
                    ? "fraternities"
                    : prefs.greek === "sorority"
                      ? "sororities"
                      : "chapters"}{" "}
                  line up best with your answers, but houses and people are
                  what decide it, so compare a few.
                </p>
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {chapters.map((result) => (
                    <ClubCard key={result.club.id} club={result.club} />
                  ))}
                </div>
              </section>
            )}

            {top.length > 0 && (
              <div className="on-cardinal panel-cardinal mt-16 px-6 py-10 text-center">
                <p className="display text-[24px] text-white">
                  Want to see everything else?
                </p>
                <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-white/85">
                  These were the strongest fits. The full list is searchable and
                  filterable.
                </p>
                <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link href="/explore" className="btn btn-on-cardinal w-full sm:w-auto">
                    Browse all clubs
                    <ArrowRight size={16} strokeWidth={2} aria-hidden />
                  </Link>
                  {prefs.greek && prefs.greek !== "no" && (
                    <Link
                      href={
                        prefs.greek === "either"
                          ? "/greek"
                          : `/greek?kind=${prefs.greek}`
                      }
                      className="btn btn-ghost-on-cardinal w-full sm:w-auto"
                    >
                      Compare every chapter
                      <ArrowRight size={16} strokeWidth={2} aria-hidden />
                    </Link>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    </>
  );
}

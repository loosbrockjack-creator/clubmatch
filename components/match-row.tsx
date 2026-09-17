import Link from "next/link";
import { ArrowRight, Clock, Users } from "lucide-react";
import { ClubMark } from "./club-mark";
import { SaveButton } from "./save-button";
import { COMMITMENT_SHORT } from "@/lib/taxonomy";
import type { MatchResult } from "@/lib/types";

export function MatchRow({
  result,
  rank,
}: {
  result: MatchResult;
  rank: number;
}) {
  const { club, score, reasons } = result;

  return (
    <article className="card card-interactive group relative flex gap-4 p-5 sm:gap-5 sm:p-6">
      <div className="hidden sm:block">
        <ClubMark mark={club.mark} size="lg" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="sm:hidden">
              <ClubMark mark={club.mark} size="sm" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted">
                {rank === 1 ? "Best match" : `Match ${rank}`}
              </p>
              <h3 className="mt-1 text-[18px] font-bold leading-snug tracking-tight text-ink sm:text-[21px]">
                <Link
                  href={`/clubs/${club.slug}`}
                  className="after:absolute after:inset-0 after:content-['']"
                >
                  {club.name}
                </Link>
              </h3>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <span className="text-[19px] font-bold tabular-nums text-cardinal sm:text-[22px]">
              {score}%
            </span>
            <SaveButton slug={club.slug} clubName={club.name} />
          </div>
        </div>

        <p className="mt-3 text-[14px] leading-relaxed text-ink-soft sm:text-[15px]">
          {reasons[0]}
        </p>

        {reasons.length > 1 && (
          <ul className="mt-2 space-y-1">
            {reasons.slice(1).map((reason) => (
              <li
                key={reason}
                className="text-[13px] leading-relaxed text-ink-muted"
              >
                {reason}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="chip">
            <Clock size={13} strokeWidth={1.75} aria-hidden />
            {COMMITMENT_SHORT[club.commitmentLevel]}
          </span>
          {club.categories.slice(0, 2).map((category) => (
            <span key={category} className="chip">
              {category}
            </span>
          ))}
          {club.freshmenWelcome && (
            <span className="chip">
              <Users size={13} strokeWidth={1.75} aria-hidden />
              Freshmen welcome
            </span>
          )}
          <span className="ml-auto hidden items-center gap-1 text-[13px] font-semibold text-ink transition-transform group-hover:translate-x-0.5 sm:inline-flex">
            View club
            <ArrowRight size={14} strokeWidth={2} aria-hidden />
          </span>
        </div>
      </div>
    </article>
  );
}

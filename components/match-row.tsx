import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock, Users } from "lucide-react";
import { SaveButton } from "./save-button";
import { photoForClub } from "@/lib/photos";
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
  const photo = photoForClub(club);

  return (
    <article
      className={`card card-interactive group relative flex gap-4 overflow-hidden p-4 sm:gap-5 sm:p-5 ${
        rank === 1 ? "border-t-2 border-t-cardinal" : ""
      }`}
    >
      <div className="relative hidden h-24 w-24 shrink-0 overflow-hidden rounded-[6px] sm:block">
        <Image src={photo.src} alt={photo.alt} fill sizes="96px" className="object-cover" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[5px] sm:hidden">
              <Image src={photo.src} alt={photo.alt} fill sizes="56px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <p
                className={`text-[11px] font-bold uppercase tracking-[0.14em] ${
                  rank === 1 ? "text-cardinal" : "text-ink-muted"
                }`}
              >
                {rank === 1 ? "Best match" : `Match ${rank}`}
              </p>
              <h3 className="display mt-1.5 text-[20px] text-ink sm:text-[24px]">
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

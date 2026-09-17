import Link from "next/link";
import { Clock } from "lucide-react";
import { ClubMark } from "./club-mark";
import { SaveButton } from "./save-button";
import { COMMITMENT_SHORT } from "@/lib/taxonomy";
import type { ClubSummary } from "@/lib/types";

/**
 * Airbnb's listing-card information order, applied to a club:
 * identity, then the headline, then quiet metadata, then the one fact that
 * decides it. A fit score takes the slot Airbnb gives the star rating.
 */
export function ClubCard({
  club,
  score,
}: {
  club: ClubSummary;
  score?: number;
}) {
  return (
    <article className="card card-interactive group relative flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <ClubMark mark={club.mark} size="md" />
        <SaveButton slug={club.slug} clubName={club.name} className="-mr-1 -mt-1" />
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <h3 className="text-[16.5px] font-bold leading-snug tracking-[-0.01em] text-ink">
          <Link
            href={`/clubs/${club.slug}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {club.name}
          </Link>
        </h3>
        {score !== undefined && (
          <span className="shrink-0 pt-0.5 text-[14px] font-bold tabular-nums text-cardinal">
            {score}%
          </span>
        )}
      </div>

      <p className="mt-1.5 text-[13px] text-ink-muted">
        {club.categories.slice(0, 2).join(" · ")}
      </p>

      <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-ink-soft">
        {club.tagline}
      </p>

      <div className="mt-auto flex items-center gap-2 pt-5 text-[13px] text-ink-muted">
        <Clock size={13.5} strokeWidth={1.75} aria-hidden />
        <span>{COMMITMENT_SHORT[club.commitmentLevel]}</span>
        {club.openToAllMajors && (
          <>
            <span aria-hidden className="text-line-strong">
              ·
            </span>
            <span>Open to all majors</span>
          </>
        )}
      </div>
    </article>
  );
}

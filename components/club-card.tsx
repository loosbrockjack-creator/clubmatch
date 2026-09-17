import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import { SaveButton } from "./save-button";
import { photoForClub } from "@/lib/photos";
import { COMMITMENT_SHORT } from "@/lib/taxonomy";
import type { ClubSummary } from "@/lib/types";

/**
 * Airbnb's listing-card information order, applied to a club: a photo cover
 * with the save action and fit score overlaid, then the headline, then quiet
 * metadata, then the one fact that decides it. Clubs have no photos of their
 * own, so the cover is picked deterministically from a category photo pool
 * (see lib/photos.ts) so the same club always shows the same image, while a
 * grid full of clubs in one category doesn't repeat a single picture.
 */
export function ClubCard({
  club,
  score,
}: {
  club: ClubSummary;
  score?: number;
}) {
  const photo = photoForClub(club);

  return (
    <article className="card card-interactive group relative flex flex-col overflow-hidden p-0">
      <div className="relative aspect-[4/3]">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 92vw"
          className="object-cover transition-transform duration-400 ease-out group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

        {/* Wrapped rather than positioned via SaveButton's own className: that
            component hardcodes "relative", which Tailwind's fixed utility
            ordering would otherwise let win over an "absolute" passed in. */}
        <div className="absolute right-3 top-3 z-10">
          <SaveButton
            slug={club.slug}
            clubName={club.name}
            className="bg-white/90 text-ink shadow-sm backdrop-blur hover:bg-white"
          />
        </div>

        {score !== undefined && (
          <span className="absolute left-3 top-3 z-10 inline-flex h-7 items-center rounded-[3px] bg-white/95 px-2.5 text-[13px] font-bold tabular-nums text-cardinal shadow-sm backdrop-blur">
            {score}% fit
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[16.5px] font-bold leading-snug tracking-[-0.01em] text-ink">
          <Link
            href={`/clubs/${club.slug}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {club.name}
          </Link>
        </h3>

        <p className="mt-1.5 text-[13px] text-ink-muted">
          {club.categories.slice(0, 2).join(" · ")}
        </p>

        <p className="mt-3 line-clamp-2 text-[14px] leading-relaxed text-ink-soft">
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
      </div>
    </article>
  );
}

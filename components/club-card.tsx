import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { ClubMark } from "./club-mark";
import { SaveButton } from "./save-button";
import { COMMITMENT_SHORT } from "@/lib/taxonomy";
import type { Club } from "@/lib/types";

export function ClubCard({ club }: { club: Club }) {
  return (
    <article className="card card-interactive group relative flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <ClubMark mark={club.mark} size="md" />
        <SaveButton slug={club.slug} clubName={club.name} className="-mr-1 -mt-1" />
      </div>

      <h3 className="mt-4 text-[17px] font-bold leading-snug tracking-tight text-ink">
        <Link
          href={`/clubs/${club.slug}`}
          className="after:absolute after:inset-0 after:content-['']"
        >
          {club.name}
        </Link>
      </h3>

      <p className="mt-1 text-[13px] font-medium text-ink-muted">
        {club.categories.slice(0, 2).join(" · ")}
      </p>

      <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-ink-soft">
        {club.tagline}
      </p>

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="chip">
          <Clock size={13} strokeWidth={1.75} aria-hidden />
          {COMMITMENT_SHORT[club.commitmentLevel]}
        </span>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink transition-transform group-hover:translate-x-0.5">
          View club
          <ArrowRight size={14} strokeWidth={2} aria-hidden />
        </span>
      </div>
    </article>
  );
}

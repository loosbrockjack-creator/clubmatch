"use client";

import { Check, Heart } from "lucide-react";
import { useSavedClubs } from "@/lib/preferences";

export function InterestedButton({
  slug,
  clubName,
  onCardinal = false,
}: {
  slug: string;
  clubName: string;
  /** Inverts the color pair for use inside a solid cardinal panel. */
  onCardinal?: boolean;
}) {
  const { saved, toggle, ready } = useSavedClubs();
  const isSaved = saved.includes(slug);

  const variant = onCardinal
    ? isSaved
      ? "btn-ghost-on-cardinal"
      : "btn-on-cardinal"
    : isSaved
      ? "btn-secondary"
      : "btn-primary";

  return (
    <button
      type="button"
      aria-pressed={ready ? isSaved : undefined}
      onClick={() => toggle(slug)}
      className={`btn ${variant} w-full sm:w-auto`}
    >
      {isSaved ? (
        <>
          <Check size={16} strokeWidth={2.25} aria-hidden />
          Saved to your list
        </>
      ) : (
        <>
          <Heart size={16} strokeWidth={2} aria-hidden />
          I&apos;m interested
        </>
      )}
      <span className="sr-only"> in {clubName}</span>
    </button>
  );
}

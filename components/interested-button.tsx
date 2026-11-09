"use client";

import { Check, Heart } from "lucide-react";
import { useSavedClubs } from "@/lib/preferences";

export function InterestedButton({
  slug,
  clubName,
  onCardinal = false,
  quiet = false,
}: {
  slug: string;
  clubName: string;
  /** Inverts the color pair for use inside a solid cardinal panel. */
  onCardinal?: boolean;
  /** Second to "I'm interested" on claimed clubs, so it must not look like the main action. */
  quiet?: boolean;
}) {
  const { saved, toggle, ready } = useSavedClubs();
  const isSaved = saved.includes(slug);

  const variant = onCardinal
    ? isSaved
      ? "btn-ghost-on-cardinal"
      : "btn-on-cardinal"
    : isSaved || quiet
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
          Saved
        </>
      ) : (
        <>
          <Heart size={16} strokeWidth={2} aria-hidden />
          Save
        </>
      )}
      <span className="sr-only"> {clubName} to your private list</span>
    </button>
  );
}

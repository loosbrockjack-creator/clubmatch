"use client";

import { Check, Heart } from "lucide-react";
import { useSavedClubs } from "@/lib/preferences";

export function InterestedButton({
  slug,
  clubName,
}: {
  slug: string;
  clubName: string;
}) {
  const { saved, toggle, ready } = useSavedClubs();
  const isSaved = ready && saved.includes(slug);

  return (
    <button
      type="button"
      onClick={() => toggle(slug)}
      aria-pressed={ready ? isSaved : undefined}
      className={`btn w-full sm:w-auto ${isSaved ? "btn-secondary" : "btn-primary"}`}
    >
      {isSaved ? (
        <>
          <Check size={16} strokeWidth={2.25} aria-hidden />
          On your list
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

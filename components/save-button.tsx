"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useSavedClubs } from "@/lib/preferences";

export function SaveButton({
  slug,
  clubName,
  className = "",
}: {
  slug: string;
  clubName: string;
  className?: string;
}) {
  const { saved, toggle, ready } = useSavedClubs();
  const isSaved = saved.includes(slug);
  // Bumped on each save so the pop replays; zero means no click yet, so no pop on load.
  const [pops, setPops] = useState(0);
  const popping = pops > 0 && isSaved;

  return (
    <button
      type="button"
      aria-pressed={ready ? isSaved : undefined}
      aria-label={isSaved ? `Remove ${clubName} from saved` : `Save ${clubName}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isSaved) setPops((n) => n + 1);
        toggle(slug);
      }}
      className={`relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-ink-muted transition-colors hover:border-line hover:bg-muted hover:text-ink ${className}`}
    >
      {popping && <span key={`ring-${pops}`} aria-hidden className="ring-burst absolute inset-0" />}
      <Heart
        key={popping ? `pop-${pops}` : "heart"}
        size={18}
        strokeWidth={1.75}
        className={`${isSaved ? "fill-cardinal text-cardinal" : ""} ${popping ? "heart-pop" : ""}`}
      />
    </button>
  );
}

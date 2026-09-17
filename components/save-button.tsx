"use client";

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

  return (
    <button
      type="button"
      aria-pressed={ready ? isSaved : undefined}
      aria-label={isSaved ? `Remove ${clubName} from saved` : `Save ${clubName}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(slug);
      }}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-ink-muted transition-colors hover:border-line hover:bg-muted hover:text-ink ${className}`}
    >
      <Heart
        size={18}
        strokeWidth={1.75}
        className={isSaved ? "fill-cardinal text-cardinal" : ""}
      />
    </button>
  );
}

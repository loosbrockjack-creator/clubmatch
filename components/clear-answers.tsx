"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { clearPreferences } from "@/lib/preferences";

/**
 * An out for anyone who wants their quiz answers gone: asks once, then clears
 * them here and on their account. Saved clubs stay.
 */
export function ClearAnswers({ onCleared, className = "" }: { onCleared?: () => void; className?: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted transition-colors hover:text-ink ${className}`}
      >
        <RotateCcw size={13} strokeWidth={2} aria-hidden />
        Clear my answers
      </button>
    );
  }

  return (
    <span role="group" aria-label="Clear your quiz answers?" className={`inline-flex flex-wrap items-center gap-3 text-[13px] ${className}`}>
      <span className="text-ink-soft">Clear your quiz answers and matches? Saved clubs stay.</span>
      <button
        type="button"
        onClick={() => {
          clearPreferences();
          setConfirming(false);
          onCleared?.();
        }}
        className="font-semibold text-cardinal hover:underline"
      >
        Yes, clear them
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="font-semibold text-ink-muted hover:text-ink">
        Cancel
      </button>
    </span>
  );
}

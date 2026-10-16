"use client";

import { useState } from "react";

/** Past this, a pull quote stops reading as a quote and starts reading as a wall. */
const LONG_QUOTE = 380;

/**
 * A member's own words from the chapter's SFE page, set as a serif pull quote.
 * Some run 900 characters, so long ones open clamped with a toggle.
 */
export function ChapterQuote({ quote, author }: { quote: string; author: string }) {
  const long = quote.length > LONG_QUOTE;
  const [open, setOpen] = useState(false);

  return (
    <figure className="mt-10 max-w-2xl border-l-[3px] border-gold pl-6 sm:pl-8">
      <blockquote
        id="chapter-quote"
        className={`font-display text-[18px] italic leading-[1.6] text-ink sm:text-[19.5px] ${
          long && !open ? "line-clamp-5" : ""
        }`}
      >
        &ldquo;{quote}&rdquo;
      </blockquote>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls="chapter-quote"
          onClick={() => setOpen((v) => !v)}
          className="link-isu mt-3 text-[13.5px]"
        >
          {open ? "Show less" : "Read the full quote"}
        </button>
      )}
      {author && (
        <figcaption className="mt-4 text-[13.5px] font-semibold text-ink-muted">
          {author}
        </figcaption>
      )}
    </figure>
  );
}

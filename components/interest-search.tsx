"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { MAX_INTERESTS, searchInterests, toPick } from "@/lib/interests";
import type { InterestPick } from "@/lib/types";

/**
 * Type a few letters, pick a broad suggestion, and it becomes a chip, like the
 * Skills field on a job application. Keyboard: arrows move, Enter adds,
 * Escape closes, Backspace on an empty box removes the last chip.
 */
export function InterestSearch({
  picks,
  onChange,
}: {
  picks: InterestPick[];
  onChange: (next: InterestPick[]) => void;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const full = picks.length >= MAX_INTERESTS;
  const matches = useMemo(
    () => (full ? [] : searchInterests(query, picks.map((p) => p.id))),
    [query, picks, full],
  );
  const showList = open && query.trim().length > 0;

  function add(index: number) {
    const found = matches[index];
    if (!found) return;
    onChange([...picks, toPick(found)]);
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  }

  function remove(id: string) {
    onChange(picks.filter((p) => p.id !== id));
    inputRef.current?.focus();
  }

  return (
    <div>
      <div className="relative">
        <Search
          size={17}
          strokeWidth={1.75}
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <input
          ref={inputRef}
          id="interest-search"
          type="text"
          role="combobox"
          aria-expanded={showList && matches.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && matches[active] ? `${listId}-${active}` : undefined}
          aria-describedby="interest-search-hint"
          autoComplete="off"
          disabled={full}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && matches.length > 0) {
              event.preventDefault();
              setOpen(true);
              setActive((a) => (a + 1) % matches.length);
            } else if (event.key === "ArrowUp" && matches.length > 0) {
              event.preventDefault();
              setActive((a) => (a - 1 + matches.length) % matches.length);
            } else if (event.key === "Enter" && showList && matches.length > 0) {
              // Pick the highlighted suggestion; never submit the quiz form.
              event.preventDefault();
              add(active);
            } else if (event.key === "Escape") {
              setOpen(false);
            } else if (event.key === "Backspace" && query === "" && picks.length > 0) {
              onChange(picks.slice(0, -1));
            }
          }}
          placeholder={full ? `That's ${MAX_INTERESTS}. Remove one to add another.` : "Start typing, like AI, climbing, or investing"}
          className="h-12 w-full rounded-[4px] border border-line-strong bg-white pl-11 pr-4 text-[15px] text-ink placeholder:text-ink-muted focus:border-cardinal focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cardinal disabled:bg-muted disabled:opacity-70"
        />

        {showList && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Suggested interests"
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-72 overflow-auto rounded-[6px] border border-line bg-white py-1 shadow-lg"
          >
            {matches.length === 0 ? (
              <li className="px-4 py-3 text-[14px] text-ink-muted">
                Nothing like that yet. Try a broader word.
              </li>
            ) : (
              matches.map((interest, index) => (
                <li
                  key={interest.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  // mousedown, not click: the input's blur would close the list first.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    add(index);
                  }}
                  onMouseEnter={() => setActive(index)}
                  className={`cursor-pointer px-4 py-2.5 text-[15px] text-ink ${
                    index === active ? "bg-cardinal-tint" : ""
                  }`}
                >
                  {interest.label}
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <p id="interest-search-hint" className="mt-2 text-[13px] text-ink-muted">
        Pick up to {MAX_INTERESTS}. We&apos;ll look for clubs that do these.
      </p>

      {picks.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Your interests">
          {picks.map((pick) => (
            <li key={pick.id}>
              <button
                type="button"
                onClick={() => remove(pick.id)}
                className="chip chip-cardinal transition-colors hover:border-cardinal"
                aria-label={`Remove ${pick.label}`}
              >
                {pick.label}
                <X size={13} strokeWidth={2.25} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { MAX_PROFILE_LINKS } from "@/lib/account";
import { LinkIcon } from "./profile-link-icons";
import {
  LINK_LABEL_MAX,
  linkKind,
  linkKindName,
  normalizeLinkInput,
} from "@/lib/profile-links";

export type LinkRow = { id: number; url: string; label: string; error: string | null };

let nextRowId = 1;
export function newLinkRow(url = "", label = ""): LinkRow {
  return { id: nextRowId++, url, label, error: null };
}

/** Validates every row. Blank rows are ignored and removed when the form saves. */
export function validateLinkRows(rows: LinkRow[]): LinkRow[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    if (!row.url.trim()) return { ...row, error: null };
    const result = normalizeLinkInput(row.url);
    if ("error" in result) return { ...row, error: result.error };
    if (seen.has(result.url)) return { ...row, error: "You already added this link." };
    seen.add(result.url);
    return { ...row, url: result.url, error: null };
  });
}

export function LinkEditor({
  rows,
  onChange,
}: {
  rows: LinkRow[];
  onChange: (rows: LinkRow[]) => void;
}) {
  const [announcement, setAnnouncement] = useState("");
  const container = useRef<HTMLDivElement>(null);
  // Reordering and removing take the focused button out from under the keyboard
  // user, so focus is put back once the DOM has updated.
  const pendingFocus = useRef<string | null>(null);

  useEffect(() => {
    if (!pendingFocus.current) return;
    container.current?.querySelector<HTMLElement>(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  });

  function patch(id: number, change: Partial<LinkRow>) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...change } : row)));
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    const atEdge = target === 0 || target === rows.length - 1;
    const direction = (delta === -1) !== atEdge ? "up" : "down";
    pendingFocus.current = `[data-move="${direction}-${rows[index].id}"]`;
    onChange(next);
    setAnnouncement(`Moved to position ${target + 1} of ${rows.length}.`);
  }

  function remove(index: number) {
    const after = rows[index + 1] ?? rows[index - 1];
    pendingFocus.current = after ? `[data-remove="${after.id}"]` : "[data-add-link]";
    onChange(rows.filter((_, i) => i !== index));
    setAnnouncement("Link removed.");
  }

  const full = rows.length >= MAX_PROFILE_LINKS;

  return (
    <div ref={container}>
      {rows.length > 0 && (
        <ul className="mb-4 space-y-3">
          {rows.map((row, index) => {
            const parsed = row.url.trim() ? normalizeLinkInput(row.url) : null;
            const kind = linkKind(parsed && "url" in parsed ? parsed.url : null);
            const errorId = `link-error-${row.id}`;
            return (
              <li key={row.id} className="rounded-[12px] border border-line bg-white p-3">
                <div className="flex flex-wrap items-center gap-2.5 sm:flex-nowrap">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-muted text-ink">
                    <LinkIcon kind={kind} />
                  </span>
                  <input
                    id={`link-url-${row.id}`}
                    aria-label={`Link ${index + 1} address`}
                    aria-invalid={row.error ? true : undefined}
                    aria-describedby={row.error ? errorId : undefined}
                    className="field h-11 min-w-[calc(100%-56px)] flex-1 text-[15px] sm:min-w-0"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={row.url}
                    onChange={(e) => patch(row.id, { url: e.target.value, error: null })}
                    onBlur={() => {
                      if (!row.url.trim()) return;
                      const result = normalizeLinkInput(row.url);
                      patch(row.id, "error" in result ? { error: result.error } : { error: null });
                    }}
                    placeholder="github.com/you"
                  />
                  <input
                    aria-label={`Link ${index + 1} label, optional`}
                    className="field h-11 w-auto min-w-0 flex-1 text-[15px] sm:w-40 sm:flex-none"
                    maxLength={LINK_LABEL_MAX}
                    value={row.label}
                    onChange={(e) => patch(row.id, { label: e.target.value })}
                    placeholder={kind === "site" ? "Label (optional)" : linkKindName(kind)}
                  />
                  <div className="ml-auto flex shrink-0 items-center">
                    <IconButton
                      label={`Move link ${index + 1} up`}
                      disabled={index === 0}
                      data-move={`up-${row.id}`}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp size={16} aria-hidden />
                    </IconButton>
                    <IconButton
                      label={`Move link ${index + 1} down`}
                      disabled={index === rows.length - 1}
                      data-move={`down-${row.id}`}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={16} aria-hidden />
                    </IconButton>
                    <IconButton
                      label={`Remove link ${index + 1}`}
                      data-remove={row.id}
                      onClick={() => remove(index)}
                    >
                      <X size={16} aria-hidden />
                    </IconButton>
                  </div>
                </div>
                {row.error && (
                  <p id={errorId} role="alert" className="mt-2 text-[13.5px] font-medium text-cardinal">
                    {row.error}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        data-add-link
        disabled={full}
        onClick={() => {
          const row = newLinkRow();
          pendingFocus.current = `#link-url-${row.id}`;
          onChange([...rows, row]);
        }}
        className="btn btn-secondary h-10 px-4 text-[14px]"
      >
        <Plus size={15} aria-hidden />
        Add a link
      </button>
      <p className="mt-2 text-[13px] text-ink-muted">
        {full ? "That's the max: 5 links." : `Up to ${MAX_PROFILE_LINKS}. We pick the icon for you.`}
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

function IconButton({
  label,
  children,
  ...props
}: { label: string; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement> & {
    [key: `data-${string}`]: string | number;
  }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-11 w-10 items-center justify-center rounded-[4px] text-ink-soft transition-colors duration-150 hover:bg-muted hover:text-ink disabled:cursor-default disabled:text-line-strong disabled:hover:bg-transparent"
      {...props}
    >
      {children}
    </button>
  );
}

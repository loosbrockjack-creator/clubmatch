"use client";

import { Check } from "lucide-react";
import { INTEREST_GROUPS, MAX_INTERESTS } from "@/lib/profile-interests";

export function InterestPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const full = value.length >= MAX_INTERESTS;

  return (
    <div className="space-y-6">
      {INTEREST_GROUPS.map((group) => (
        <fieldset key={group.key}>
          <legend className="mb-2.5 text-[13.5px] font-semibold text-ink-soft">{group.legend}</legend>
          <div className="flex flex-wrap gap-2">
            {group.options.map((option) => {
              const on = value.includes(option.id);
              const blocked = full && !on;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={on}
                  aria-disabled={blocked || undefined}
                  onClick={() => {
                    if (blocked) return;
                    onChange(on ? value.filter((id) => id !== option.id) : [...value, option.id]);
                  }}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-[6px] border px-3 py-1.5 text-left text-[14px] font-medium transition-colors duration-150 ${
                    on
                      ? "border-cardinal bg-cardinal-tint text-cardinal-dark"
                      : blocked
                        ? "cursor-not-allowed border-line text-ink-muted opacity-60"
                        : "border-line-strong bg-white text-ink-soft hover:border-ink-muted hover:text-ink"
                  }`}
                >
                  {on && <Check size={14} strokeWidth={2.5} aria-hidden />}
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      <p aria-live="polite" className="text-[13px] tabular-nums text-ink-muted">
        {full
          ? `That's the max: ${MAX_INTERESTS} picked. Remove one to pick another.`
          : `${value.length} of ${MAX_INTERESTS} picked`}
      </p>
    </div>
  );
}

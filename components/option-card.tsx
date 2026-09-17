"use client";

import { Check } from "lucide-react";

export function OptionCard({
  type,
  name,
  value,
  checked,
  onChange,
  label,
  hint,
  compact = false,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  hint: string;
  compact?: boolean;
}) {
  return (
    <label className="block cursor-pointer">
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        className={`flex h-full items-start justify-between gap-3 rounded-[16px] border border-line bg-surface transition-all duration-200 ease-out peer-hover:border-line-strong peer-checked:border-cardinal peer-checked:bg-cardinal-tint peer-checked:shadow-[inset_0_0_0_1px_var(--color-cardinal)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cardinal ${
          compact ? "px-4 py-3.5" : "px-5 py-4"
        }`}
      >
        <span className="min-w-0">
          <span
            className={`block font-semibold leading-snug tracking-tight text-ink ${
              compact ? "text-[15px]" : "text-[16px]"
            }`}
          >
            {label}
          </span>
          <span
            className={`mt-1 block leading-snug text-ink-muted ${
              compact ? "text-[12px]" : "text-[13px]"
            }`}
          >
            {hint}
          </span>
        </span>

        <span
          aria-hidden
          className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center border transition-colors ${
            type === "radio" ? "rounded-full" : "rounded-[7px]"
          } ${
            checked
              ? "border-cardinal bg-cardinal text-white"
              : "border-line-strong bg-surface text-transparent"
          }`}
        >
          <Check size={13} strokeWidth={3} />
        </span>
      </span>
    </label>
  );
}

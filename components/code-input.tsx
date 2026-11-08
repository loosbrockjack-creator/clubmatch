"use client";

import { useRef } from "react";

/**
 * One box per digit. Typing advances, Backspace steps back, and pasting a
 * whole code (or an autofilled one-time code) fills every box at once.
 */
export function CodeInput({
  length,
  value,
  onChange,
  disabled = false,
  invalid = false,
}: {
  length: number;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function setFrom(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;
    const chars = value.padEnd(length, " ").split("");
    for (let i = 0; i < digits.length && index + i < length; i++) {
      chars[index + i] = digits[i];
    }
    const next = chars.join("").replace(/\s+$/, "");
    onChange(next.slice(0, length));
    const focusAt = Math.min(index + digits.length, length - 1);
    refs.current[focusAt]?.focus();
  }

  return (
    <div className="flex gap-2 sm:gap-2.5" role="group" aria-label="Sign-in code">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1}`}
          maxLength={length}
          disabled={disabled}
          value={value[index] && value[index] !== " " ? value[index] : ""}
          autoFocus={index === 0}
          onChange={(event) => setFrom(index, event.target.value)}
          onPaste={(event) => {
            event.preventDefault();
            setFrom(0, event.clipboardData.getData("text"));
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace") {
              event.preventDefault();
              const chars = value.split("");
              if (chars[index] && chars[index] !== " ") {
                chars[index] = " ";
                onChange(chars.join("").replace(/\s+$/, ""));
              } else if (index > 0) {
                chars[index - 1] = " ";
                onChange(chars.join("").replace(/\s+$/, ""));
                refs.current[index - 1]?.focus();
              }
            } else if (event.key === "ArrowLeft" && index > 0) {
              refs.current[index - 1]?.focus();
            } else if (event.key === "ArrowRight" && index < length - 1) {
              refs.current[index + 1]?.focus();
            }
          }}
          className={`h-14 w-11 rounded-[4px] border bg-surface text-center text-[22px] font-semibold tabular-nums text-ink transition-colors focus-visible:border-cardinal focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-cardinal disabled:bg-muted sm:h-16 sm:w-12 ${
            invalid ? "border-cardinal" : "border-line-strong"
          }`}
        />
      ))}
    </div>
  );
}

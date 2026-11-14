import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "on-cardinal" | "ghost-on-cardinal";

// Rest look, then the color that sweeps up from below with the label riding on it.
const VARIANTS: Record<Variant, { rest: string; fill: string; label: string }> = {
  primary: {
    rest: "border border-cardinal bg-cardinal text-white",
    fill: "bg-cardinal-deep",
    label: "text-white",
  },
  secondary: {
    rest: "border border-ink bg-surface text-ink",
    fill: "bg-ink",
    label: "text-white",
  },
  "on-cardinal": {
    rest: "border border-white bg-white text-cardinal",
    fill: "bg-gold",
    label: "text-ink",
  },
  "ghost-on-cardinal": {
    rest: "border border-white/55 bg-transparent text-white",
    fill: "bg-white",
    label: "text-cardinal",
  },
};

const EASE = "ease-[cubic-bezier(0.22,0.61,0.36,1)]";

/**
 * Discovery CTA with a roll-up hover: the label lifts out the top while a skewed
 * fill sweeps in from the bottom carrying a second copy of the label.
 * Keyboard focus plays the same motion.
 */
export function RollLink({
  href,
  variant = "secondary",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  const v = VARIANTS[variant];
  return (
    <Link
      href={href}
      className={`btn group relative isolate overflow-hidden ${v.rest} ${className}`}
    >
      <span
        className={`inline-flex items-center gap-[10px] transition-transform duration-500 ${EASE} group-hover:-translate-y-[150%] group-focus-visible:-translate-y-[150%]`}
      >
        {children}
      </span>
      <span
        aria-hidden
        className={`absolute inset-0 flex translate-y-full items-center justify-center transition-transform duration-500 ${EASE} group-hover:translate-y-0 group-focus-visible:translate-y-0`}
      >
        <span
          className={`absolute inset-0 translate-y-full scale-y-0 skew-y-12 transition-transform duration-500 ${EASE} group-hover:translate-y-0 group-hover:scale-150 group-focus-visible:translate-y-0 group-focus-visible:scale-150 ${v.fill}`}
        />
        <span className={`relative z-10 inline-flex items-center gap-[10px] ${v.label}`}>
          {children}
        </span>
      </span>
    </Link>
  );
}

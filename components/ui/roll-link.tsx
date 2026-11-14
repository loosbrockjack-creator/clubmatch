import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "secondary" | "on-cardinal";

// Rest look, then the fill that slides up from below with the label riding on it.
// Border matches the fill on hover so the whole box reads as one solid color.
const VARIANTS: Record<Variant, { rest: string; fill: string; label: string }> = {
  secondary: {
    rest: "border border-ink bg-surface text-ink",
    fill: "bg-ink",
    label: "text-white",
  },
  "on-cardinal": {
    rest: "border border-white bg-white text-cardinal hover:border-gold focus-visible:border-gold",
    fill: "bg-gold",
    label: "text-ink",
  },
};

// Both layers share one duration and curve so they travel in lockstep.
const MOTION = "transition-transform duration-[400ms] ease-[cubic-bezier(0.65,0,0.35,1)]";

/**
 * Roll-up hover for a few headline CTAs: the label slides out the top while a
 * solid fill slides in from the bottom carrying a second copy of the label.
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
      className={`btn group relative isolate overflow-hidden transition-colors duration-[400ms] ${v.rest} ${className}`}
    >
      {/* .btn is 48px tall, so moving the in-flow label 48px clears it exactly. */}
      <span
        className={`inline-flex items-center gap-[10px] ${MOTION} group-hover:-translate-y-12 group-focus-visible:-translate-y-12`}
      >
        {children}
      </span>
      <span
        aria-hidden
        className={`absolute inset-0 flex translate-y-full items-center justify-center ${MOTION} group-hover:translate-y-0 group-focus-visible:translate-y-0 ${v.fill} ${v.label}`}
      >
        <span className="inline-flex items-center gap-[10px]">{children}</span>
      </span>
    </Link>
  );
}

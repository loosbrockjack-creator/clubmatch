import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "on-cardinal";

// Rest look, then the fill that slides up from below with the label riding on it.
// Border matches the fill on hover so the whole box reads as one solid color.
const VARIANTS: Record<Variant, { rest: string; fill: string; label: string }> = {
  primary: {
    rest: "border border-cardinal bg-cardinal text-white hover:border-cardinal-deep focus-visible:border-cardinal-deep",
    fill: "bg-cardinal-deep",
    label: "text-white",
  },
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

// The in-flow label moves exactly one button height so it clears the top edge.
const SIZES = {
  md: { box: "", lift: "group-hover:-translate-y-12 group-focus-visible:-translate-y-12" },
  sm: {
    box: "h-10 px-5 text-[14px]",
    lift: "group-hover:-translate-y-10 group-focus-visible:-translate-y-10",
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
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  size?: keyof typeof SIZES;
  className?: string;
  children: ReactNode;
}) {
  const v = VARIANTS[variant];
  const z = SIZES[size];
  return (
    <Link
      href={href}
      className={`btn group relative isolate overflow-hidden transition-colors duration-[400ms] ${z.box} ${v.rest} ${className}`}
    >
      <span
        className={`inline-flex items-center gap-[10px] ${MOTION} ${z.lift}`}
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

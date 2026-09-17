const sizes = {
  sm: "h-11 w-11 rounded-[4px]",
  md: "h-[52px] w-[52px] rounded-[5px]",
  lg: "h-[68px] w-[68px] rounded-[6px]",
  xl: "h-[76px] w-[76px] rounded-[6px] sm:h-[96px] sm:w-[96px] sm:rounded-[8px]",
} as const;

function textSize(mark: string, size: keyof typeof sizes) {
  const long = mark.length >= 4;
  if (size === "xl") return long ? "text-lg sm:text-2xl" : "text-2xl sm:text-3xl";
  if (size === "lg") return long ? "text-sm" : "text-xl";
  if (size === "md") return long ? "text-[11px]" : "text-[15px]";
  return long ? "text-[10px]" : "text-[13px]";
}

/**
 * Letter mark standing in for a club logo. Set in the display serif with
 * cardinal ink on a tinted field, so it reads as an institutional monogram
 * rather than a generic avatar chip.
 */
export function ClubMark({
  mark,
  size = "md",
}: {
  mark: string;
  size?: keyof typeof sizes;
}) {
  return (
    <span
      aria-hidden
      className={`${sizes[size]} ${textSize(mark, size)} display flex shrink-0 items-center justify-center border border-cardinal/15 bg-cardinal-tint font-semibold tracking-tight text-cardinal`}
    >
      {mark}
    </span>
  );
}

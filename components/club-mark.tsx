const sizes = {
  sm: "h-12 w-12 rounded-[12px]",
  md: "h-14 w-14 rounded-[14px]",
  lg: "h-[72px] w-[72px] rounded-[16px]",
  xl: "h-20 w-20 rounded-[18px] sm:h-[104px] sm:w-[104px] sm:rounded-[22px]",
} as const;

function textSize(mark: string, size: keyof typeof sizes) {
  const long = mark.length >= 4;
  if (size === "xl") return long ? "text-lg sm:text-2xl" : "text-2xl sm:text-3xl";
  if (size === "lg") return long ? "text-sm" : "text-xl";
  if (size === "md") return long ? "text-xs" : "text-base";
  return long ? "text-[10px]" : "text-sm";
}

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
      className={`${sizes[size]} ${textSize(mark, size)} flex shrink-0 items-center justify-center border border-line bg-muted font-bold tracking-tight text-ink-soft`}
    >
      {mark}
    </span>
  );
}

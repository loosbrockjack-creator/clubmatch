/**
 * A labeled row of toggle chips. Shared by Explore and Greek life so both
 * filter bars look and behave the same.
 */
export function FilterRow<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { id: T; label: string }[];
  selected: T[];
  onToggle: (id: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-0">
      {/* Fixed label column, so chips that wrap line up under the first chip
          instead of falling back under the label. */}
      <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-muted sm:flex sm:h-[30px] sm:w-[112px] sm:shrink-0 sm:items-center">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option.id)}
              className={`chip transition-colors ${
                active
                  ? "border-cardinal bg-cardinal-tint text-cardinal"
                  : "hover:border-line-strong hover:bg-muted-deep"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-full text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-muted sm:w-[104px]">
        {label}
      </span>
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
  );
}

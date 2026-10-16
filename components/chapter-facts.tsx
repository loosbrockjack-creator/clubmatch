import type { Club, GreekDetail } from "@/lib/types";

const ALCOHOL_TEXT: Record<Exclude<GreekDetail["alcoholStatus"], "">, string> = {
  Prohibited: "Alcohol-free chapter house",
  Limited: "Limited alcohol in the chapter house",
  Permitted: "Alcohol permitted in the chapter house",
};

/**
 * The chapter's spec sheet, LinkedIn-style: label on the left, fact on the
 * right, a hairline between rows. Every value is the chapter's own SFE text;
 * a row only renders when SFE has something for it. Officer names appear only
 * in the member quote's own caption, as the chapter published it.
 */
export function ChapterFacts({
  club,
  chapter,
}: {
  club: Club;
  chapter: GreekDetail;
}) {
  const rows = [
    { label: "Motto", value: chapter.motto },
    { label: "Philanthropy", value: chapter.philanthropy },
    { label: "Address", value: chapter.address ? `${chapter.address}, Ames` : "" },
    { label: "Living", value: chapter.living },
    { label: "Parking", value: chapter.parking },
    {
      label: "Alcohol",
      value: chapter.alcoholStatus ? ALCOHOL_TEXT[chapter.alcoholStatus] : "",
    },
  ].filter((row) => row.value);

  if (rows.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="display gold-rule text-[26px] text-ink">Chapter facts</h2>
      <dl className="mt-6 max-w-3xl border-t border-line">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid gap-1 border-b border-line py-4 sm:grid-cols-[180px_1fr] sm:gap-6"
          >
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted sm:pt-[3px]">
              {row.label}
            </dt>
            <dd className="text-[15px] leading-relaxed text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[13px] text-ink-muted">
        {`As listed by ${club.name} on its Iowa State SFE page.`}
      </p>
    </section>
  );
}

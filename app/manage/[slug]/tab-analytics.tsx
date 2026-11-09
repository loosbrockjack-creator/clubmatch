"use client";

import { useState } from "react";
import { Lightbulb, Table2 } from "lucide-react";
import type { ActivityKind, ClubAnalytics } from "@/lib/club-types";
import { EmptyState, PanelError, PanelSkeleton, SectionTitle, usePanelData } from "./shared";

const RANGES = [7, 30, 90] as const;
const TREND_METRICS: { kind: ActivityKind; label: string }[] = [
  { kind: "impression", label: "Matches" },
  { kind: "view", label: "Page views" },
  { kind: "save", label: "Saves" },
  { kind: "interested", label: "Interested" },
];

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

export function AnalyticsTab({ slug }: { slug: string }) {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const { data, error, reload } = usePanelData<ClubAnalytics>(`/api/manage/${slug}/analytics?days=${days}`);

  if (error) return <PanelError message={error} onRetry={() => void reload()} />;
  if (!data) return <PanelSkeleton />;

  const empty = data.funnel.every((stage) => stage.students === 0);

  return (
    <div className="space-y-12">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="display text-[34px] leading-tight text-ink sm:text-[44px]" data-matched-headline>
            You showed up in {data.matchedStudents.toLocaleString()}{" "}
            {data.matchedStudents === 1 ? "student's" : "students'"} matches
          </p>
          <p className="mt-2 text-[14.5px] text-ink-soft">In the last {data.days} days.</p>
        </div>
        <div role="group" aria-label="Date range" className="flex shrink-0 gap-1.5">
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              aria-pressed={range === days}
              onClick={() => setDays(range)}
              className={`chip transition-colors ${
                range === days ? "border-cardinal bg-cardinal-tint text-cardinal" : "hover:border-line-strong hover:bg-muted-deep"
              }`}
            >
              {range} days
            </button>
          ))}
        </div>
      </section>

      {empty ? (
        <EmptyState title="No activity yet in this window">
          Numbers start when students see your club in their quiz results or open your page. We only show real
          activity, so this stays at zero until that happens.
        </EmptyState>
      ) : (
        <>
          <Funnel data={data} />
          <Trend data={data} />
          <Gaps data={data} />
        </>
      )}
    </div>
  );
}

function Funnel({ data }: { data: ClubAnalytics }) {
  const max = Math.max(1, ...data.funnel.map((stage) => stage.students));
  return (
    <section>
      <SectionTitle title="From match to member" intro="Distinct students at each step. We count students, never who they are." />
      <ol className="card space-y-4 px-5 py-6 sm:px-7" data-funnel>
        {data.funnel.map((stage) => (
          <li key={stage.kind} className="grid gap-1.5 sm:grid-cols-[250px_1fr_56px] sm:items-center sm:gap-4">
            <span className="text-[14px] text-ink-soft">{stage.label}</span>
            <span className="order-3 h-2.5 sm:order-none" aria-hidden>
              <span
                className="block h-full rounded-r-[4px] bg-cardinal transition-[width] duration-200"
                style={{ width: `${Math.max(stage.students > 0 ? 1 : 0, (stage.students / max) * 100)}%` }}
              />
            </span>
            <span className="text-[15px] font-bold tabular-nums text-ink sm:text-right">{stage.students.toLocaleString()}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Trend({ data }: { data: ClubAnalytics }) {
  const [metric, setMetric] = useState<ActivityKind>("impression");
  const [asTable, setAsTable] = useState(false);
  const label = TREND_METRICS.find((m) => m.kind === metric)?.label ?? "";
  const max = Math.max(1, ...data.weeks.map((week) => week.counts[metric]));
  const hasData = data.weeks.some((week) => week.counts[metric] > 0);

  return (
    <section>
      <SectionTitle title="Week by week" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Metric" className="flex flex-wrap gap-1.5">
          {TREND_METRICS.map(({ kind, label: name }) => (
            <button
              key={kind}
              type="button"
              aria-pressed={kind === metric}
              onClick={() => setMetric(kind)}
              className={`chip transition-colors ${
                kind === metric ? "border-cardinal bg-cardinal-tint text-cardinal" : "hover:border-line-strong hover:bg-muted-deep"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={asTable}
          onClick={() => setAsTable((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-soft hover:text-ink"
        >
          <Table2 size={14} strokeWidth={1.75} aria-hidden />
          {asTable ? "Show chart" : "Show table"}
        </button>
      </div>
      <div className="card px-5 py-6 sm:px-7">
        {asTable ? (
          <table className="w-full text-left text-[14px]">
            <caption className="sr-only">{label} by week</caption>
            <thead>
              <tr className="border-b border-line text-[12.5px] text-ink-muted">
                <th scope="col" className="py-2 font-semibold">Week of</th>
                <th scope="col" className="py-2 text-right font-semibold">{label}</th>
              </tr>
            </thead>
            <tbody>
              {data.weeks.map((week) => (
                <tr key={week.week} className="border-b border-line last:border-b-0">
                  <td className="py-2 text-ink-soft">{shortDate(week.week)}</td>
                  <td className="py-2 text-right font-semibold tabular-nums text-ink">{week.counts[metric]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : !hasData ? (
          <p className="py-10 text-center text-[14px] text-ink-muted">No {label.toLowerCase()} in this window.</p>
        ) : (
          <div role="img" aria-label={`${label} by week. Use Show table for the numbers.`}>
            <ul className="flex h-44 items-end gap-[2px] border-b border-line-strong sm:gap-1">
              {data.weeks.map((week) => {
                const value = week.counts[metric];
                return (
                  <li key={week.week} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
                    <span
                      className="block w-full max-w-[28px] rounded-t-[4px] bg-cardinal transition-opacity duration-150 group-hover:opacity-80"
                      style={{ height: `${value > 0 ? Math.max(2, (value / max) * 100) : 0}%` }}
                    />
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-[4px] bg-ink px-2.5 py-1.5 text-[12.5px] font-medium text-white shadow-sm group-hover:block">
                      {value} · week of {shortDate(week.week)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 flex justify-between text-[12.5px] text-ink-muted">
              <span>{shortDate(data.weeks[0].week)}</span>
              <span>{shortDate(data.weeks[data.weeks.length - 1].week)}</span>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function Gaps({ data }: { data: ClubAnalytics }) {
  const suggestions = data.gaps.filter((gap) => gap.suggestion);
  return (
    <section>
      <SectionTitle
        title="Who sees you, and who saves you"
        intro="By major, for students who've added one. A big gap means a major finds you but doesn't see why to join."
      />
      {data.gaps.length === 0 ? (
        <EmptyState title="Not enough students to break down yet">
          We show a major once at least 3 students from it have matched with you, so no one can be singled out.
        </EmptyState>
      ) : (
        <div className="card px-4 py-2 sm:px-7">
          <table className="w-full text-left text-[13.5px] sm:text-[14px]" data-gaps>
            <caption className="sr-only">Matches and saves by major</caption>
            <thead>
              <tr className="border-b border-line text-[12.5px] text-ink-muted">
                <th scope="col" className="py-3 font-semibold">Major</th>
                <th scope="col" className="py-3 pl-2 text-right font-semibold">Matches</th>
                <th scope="col" className="py-3 pl-2 text-right font-semibold">Saves</th>
                <th scope="col" className="py-3 pl-2 text-right font-semibold">Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.gaps.map((gap) => (
                <tr key={gap.group} className="border-b border-line last:border-b-0">
                  <th scope="row" className="py-3 font-medium text-ink">{gap.group}</th>
                  <td className="py-3 text-right tabular-nums text-ink-soft">{gap.matches}</td>
                  <td className="py-3 text-right tabular-nums text-ink-soft">{gap.saves}</td>
                  <td className="py-3 text-right font-semibold tabular-nums text-ink">{Math.round(gap.saveRate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.smallGroupStudents > 0 && (
        <p className="mt-3 text-[13px] text-ink-muted">
          {data.smallGroupStudents} more {data.smallGroupStudents === 1 ? "student is" : "students are"} in majors too
          small to show on their own.
        </p>
      )}
      {suggestions.length > 0 && (
        <ul className="mt-5 space-y-3" data-suggestions>
          {suggestions.map((gap) => (
            <li key={gap.group} className="flex gap-3 rounded-[14px] bg-gold-tint px-5 py-4">
              <Lightbulb size={17} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 text-gold-deep" />
              <p className="text-[14.5px] leading-relaxed text-ink">{gap.suggestion}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

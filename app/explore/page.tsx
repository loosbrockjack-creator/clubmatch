"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { ClubCard } from "@/components/club-card";
import { clubs } from "@/lib/clubs";
import { scoreClub } from "@/lib/matching";
import { useStoredPreferences } from "@/lib/preferences";
import {
  ACADEMIC_AREAS,
  CAREER_BY_ID,
  COMMITMENTS,
  COMMITMENT_SHORT,
  EXPERIENCES,
} from "@/lib/taxonomy";
import type { AcademicAreaId, CommitmentId, ExperienceId } from "@/lib/types";

type SortMode = "fit" | "az";

function FilterRow<T extends string>({
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

export default function ExplorePage() {
  const prefs = useStoredPreferences();
  const [query, setQuery] = useState("");
  const [areas, setAreas] = useState<AcademicAreaId[]>([]);
  const [commitments, setCommitments] = useState<CommitmentId[]>([]);
  const [experiences, setExperiences] = useState<ExperienceId[]>([]);
  const [sort, setSort] = useState<SortMode>("fit");

  const hasPrefs = prefs !== null && prefs !== false;
  const activeSort: SortMode = hasPrefs ? sort : "az";

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const matches = clubs.filter((club) => {
      if (areas.length > 0 && !club.academicAreas.some((a) => areas.includes(a))) {
        return false;
      }
      if (commitments.length > 0 && !commitments.includes(club.commitmentLevel)) {
        return false;
      }
      if (
        experiences.length > 0 &&
        !club.experienceTypes.some((e) => experiences.includes(e))
      ) {
        return false;
      }
      if (!needle) return true;

      const haystack = [
        club.name,
        club.mark,
        club.tagline,
        club.summary,
        club.college,
        ...club.categories,
        ...club.majors,
        ...club.careerPaths.map((id) => CAREER_BY_ID[id].label),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });

    if (activeSort === "fit" && hasPrefs) {
      return matches
        .map((club) => ({ club, score: scoreClub(prefs, club).score }))
        .sort((a, b) => b.score - a.score || a.club.name.localeCompare(b.club.name))
        .map((entry) => entry.club);
    }

    return matches.sort((a, b) => a.name.localeCompare(b.name));
  }, [query, areas, commitments, experiences, activeSort, hasPrefs, prefs]);

  const filterCount = areas.length + commitments.length + experiences.length;

  function clearAll() {
    setQuery("");
    setAreas([]);
    setCommitments([]);
    setExperiences([]);
  }

  function toggler<T extends string>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
  ) {
    return (id: T) =>
      setter((current) =>
        current.includes(id)
          ? current.filter((value) => value !== id)
          : [...current, id],
      );
  }

  return (
    <div className="shell pb-8 pt-12 sm:pt-16">
      <h1 className="text-[32px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[40px]">
        Explore clubs
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-muted sm:text-[16px]">
        Every academic and professional organization in ClubMatch. Search by
        name, major, or career area.
      </p>

      <div className="relative mt-8">
        <Search
          size={18}
          strokeWidth={1.75}
          aria-hidden
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <label htmlFor="club-search" className="sr-only">
          Search clubs
        </label>
        <input
          id="club-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search clubs, majors, or career areas..."
          className="h-14 w-full rounded-[16px] border border-line bg-surface pl-[52px] pr-5 text-[15px] text-ink placeholder:text-ink-muted focus:border-line-strong focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cardinal sm:h-[58px]"
        />
      </div>

      <div className="mt-6 space-y-3">
        <FilterRow
          label="Area"
          options={ACADEMIC_AREAS}
          selected={areas}
          onToggle={toggler(setAreas)}
        />
        <FilterRow
          label="Time"
          options={COMMITMENTS.map((c) => ({
            id: c.id,
            label: COMMITMENT_SHORT[c.id],
          }))}
          selected={commitments}
          onToggle={toggler(setCommitments)}
        />
        <FilterRow
          label="Experience"
          options={EXPERIENCES}
          selected={experiences}
          onToggle={toggler(setExperiences)}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <div className="flex items-center gap-3">
          <p className="text-[14px] font-medium text-ink">
            {filtered.length} {filtered.length === 1 ? "club" : "clubs"}
          </p>
          {(filterCount > 0 || query) && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-muted hover:text-ink"
            >
              <X size={13} strokeWidth={2} aria-hidden />
              Clear
            </button>
          )}
        </div>

        {hasPrefs && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="sort"
              className="text-[13px] font-medium text-ink-muted"
            >
              Sort
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              className="h-9 rounded-lg border border-line bg-surface px-2.5 text-[13px] font-medium text-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cardinal"
            >
              <option value="fit">Best fit for you</option>
              <option value="az">A to Z</option>
            </select>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card mt-6 px-6 py-20 text-center">
          <h2 className="text-[20px] font-bold tracking-tight text-ink">
            No clubs match that.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-ink-muted">
            Try a broader search term or remove one of the filters.
          </p>
          <button type="button" onClick={clearAll} className="btn btn-secondary mt-7">
            Clear search and filters
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Search, X } from "lucide-react";
import { ClubCard } from "./club-card";
import { FilterRow } from "./filter-row";
import { clubs } from "@/lib/clubs";
import { COUNCILS, SFE_INTEREST_FORM } from "@/lib/taxonomy";
import type { ClubSummary, CouncilId, GreekKind } from "@/lib/types";

type KindFilter = GreekKind | "all";
type HousingFilter = "housed" | "unhoused";

const CHAPTERS = clubs
  .filter((club): club is ClubSummary & { greek: NonNullable<ClubSummary["greek"]> } =>
    Boolean(club.greek),
  )
  .sort((a, b) => a.name.localeCompare(b.name));

const COUNCIL_COUNTS = COUNCILS.map((council) => ({
  ...council,
  count: CHAPTERS.filter((c) => c.greek.council === council.id).length,
}));

/** SFE's affiliation tags, most common first. */
const AFFILIATIONS = Array.from(
  CHAPTERS.reduce((counts, club) => {
    for (const tag of club.greek.affiliations) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return counts;
  }, new Map<string, number>()),
)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([id]) => ({ id, label: id }));

const HOUSING_OPTIONS: { id: HousingFilter; label: string }[] = [
  { id: "housed", label: "Chapter house" },
  { id: "unhoused", label: "No chapter house" },
];

const KIND_OPTIONS: { id: GreekKind; label: string }[] = [
  { id: "fraternity", label: "Fraternities" },
  { id: "sorority", label: "Sororities" },
];

const COUNCIL_IDS = new Set<string>(COUNCILS.map((c) => c.id));

function parseKind(value: string | null): KindFilter {
  return value === "fraternity" || value === "sorority" ? value : "all";
}

function parseCouncils(value: string | null): CouncilId[] {
  return (value ?? "")
    .split(",")
    .filter((id): id is CouncilId => COUNCIL_IDS.has(id));
}

export function GreekBrowser() {
  const searchParams = useSearchParams();
  const [kind, setKind] = useState<KindFilter>(() => parseKind(searchParams.get("kind")));
  const [councils, setCouncils] = useState<CouncilId[]>(() =>
    parseCouncils(searchParams.get("council")),
  );
  const [affiliations, setAffiliations] = useState<string[]>([]);
  const [housing, setHousing] = useState<HousingFilter[]>([]);
  const [query, setQuery] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  /** Keep kind and council in the URL so a filtered view can be shared. */
  function syncUrl(nextKind: KindFilter, nextCouncils: CouncilId[]) {
    const params = new URLSearchParams();
    if (nextKind !== "all") params.set("kind", nextKind);
    if (nextCouncils.length > 0) params.set("council", nextCouncils.join(","));
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/greek?${qs}` : "/greek");
  }

  function chooseKind(next: KindFilter) {
    setKind(next);
    syncUrl(next, councils);
  }

  function toggleCouncil(id: CouncilId) {
    const next = councils.includes(id)
      ? councils.filter((c) => c !== id)
      : [...councils, id];
    setCouncils(next);
    syncUrl(kind, next);
  }

  /** Council tiles narrow to just that council, then bring the grid into view. */
  function focusCouncil(id: CouncilId) {
    const next: CouncilId[] = councils.length === 1 && councils[0] === id ? [] : [id];
    setCouncils(next);
    syncUrl(kind, next);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleIn<T>(setter: React.Dispatch<React.SetStateAction<T[]>>) {
    return (id: T) =>
      setter((current) =>
        current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
      );
  }

  function clearAll() {
    setKind("all");
    setCouncils([]);
    setAffiliations([]);
    setHousing([]);
    setQuery("");
    syncUrl("all", []);
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return CHAPTERS.filter((club) => {
      const g = club.greek;
      if (kind !== "all" && g.kind !== kind) return false;
      if (councils.length > 0 && (!g.council || !councils.includes(g.council))) return false;
      if (affiliations.length > 0 && !g.affiliations.some((a) => affiliations.includes(a))) {
        return false;
      }
      if (housing.length === 1 && g.housed !== (housing[0] === "housed")) return false;
      if (!needle) return true;
      return [club.name, club.mark, g.letters, g.nickname, club.tagline, ...g.affiliations]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [kind, councils, affiliations, housing, query]);

  const filterCount =
    (kind !== "all" ? 1 : 0) + councils.length + affiliations.length + housing.length;

  return (
    <>
      {/* ---- Councils -------------------------------------------------- */}
      <section className="shell py-16 sm:py-24">
        <div className="max-w-2xl">
          <h2 className="display gold-rule text-[30px] text-ink sm:text-[38px]">
            Four councils, four ways to join
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
            Almost every chapter belongs to one of four councils, and each
            council recruits on its own schedule. Pick one to see its chapters.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COUNCIL_COUNTS.map((council) => {
            const active = councils.length === 1 && councils[0] === council.id;
            return (
              <button
                key={council.id}
                type="button"
                aria-pressed={active}
                onClick={() => focusCouncil(council.id)}
                className={`card card-interactive group flex flex-col p-6 text-left ${
                  active ? "border-cardinal shadow-sm" : ""
                }`}
              >
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-cardinal">
                  {council.count} chapters
                </span>
                <span className="display mt-3 text-[21px] leading-snug text-ink">
                  {council.name}
                </span>
                <span className="mt-3 text-[14px] leading-relaxed text-ink-soft">
                  {council.line}
                </span>
                <span className="mt-auto pt-5 text-[13px] font-semibold text-ink transition-colors group-hover:text-cardinal">
                  {active ? "Showing these chapters" : "See chapters"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ---- Chapters -------------------------------------------------- */}
      <section className="border-t border-line bg-muted">
        <div ref={gridRef} className="shell scroll-mt-20 py-16 sm:py-20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="display gold-rule text-[30px] text-ink sm:text-[38px]">
              Every chapter
            </h2>
            <div className="relative w-full lg:max-w-md">
              <Search
                size={18}
                strokeWidth={1.75}
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <label htmlFor="chapter-search" className="sr-only">
                Search chapters
              </label>
              <input
                id="chapter-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, letters, or nickname"
                className="h-12 w-full rounded-[4px] border border-line-strong bg-white pl-11 pr-4 text-[15px] text-ink shadow-sm placeholder:text-ink-muted focus:border-cardinal focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cardinal"
              />
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {/* Single-select: picking the active type again clears it. */}
            <FilterRow
              label="Type"
              options={KIND_OPTIONS}
              selected={kind === "all" ? [] : [kind]}
              onToggle={(id) => chooseKind(kind === id ? "all" : id)}
            />
            <FilterRow
              label="Council"
              options={COUNCILS.map((c) => ({ id: c.id, label: c.name }))}
              selected={councils}
              onToggle={toggleCouncil}
            />
            <FilterRow
              label="Affiliation"
              options={AFFILIATIONS}
              selected={affiliations}
              onToggle={toggleIn(setAffiliations)}
            />
            <FilterRow
              label="Housing"
              options={HOUSING_OPTIONS}
              selected={housing}
              onToggle={toggleIn(setHousing)}
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line-strong/60 pt-5">
            <div className="flex items-center gap-3">
              <p className="text-[14px] font-semibold text-ink" aria-live="polite">
                {filtered.length} {filtered.length === 1 ? "chapter" : "chapters"}
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
            <a
              href={SFE_INTEREST_FORM}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft transition-colors hover:text-cardinal"
            >
              Interested? Tell the SFE office
              <ArrowUpRight size={13} strokeWidth={2} aria-hidden />
            </a>
          </div>

          {filtered.length === 0 ? (
            <div className="card mt-6 px-6 py-20 text-center">
              <h3 className="display text-[24px] text-ink">No chapters match that.</h3>
              <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-ink-soft">
                Try removing a filter. Some combinations, like a council and an
                affiliation none of its chapters list, have no overlap.
              </p>
              <button type="button" onClick={clearAll} className="btn btn-secondary mt-7">
                Clear search and filters
              </button>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((club) => (
                <ClubCard key={club.id} club={club} />
              ))}
            </div>
          )}

          <p className="mt-12 max-w-2xl text-[13px] leading-relaxed text-ink-muted">
            Chapter list, photos, and details come from Iowa State&apos;s Office
            of Sorority and Fraternity Engagement. Chapters without a photo on
            their SFE page show a stock photo instead.
          </p>
        </div>
      </section>
    </>
  );
}

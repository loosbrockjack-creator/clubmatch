"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClubCard } from "@/components/club-card";
import { EventExploreTile } from "@/components/event-cards";
import { fetchUpcomingEvents } from "@/lib/club-client";
import { getClubSummary } from "@/lib/clubs";
import { rotateFeatured } from "@/lib/club-featured";
import { photoForClub } from "@/lib/photos";
import type { ClubEvent } from "@/lib/club-types";
import { getSupabase } from "@/lib/supabase";

type FeaturedRow = { club_slug: string; tagline: string | null };

/**
 * Explore's two paid-club rows. Each stays out of the way when there's nothing
 * to show, so an empty campus doesn't get empty boxes. Featured is a labeled
 * slot only: it never touches match scores or the ranking of the grid below.
 */
export function ExploreHighlights() {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [featured, setFeatured] = useState<FeaturedRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchUpcomingEvents({ withinDays: 7, limit: 12 })
      .then((rows) => {
        if (!cancelled) setEvents(rows);
      })
      .catch(() => {
        // The grid is the page. A failed extra just doesn't show.
      });
    void getSupabase()
      ?.rpc("featured_clubs")
      .then(({ data }) => {
        if (!cancelled && data) setFeatured(rotateFeatured(data as FeaturedRow[], Date.now()));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const eventRows = events.filter((event) => getClubSummary(event.club_slug));
  const featuredClubs = featured.flatMap((row) => {
    const club = getClubSummary(row.club_slug);
    return club ? [{ ...club, tagline: row.tagline || club.tagline }] : [];
  });

  return (
    <>
      {eventRows.length > 0 && (
        <section className="mt-10" aria-labelledby="this-week-heading" data-this-week>
          <h2 id="this-week-heading" className="display gold-rule text-[24px] text-ink">
            This week on campus
          </h2>
          {/* pt and pb give the hover lift and its shadow room inside the scroller, which clips. */}
          <ul className="-mx-5 -mb-4 mt-4 flex gap-3 overflow-x-auto px-5 pb-6 pt-1 sm:mx-0 sm:px-0">
            {eventRows.map((event) => {
              const club = getClubSummary(event.club_slug)!;
              // The event's own photo, else the club's cover, so the row reads evenly.
              const cover = photoForClub(club);
              return (
                <li key={event.id} className="w-[270px] shrink-0">
                  <Link
                    href={`/clubs/${event.club_slug}`}
                    className="card card-interactive group flex h-full flex-col overflow-hidden p-0"
                  >
                    <EventExploreTile event={event} clubName={club.name} cover={cover} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {featuredClubs.length > 0 && (
        <section className="mt-10" aria-labelledby="featured-heading" data-featured>
          <h2 id="featured-heading" className="display gold-rule text-[24px] text-ink">
            Featured
          </h2>
          <p className="mb-5 mt-2 text-[13.5px] text-ink-muted">
            Clubs that run their own ClubMatch page, taking turns. It never changes your match scores.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredClubs.map((club) => (
              <div key={club.id} className="relative">
                <ClubCard club={club} />
                <span className="chip chip-gold pointer-events-none absolute left-3 top-3 z-10">
                  Featured
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

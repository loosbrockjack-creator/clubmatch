"use client";

import { useEffect, useState } from "react";
import { EventPageCard } from "@/components/event-cards";
import { fetchUpcomingEvents } from "@/lib/club-client";
import type { ClubEvent } from "@/lib/club-types";

/**
 * Fetched in the browser rather than built into the page: a static page would
 * keep showing an event after it ended, and past events have to drop off.
 */
export function ClubEvents({ slug, clubName }: { slug: string; clubName: string }) {
  const [events, setEvents] = useState<ClubEvent[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchUpcomingEvents({ slug })
      .then((rows) => {
        if (!cancelled) setEvents(rows);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <section className="mt-14" aria-labelledby="club-events-heading">
      <h2 id="club-events-heading" className="display gold-rule text-[26px] text-ink">
        Upcoming events
      </h2>
      {failed ? (
        <p className="mt-4 text-[15px] text-ink-soft">Couldn&apos;t load events. Refresh to try again.</p>
      ) : events === null ? (
        <div className="skeleton mt-5 h-24 rounded-[14px]" />
      ) : events.length === 0 ? (
        <p className="mt-4 text-[15px] text-ink-soft">{clubName} doesn&apos;t have anything on the calendar right now.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {events.map((event) => (
            <li key={event.id} className="card overflow-hidden p-0">
              <EventPageCard event={event} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

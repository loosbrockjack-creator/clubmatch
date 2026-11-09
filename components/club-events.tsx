"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { fetchUpcomingEvents, formatEventTime } from "@/lib/club-client";
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
        <p className="text-[15px] text-ink-soft">Couldn&apos;t load events. Refresh to try again.</p>
      ) : events === null ? (
        <div className="skeleton h-24 rounded-[14px]" />
      ) : events.length === 0 ? (
        <p className="text-[15px] text-ink-soft">{clubName} doesn&apos;t have anything on the calendar right now.</p>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li key={event.id} className="card px-5 py-5 sm:px-6">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-cardinal">
                <CalendarDays size={14} strokeWidth={2} aria-hidden />
                {formatEventTime(event)}
              </p>
              <h3 className="mt-2 text-[17px] font-bold leading-snug tracking-[-0.01em] text-ink">
                {event.title}
              </h3>
              {event.location && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[14px] text-ink-muted">
                  <MapPin size={14} strokeWidth={1.75} aria-hidden />
                  {event.location}
                </p>
              )}
              {event.description && (
                <p className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-soft">
                  {event.description}
                </p>
              )}
              {event.link && (
                <a
                  href={event.link}
                  target="_blank"
                  rel="noreferrer noopener nofollow"
                  className="link-isu mt-3 inline-flex items-center gap-1 text-[14px]"
                >
                  Event details
                  <ArrowUpRight size={13} strokeWidth={2} aria-hidden />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

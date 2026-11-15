import Image from "next/image";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { formatEventTime } from "@/lib/club-client";
import type { ClubEvent } from "@/lib/club-types";

type CardEvent = Pick<ClubEvent, "title" | "description" | "location" | "link" | "photo" | "starts_at" | "ends_at">;

/**
 * The event as it reads on a club's page. Shared with the admin preview so the
 * preview is never a lookalike. `time` overrides the formatted date when the
 * preview has no start time yet.
 */
export function EventPageCard({ event, time }: { event: CardEvent; time?: string }) {
  return (
    <>
      {event.photo && (
        <div className="relative aspect-[16/9] bg-muted sm:aspect-[21/9]">
          <Image
            src={event.photo}
            alt={`Photo for ${event.title}`}
            fill
            unoptimized
            sizes="(min-width: 768px) 720px, 92vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="px-5 py-5 sm:px-6">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-cardinal">
          <CalendarDays size={14} strokeWidth={2} aria-hidden />
          {time ?? formatEventTime(event)}
        </p>
        <h3 className="mt-2 text-[17px] font-bold leading-snug tracking-[-0.01em] text-ink">{event.title}</h3>
        {event.location && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[14px] text-ink-muted">
            <MapPin size={14} strokeWidth={1.75} aria-hidden />
            {event.location}
          </p>
        )}
        {event.description && (
          <p className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-soft">{event.description}</p>
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
      </div>
    </>
  );
}

/**
 * The inside of an Explore "This week" tile: photo (or the club's cover), then
 * time, title, club, place. The caller supplies the wrapping link or box.
 */
export function EventExploreTile({
  event,
  clubName,
  cover,
  time,
}: {
  event: CardEvent;
  clubName: string;
  cover: { src: string; quality?: number };
  time?: string;
}) {
  return (
    <>
      <span className="relative block aspect-[16/9] overflow-hidden bg-muted">
        {event.photo ? (
          <Image
            src={event.photo}
            alt=""
            fill
            unoptimized
            sizes="270px"
            className="object-cover transition-transform duration-400 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <Image
            src={cover.src}
            alt=""
            quality={cover.quality}
            fill
            sizes="270px"
            className="object-cover transition-transform duration-400 ease-out group-hover:scale-[1.03]"
          />
        )}
      </span>
      <span className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-cardinal">
          <CalendarDays size={13} strokeWidth={2} aria-hidden />
          {time ?? formatEventTime(event)}
        </span>
        <span className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug text-ink">{event.title}</span>
        <span className="mt-1 line-clamp-1 text-[13px] text-ink-soft">{clubName}</span>
        {event.location && (
          <span className="mt-1 flex items-center gap-1 text-[12.5px] text-ink-muted">
            <MapPin size={12} strokeWidth={1.75} aria-hidden className="shrink-0" />
            <span className="line-clamp-1">{event.location}</span>
          </span>
        )}
      </span>
    </>
  );
}

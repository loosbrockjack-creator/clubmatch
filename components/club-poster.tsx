"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { ClubMark } from "./club-mark";
import { photoForClub } from "@/lib/photos";
import type { ClubSummary } from "@/lib/types";

export type ClubRole = "member" | "officer";

/**
 * One club in a student's "My clubs" row. The cover does the talking, so clubs
 * read as a shelf rather than a list. A club with no art of its own gets a quiet
 * card with its mark rather than a stock photo that isn't really theirs.
 */
export function ClubPoster({
  club,
  role,
  verified,
}: {
  club: ClubSummary;
  role: ClubRole;
  verified: boolean;
}) {
  const photo = photoForClub({ ...club, name: club.name });
  const [failed, setFailed] = useState(false);
  const showPhoto = photo.own && !failed;

  return (
    <li>
      <Link href={`/clubs/${club.slug}`} className="group block rounded-[12px]">
        <span className="relative block aspect-[4/3] overflow-hidden rounded-[12px] border border-line bg-muted">
          {showPhoto ? (
            <Image
              src={photo.src}
              alt=""
              quality={photo.quality}
              fill
              sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 46vw"
              onError={() => setFailed(true)}
              className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <span data-cover-fallback className="flex h-full w-full items-center justify-center">
              <ClubMark mark={club.mark} size="lg" />
            </span>
          )}
        </span>
        <span className="mt-2.5 line-clamp-2 block text-[14.5px] font-semibold leading-snug text-ink transition-colors duration-150 group-hover:text-cardinal">
          {club.name}
        </span>
      </Link>
      <p className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-medium text-ink-muted">
        <span className={role === "officer" ? "font-semibold text-cardinal-dark" : undefined}>
          {role === "officer" ? "Officer" : "Member"}
        </span>
        {verified && (
          <span title="Verified by the club's officers" className="inline-flex text-cardinal">
            <BadgeCheck size={15} strokeWidth={2} aria-hidden />
            <span className="sr-only">, verified by the club&apos;s officers</span>
          </span>
        )}
      </p>
    </li>
  );
}

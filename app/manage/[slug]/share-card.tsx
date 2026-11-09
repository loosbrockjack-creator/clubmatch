"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Copy } from "lucide-react";
import { clubUrl, shareDescription, shareTitle } from "@/lib/club-seo";
import { getClubSummary } from "@/lib/clubs";
import type { ClubOverlay } from "@/lib/club-types";
import { photoForClub } from "@/lib/photos";
import { SectionTitle } from "./shared";

/** The club's link, and what it looks like when posted in a group chat or on social. */
export function ShareCard({
  slug,
  clubName,
  overlay,
  directoryTagline,
}: {
  slug: string;
  clubName: string;
  overlay: ClubOverlay | null;
  directoryTagline: string;
}) {
  const [copied, setCopied] = useState<"yes" | "no" | null>(null);
  const url = clubUrl(slug);
  const summary = getClubSummary(slug);
  const stock = summary ? photoForClub(summary) : null;
  const image = overlay?.photos[0] ?? stock?.src ?? null;
  const description = shareDescription(overlay?.tagline, overlay?.description, directoryTagline);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied("yes");
    } catch {
      setCopied("no");
    }
  }

  return (
    <section data-share-card>
      <SectionTitle
        title="Share your page"
        intro="Your page is public, with its own search listing. Post this link anywhere: anyone can open it without signing in."
      />
      <div className="card px-5 py-6 sm:px-7">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="share-url" className="sr-only">
            Your club page link
          </label>
          <input
            id="share-url"
            readOnly
            value={url}
            onFocus={(event) => event.target.select()}
            className="field min-w-0 text-[14.5px] text-ink-soft sm:flex-1"
          />
          <button type="button" onClick={() => void copy()} className="btn btn-secondary shrink-0">
            {copied === "yes" ? (
              <Check size={16} strokeWidth={2.25} aria-hidden />
            ) : (
              <Copy size={16} strokeWidth={1.75} aria-hidden />
            )}
            {copied === "yes" ? "Copied" : "Copy link"}
          </button>
        </div>
        <p role="status" className="mt-2 min-h-5 text-[13px] text-ink-muted">
          {copied === "no" ? "Couldn't reach your clipboard. Select the link and copy it yourself." : ""}
        </p>

        <p className="mt-3 text-[13px] font-semibold text-ink-soft">How it looks when shared</p>
        <div className="mt-2 max-w-md overflow-hidden rounded-[12px] border border-line" data-share-preview>
          {image && (
            <div className="relative aspect-[1.91/1] bg-muted">
              <Image src={image} alt="" fill unoptimized sizes="448px" className="object-cover" />
            </div>
          )}
          <div className="border-t border-line bg-muted px-4 py-3">
            <p className="text-[12px] uppercase tracking-[0.04em] text-ink-muted">{new URL(url).hostname}</p>
            <p className="mt-0.5 text-[15px] font-semibold leading-snug text-ink">{shareTitle(clubName)}</p>
            <p className="mt-0.5 line-clamp-2 text-[13.5px] leading-snug text-ink-soft">{description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

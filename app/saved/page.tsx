"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ClubCard } from "@/components/club-card";
import { PageHeader } from "@/components/page-header";
import { clubBySlug } from "@/lib/clubs";
import { useSavedClubs } from "@/lib/preferences";

export default function SavedPage() {
  const { saved, ready } = useSavedClubs();
  const savedClubs = saved
    .map((slug) => clubBySlug.get(slug))
    .filter((club) => club !== undefined);

  return (
    <>
      <PageHeader
        title="Saved clubs"
        intro="Your shortlist, kept on this device. Nothing is sent anywhere."
      />

      <div className="shell pb-8 pt-10">
      {!ready ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton h-[228px] rounded-[14px]" />
          ))}
        </div>
      ) : savedClubs.length === 0 ? (
        <div className="card px-6 py-20 text-center">
          <h2 className="display text-[24px] text-ink">Nothing saved yet.</h2>
          <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-ink-soft">
            Tap the heart on any club to keep it here while you decide.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/match" className="btn btn-primary">
              Find my clubs
              <ArrowRight size={16} strokeWidth={2} aria-hidden />
            </Link>
            <Link href="/explore" className="btn btn-secondary">
              Browse all clubs
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="border-b border-line pb-4 text-[14px] font-semibold text-ink">
            {savedClubs.length} {savedClubs.length === 1 ? "club" : "clubs"}
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {savedClubs.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
        </>
      )}
      </div>
    </>
  );
}

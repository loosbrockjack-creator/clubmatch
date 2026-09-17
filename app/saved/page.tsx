"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ClubCard } from "@/components/club-card";
import { clubBySlug } from "@/lib/clubs";
import { useSavedClubs } from "@/lib/preferences";

export default function SavedPage() {
  const { saved, ready } = useSavedClubs();
  const savedClubs = saved
    .map((slug) => clubBySlug.get(slug))
    .filter((club) => club !== undefined);

  return (
    <div className="shell pb-8 pt-12 sm:pt-16">
      <h1 className="text-[32px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[40px]">
        Saved clubs
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-muted sm:text-[16px]">
        Your shortlist, kept on this device. Nothing is sent anywhere.
      </p>

      {!ready ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton h-[236px] rounded-[16px]" />
          ))}
        </div>
      ) : savedClubs.length === 0 ? (
        <div className="card mt-10 px-6 py-20 text-center">
          <h2 className="text-[20px] font-bold tracking-tight text-ink">
            Nothing saved yet.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-ink-muted">
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
          <p className="mt-8 text-[14px] font-medium text-ink">
            {savedClubs.length} {savedClubs.length === 1 ? "club" : "clubs"}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedClubs.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

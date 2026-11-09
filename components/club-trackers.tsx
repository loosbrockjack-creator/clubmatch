"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "@/lib/account";
import { logActivity } from "@/lib/club-client";
import { useSavedClubs } from "@/lib/preferences";

/** Counts one page view per session for the club's analytics. */
export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    logActivity("view", [slug]);
  }, [slug]);
  return null;
}

/** An outbound club link that counts as a click-through for the club's analytics. */
export function TrackedLink({
  slug,
  href,
  className,
  children,
}: {
  slug: string;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener nofollow"
      className={className}
      onClick={() => logActivity("lead", [slug])}
    >
      {children}
    </a>
  );
}

/**
 * Saves happen from many places (hearts on cards, the club page). This watches
 * the saved list and logs what's newly added. While the account is loading, the
 * list is being synced rather than changed by the student, so that's ignored.
 */
export function SaveTracker() {
  const { saved, ready } = useSavedClubs();
  const { status } = useAccount();
  const previous = useRef<string[] | null>(null);

  useEffect(() => {
    if (!ready) return;
    const before = previous.current;
    previous.current = saved;
    if (status === "loading" || before === null) return;
    const added = saved.filter((slug) => !before.includes(slug));
    if (added.length > 0) logActivity("save", added);
  }, [saved, ready, status]);

  return null;
}

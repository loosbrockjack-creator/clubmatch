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
 * Saves happen from many places (hearts on cards, the club page), so this watches
 * the saved list. The list also changes without a tap, when an account syncs on
 * sign-in, and that must not count. So a change only counts right after a click
 * on a toggle button, and only when it adds exactly one club. Signed-out saves
 * aren't logged at all, because nothing can verify them.
 */
const TAP_WINDOW_MS = 500;

export function SaveTracker() {
  const { saved, ready } = useSavedClubs();
  const { status } = useAccount();
  const previous = useRef<string[] | null>(null);
  const lastTap = useRef(0);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if ((event.target as Element | null)?.closest?.("button[aria-pressed]")) {
        lastTap.current = event.timeStamp;
      }
    }
    // Capture phase, because the save button stops its click from bubbling.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const before = previous.current;
    previous.current = saved;
    if (status !== "signed-in" || before === null) return;
    const tapped = performance.now() - lastTap.current < TAP_WINDOW_MS;
    const added = saved.filter((slug) => !before.includes(slug));
    if (tapped && added.length === 1) logActivity("save", added);
  }, [saved, ready, status]);

  return null;
}

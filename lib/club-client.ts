"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getSupabase } from "./supabase";
import { useAccount } from "./account";
import { readLocalPreferences } from "./preferences";
import type { ActivityKind, ClubEvent } from "./club-types";

/** Calls one of our API routes with the signed-in student's token attached. */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T | null; error: string | null; status: number }> {
  const session = (await getSupabase()?.auth.getSession())?.data.session;
  const headers = new Headers(init.headers);
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  try {
    const res = await fetch(path, { ...init, headers });
    const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok) {
      return { data: null, error: body?.error ?? "Something went wrong. Try again.", status: res.status };
    }
    return { data: body, error: null, status: res.status };
  } catch {
    return { data: null, error: "Couldn't reach ClubMatch. Check your connection.", status: 0 };
  }
}

const VISITOR_KEY = "clubmatch:visitor";
const SENT_KEY = "clubmatch:activity-sent";

function visitorId(): string {
  try {
    let id = window.localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** Fire and forget. One session never sends the same event twice. Analytics must never break a page. */
export function logActivity(kind: ActivityKind, slugs: string[]) {
  let fresh = slugs;
  try {
    const sent = new Set<string>(JSON.parse(window.sessionStorage.getItem(SENT_KEY) ?? "[]") as string[]);
    fresh = slugs.filter((slug) => !sent.has(`${kind}:${slug}`));
    if (fresh.length === 0) return;
    for (const slug of fresh) sent.add(`${kind}:${slug}`);
    window.sessionStorage.setItem(SENT_KEY, JSON.stringify(Array.from(sent).slice(-500)));
  } catch {
    // Storage blocked: the database's daily uniqueness still dedupes.
  }
  // Signed-out visitors only have the quiz answer on this device. The server
  // ignores this and reads the account instead when a token is present.
  const area = readLocalPreferences()?.academicArea ?? null;
  void apiFetch("/api/activity", {
    method: "POST",
    body: JSON.stringify({ kind, slugs: fresh, visitor: visitorId(), area }),
    keepalive: true,
  });
}

/** The clubs this student is an officer of. */
export function useOfficerClubs(): string[] {
  const account = useAccount();
  const [clubs, setClubs] = useState<{ userId: string; slugs: string[] } | null>(null);
  const userId = account.userId;
  const memberKey = account.memberships.join("|");

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !userId) return;
    let cancelled = false;
    void sb
      .from("memberships")
      .select("club_slug")
      .eq("user_id", userId)
      .eq("role", "officer")
      .then(({ data }) => {
        if (!cancelled) setClubs({ userId, slugs: (data ?? []).map((r) => r.club_slug as string) });
      });
    return () => {
      cancelled = true;
    };
  }, [userId, memberKey]);

  return clubs && clubs.userId === userId ? clubs.slugs : [];
}

/* Unread inbox count: a small shared store, so header and inbox stay in step. */
let unread = 0;
const unreadListeners = new Set<() => void>();

function setUnread(next: number) {
  if (next === unread) return;
  unread = next;
  for (const listener of unreadListeners) listener();
}

export async function refreshUnread(userId: string | null) {
  const sb = getSupabase();
  if (!sb || !userId) {
    setUnread(0);
    return;
  }
  const { count, error } = await sb
    .from("campaign_recipients")
    .select("campaign_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (!error) setUnread(count ?? 0);
}

export function useUnreadCount(): number {
  return useSyncExternalStore(
    (listener) => {
      unreadListeners.add(listener);
      return () => unreadListeners.delete(listener);
    },
    () => unread,
    () => 0,
  );
}

/** Upcoming public events. Past ones drop off as soon as they end. */
export async function fetchUpcomingEvents(options: { slug?: string; withinDays?: number; limit?: number }) {
  const sb = getSupabase();
  if (!sb) return [];
  const now = new Date();
  // An event with no end time counts as over 3 hours after it starts. Ended
  // events are filtered in the query, so they can't use up the limit.
  const openStart = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
  let query = sb
    .from("club_events")
    .select("id, club_slug, title, description, location, link, starts_at, ends_at")
    .or(`ends_at.gte."${now.toISOString()}",and(ends_at.is.null,starts_at.gte."${openStart}")`)
    .order("starts_at", { ascending: true })
    .limit(options.limit ?? 40);
  if (options.slug) query = query.eq("club_slug", options.slug);
  if (options.withinDays) {
    query = query.lte(
      "starts_at",
      new Date(now.getTime() + options.withinDays * 24 * 60 * 60 * 1000).toISOString(),
    );
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ClubEvent[];
}

export function formatEventTime(event: Pick<ClubEvent, "starts_at" | "ends_at">) {
  const start = new Date(event.starts_at);
  const day = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const time = (date: Date) => date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const end = event.ends_at ? new Date(event.ends_at) : null;
  if (!end) return `${day}, ${time(start)}`;
  const sameDay = end.toDateString() === start.toDateString();
  return sameDay
    ? `${day}, ${time(start)} to ${time(end)}`
    : `${day}, ${time(start)} to ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time(end)}`;
}

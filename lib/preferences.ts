"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Preferences } from "./types";

const PREFS_KEY = "clubmatch:preferences:v1";
const SAVED_KEY = "clubmatch:saved:v1";

export const emptyPreferences: Preferences = {
  academicArea: null,
  goals: [],
  careers: [],
  commitment: null,
  experiences: [],
  completedAt: "",
};

const EMPTY_SAVED: string[] = [];

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage is unavailable in some private-browsing modes. The in-memory
    // listeners still fire, so the current session keeps working.
  }
  emit();
}

function isPreferences(value: unknown): value is Preferences {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Preferences>;
  return (
    Array.isArray(candidate.goals) &&
    Array.isArray(candidate.careers) &&
    Array.isArray(candidate.experiences)
  );
}

/**
 * useSyncExternalStore compares snapshots by reference, so both snapshots are
 * memoized against the raw string and only reparsed when storage changes.
 */
let prefsRaw: string | null = null;
let prefsValue: Preferences | null = null;

function getPreferencesSnapshot(): Preferences | null {
  const raw = read(PREFS_KEY);
  if (raw !== prefsRaw) {
    prefsRaw = raw;
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      prefsValue = isPreferences(parsed) ? parsed : null;
    } catch {
      prefsValue = null;
    }
  }
  return prefsValue;
}

let savedRaw: string | null = null;
let savedValue: string[] = EMPTY_SAVED;

function getSavedSnapshot(): string[] {
  const raw = read(SAVED_KEY);
  if (raw !== savedRaw) {
    savedRaw = raw;
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      savedValue = Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : EMPTY_SAVED;
    } catch {
      savedValue = EMPTY_SAVED;
    }
  }
  return savedValue;
}

const subscribeNothing = () => () => {};

/** False during the prerender and hydration pass, true once on the client. */
function useIsHydrated() {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}

export function savePreferences(prefs: Preferences) {
  write(PREFS_KEY, JSON.stringify(prefs));
}

/** null while hydrating, false when nothing is stored, otherwise the answers. */
export function useStoredPreferences(): Preferences | null | false {
  const hydrated = useIsHydrated();
  const prefs = useSyncExternalStore(
    subscribe,
    getPreferencesSnapshot,
    () => null,
  );
  if (!hydrated) return null;
  return prefs ?? false;
}

export function useSavedClubs() {
  const hydrated = useIsHydrated();
  const saved = useSyncExternalStore(
    subscribe,
    getSavedSnapshot,
    () => EMPTY_SAVED,
  );

  const toggle = useCallback((slug: string) => {
    const current = getSavedSnapshot();
    const next = current.includes(slug)
      ? current.filter((value) => value !== slug)
      : [...current, slug];
    write(SAVED_KEY, JSON.stringify(next));
  }, []);

  return { saved, toggle, ready: hydrated };
}

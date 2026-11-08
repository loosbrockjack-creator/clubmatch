"use client";

import { useSyncExternalStore } from "react";
import {
  clearLocalAccountData,
  readLocalPreferences,
  readLocalSaved,
  registerRemote,
  replaceLocalPreferences,
  replaceLocalSaved,
} from "./preferences";
import { getSupabase } from "./supabase";
import type { Preferences } from "./types";

export const CLASS_YEARS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Graduate",
  "Alumni",
] as const;
export type ClassYear = (typeof CLASS_YEARS)[number];

export type ProfileLinks = {
  linkedin?: string;
  instagram?: string;
  website?: string;
};

export interface Profile {
  id: string;
  display_name: string | null;
  major: string | null;
  class_year: ClassYear | null;
  bio: string | null;
  links: ProfileLinks;
  avatar_url: string | null;
  avatar_preset: number | null;
  preferences: Preferences | null;
  visible: boolean;
  onboarded: boolean;
}

/** The fields other students can see. */
export type PublicProfile = Pick<
  Profile,
  "id" | "display_name" | "major" | "class_year" | "avatar_url" | "avatar_preset"
> &
  Partial<Pick<Profile, "bio" | "links">>;

export const PUBLIC_PROFILE_COLUMNS =
  "id, display_name, major, class_year, avatar_url, avatar_preset";

type AccountState = {
  status: "loading" | "signed-out" | "signed-in";
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  memberships: string[];
};

const SERVER_STATE: AccountState = {
  status: "loading",
  userId: null,
  email: null,
  profile: null,
  memberships: [],
};

let state: AccountState = SERVER_STATE;
const listeners = new Set<() => void>();

function set(patch: Partial<AccountState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

let started = false;

function start() {
  if (started) return;
  started = true;
  const sb = getSupabase();
  if (!sb) {
    set({ status: "signed-out" });
    return;
  }
  sb.auth.onAuthStateChange((_event, session) => {
    // Supabase warns against awaiting its own calls inside this callback.
    setTimeout(() => void handleSession(session?.user ?? null), 0);
  });
}

let loading: { userId: string; promise: Promise<void> } | null = null;

/** Loads an account once per sign-in; token refreshes reuse the same load. */
function ensureLoaded(user: { id: string; email?: string }) {
  if (loading?.userId === user.id) return loading.promise;
  set({ status: "loading", userId: user.id, email: user.email ?? null });
  const promise = loadAccount(user.id);
  loading = { userId: user.id, promise };
  return promise;
}

async function handleSession(user: { id: string; email?: string } | null) {
  if (!user) {
    loading = null;
    registerRemote(null);
    set({ ...SERVER_STATE, status: "signed-out" });
    return;
  }
  await ensureLoaded(user);
}

const mergedKey = (userId: string) => `clubmatch:merged:${userId}`;

function readFlag(key: string) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string, on: boolean) {
  try {
    if (on) window.localStorage.setItem(key, "1");
    else window.localStorage.removeItem(key);
  } catch {
    // Storage unavailable; the merge simply runs again next time.
  }
}

/**
 * Loads the account and reconciles it with this device. The first sign-in on
 * a device merges: anything saved while signed out is added to the account,
 * and quiz answers fill the account if it has none. After that the account is
 * the source of truth, so removing a save on one device sticks everywhere.
 */
async function loadAccount(userId: string) {
  const sb = getSupabase();
  if (!sb) return;

  const [profileRes, savedRes, memberRes] = await Promise.all([
    sb.from("profiles").select("*").eq("id", userId).single(),
    sb.from("saved_clubs").select("club_slug").eq("user_id", userId),
    sb.from("memberships").select("club_slug").eq("user_id", userId),
  ]);
  if (state.userId !== userId) return; // signed out meanwhile

  let profile = (profileRes.data as Profile | null) ?? null;
  const remoteSaved = (savedRes.data ?? []).map((row) => row.club_slug as string);
  const firstMerge = !readFlag(mergedKey(userId));

  let saved = remoteSaved;
  if (firstMerge) {
    const missing = readLocalSaved().filter((slug) => !remoteSaved.includes(slug));
    if (missing.length > 0) {
      await sb
        .from("saved_clubs")
        .upsert(
          missing.map((club_slug) => ({ user_id: userId, club_slug })),
          { ignoreDuplicates: true },
        );
      saved = [...remoteSaved, ...missing];
    }
    const localPrefs = readLocalPreferences();
    if (profile && !profile.preferences && localPrefs) {
      const { data } = await sb
        .from("profiles")
        .update({ preferences: localPrefs })
        .eq("id", userId)
        .select("*")
        .single();
      if (data) profile = data as Profile;
    }
    if (!savedRes.error) writeFlag(mergedKey(userId), true);
  }

  if (!savedRes.error) replaceLocalSaved(saved);
  if (profile?.preferences) replaceLocalPreferences(profile.preferences);

  registerRemote({
    save: (slug, isSaved) => {
      const query = isSaved
        ? sb.from("saved_clubs").upsert({ user_id: userId, club_slug: slug }, { ignoreDuplicates: true })
        : sb.from("saved_clubs").delete().eq("user_id", userId).eq("club_slug", slug);
      void query.then(({ error }) => {
        if (error) console.error("Couldn't sync saved club", error.message);
      });
    },
    preferences: (prefs) => {
      void sb
        .from("profiles")
        .update({ preferences: prefs })
        .eq("id", userId)
        .then(({ error }) => {
          if (error) console.error("Couldn't sync quiz answers", error.message);
        });
    },
  });

  set({
    status: "signed-in",
    profile,
    memberships: (memberRes.data ?? []).map((row) => row.club_slug as string),
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAccount(): AccountState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}

/* ---- Actions ---- */

export const ISU_DOMAIN = "@iastate.edu";

/** Accepts "netid" or "netid@iastate.edu"; null if it isn't an ISU address. */
export function normalizeIsuEmail(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (!value) return null;
  const email = value.includes("@") ? value : `${value}${ISU_DOMAIN}`;
  return /^[a-z0-9._%+-]+@iastate\.edu$/.test(email) ? email : null;
}

function friendlyAuthError(message: string, status?: number): string {
  if (status === 429 || /rate limit|too many/i.test(message)) {
    return "Too many codes requested. Wait a minute, then try again.";
  }
  if (/iastate|database error saving new user/i.test(message)) {
    return "ClubMatch is for Iowa State students. Use your @iastate.edu email.";
  }
  if (/expired/i.test(message)) {
    return "That code expired. Send a new one and try again.";
  }
  if (/invalid|token/i.test(message)) {
    return "That code didn't match. Check the email and try again.";
  }
  return "Something went wrong. Try again in a moment.";
}

export async function sendCode(email: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return "Accounts aren't available right now.";
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  return error ? friendlyAuthError(error.message, error.status) : null;
}

export async function verifyCode(email: string, token: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return "Accounts aren't available right now.";
  const { data, error } = await sb.auth.verifyOtp({ email, token, type: "email" });
  if (error) return friendlyAuthError(error.message, error.status);
  // Load the account before the caller navigates, so the next page has it.
  if (data.user) await ensureLoaded(data.user);
  return null;
}

export async function signOut() {
  const sb = getSupabase();
  const userId = state.userId;
  loading = null;
  registerRemote(null);
  clearLocalAccountData();
  if (userId) writeFlag(mergedKey(userId), false);
  set({ ...SERVER_STATE, status: "signed-out" });
  await sb?.auth.signOut();
}

export async function updateProfile(patch: Partial<Profile>): Promise<string | null> {
  const sb = getSupabase();
  const userId = state.userId;
  if (!sb || !userId) return "You're signed out. Sign in and try again.";
  const { data, error } = await sb
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("*")
    .single();
  if (error) return "Couldn't save your profile. Try again.";
  set({ profile: data as Profile });
  return null;
}

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadAvatar(file: File): Promise<string | null> {
  const sb = getSupabase();
  const userId = state.userId;
  if (!sb || !userId) return "You're signed out. Sign in and try again.";
  if (!AVATAR_TYPES.includes(file.type)) return "Use a JPG, PNG, or WebP image.";
  if (file.size > AVATAR_MAX_BYTES) return "That photo is over 2 MB. Try a smaller one.";

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await sb.storage.from("avatars").upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (error) return "Couldn't upload that photo. Try again.";

  const { data } = sb.storage.from("avatars").getPublicUrl(path);
  const saveError = await updateProfile({ avatar_url: data.publicUrl });
  if (saveError) return saveError;
  await removeAvatarFiles(userId, path);
  return null;
}

/** Removes every file in the student's avatar folder except `keep`. */
async function removeAvatarFiles(userId: string, keep?: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { data } = await sb.storage.from("avatars").list(userId);
  const stale = (data ?? [])
    .map((file) => `${userId}/${file.name}`)
    .filter((path) => path !== keep);
  if (stale.length > 0) await sb.storage.from("avatars").remove(stale);
}

export async function removeAvatar(): Promise<string | null> {
  const userId = state.userId;
  if (!userId) return "You're signed out.";
  const error = await updateProfile({ avatar_url: null });
  if (!error) await removeAvatarFiles(userId);
  return error;
}

export async function toggleMembership(slug: string): Promise<string | null> {
  const sb = getSupabase();
  const userId = state.userId;
  if (!sb || !userId) return "signed-out";
  const isMember = state.memberships.includes(slug);
  set({
    memberships: isMember
      ? state.memberships.filter((value) => value !== slug)
      : [...state.memberships, slug],
  });
  const { error } = isMember
    ? await sb.from("memberships").delete().eq("user_id", userId).eq("club_slug", slug)
    : await sb.from("memberships").insert({ user_id: userId, club_slug: slug });
  if (error) {
    set({
      memberships: isMember
        ? [...state.memberships, slug]
        : state.memberships.filter((value) => value !== slug),
    });
    return "Couldn't update that. Try again.";
  }
  return null;
}

export async function reportProfile(target: string, reason: string): Promise<string | null> {
  const sb = getSupabase();
  const userId = state.userId;
  if (!sb || !userId) return "You're signed out.";
  const { error } = await sb.from("reports").insert({ reporter: userId, target, reason });
  return error ? "Couldn't send the report. Try again." : null;
}

export async function deleteAccount(): Promise<string | null> {
  const sb = getSupabase();
  const userId = state.userId;
  if (!sb || !userId) return "You're signed out.";
  await removeAvatarFiles(userId);
  const { error } = await sb.rpc("delete_my_account");
  if (error) return "Couldn't delete your account. Try again, or email us.";
  await signOut();
  return null;
}

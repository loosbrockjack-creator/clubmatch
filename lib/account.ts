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

/** One profile link, in display order. Max 5 (enforced in the database). */
export type ProfileLink = { url: string; label?: string };
export const MAX_PROFILE_LINKS = 5;

export const LOOKING_FOR = ["club", "teammates", "study_group", "friends", "browsing"] as const;
export type LookingFor = (typeof LOOKING_FOR)[number];

/** `option` is the form choice; `status` is how it reads on the profile. */
export const LOOKING_FOR_COPY: Record<LookingFor, { option: string; status: string }> = {
  club: { option: "A club to join", status: "Looking for a club" },
  teammates: { option: "Teammates", status: "Looking for teammates" },
  study_group: { option: "A study group", status: "Looking for a study group" },
  friends: { option: "Friends", status: "Looking for friends" },
  browsing: { option: "Just browsing", status: "Just browsing" },
};

export interface Profile {
  id: string;
  display_name: string | null;
  major: string | null;
  class_year: ClassYear | null;
  bio: string | null;
  links: ProfileLink[];
  avatar_url: string | null;
  avatar_preset: number | null;
  /**
   * Public interest chips from the quiz taxonomy, namespaced because some ids
   * repeat across lists: "area:<AcademicAreaId>", "career:<CareerId>", "goal:<GoalId>".
   */
  interests: string[];
  /** True once the student has saved chips, so an empty list means "none", not "not yet". */
  interests_chosen?: boolean;
  looking_for: LookingFor | null;
  /** "Let clubs find me": officers can see this student in good-fit leads. */
  discoverable: boolean;
  policy_notice_seen: boolean;
  /** Quiz answers. Lives in the private `profile_private` table, merged in client-side. */
  preferences: Preferences | null;
  visible: boolean;
  onboarded: boolean;
}

/** The fields other students (and club officers) can see. */
export type PublicProfile = Pick<
  Profile,
  | "id"
  | "display_name"
  | "major"
  | "class_year"
  | "avatar_url"
  | "avatar_preset"
  | "interests"
  | "looking_for"
> &
  Partial<Pick<Profile, "bio" | "links">>;

export const PUBLIC_PROFILE_COLUMNS =
  "id, display_name, major, class_year, avatar_url, avatar_preset, interests, looking_for";

/** Columns that live on the `profiles` table (everything but `preferences`). */
type ProfileRow = Omit<Profile, "preferences">;

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

/**
 * Signing out "parks" the session instead of ending it: the app treats the
 * student as signed out, but Supabase keeps the session in this browser, so
 * the sign-in page can offer "Continue as <email>" with no new code. Ending it
 * for real (a different email, or deleting the account) goes through
 * forgetThisDevice. The parked id is checked against the live session, so a
 * stale entry never signs anyone in.
 */
const PARKED_KEY = "clubmatch:parked";
type Parked = { userId: string; email: string };

function readParked(): Parked | null {
  try {
    const raw = window.localStorage.getItem(PARKED_KEY);
    const value = raw ? (JSON.parse(raw) as Partial<Parked>) : null;
    return value?.userId && value.email ? { userId: value.userId, email: value.email } : null;
  } catch {
    return null;
  }
}

function writeParked(value: Parked | null) {
  try {
    if (value) window.localStorage.setItem(PARKED_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(PARKED_KEY);
  } catch {
    // Private mode: signing out then just ends the session, as before.
  }
  for (const listener of parkedListeners) listener();
}

const parkedListeners = new Set<() => void>();

/** For useSyncExternalStore: the parked email, or "" when there isn't one. */
export const parkedEmail = {
  subscribe(listener: () => void) {
    parkedListeners.add(listener);
    return () => parkedListeners.delete(listener);
  },
  get: () => readParked()?.email ?? "",
  getServer: () => "",
};

/** True while this browser holds a parked session, so API calls go out unsigned. */
export function isParked() {
  return typeof window !== "undefined" && readParked() !== null;
}

async function handleSession(user: { id: string; email?: string } | null) {
  if (user && readParked()?.userId === user.id) {
    loading = null;
    registerRemote(null);
    set({ ...SERVER_STATE, status: "signed-out" });
    return;
  }
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

  const [profileRes, privateRes, savedRes, memberRes] = await Promise.all([
    sb.from("profiles").select("*").eq("id", userId).single(),
    sb.from("profile_private").select("preferences").eq("user_id", userId).maybeSingle(),
    sb.from("saved_clubs").select("club_slug").eq("user_id", userId),
    sb.from("memberships").select("club_slug").eq("user_id", userId),
  ]);
  if (state.userId !== userId) return; // signed out meanwhile

  const row = (profileRes.data as ProfileRow | null) ?? null;
  let profile: Profile | null = row
    ? { ...row, preferences: (privateRes.data?.preferences as Preferences | null) ?? null }
    : null;
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
      const { error } = await sb
        .from("profile_private")
        .upsert({ user_id: userId, preferences: localPrefs });
      if (!error) profile = { ...profile, preferences: localPrefs };
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
      if (state.profile) set({ profile: { ...state.profile, preferences: prefs } });
      void sb
        .from("profile_private")
        .upsert({ user_id: userId, preferences: prefs })
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
  // A fresh code replaces whatever session was parked here.
  writeParked(null);
  // Load the account before the caller navigates, so the next page has it.
  if (data.user) await ensureLoaded(data.user);
  return null;
}

function clearSignedInState() {
  const userId = state.userId;
  loading = null;
  registerRemote(null);
  clearLocalAccountData();
  if (userId) writeFlag(mergedKey(userId), false);
  set({ ...SERVER_STATE, status: "signed-out" });
}

/** Signs out of the app but keeps the session parked for a one-tap return. */
export async function signOut() {
  const { userId, email } = state;
  if (userId && email) writeParked({ userId, email });
  clearSignedInState();
}

/** Ends the session for real, so the next sign-in on this browser needs a code. */
export async function forgetThisDevice() {
  writeParked(null);
  clearSignedInState();
  await getSupabase()?.auth.signOut();
}

/** Signs the parked student back in. Returns an error message, or null. */
export async function continueParked(): Promise<string | null> {
  const sb = getSupabase();
  const parked = readParked();
  if (!sb || !parked) return "Sign in with your email.";
  const { data } = await sb.auth.getSession();
  const user = data.session?.user;
  if (!user || user.id !== parked.userId) {
    await forgetThisDevice();
    return "That sign-in expired. Enter your email and we'll send a code.";
  }
  writeParked(null);
  await ensureLoaded(user);
  return null;
}

/** Updates `profiles` columns. Quiz answers sync separately (see registerRemote). */
export async function updateProfile(patch: Partial<ProfileRow>): Promise<string | null> {
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
  set({
    profile: { ...(data as ProfileRow), preferences: state.profile?.preferences ?? null },
  });
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
  await forgetThisDevice();
  return null;
}

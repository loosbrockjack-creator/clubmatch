"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Upload } from "lucide-react";
import { AVATAR_PRESETS, Avatar } from "@/components/avatar";
import { InterestPicker } from "@/components/interest-picker";
import {
  LinkEditor,
  newLinkRow,
  validateLinkRows,
  type LinkRow,
} from "@/components/profile-link-editor";
import { LetClubsFindMe } from "@/components/profile-settings";
import {
  CLASS_YEARS,
  LOOKING_FOR,
  LOOKING_FOR_COPY,
  removeAvatar,
  updateProfile,
  uploadAvatar,
  type ClassYear,
  type LookingFor,
  type Profile,
  type ProfileLink,
} from "@/lib/account";
import { effectiveInterests, interestsFromPreferences } from "@/lib/profile-interests";
import { safeLinkUrl } from "@/lib/profile-links";
import { ACADEMIC_AREAS, majorsForAreas } from "@/lib/taxonomy";

const BIO_MAX = 280;

const ALL_MAJORS = Array.from(
  new Set(majorsForAreas(ACADEMIC_AREAS.map((area) => area.id))),
).sort((a, b) => a.localeCompare(b));

function rowsFromProfile(profile: Profile): LinkRow[] {
  const stored: unknown = profile.links;
  if (!Array.isArray(stored)) return [];
  return (stored as ProfileLink[]).flatMap((link) => {
    const url = safeLinkUrl(link?.url);
    return url ? [newLinkRow(url, typeof link.label === "string" ? link.label : "")] : [];
  });
}

function SectionHeading({ title, hint }: { title: string; hint?: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="display text-[22px] text-ink">{title}</h2>
      {hint && <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{hint}</p>}
    </div>
  );
}

export function ProfileForm({
  profile,
  submitLabel,
  onSaved,
  markOnboarded = false,
}: {
  profile: Profile;
  submitLabel: string;
  onSaved?: () => void;
  markOnboarded?: boolean;
}) {
  const [name, setName] = useState(profile.display_name ?? "");
  const [major, setMajor] = useState(profile.major ?? "");
  const [year, setYear] = useState<ClassYear | "">(profile.class_year ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [rows, setRows] = useState<LinkRow[]>(() => rowsFromProfile(profile));
  const [interests, setInterests] = useState<string[]>(() => effectiveInterests(profile));
  const [interestsTouched, setInterestsTouched] = useState(false);
  const [lookingFor, setLookingFor] = useState<LookingFor | null>(profile.looking_for);
  const [preset, setPreset] = useState(profile.avatar_preset ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const quizInterests = interestsFromPreferences(profile.preferences);
  const prefilled =
    !profile.interests_chosen && profile.interests.length === 0 && quizInterests.length > 0;

  function pickInterests(next: string[]) {
    setInterests(next);
    setInterestsTouched(true);
  }

  async function onPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setPhotoError(await uploadAvatar(file));
    setUploading(false);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const checked = validateLinkRows(rows);
    setRows(checked);
    const invalid = checked.find((row) => row.error);
    if (invalid) {
      setError("Fix the highlighted link, then save again.");
      document.getElementById(`link-url-${invalid.id}`)?.focus();
      return;
    }
    const kept = checked.filter((row) => row.url.trim());
    const links: ProfileLink[] = kept.map((row) => {
      const label = row.label.trim();
      return label ? { url: row.url, label } : { url: row.url };
    });
    setSaving(true);
    setError(null);
    const problem = await updateProfile({
      display_name: name.trim() || null,
      major: major.trim() || null,
      class_year: year || null,
      bio: bio.trim() || null,
      links,
      interests,
      // Saving an untouched, empty picker isn't a choice: quiz answers taken
      // later should still prefill it.
      interests_chosen: Boolean(profile.interests_chosen) || interestsTouched || interests.length > 0,
      looking_for: lookingFor,
      avatar_preset: preset,
      // New students read the clubs explanation during onboarding, so they
      // never need the notice shown to students who signed up before it.
      ...(markOnboarded ? { onboarded: true, policy_notice_seen: true } : {}),
    });
    setSaving(false);
    if (problem) {
      setError(problem);
      return;
    }
    setRows(kept);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onSaved?.();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-9">
      {/* Photo */}
      <fieldset>
        <legend className="field-label">Profile photo</legend>
        <div className="mt-1 flex flex-wrap items-center gap-5">
          <Avatar name={name} url={profile.avatar_url} preset={preset} size={84} />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn btn-secondary h-10 px-4 text-[14px]"
            >
              {uploading ? (
                <Loader2 size={15} className="animate-spin" aria-hidden />
              ) : (
                <Upload size={15} aria-hidden />
              )}
              {profile.avatar_url ? "Change photo" : "Upload photo"}
            </button>
            {profile.avatar_url && (
              <button
                type="button"
                onClick={async () => setPhotoError(await removeAvatar())}
                className="inline-flex min-h-10 items-center text-[14px] font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
              >
                Remove photo
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              tabIndex={-1}
              onChange={onPhoto}
            />
          </div>
        </div>
        <p className="mt-3 text-[13px] text-ink-muted">JPG, PNG, or WebP, up to 2 MB.</p>
        {photoError && (
          <p role="alert" className="mt-2 text-[14px] font-medium text-cardinal">
            {photoError}
          </p>
        )}
        {!profile.avatar_url && (
          <div className="mt-5">
            <p className="text-[13.5px] font-semibold text-ink-soft">Or pick a color</p>
            <div className="mt-2.5 flex flex-wrap gap-2.5">
              {AVATAR_PRESETS.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Color ${index + 1}`}
                  aria-pressed={preset === index}
                  onClick={() => setPreset(index)}
                  className={`rounded-full p-0.5 ring-offset-2 transition-shadow ${
                    preset === index ? "ring-2 ring-cardinal" : "ring-1 ring-transparent hover:ring-line-strong"
                  }`}
                >
                  <Avatar name={name} preset={index} size={40} />
                </button>
              ))}
            </div>
          </div>
        )}
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="pf-name" className="field-label">
            Name
          </label>
          <input
            id="pf-name"
            className="field"
            autoComplete="name"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First and last name"
          />
        </div>
        <div>
          <label htmlFor="pf-major" className="field-label">
            Major
          </label>
          <input
            id="pf-major"
            className="field"
            list="pf-majors"
            maxLength={80}
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            placeholder="Start typing your major"
          />
          <datalist id="pf-majors">
            {ALL_MAJORS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="pf-year" className="field-label">
            Class year
          </label>
          <select
            id="pf-year"
            className="field"
            value={year}
            onChange={(e) => setYear(e.target.value as ClassYear | "")}
          >
            <option value="">Choose one</option>
            {CLASS_YEARS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="pf-bio" className="field-label">
          About you
        </label>
        <textarea
          id="pf-bio"
          className="field h-auto min-h-[110px] py-3 leading-relaxed"
          maxLength={BIO_MAX}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A sentence or two about you."
        />
        <p className="mt-1.5 text-right text-[12.5px] tabular-nums text-ink-muted">
          {bio.length}/{BIO_MAX}
        </p>
      </div>

      <section aria-labelledby="pf-interests-title">
        <div id="pf-interests-title">
          <SectionHeading
            title="Interests"
            hint={
              prefilled ? (
                "We started these from your quiz. Only what's selected shows on your profile, once you save."
              ) : profile.preferences ? (
                "Pick what you want other students to see. Your quiz answers themselves stay private."
              ) : (
                <>
                  Pick what you want other students to see, or{" "}
                  <Link href="/match" className="link-isu">
                    take the quiz
                  </Link>{" "}
                  and we&apos;ll suggest some.
                </>
              )
            }
          />
        </div>
        <InterestPicker value={interests} onChange={pickInterests} />
        {profile.preferences && !prefilled && (
          <button
            type="button"
            onClick={() => pickInterests(quizInterests)}
            className="mt-1 inline-flex min-h-10 items-center text-[13.5px] font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          >
            Start over from my quiz answers
          </button>
        )}
      </section>

      <fieldset>
        <legend className="contents">
          <span className="block">
            <SectionHeading title="Looking for" hint="Shows at the top of your profile. Change it whenever." />
          </span>
        </legend>
        <div className="flex flex-wrap items-center gap-2">
          {LOOKING_FOR.map((option) => (
            <label key={option} className="cursor-pointer">
              <input
                type="radio"
                name="pf-looking-for"
                value={option}
                checked={lookingFor === option}
                onChange={() => setLookingFor(option)}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-10 items-center rounded-[6px] border border-line-strong bg-white px-3 py-1.5 text-[14px] font-medium text-ink-soft transition-colors duration-150 hover:border-ink-muted hover:text-ink peer-checked:border-cardinal peer-checked:bg-cardinal-tint peer-checked:text-cardinal-dark peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cardinal">
                {LOOKING_FOR_COPY[option].option}
              </span>
            </label>
          ))}
          {lookingFor && (
            <button
              type="button"
              onClick={() => setLookingFor(null)}
              className="ml-1 inline-flex min-h-10 items-center px-1 text-[13.5px] font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </fieldset>

      <section aria-labelledby="pf-links-title">
        <div id="pf-links-title">
          <SectionHeading title="Links" hint="Anywhere you want people to find you. Put your favorite first." />
        </div>
        <LinkEditor rows={rows} onChange={setRows} />
      </section>

      <section aria-labelledby="pf-clubs-title" className="border-t border-line pt-8">
        <div id="pf-clubs-title" className="sr-only">
          Club visibility
        </div>
        <LetClubsFindMe profile={profile} id="pf-let-clubs-find-me" />
        <p className="mt-2 text-[13px] text-ink-muted">This switch saves right away.</p>
      </section>

      {error && (
        <p role="alert" className="text-[14px] font-medium text-cardinal">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving && <Loader2 size={16} className="animate-spin" aria-hidden />}
          {submitLabel}
        </button>
        <span aria-live="polite">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-soft">
              <Check size={16} aria-hidden /> Saved
            </span>
          )}
        </span>
      </div>
    </form>
  );
}

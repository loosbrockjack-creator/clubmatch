"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Upload } from "lucide-react";
import { AVATAR_PRESETS, Avatar } from "@/components/avatar";
import {
  CLASS_YEARS,
  removeAvatar,
  updateProfile,
  uploadAvatar,
  type ClassYear,
  type Profile,
  type ProfileLinks,
} from "@/lib/account";
import { ACADEMIC_AREAS, ACADEMIC_AREA_BY_ID, majorsForAreas } from "@/lib/taxonomy";

const BIO_MAX = 280;

const ALL_MAJORS = Array.from(
  new Set(majorsForAreas(ACADEMIC_AREAS.map((area) => area.id))),
).sort((a, b) => a.localeCompare(b));

function cleanLinks(raw: ProfileLinks): { links: ProfileLinks; error: string | null } {
  const links: ProfileLinks = {};
  const linkedin = raw.linkedin?.trim();
  if (linkedin) {
    const url = /^https?:\/\//i.test(linkedin) ? linkedin : `https://${linkedin}`;
    if (!/^https:\/\/([a-z]+\.)?linkedin\.com\/.+/i.test(url.replace(/^http:/i, "https:"))) {
      return { links, error: "LinkedIn should be a linkedin.com link." };
    }
    links.linkedin = url.replace(/^http:/i, "https:");
  }
  const instagram = raw.instagram?.trim().replace(/^@/, "");
  if (instagram) {
    if (!/^[A-Za-z0-9._]{1,30}$/.test(instagram)) {
      return { links, error: "Instagram should be just your handle, like @cyclone." };
    }
    links.instagram = instagram;
  }
  const website = raw.website?.trim();
  if (website) {
    const url = /^https?:\/\//i.test(website) ? website : `https://${website}`;
    try {
      new URL(url);
    } catch {
      return { links, error: "That website link doesn't look right." };
    }
    links.website = url;
  }
  return { links, error: null };
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
  const [links, setLinks] = useState<ProfileLinks>(profile.links ?? {});
  const [preset, setPreset] = useState(profile.avatar_preset ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const quizArea = profile.preferences?.academicArea;
  const quizSummary = useMemo(() => {
    if (!profile.preferences) return null;
    const area =
      quizArea && quizArea !== "undecided" ? ACADEMIC_AREA_BY_ID[quizArea]?.label : null;
    return area ? `Matched on ${area.toLowerCase()} and your goals.` : "Your quiz answers are saved.";
  }, [profile.preferences, quizArea]);

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
    const { links: clean, error: linkError } = cleanLinks(links);
    if (linkError) {
      setError(linkError);
      return;
    }
    setSaving(true);
    setError(null);
    const problem = await updateProfile({
      display_name: name.trim() || null,
      major: major.trim() || null,
      class_year: year || null,
      bio: bio.trim() || null,
      links: clean,
      avatar_preset: preset,
      ...(markOnboarded ? { onboarded: true } : {}),
    });
    setSaving(false);
    if (problem) {
      setError(problem);
      return;
    }
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
                className="text-[14px] font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
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
          placeholder="A sentence or two. What you study, what you're into, what you're looking for."
        />
        <p className="mt-1.5 text-right text-[12.5px] tabular-nums text-ink-muted">
          {bio.length}/{BIO_MAX}
        </p>
      </div>

      <fieldset>
        <legend className="field-label">Links (optional)</legend>
        <div className="mt-1 grid gap-4 sm:grid-cols-3">
          <input
            aria-label="LinkedIn URL"
            className="field"
            value={links.linkedin ?? ""}
            onChange={(e) => setLinks({ ...links, linkedin: e.target.value })}
            placeholder="linkedin.com/in/you"
          />
          <input
            aria-label="Instagram handle"
            className="field"
            value={links.instagram ?? ""}
            onChange={(e) => setLinks({ ...links, instagram: e.target.value })}
            placeholder="@instagram"
          />
          <input
            aria-label="Website"
            className="field"
            value={links.website ?? ""}
            onChange={(e) => setLinks({ ...links, website: e.target.value })}
            placeholder="yoursite.com"
          />
        </div>
      </fieldset>

      <div className="rounded-[4px] border border-line bg-muted px-5 py-4">
        <p className="text-[14.5px] font-semibold text-ink">Interests</p>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">
          {quizSummary ?? "Take the quiz and your answers are saved here to shape your matches."}{" "}
          <Link href="/match" className="link-isu font-semibold">
            {profile.preferences ? "Retake the quiz" : "Take the quiz"}
          </Link>
        </p>
      </div>

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
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-soft">
            <Check size={16} aria-hidden /> Saved
          </span>
        )}
      </div>
    </form>
  );
}

"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Circle, ImagePlus, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/club-client";
import type { ClubAnalytics, ClubLink, ClubOverlay, ManageAccess } from "@/lib/club-types";
import { LIMITS } from "@/lib/club-validate";
import { CharCount, FormStatus, PanelError, PanelSkeleton, SectionTitle, usePanelData } from "./shared";

type ProfileData = {
  overlay: ClubOverlay | null;
  directory: { tagline: string; description: string; meeting: string };
};

export function ProfileTab({
  slug,
  clubName,
  access,
  onAccess,
}: {
  slug: string;
  clubName: string;
  access: ManageAccess;
  onAccess: (next: ManageAccess) => void;
}) {
  const { data, error, reload } = usePanelData<ProfileData>(`/api/manage/${slug}/profile`);
  // Bumped after every save or photo change, so the checklist re-reads the page.
  const [version, setVersion] = useState(0);
  const onSaved = () => setVersion((v) => v + 1);
  if (error) return <PanelError message={error} onRetry={() => void reload()} />;
  if (!data) return <PanelSkeleton />;
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="min-w-0 space-y-10">
        <ProfileForm slug={slug} data={data} onSaved={onSaved} />
        <Photos slug={slug} clubName={clubName} initial={data.overlay?.photos ?? []} onSaved={onSaved} />
        <FeaturedToggle slug={slug} access={access} onAccess={onAccess} />
      </div>
      <Completeness slug={slug} version={version} />
    </div>
  );
}

function ProfileForm({ slug, data, onSaved }: { slug: string; data: ProfileData; onSaved: () => void }) {
  const overlay = data.overlay;
  const [tagline, setTagline] = useState(overlay?.tagline ?? "");
  const [description, setDescription] = useState(overlay?.description ?? "");
  const [meeting, setMeeting] = useState(overlay?.meeting_info ?? "");
  const [links, setLinks] = useState<ClubLink[]>(overlay?.links ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setLink = (index: number, patch: Partial<ClubLink>) => {
    setSaved(false);
    setLinks((list) => list.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  };

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await apiFetch<{ overlay: ClubOverlay }>(`/api/manage/${slug}/profile`, {
      method: "PUT",
      body: JSON.stringify({
        tagline,
        description,
        meeting_info: meeting,
        links: links.filter((link) => link.url.trim()),
      }),
    });
    setBusy(false);
    if (res.data) {
      setLinks(res.data.overlay.links);
      setSaved(true);
      onSaved();
    } else setError(res.error);
  }

  return (
    <form onSubmit={save} noValidate>
      <SectionTitle
        title="Your page"
        intro="Anything you leave blank keeps showing what Iowa State's directory says. Changes go live when you save."
      />
      <div className="card space-y-6 px-5 py-6 sm:px-7">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="club-tagline" className="field-label">
              Tagline
            </label>
            <CharCount value={tagline} max={LIMITS.tagline} />
          </div>
          <input
            id="club-tagline"
            className="field"
            value={tagline}
            onChange={(e) => {
              setTagline(e.target.value);
              setSaved(false);
            }}
            placeholder={data.directory.tagline}
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="club-description" className="field-label">
              Description
            </label>
            <CharCount value={description} max={LIMITS.description} />
          </div>
          <textarea
            id="club-description"
            className="field h-auto py-3 leading-relaxed"
            rows={7}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setSaved(false);
            }}
            placeholder={data.directory.description}
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="club-meeting" className="field-label">
              Meeting info
            </label>
            <CharCount value={meeting} max={LIMITS.meetingInfo} />
          </div>
          <textarea
            id="club-meeting"
            className="field h-auto py-3 leading-relaxed"
            rows={3}
            value={meeting}
            onChange={(e) => {
              setMeeting(e.target.value);
              setSaved(false);
            }}
            placeholder={data.directory.meeting || "When and where can a new student show up?"}
          />
        </div>
        <fieldset>
          <legend className="field-label">Links</legend>
          {links.length === 0 && (
            <p className="mb-3 text-[14px] text-ink-muted">Add your Instagram, GroupMe, or website.</p>
          )}
          <ul className="space-y-3">
            {links.map((link, index) => (
              <li key={index} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  aria-label={`Link ${index + 1} label`}
                  className="field sm:w-44"
                  value={link.label}
                  maxLength={LIMITS.linkLabel}
                  onChange={(e) => setLink(index, { label: e.target.value })}
                  placeholder="Instagram"
                />
                <input
                  aria-label={`Link ${index + 1} address`}
                  className="field min-w-0 sm:flex-1"
                  value={link.url}
                  inputMode="url"
                  onChange={(e) => setLink(index, { url: e.target.value })}
                  placeholder="https://"
                />
                <button
                  type="button"
                  aria-label={`Remove link ${index + 1}`}
                  onClick={() => {
                    setSaved(false);
                    setLinks((list) => list.filter((_, i) => i !== index));
                  }}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-[4px] text-ink-muted transition-colors hover:bg-muted hover:text-cardinal sm:self-auto"
                >
                  <Trash2 size={16} strokeWidth={1.75} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          {links.length < LIMITS.links && (
            <button
              type="button"
              onClick={() => setLinks((list) => [...list, { label: "", url: "" }])}
              className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-cardinal hover:text-cardinal-dark"
            >
              <Plus size={15} strokeWidth={2} aria-hidden />
              Add a link
            </button>
          )}
        </fieldset>
        <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? "Saving..." : "Save changes"}
          </button>
          <FormStatus error={error} success={saved ? "Saved. It's live on your page." : null} />
        </div>
      </div>
    </form>
  );
}

function Photos({
  slug,
  clubName,
  initial,
  onSaved,
}: {
  slug: string;
  clubName: string;
  initial: string[];
  onSaved: () => void;
}) {
  const [photos, setPhotos] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("photo", file);
    const res = await apiFetch<{ photos: string[] }>(`/api/manage/${slug}/photos`, { method: "POST", body: form });
    setBusy(false);
    if (res.data) {
      setPhotos(res.data.photos);
      onSaved();
    } else setError(res.error);
    if (input.current) input.current.value = "";
  }

  async function remove(url: string) {
    setError(null);
    const res = await apiFetch<{ photos: string[] }>(`/api/manage/${slug}/photos`, {
      method: "DELETE",
      body: JSON.stringify({ url }),
    });
    if (res.data) {
      setPhotos(res.data.photos);
      onSaved();
    } else setError(res.error);
  }

  return (
    <section>
      <SectionTitle title="Photos" intro="The first one becomes your banner and share image. JPG, PNG, or WebP, up to 3 MB." />
      <div className="card px-5 py-6 sm:px-7">
        {photos.length > 0 && (
          <ul className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((url, index) => (
              <li key={url} className="relative aspect-[4/3] overflow-hidden rounded-[12px] bg-muted">
                <Image src={url} alt={`${clubName} photo ${index + 1}`} fill unoptimized sizes="240px" className="object-cover" />
                {index === 0 && <span className="chip absolute left-2 top-2 bg-white">Banner</span>}
                <button
                  type="button"
                  aria-label={`Remove photo ${index + 1}`}
                  onClick={() => void remove(url)}
                  className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-[4px] bg-white text-ink shadow-sm transition-colors hover:text-cardinal"
                >
                  <Trash2 size={15} strokeWidth={1.75} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-4">
          {photos.length < LIMITS.photos && (
            <label className={`btn btn-secondary cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-cardinal ${busy ? "opacity-60" : ""}`}>
              <ImagePlus size={16} strokeWidth={1.75} aria-hidden />
              {busy ? "Uploading..." : "Add a photo"}
              <input
                ref={input}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
            </label>
          )}
          <FormStatus error={error} />
        </div>
      </div>
    </section>
  );
}

function FeaturedToggle({
  slug,
  access,
  onAccess,
}: {
  slug: string;
  access: ManageAccess;
  onAccess: (next: ManageAccess) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    const next = !access.featuredOptIn;
    const res = await apiFetch(`/api/manage/${slug}/access`, {
      method: "PATCH",
      body: JSON.stringify({ featuredOptIn: next }),
    });
    setBusy(false);
    if (res.error) setError(res.error);
    else onAccess({ ...access, featuredOptIn: next });
  }

  return (
    <section className="card flex flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div>
        <h2 className="text-[15.5px] font-semibold text-ink">Featured on Explore</h2>
        <p className="mt-1 max-w-md text-[14px] leading-relaxed text-ink-soft">
          Take turns in the labeled Featured row on Explore. Included in your plan. It doesn&apos;t change anyone&apos;s match scores.
        </p>
        <FormStatus error={error} />
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={access.featuredOptIn}
        aria-label="Featured on Explore"
        disabled={busy}
        onClick={() => void toggle()}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${access.featuredOptIn ? "bg-cardinal" : "bg-line-strong"}`}
      >
        <span
          aria-hidden
          className={`absolute left-[3px] top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform duration-200 ${access.featuredOptIn ? "translate-x-5" : ""}`}
        />
      </button>
    </section>
  );
}

function Completeness({ slug, version }: { slug: string; version: number }) {
  const { data } = usePanelData<ClubAnalytics>(`/api/manage/${slug}/analytics?days=7&v=${version}`);
  if (!data) return <div className="skeleton h-72 rounded-[14px]" />;
  const { score, items } = data.completeness;
  return (
    <aside className="card px-5 py-6 lg:sticky lg:top-[140px]" aria-label="Profile completeness">
      <p className="flex items-baseline justify-between">
        <span className="text-[15px] font-semibold text-ink">Page completeness</span>
        <span className="display text-[26px] tabular-nums text-ink">{score}%</span>
      </p>
      <div
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Page completeness"
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted-deep"
      >
        <div className="h-full rounded-full bg-cardinal transition-[width] duration-200" style={{ width: `${score}%` }} />
      </div>
      <ul className="mt-5 space-y-3.5">
        {items.map((item) => (
          <li key={item.id} className="flex gap-2.5">
            {item.done ? (
              <CheckCircle2 size={17} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0 text-cardinal" />
            ) : (
              <Circle size={17} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0 text-line-strong" />
            )}
            <div>
              <p className={`text-[14px] font-medium ${item.done ? "text-ink-muted" : "text-ink"}`}>
                {item.label}
                <span className="sr-only">{item.done ? " (done)" : " (to do)"}</span>
              </p>
              {!item.done && <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{item.hint}</p>}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

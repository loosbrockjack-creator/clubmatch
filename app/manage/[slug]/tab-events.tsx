"use client";

import { useState } from "react";
import { CalendarDays, MapPin, Pencil, Trash2 } from "lucide-react";
import { apiFetch, formatEventTime } from "@/lib/club-client";
import type { ClubEvent } from "@/lib/club-types";
import { LIMITS } from "@/lib/club-validate";
import { EmptyState, FormStatus, PanelError, PanelSkeleton, SectionTitle, usePanelData } from "./shared";

type Draft = {
  id: string | null;
  title: string;
  description: string;
  location: string;
  link: string;
  starts_at: string;
  ends_at: string;
};
const BLANK: Draft = { id: null, title: "", description: "", location: "", link: "", starts_at: "", ends_at: "" };

/** ISO to the local value a datetime-local input wants. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function EventsTab({ slug }: { slug: string }) {
  const { data, error, reload } = usePanelData<{ events: ClubEvent[] }>(`/api/manage/${slug}/events`);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  if (error) return <PanelError message={error} onRetry={() => void reload()} />;
  if (!data) return <PanelSkeleton />;

  const now = new Date().toISOString();
  const isPast = (event: ClubEvent) => (event.ends_at ?? event.starts_at) < now;
  const upcoming = data.events.filter((e) => !isPast(e)).reverse();
  const past = data.events.filter(isPast).slice(0, 10);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    setSaved(null);
    const res = await apiFetch(`/api/manage/${slug}/events`, {
      method: draft.id ? "PATCH" : "POST",
      body: JSON.stringify({
        ...draft,
        starts_at: draft.starts_at ? new Date(draft.starts_at).toISOString() : "",
        ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : "",
      }),
    });
    setBusy(false);
    if (res.error) {
      setFormError(res.error);
      return;
    }
    setSaved(draft.id ? "Event updated." : "Event posted. It's on your page and on Explore.");
    setDraft(BLANK);
    await reload();
  }

  async function remove(id: string) {
    setPendingDelete(null);
    const res = await apiFetch(`/api/manage/${slug}/events`, { method: "DELETE", body: JSON.stringify({ id }) });
    if (res.error) setFormError(res.error);
    await reload();
  }

  const field = (key: keyof Draft) => ({
    value: draft[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft((d) => ({ ...d, [key]: e.target.value })),
  });

  const row = (event: ClubEvent, canEdit: boolean) => (
    <li key={event.id} className="flex flex-col gap-3 border-b border-line py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-cardinal">
          <CalendarDays size={13} strokeWidth={2} aria-hidden />
          {formatEventTime(event)}
        </p>
        <p className="mt-1 text-[15.5px] font-semibold text-ink">{event.title}</p>
        {event.location && (
          <p className="mt-0.5 flex items-center gap-1 text-[13.5px] text-ink-muted">
            <MapPin size={13} strokeWidth={1.75} aria-hidden />
            {event.location}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setSaved(null);
              setDraft({
                id: event.id,
                title: event.title,
                description: event.description ?? "",
                location: event.location ?? "",
                link: event.link ?? "",
                starts_at: toLocalInput(event.starts_at),
                ends_at: toLocalInput(event.ends_at),
              });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-[4px] px-3 text-[13.5px] font-semibold text-ink-soft transition-colors hover:bg-muted hover:text-ink"
          >
            <Pencil size={14} strokeWidth={1.75} aria-hidden />
            Edit<span className="sr-only"> {event.title}</span>
          </button>
        )}
        {pendingDelete === event.id ? (
          <>
            <button
              type="button"
              onClick={() => void remove(event.id)}
              className="inline-flex h-10 items-center rounded-[4px] px-3 text-[13.5px] font-semibold text-cardinal hover:bg-cardinal-tint"
            >
              Confirm remove
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="inline-flex h-10 items-center rounded-[4px] px-3 text-[13.5px] font-medium text-ink-muted hover:bg-muted"
            >
              Keep
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setPendingDelete(event.id)}
            className="inline-flex h-10 items-center gap-1.5 rounded-[4px] px-3 text-[13.5px] font-semibold text-ink-soft transition-colors hover:bg-muted hover:text-cardinal"
          >
            <Trash2 size={14} strokeWidth={1.75} aria-hidden />
            Remove<span className="sr-only"> {event.title}</span>
          </button>
        )}
      </div>
    </li>
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[400px_1fr] lg:items-start">
      <form onSubmit={submit} noValidate className="min-w-0">
        <SectionTitle title={draft.id ? "Edit event" : "Post an event"} />
        <div className="card space-y-4 px-5 py-6">
          <div>
            <label htmlFor="event-title" className="field-label">Title</label>
            <input id="event-title" className="field" maxLength={LIMITS.eventTitle} {...field("title")} placeholder="Fall kickoff meeting" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <label htmlFor="event-start" className="field-label">Starts</label>
              <input id="event-start" type="datetime-local" className="field" {...field("starts_at")} />
            </div>
            <div>
              <label htmlFor="event-end" className="field-label">
                Ends <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <input id="event-end" type="datetime-local" className="field" {...field("ends_at")} />
            </div>
          </div>
          <div>
            <label htmlFor="event-location" className="field-label">Where</label>
            <input id="event-location" className="field" maxLength={LIMITS.eventLocation} {...field("location")} placeholder="Memorial Union, Room 3512" />
          </div>
          <div>
            <label htmlFor="event-description" className="field-label">
              Details <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <textarea id="event-description" className="field h-auto py-3" rows={3} maxLength={LIMITS.eventDescription} {...field("description")} />
          </div>
          <div>
            <label htmlFor="event-link" className="field-label">
              Link <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input id="event-link" className="field" inputMode="url" {...field("link")} placeholder="https://" />
          </div>
          <FormStatus error={formError} success={saved} />
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy ? "Saving..." : draft.id ? "Save event" : "Post event"}
            </button>
            {draft.id && (
              <button type="button" className="btn btn-quiet" onClick={() => setDraft(BLANK)}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="min-w-0">
        <SectionTitle title="Upcoming" />
        {upcoming.length === 0 ? (
          <EmptyState title="Nothing on the calendar">
            Post your next meeting. Events show on your page and, in their week, on Explore.
          </EmptyState>
        ) : (
          <ul className="card px-5">{upcoming.map((event) => row(event, true))}</ul>
        )}
        {past.length > 0 && (
          <div className="mt-10">
            <h3 className="text-[15px] font-semibold text-ink">Past</h3>
            <p className="mt-1 text-[13.5px] text-ink-muted">These have dropped off your page and Explore.</p>
            <ul className="card mt-3 px-5">{past.map((event) => row(event, false))}</ul>
          </div>
        )}
      </div>
    </div>
  );
}

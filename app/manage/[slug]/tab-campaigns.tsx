"use client";

import { useState } from "react";
import { Send, Users } from "lucide-react";
import { apiFetch } from "@/lib/club-client";
import {
  CAMPAIGN_AUDIENCE_LABEL,
  CAMPAIGN_AUDIENCES,
  CAMPAIGN_DAILY_LIMIT,
  CAMPAIGN_WEEKLY_LIMIT,
  type CampaignAudience,
  type CampaignSummary,
} from "@/lib/club-types";
import { LIMITS } from "@/lib/club-validate";
import { CharCount, EmptyState, FormStatus, PanelError, PanelSkeleton, SectionTitle, usePanelData } from "./shared";

type Data = {
  campaigns: CampaignSummary[];
  audienceCounts: Record<CampaignAudience, number>;
  remaining: { day: number; week: number };
};

export function CampaignsTab({ slug }: { slug: string }) {
  const { data, error, reload } = usePanelData<Data>(`/api/manage/${slug}/campaigns`);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<CampaignAudience>("both");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  if (error) return <PanelError message={error} onRetry={() => void reload()} />;
  if (!data) return <PanelSkeleton />;

  const count = data.audienceCounts[audience];
  const outOfSends = data.remaining.day === 0 || data.remaining.week === 0;

  function review(event: React.FormEvent) {
    event.preventDefault();
    setSent(null);
    if (!subject.trim() || !body.trim()) {
      setFormError("Add a subject and a message first.");
      return;
    }
    setFormError(null);
    setConfirming(true);
  }

  async function send() {
    setBusy(true);
    setFormError(null);
    const res = await apiFetch<{ recipients: number }>(`/api/manage/${slug}/campaigns`, {
      method: "POST",
      body: JSON.stringify({ subject, body, audience }),
    });
    setBusy(false);
    setConfirming(false);
    if (res.data) {
      setSent(`Sent to ${res.data.recipients} ${res.data.recipients === 1 ? "student" : "students"}.`);
      setSubject("");
      setBody("");
    } else setFormError(res.error);
    await reload();
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
      <form onSubmit={review} noValidate className="min-w-0">
        <SectionTitle
          title="New message"
          intro={`Lands in their ClubMatch inbox, with a dot on the header. ${data.remaining.day} of ${CAMPAIGN_DAILY_LIMIT} left today, ${data.remaining.week} of ${CAMPAIGN_WEEKLY_LIMIT} this week.`}
        />
        <div className="card space-y-5 px-5 py-6">
          <fieldset>
            <legend className="field-label">Send to</legend>
            <div className="space-y-2">
              {CAMPAIGN_AUDIENCES.map((id) => (
                <label
                  key={id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-[4px] border px-3.5 py-3 text-[14.5px] transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-cardinal ${
                    audience === id ? "border-cardinal bg-cardinal-tint" : "border-line hover:border-line-strong"
                  }`}
                >
                  <span className="flex items-center gap-2.5 font-medium text-ink">
                    <input
                      type="radio"
                      name="audience"
                      value={id}
                      checked={audience === id}
                      onChange={() => {
                        setAudience(id);
                        setConfirming(false);
                      }}
                      className="accent-cardinal"
                    />
                    {CAMPAIGN_AUDIENCE_LABEL[id]}
                  </span>
                  <span className="text-[13px] tabular-nums text-ink-muted">{data.audienceCounts[id]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="campaign-subject" className="field-label">Subject</label>
              <CharCount value={subject} max={LIMITS.campaignSubject} />
            </div>
            <input
              id="campaign-subject"
              className="field"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setConfirming(false);
              }}
              placeholder="First meeting is Thursday"
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="campaign-body" className="field-label">Message</label>
              <CharCount value={body} max={LIMITS.campaignBody} />
            </div>
            <textarea
              id="campaign-body"
              className="field h-auto py-3 leading-relaxed"
              rows={6}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setConfirming(false);
              }}
            />
          </div>
          <FormStatus error={formError} success={sent} />
          {confirming ? (
            <div className="rounded-[4px] bg-muted px-4 py-4">
              <p className="text-[14.5px] font-medium text-ink">
                Send this to {count} {count === 1 ? "student" : "students"}? You can&apos;t unsend it.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" onClick={() => void send()} disabled={busy} className="btn btn-primary">
                  <Send size={15} strokeWidth={2} aria-hidden />
                  {busy ? "Sending..." : "Send now"}
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="btn btn-quiet">
                  Keep editing
                </button>
              </div>
            </div>
          ) : (
            <button type="submit" disabled={count === 0 || outOfSends} className="btn btn-primary">
              Review and send
            </button>
          )}
          {count === 0 && <p className="text-[13.5px] text-ink-muted">No one is in this audience yet.</p>}
          {outOfSends && (
            <p className="text-[13.5px] text-ink-muted">
              You&apos;ve hit the send limit for now. It keeps students from muting you.
            </p>
          )}
        </div>
      </form>

      <section className="min-w-0">
        <SectionTitle title="Sent" />
        {data.campaigns.length === 0 ? (
          <EmptyState title="No messages yet">
            Try a short note about your next meeting. Members and interested students get it in their inbox.
          </EmptyState>
        ) : (
          <ul className="space-y-3" data-campaigns-sent>
            {data.campaigns.map((campaign) => (
              <li key={campaign.id} className="card px-5 py-4">
                <p className="text-[13px] text-ink-muted">
                  {new Date(campaign.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
                <p className="mt-0.5 text-[15.5px] font-semibold text-ink">{campaign.subject}</p>
                <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">
                  {campaign.body}
                </p>
                <p className="mt-2.5 flex items-center gap-1.5 text-[13px] text-ink-muted">
                  <Users size={13} strokeWidth={1.75} aria-hidden />
                  {campaign.recipient_count} {campaign.recipient_count === 1 ? "student" : "students"} ·{" "}
                  {CAMPAIGN_AUDIENCE_LABEL[campaign.audience]}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

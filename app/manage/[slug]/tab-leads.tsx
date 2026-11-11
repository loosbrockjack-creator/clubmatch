"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Info, Send } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { apiFetch } from "@/lib/club-client";
import { LOOKING_FOR_LABEL } from "@/lib/club-leads";
import type { GoodFitLead, InterestedLead, LeadStudent } from "@/lib/club-types";
import { LIMITS } from "@/lib/club-validate";
import { CharCount, EmptyState, FormStatus, PanelError, PanelSkeleton, SectionTitle, usePanelData } from "./shared";

type Data = {
  goodFit: GoodFitLead[];
  goodFitTotal: number;
  invitesLeftToday: number;
  interested: InterestedLead[];
  hiddenInterested: number;
};

function linkName(link: { url: string; label?: string }) {
  if (link.label) return link.label;
  try {
    return new URL(link.url).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}

function LeadRow({
  student,
  fit,
  badge,
  actions,
  children,
}: {
  student: LeadStudent;
  fit: string[];
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const looking = student.looking_for ? LOOKING_FOR_LABEL[student.looking_for] : null;
  return (
    <li className="border-b border-line py-5 last:border-b-0" data-lead={student.id}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <Avatar name={student.display_name} url={student.avatar_url} preset={student.avatar_preset} size={44} />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-[15.5px] font-semibold text-ink">{student.display_name || "Iowa State student"}</span>
              {badge}
            </p>
            <p className="mt-0.5 text-[13.5px] text-ink-muted">
              {[student.major, student.class_year].filter(Boolean).join(" · ") || "No major listed"}
            </p>
            {(fit.length > 0 || looking) && (
              <p className="mt-2 text-[14px] leading-relaxed text-ink-soft" data-why-fit>
                {[...fit, looking].filter(Boolean).join(" · ")}
              </p>
            )}
            {student.links.length > 0 && (
              <ul className="mt-1 flex flex-wrap gap-x-4">
                {student.links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer noopener nofollow"
                      className="link-isu inline-flex min-h-11 items-center gap-1 text-[13.5px] sm:min-h-8"
                    >
                      {linkName(link)}
                      <ArrowUpRight size={12} strokeWidth={2} aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={`/students/${student.id}`}
            className="inline-flex h-11 items-center rounded-[4px] border border-line-strong bg-white px-3.5 text-[14px] font-semibold text-ink transition-colors hover:border-ink sm:h-10"
          >
            View profile
            <span className="sr-only">: {student.display_name || "this student"}</span>
          </Link>
          {actions}
        </div>
      </div>
      {children}
    </li>
  );
}

function GoodFitRow({
  slug,
  student,
  outOfInvites,
  onInvited,
}: {
  slug: string;
  student: GoodFitLead;
  outOfInvites: boolean;
  onInvited: () => void;
}) {
  const [composing, setComposing] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = student.display_name || "this student";

  async function send() {
    setBusy(true);
    setError(null);
    const res = await apiFetch(`/api/manage/${slug}/invites`, {
      method: "POST",
      body: JSON.stringify({ studentId: student.id, note }),
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setComposing(false);
    onInvited();
  }

  return (
    <LeadRow
      student={student}
      fit={student.fit}
      badge={
        <span className="inline-flex h-6 items-center rounded-[3px] bg-cardinal-tint px-2 text-[12.5px] font-bold tabular-nums text-cardinal">
          {student.match}% fit
        </span>
      }
      actions={
        student.invited ? (
          <span className="chip h-11 sm:h-10" data-invited>
            <Check size={14} strokeWidth={2.25} aria-hidden />
            Invited
          </span>
        ) : (
          !composing && (
            <button
              type="button"
              disabled={outOfInvites}
              onClick={() => setComposing(true)}
              title={outOfInvites ? "You've used today's invites" : undefined}
              className="inline-flex h-11 items-center gap-2 rounded-[4px] bg-cardinal px-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-cardinal-dark disabled:cursor-not-allowed disabled:bg-muted-deep disabled:text-ink-muted sm:h-10"
            >
              <Send size={14} strokeWidth={2} aria-hidden />
              Invite<span className="sr-only"> {name}</span>
            </button>
          )
        )
      }
    >
      {composing && !student.invited && (
        <div className="mt-4 rounded-[8px] bg-muted px-4 py-4 sm:ml-[56px]">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`invite-${student.id}`} className="field-label">
              Add a note <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <CharCount value={note} max={LIMITS.inviteNote} />
          </div>
          <textarea
            id={`invite-${student.id}`}
            className="field h-auto py-3"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="We have a beginner project starting Thursday."
          />
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
            {name} gets one message in their inbox with a link to your page. You can only invite them once.
          </p>
          <FormStatus error={error} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || note.length > LIMITS.inviteNote}
              onClick={() => void send()}
              className="btn btn-primary h-11"
            >
              {busy ? "Sending..." : "Send invite"}
            </button>
            <button type="button" onClick={() => setComposing(false)} className="btn btn-quiet h-11">
              Cancel
            </button>
          </div>
        </div>
      )}
    </LeadRow>
  );
}

export function LeadsTab({ slug, clubName }: { slug: string; clubName: string }) {
  const { data, error, reload } = usePanelData<Data>(`/api/manage/${slug}/leads`);
  if (error) return <PanelError message={error} onRetry={() => void reload()} />;
  if (!data) return <PanelSkeleton />;

  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <section>
        <SectionTitle
          title="Told you they're interested"
          intro={`These students asked to let ${clubName}'s officers know. Reach them with a campaign, or through the links on their profile.`}
        />
        {data.interested.length === 0 && data.hiddenInterested === 0 ? (
          <EmptyState title="No one has asked yet">
            Students can tap I&apos;m interested on your page. A full page and an upcoming
            event give them a reason to.
          </EmptyState>
        ) : (
          <>
            {data.interested.length > 0 && (
              <ul className="card px-5" data-leads-interested>
                {data.interested.map((student) => (
                  <LeadRow
                    key={student.id}
                    student={student}
                    fit={student.fit}
                    badge={
                      <span className="text-[13px] text-ink-muted">
                        {new Date(student.since).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    }
                  />
                ))}
              </ul>
            )}
            {data.hiddenInterested > 0 && (
              <p className="mt-3 text-[13.5px] text-ink-muted">
                Plus {data.hiddenInterested} {data.hiddenInterested === 1 ? "student" : "students"} with a hidden
                profile, who still get your campaigns.
              </p>
            )}
          </>
        )}
      </section>

      <section>
        <SectionTitle
          title="Good-fit students"
          intro={
            data.goodFitTotal > data.goodFit.length
              ? `Your strongest ${data.goodFit.length} of ${data.goodFitTotal} students who fit ${clubName}, not counting current members. Invite the ones you'd like to meet.`
              : `Students who fit ${clubName}, not counting current members. Invite the ones you'd like to meet.`
          }
        />
        <p className="mb-2 flex gap-2 text-[13.5px] leading-relaxed text-ink-muted">
          <Info size={15} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0" />
          Only students who left Let clubs find me on. You see their public profile, what they chose to show about their
          interests, and a match score, never their quiz answers.
        </p>
        {data.goodFit.length > 0 && (
          <p className="mb-4 ml-[23px] text-[13.5px] font-medium text-ink-soft" data-invites-left>
            {data.invitesLeftToday > 0
              ? `${data.invitesLeftToday} invites left today.`
              : "You've used today's invites. You can send more tomorrow."}
          </p>
        )}
        {data.goodFit.length === 0 ? (
          <EmptyState title="No good fits right now">
            When students take the quiz and fit your club, they&apos;ll show up here. New students join all the time,
            so check back.
          </EmptyState>
        ) : (
          <ul className="card px-5" data-leads-goodfit>
            {data.goodFit.map((student) => (
              <GoodFitRow
                key={student.id}
                slug={slug}
                student={student}
                outOfInvites={data.invitesLeftToday === 0}
                onInvited={() => void reload()}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

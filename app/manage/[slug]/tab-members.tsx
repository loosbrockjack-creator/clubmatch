"use client";

import { useState } from "react";
import { BadgeCheck, EyeOff } from "lucide-react";
import { apiFetch } from "@/lib/club-client";
import type { RosterMember } from "@/lib/club-types";
import { EmptyState, FormStatus, PanelError, PanelSkeleton, SectionTitle, StudentRow, usePanelData } from "./shared";

type Data = { members: RosterMember[]; you: string };
type Action = "verify" | "unverify" | "promote" | "demote" | "remove";

export function MembersTab({ slug, clubName }: { slug: string; clubName: string }) {
  const { data, error, reload } = usePanelData<Data>(`/api/manage/${slug}/members`);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  if (error) return <PanelError message={error} onRetry={() => void reload()} />;
  if (!data) return <PanelSkeleton />;

  async function act(userId: string, action: Action) {
    setBusyId(userId);
    setActionError(null);
    setConfirmRemove(null);
    const res = await apiFetch(`/api/manage/${slug}/members`, {
      method: "PATCH",
      body: JSON.stringify({ userId, action }),
    });
    if (res.error) setActionError(res.error);
    await reload();
    setBusyId(null);
  }

  const officers = data.members.filter((m) => m.role === "officer");
  const unconfirmed = data.members.filter((m) => m.role === "member" && !m.verified);
  const confirmed = data.members.filter((m) => m.role === "member" && m.verified);

  const quiet =
    "inline-flex h-10 items-center rounded-[4px] border border-line-strong bg-white px-3 text-[13.5px] font-semibold text-ink transition-colors hover:border-ink disabled:opacity-50";
  const danger =
    "inline-flex h-10 items-center rounded-[4px] px-3 text-[13.5px] font-semibold text-ink-muted transition-colors hover:bg-cardinal-tint hover:text-cardinal disabled:opacity-50";

  const removeButton = (member: RosterMember, name: string) =>
    confirmRemove === member.id ? (
      <>
        <button type="button" disabled={busyId === member.id} onClick={() => void act(member.id, "remove")} className={`${danger} text-cardinal`}>
          Confirm remove
        </button>
        <button type="button" onClick={() => setConfirmRemove(null)} className={danger}>
          Keep
        </button>
      </>
    ) : (
      <button type="button" onClick={() => setConfirmRemove(member.id)} className={danger}>
        Remove<span className="sr-only"> {name}</span>
      </button>
    );

  const memberRow = (member: RosterMember) => {
    const name = member.profile?.display_name || "this student";
    const disabled = busyId === member.id;
    if (!member.profile) {
      return (
        <li key={member.id} className="flex flex-col gap-3 border-b border-line py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-ink-muted">
              <EyeOff size={18} strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-ink">Student with a hidden profile</p>
              <p className="text-[13px] text-ink-muted">Hidden profiles can&apos;t be confirmed, only removed.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">{removeButton(member, "this student")}</div>
        </li>
      );
    }
    return (
      <StudentRow
        key={member.id}
        student={member.profile}
        meta={
          member.verified ? (
            <p className="mt-0.5 flex items-center gap-1 text-[12.5px] font-semibold text-ink-soft">
              <BadgeCheck size={13} strokeWidth={2} aria-hidden className="text-cardinal" />
              Confirmed
            </p>
          ) : undefined
        }
      >
        {member.role === "officer" ? (
          member.id === data.you ? (
            <span className="chip">You</span>
          ) : (
            <button type="button" disabled={disabled} onClick={() => void act(member.id, "demote")} className={quiet}>
              Make member<span className="sr-only">: {name}</span>
            </button>
          )
        ) : (
          <>
            {member.verified ? (
              <button type="button" disabled={disabled} onClick={() => void act(member.id, "unverify")} className={quiet}>
                Unconfirm<span className="sr-only"> {name}</span>
              </button>
            ) : (
              <button type="button" disabled={disabled} onClick={() => void act(member.id, "verify")} className={quiet} data-action="verify">
                Confirm<span className="sr-only"> {name}</span>
              </button>
            )}
            <button type="button" disabled={disabled} onClick={() => void act(member.id, "promote")} className={quiet} data-action="promote">
              Make officer<span className="sr-only">: {name}</span>
            </button>
          </>
        )}
        {member.id !== data.you && removeButton(member, name)}
      </StudentRow>
    );
  };

  const hasMembers = unconfirmed.length + confirmed.length > 0;

  return (
    <div className="max-w-3xl space-y-10">
      <FormStatus error={actionError} />
      {unconfirmed.length > 0 && (
        <section>
          <SectionTitle
            title={`Waiting to be confirmed (${unconfirmed.length})`}
            intro="These students tapped I'm a member on your page. Confirming adds a check to their profile."
          />
          <ul className="card px-5">{unconfirmed.map(memberRow)}</ul>
        </section>
      )}
      <section>
        <SectionTitle title={`Members (${confirmed.length})`} />
        {confirmed.length > 0 ? (
          <ul className="card px-5">{confirmed.map(memberRow)}</ul>
        ) : (
          <EmptyState title={hasMembers ? "No confirmed members yet" : "No members yet"}>
            {hasMembers
              ? "Confirm the students above once you know they're in the club."
              : `Students appear here when they tap I'm a member on ${clubName}'s page. Share your page with your club to get started.`}
          </EmptyState>
        )}
      </section>
      <section>
        <SectionTitle
          title={`Officers (${officers.length})`}
          intro="Officers can use everything in this panel. To add one, they tap I'm a member on your page, then you make them an officer."
        />
        <ul className="card px-5">{officers.map(memberRow)}</ul>
      </section>
    </div>
  );
}

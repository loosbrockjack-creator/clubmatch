"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BellOff, ChevronDown, Inbox as InboxIcon } from "lucide-react";
import { AccountGate } from "@/components/account-gate";
import { PageHeader } from "@/components/page-header";
import { refreshUnread } from "@/lib/club-client";
import { getClubSummary } from "@/lib/clubs";
import { getSupabase } from "@/lib/supabase";

type Message = {
  id: string;
  club_slug: string;
  subject: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

type Row = {
  campaign_id: string;
  read_at: string | null;
  club_campaigns: Omit<Message, "read_at"> | null;
};

export function InboxView() {
  return (
    <>
      <PageHeader
        crumbs={[]}
        title="Inbox"
        intro="Messages from officers of clubs you're in, or told you're interested in."
      />
      <AccountGate>{(profile) => <Messages userId={profile.id} />}</AccountGate>
    </>
  );
}

function Messages({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [muted, setMuted] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const [inbox, mutes] = await Promise.all([
      sb
        .from("campaign_recipients")
        .select("campaign_id, read_at, club_campaigns(id, club_slug, subject, body, created_at)")
        .eq("user_id", userId)
        .limit(200),
      sb.from("club_mutes").select("club_slug").eq("user_id", userId),
    ]);
    if (inbox.error) {
      setError("Couldn't load your messages. Refresh to try again.");
      return;
    }
    setError(null);
    const rows = (inbox.data ?? []) as unknown as Row[];
    setMessages(
      rows
        .flatMap((row) => (row.club_campaigns ? [{ ...row.club_campaigns, read_at: row.read_at }] : []))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    );
    setMuted((mutes.data ?? []).map((row) => row.club_slug as string));
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function markRead(ids: string[]) {
    const sb = getSupabase();
    if (!sb || ids.length === 0) return;
    const at = new Date().toISOString();
    setMessages((list) => list?.map((m) => (ids.includes(m.id) ? { ...m, read_at: at } : m)) ?? null);
    await sb.from("campaign_recipients").update({ read_at: at }).eq("user_id", userId).in("campaign_id", ids);
    await refreshUnread(userId);
  }

  async function toggleMute(slug: string) {
    const sb = getSupabase();
    if (!sb) return;
    const isMuted = muted.includes(slug);
    setMuted((list) => (isMuted ? list.filter((s) => s !== slug) : [...list, slug]));
    const { error: writeError } = isMuted
      ? await sb.from("club_mutes").delete().eq("user_id", userId).eq("club_slug", slug)
      : await sb.from("club_mutes").insert({ user_id: userId, club_slug: slug });
    if (writeError) {
      setMuted((list) => (isMuted ? [...list, slug] : list.filter((s) => s !== slug)));
      setError("Couldn't change that. Try again.");
    }
  }

  const unread = useMemo(() => (messages ?? []).filter((m) => !m.read_at), [messages]);
  // A muted club that has no messages left in view still needs a way back.
  const mutedOnly = muted.filter((slug) => !(messages ?? []).some((m) => m.club_slug === slug));

  if (messages === null && !error) {
    return (
      <div className="shell max-w-3xl space-y-3 py-10">
        <div className="skeleton h-20 rounded-[14px]" />
        <div className="skeleton h-20 rounded-[14px]" />
      </div>
    );
  }

  return (
    <div className="shell max-w-3xl pb-12 pt-10">
      {error && (
        <p role="alert" className="mb-5 text-[14.5px] font-medium text-cardinal">
          {error}
        </p>
      )}

      {messages?.length === 0 && (
        <div className="card px-6 py-14 text-center">
          <InboxIcon size={26} strokeWidth={1.5} aria-hidden className="mx-auto text-ink-muted" />
          <h2 className="display mt-4 text-[24px] text-ink">Nothing here yet</h2>
          <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-ink-soft">
            When a club you&apos;re in sends a message, it lands here. Find a club and tell its officers
            you&apos;re interested to start hearing from them.
          </p>
          <Link href="/explore" className="btn btn-secondary mt-6">
            Explore clubs
          </Link>
        </div>
      )}

      {messages && messages.length > 0 && (
        <>
          <div className="mb-4 flex min-h-8 items-center justify-between gap-4">
            <p className="text-[14px] font-semibold text-ink">
              {unread.length > 0 ? `${unread.length} unread` : "All caught up"}
            </p>
            {unread.length > 0 && (
              <button
                type="button"
                onClick={() => void markRead(unread.map((m) => m.id))}
                className="link-isu text-[13.5px]"
              >
                Mark all as read
              </button>
            )}
          </div>
          <ul className="space-y-3">
            {messages.map((message) => {
              const open = openId === message.id;
              const clubName = getClubSummary(message.club_slug)?.name ?? "A club";
              const isMuted = muted.includes(message.club_slug);
              return (
                <li key={message.id} className="card overflow-hidden" data-inbox-message>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`message-${message.id}`}
                    onClick={() => {
                      setOpenId(open ? null : message.id);
                      if (!open && !message.read_at) void markRead([message.id]);
                    }}
                    className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-muted"
                  >
                    <span
                      aria-hidden
                      className={`mt-2 h-2 w-2 shrink-0 rounded-full ${message.read_at ? "bg-transparent" : "bg-cardinal"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] text-ink-muted">
                        {clubName} · {new Date(message.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        {!message.read_at && <span className="sr-only"> (unread)</span>}
                      </span>
                      <span className={`mt-0.5 block text-[15.5px] leading-snug text-ink ${message.read_at ? "font-medium" : "font-bold"}`}>
                        {message.subject}
                      </span>
                    </span>
                    <ChevronDown
                      size={18}
                      strokeWidth={1.75}
                      aria-hidden
                      className={`mt-1 shrink-0 text-ink-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open && (
                    <div id={`message-${message.id}`} className="border-t border-line px-5 py-5 sm:pl-10">
                      <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{message.body}</p>
                      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px]">
                        <Link href={`/clubs/${message.club_slug}`} className="link-isu">
                          View {clubName}
                        </Link>
                        <button
                          type="button"
                          onClick={() => void toggleMute(message.club_slug)}
                          aria-pressed={isMuted}
                          className="inline-flex items-center gap-1.5 font-medium text-ink-muted transition-colors hover:text-ink"
                        >
                          <BellOff size={14} strokeWidth={1.75} aria-hidden />
                          {isMuted ? `Unmute ${clubName}` : `Mute ${clubName}`}
                        </button>
                      </div>
                      {isMuted && (
                        <p className="mt-2 text-[13px] text-ink-muted">
                          Muted. You won&apos;t get new messages from this club.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {mutedOnly.length > 0 && (
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="text-[14px] font-semibold text-ink">Muted clubs</h2>
          <ul className="mt-3 space-y-2">
            {mutedOnly.map((slug) => (
              <li key={slug} className="flex items-center justify-between gap-4 text-[14px] text-ink-soft">
                {getClubSummary(slug)?.name ?? slug}
                <button type="button" onClick={() => void toggleMute(slug)} className="link-isu text-[13.5px]">
                  Unmute
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

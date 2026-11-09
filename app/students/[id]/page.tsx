"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, EyeOff, Flag, Users } from "lucide-react";
import { AccountGate } from "@/components/account-gate";
import { Avatar } from "@/components/avatar";
import { ClubPoster, type ClubRole } from "@/components/club-poster";
import { ProfileLinkTiles } from "@/components/profile-link-tiles";
import {
  LOOKING_FOR,
  LOOKING_FOR_COPY,
  PUBLIC_PROFILE_COLUMNS,
  reportProfile,
  useAccount,
  type LookingFor,
  type Profile,
  type PublicProfile,
} from "@/lib/account";
import { clubBySlug } from "@/lib/clubs";
import {
  effectiveInterests,
  groupInterests,
  interestLabel,
  knownInterests,
} from "@/lib/profile-interests";
import { resolveProfileLinks } from "@/lib/profile-links";
import { getSupabase } from "@/lib/supabase";
import type { ClubSummary } from "@/lib/types";

type MembershipRow = { club_slug: string; role: ClubRole; verified: boolean };
type ClubEntry = { club: ClubSummary; role: ClubRole; verified: boolean };

type Loaded =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "error" }
  | { state: "ready"; profile: PublicProfile; clubs: ClubEntry[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Officers first, then confirmed members, keeping each group's join order. */
function toClubEntries(rows: MembershipRow[]): ClubEntry[] {
  const rank = (entry: ClubEntry) => (entry.role === "officer" ? 0 : entry.verified ? 1 : 2);
  return rows
    .flatMap((row) => {
      const club = clubBySlug.get(row.club_slug);
      if (!club) return [];
      return [{ club, role: row.role === "officer" ? ("officer" as const) : ("member" as const), verified: row.verified === true }];
    })
    .sort((a, b) => rank(a) - rank(b));
}

export default function StudentPage() {
  return <AccountGate fallback={<ProfileSkeleton />}>{(me) => <StudentProfile me={me} />}</AccountGate>;
}

function ProfileSkeleton() {
  return (
    <div className="shell max-w-[976px] py-12 sm:py-16" aria-busy="true" aria-label="Loading profile">
      <div className="flex items-center gap-6">
        <div className="skeleton h-24 w-24 shrink-0 rounded-full" />
        <div className="flex-1 space-y-3">
          <div className="skeleton h-9 max-w-xs rounded-[6px]" />
          <div className="skeleton h-4 max-w-[200px] rounded-[4px]" />
        </div>
      </div>
      <div className="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton aspect-[4/3] rounded-[12px]" />
        ))}
      </div>
    </div>
  );
}

function StudentProfile({ me }: { me: Profile }) {
  const { id } = useParams<{ id: string }>();
  const [loaded, setLoaded] = useState<Loaded & { for?: string }>({ state: "loading" });

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return { state: "error" } as const;
    // A malformed id would come back as a database error, not "no such profile".
    if (!UUID.test(id)) return { state: "missing" } as const;
    const [profileRes, clubsRes] = await Promise.all([
      sb.from("profiles").select(`${PUBLIC_PROFILE_COLUMNS}, bio, links`).eq("id", id).maybeSingle(),
      sb.from("memberships").select("club_slug, role, verified").eq("user_id", id),
    ]);
    if (profileRes.error || clubsRes.error) return { state: "error" } as const;
    if (!profileRes.data) return { state: "missing" } as const;
    return {
      state: "ready",
      profile: profileRes.data as PublicProfile,
      clubs: toClubEntries((clubsRes.data ?? []) as MembershipRow[]),
    } as const;
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    void load()
      .catch(() => ({ state: "error" }) as const)
      .then((next) => {
        if (!cancelled) setLoaded({ ...next, for: id });
      });
    return () => {
      cancelled = true;
    };
  }, [id, load]);

  // Navigating between students shows the skeleton, not the previous person.
  if (loaded.state === "loading" || loaded.for !== id) return <ProfileSkeleton />;

  if (loaded.state === "error") {
    return (
      <div className="shell py-24 text-center">
        <h1 className="display text-[30px] text-ink">We couldn&apos;t load this profile.</h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] text-ink-soft">
          Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => {
            setLoaded({ state: "loading" });
            void load()
              .catch(() => ({ state: "error" }) as const)
              .then((next) => setLoaded({ ...next, for: id }));
          }}
          className="btn btn-secondary mt-8"
        >
          Try again
        </button>
      </div>
    );
  }

  if (loaded.state === "missing") {
    return (
      <div className="shell py-24 text-center">
        <h1 className="display text-[30px] text-ink">This profile isn&apos;t available.</h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] text-ink-soft">
          The student may have hidden their profile or deleted their account.
        </p>
        <Link href="/explore" className="btn btn-secondary mt-8">
          Browse clubs
        </Link>
      </div>
    );
  }

  return <ProfileView me={me} profile={loaded.profile} clubs={loaded.clubs} />;
}

function lookingForStatus(value: unknown): string | null {
  return LOOKING_FOR.includes(value as LookingFor) ? LOOKING_FOR_COPY[value as LookingFor].status : null;
}

function ProfileView({ me, profile, clubs }: { me: Profile; profile: PublicProfile; clubs: ClubEntry[] }) {
  const isMe = profile.id === me.id;
  const meta = [profile.major, profile.class_year].filter(Boolean).join(" · ");
  const links = resolveProfileLinks(profile.links);
  const interestGroups = groupInterests(profile.interests);
  const status = lookingForStatus(profile.looking_for);

  return (
    <div className="shell max-w-[976px] pb-20 pt-10 sm:pt-16">
      {isMe && !me.visible && (
        <p className="mb-8 flex items-start gap-2.5 rounded-[12px] border border-line bg-muted px-4 py-3 text-[14px] text-ink-soft">
          <EyeOff size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Your profile is hidden, so only you can see this page.{" "}
            <Link href="/account#settings" className="link-isu">
              Change this
            </Link>
          </span>
        </p>
      )}

      <header className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-start">
        <Avatar
          name={profile.display_name}
          url={profile.avatar_url}
          preset={profile.avatar_preset}
          size={104}
        />
        <div className="w-full min-w-0 flex-1">
          <h1 className="display text-[34px] [overflow-wrap:anywhere] leading-tight text-cardinal sm:text-[44px]">
            {profile.display_name || "Iowa State student"}
          </h1>
          {meta && <p className="mt-1.5 text-[15px] font-semibold text-ink-soft [overflow-wrap:anywhere]">{meta}</p>}
          {profile.bio && (
            <p className="mt-4 max-w-2xl whitespace-pre-line text-[16px] [overflow-wrap:anywhere] leading-relaxed text-ink">
              {profile.bio}
            </p>
          )}
          {status && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-[6px] border border-line bg-muted px-3 py-1.5 text-[13.5px] font-semibold text-ink">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-gold-deep" />
              {status}
            </p>
          )}
          {isMe && (!profile.bio || !status) && (
            <p className="mt-2 text-[14px] text-ink-soft">
              <Link href="/account#profile" className="link-isu inline-flex min-h-10 items-center">
                {!profile.bio && !status
                  ? "Add a bio and what you're looking for"
                  : !profile.bio
                    ? "Add a short bio"
                    : "Say what you're looking for"}
              </Link>
            </p>
          )}
        </div>
        {isMe && (
          <Link href="/account#profile" className="btn btn-secondary h-10 shrink-0 self-start px-4 text-[14px]">
            Edit profile
          </Link>
        )}
      </header>

      {!isMe && <YouBoth me={me} profile={profile} clubs={clubs} />}

      {(clubs.length > 0 || isMe) && (
        <Section title="My clubs">
          {clubs.length > 0 ? (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
              {clubs.map((entry, index) => (
                <ClubPoster key={entry.club.slug} {...entry} eager={index < 4} />
              ))}
            </ul>
          ) : (
            <Nudge
              title="Show the clubs you're in."
              body="Open a club's page and tap I'm a member. Its cover shows up here."
              href="/explore"
              action="Browse clubs"
            />
          )}
        </Section>
      )}

      {(interestGroups.length > 0 || isMe) && (
        <Section title="Interests">
          {interestGroups.length > 0 ? (
            <dl className="space-y-4">
              {interestGroups.map((group) => (
                <div key={group.key} className="grid grid-cols-1 gap-2 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-4">
                  <dt className="pt-1 text-[13.5px] font-semibold text-ink-muted">{group.heading}</dt>
                  <dd className="flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <span key={item.id} className="chip">
                        {item.label}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <Nudge
              title="Pick what you're into."
              body={
                me.preferences && !me.interests_chosen
                  ? "We'll start you off from your quiz answers. You choose what shows."
                  : "Chips like Data & AI or Lead something help people see what you're about."
              }
              href="/account#profile"
              action="Add interests"
            />
          )}
        </Section>
      )}

      {(links.length > 0 || isMe) && (
        <Section title="Links">
          {links.length > 0 ? (
            <ProfileLinkTiles links={links} />
          ) : (
            <Nudge
              title="Add a link or two."
              body="Instagram, GitHub, a portfolio, whatever you'd want people to see."
              href="/account#profile"
              action="Add links"
            />
          )}
        </Section>
      )}

      {!isMe && <ReportLink target={profile.id} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 border-t border-line pt-8 sm:mt-14">
      <h2 className="display mb-5 text-[24px] text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Nudge({
  title,
  body,
  href,
  action,
}: {
  title: string;
  body: string;
  href: string;
  action: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-dashed border-line-strong px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-[14px] leading-relaxed text-ink-soft">{body}</p>
      </div>
      <Link href={href} className="btn btn-secondary h-10 shrink-0 self-start px-4 text-[14px] sm:self-auto">
        {action}
        <ArrowRight size={15} aria-hidden />
      </Link>
    </div>
  );
}

const SHARED_CLUBS_SHOWN = 3;

/** Overlap with the viewer, worked out in the browser from what both can already read. */
function YouBoth({ me, profile, clubs }: { me: Profile; profile: PublicProfile; clubs: ClubEntry[] }) {
  const { memberships } = useAccount();
  const shared = clubs.filter((entry) => memberships.includes(entry.club.slug));
  const mine = new Set(effectiveInterests(me));
  const sharedInterests = knownInterests(profile.interests).filter((id) => mine.has(id));
  if (shared.length === 0 && sharedInterests.length === 0) return null;

  const shown = shared.slice(0, SHARED_CLUBS_SHOWN);
  const extra = shared.length - shown.length;

  return (
    <aside
      aria-label="What you have in common"
      data-you-both
      className="mt-8 flex gap-3.5 rounded-[12px] border border-line bg-muted px-4 py-4 sm:px-5"
    >
      <Users size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-soft" aria-hidden />
      <div className="min-w-0 space-y-2.5 text-[14.5px] leading-relaxed text-ink">
        {shown.length > 0 && (
          <p>
            You&apos;re both in{" "}
            {shown.map((entry, index) => (
              <span key={entry.club.slug}>
                <Link href={`/clubs/${entry.club.slug}`} className="font-semibold underline underline-offset-3 hover:text-cardinal">
                  {entry.club.name}
                </Link>
                {listJoiner(index, shown.length, extra)}
              </span>
            ))}
            {extra > 0 && `${extra} more`}.
          </p>
        )}
        {sharedInterests.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span>You&apos;re both into</span>
            {sharedInterests.map((id) => (
              <span key={id} className="chip bg-white">
                {interestLabel(id)}
              </span>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

/** Separator after item `index`, where `extra` adds a trailing "N more" to the list. */
function listJoiner(index: number, count: number, extra: number): string {
  const total = count + (extra > 0 ? 1 : 0);
  if (index === total - 1) return "";
  if (index === total - 2) return total > 2 ? ", and " : " and ";
  return ", ";
}

function ReportLink({ target }: { target: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (status === "sent") {
    return <p className="mt-16 text-[14px] text-ink-muted">Thanks. We&apos;ll take a look.</p>;
  }

  return (
    <div className="mt-16 border-t border-line pt-6">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-10 items-center gap-1.5 text-[13.5px] font-semibold text-ink-muted hover:text-cardinal"
        >
          <Flag size={14} aria-hidden /> Report this profile
        </button>
      ) : (
        <form
          className="max-w-lg"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!reason.trim()) return;
            setStatus("sending");
            const problem = await reportProfile(target, reason.trim());
            if (problem) {
              setError(problem);
              setStatus("idle");
            } else setStatus("sent");
          }}
        >
          <label htmlFor="report-reason" className="field-label">
            What&apos;s wrong with this profile?
          </label>
          <textarea
            id="report-reason"
            className="field h-auto min-h-[90px] py-3"
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {error && <p role="alert" className="mt-2 text-[14px] text-cardinal">{error}</p>}
          <div className="mt-4 flex gap-3">
            <button type="submit" disabled={status === "sending" || !reason.trim()} className="btn btn-primary h-10 px-4 text-[14px]">
              Send report
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-quiet h-10 px-4 text-[14px]">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

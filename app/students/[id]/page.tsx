"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AtSign, Flag, Globe, Link2 } from "lucide-react";
import { AccountGate } from "@/components/account-gate";
import { Avatar } from "@/components/avatar";
import { ClubCard } from "@/components/club-card";
import { reportProfile, type Profile, type PublicProfile } from "@/lib/account";
import { clubBySlug } from "@/lib/clubs";
import { getSupabase } from "@/lib/supabase";

type Loaded =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "ready"; profile: PublicProfile; clubs: string[] };

export default function StudentPage() {
  return <AccountGate>{(me) => <StudentProfile me={me} />}</AccountGate>;
}

function StudentProfile({ me }: { me: Profile }) {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Loaded>({ state: "loading" });

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let cancelled = false;
    void Promise.all([
      sb
        .from("profiles")
        .select("id, display_name, major, class_year, bio, links, avatar_url, avatar_preset")
        .eq("id", id)
        .maybeSingle(),
      sb.from("memberships").select("club_slug").eq("user_id", id),
    ]).then(([profileRes, clubsRes]) => {
      if (cancelled) return;
      if (!profileRes.data) {
        setData({ state: "missing" });
        return;
      }
      setData({
        state: "ready",
        profile: profileRes.data as PublicProfile,
        clubs: (clubsRes.data ?? []).map((row) => row.club_slug as string),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (data.state === "loading") {
    return (
      <div className="shell py-14">
        <div className="skeleton h-28 rounded-[14px]" />
      </div>
    );
  }

  if (data.state === "missing") {
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

  const { profile, clubs } = data;
  const isMe = profile.id === me.id;
  const meta = [profile.major, profile.class_year].filter(Boolean).join(" · ");
  const links = profile.links ?? {};
  const clubList = clubs.map((slug) => clubBySlug.get(slug)).filter((c) => c !== undefined);

  return (
    <>
      <div className="border-b border-line bg-muted">
        <div className="shell flex flex-col gap-6 py-12 sm:flex-row sm:items-center sm:py-16">
          <Avatar
            name={profile.display_name}
            url={profile.avatar_url}
            preset={profile.avatar_preset}
            size={112}
          />
          <div className="min-w-0">
            <h1 className="display text-[34px] leading-tight text-cardinal sm:text-[46px]">
              {profile.display_name || "Iowa State student"}
            </h1>
            {meta && <p className="mt-1.5 text-[15px] font-semibold text-ink-soft">{meta}</p>}
            {profile.bio && (
              <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink">{profile.bio}</p>
            )}
            {(links.linkedin || links.instagram || links.website) && (
              <div className="mt-5 flex flex-wrap gap-4 text-[14px] font-semibold">
                {links.linkedin && (
                  <a href={links.linkedin} target="_blank" rel="noopener noreferrer nofollow" className="link-isu inline-flex items-center gap-1.5">
                    <Link2 size={15} aria-hidden /> LinkedIn
                  </a>
                )}
                {links.instagram && (
                  <a
                    href={`https://instagram.com/${links.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="link-isu inline-flex items-center gap-1.5"
                  >
                    <AtSign size={15} aria-hidden /> {links.instagram}
                  </a>
                )}
                {links.website && (
                  <a href={links.website} target="_blank" rel="noopener noreferrer nofollow" className="link-isu inline-flex items-center gap-1.5">
                    <Globe size={15} aria-hidden /> Website
                  </a>
                )}
              </div>
            )}
          </div>
          {isMe && (
            <Link href="/account#profile" className="btn btn-secondary h-10 px-4 text-[14px] sm:ml-auto">
              Edit profile
            </Link>
          )}
        </div>
      </div>

      <div className="shell pb-16 pt-12">
        <h2 className="display gold-rule text-[26px] text-ink">Clubs</h2>
        {clubList.length === 0 ? (
          <p className="text-[15px] text-ink-soft">
            {isMe ? "You haven't added any clubs yet." : "No clubs listed yet."}
          </p>
        ) : (
          <div className="mt-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {clubList.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
        )}

        {!isMe && <ReportLink target={profile.id} />}
      </div>
    </>
  );
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
          className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-muted hover:text-cardinal"
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

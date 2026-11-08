"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { PUBLIC_PROFILE_COLUMNS, useAccount, type PublicProfile } from "@/lib/account";
import { CONTACT_EMAIL } from "@/lib/site";
import { getSupabase } from "@/lib/supabase";

const SHOWN = 12;

/**
 * Two account-era sections on a club page: the students on ClubMatch who say
 * they're members, and the events slot that unlocks once a club claims its
 * page (the future premium feature).
 */
export function ClubCommunity({ slug, clubName }: { slug: string; clubName: string }) {
  return (
    <>
      <Members slug={slug} />
      <section className="mt-14">
        <h2 className="display gold-rule text-[26px] text-ink">Events and news</h2>
        <div className="card flex flex-col gap-5 px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-tint text-gold-deep">
              <CalendarDays size={20} strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <p className="text-[15.5px] font-semibold text-ink">
                {clubName} hasn&apos;t claimed its ClubMatch page yet.
              </p>
              <p className="mt-1 text-[14.5px] leading-relaxed text-ink-soft">
                Officers can claim it to post events and news for members and interested
                students.
              </p>
            </div>
          </div>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Claim ${clubName} on ClubMatch`)}&body=${encodeURIComponent(
              `Club: ${clubName}\nClubMatch page: https://clubmatch-puce.vercel.app/clubs/${slug}\nYour name and officer role:\n`,
            )}`}
            className="btn btn-outline-cardinal shrink-0 rounded-full"
          >
            Claim this club
          </a>
        </div>
      </section>
    </>
  );
}

function Members({ slug }: { slug: string }) {
  const account = useAccount();
  const signedIn = account.status === "signed-in";
  const iAmMember = account.memberships.includes(slug);
  const [members, setMembers] = useState<PublicProfile[] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !signedIn) return;
    let cancelled = false;
    void sb
      .from("memberships")
      .select(`created_at, profiles!memberships_profile_fk!inner(${PUBLIC_PROFILE_COLUMNS})`, {
        count: "exact",
      })
      .eq("club_slug", slug)
      .eq("profiles.visible", true)
      .order("created_at", { ascending: false })
      .limit(SHOWN)
      .then(({ data, count, error }) => {
        if (cancelled) return;
        if (error) {
          setMembers([]);
          return;
        }
        setMembers(
          (data ?? []).map((row) => row.profiles as unknown as PublicProfile),
        );
        setTotal(count ?? 0);
      });
    return () => {
      cancelled = true;
    };
    // Refetch when the viewer joins or leaves.
  }, [slug, signedIn, iAmMember]);

  return (
    <section className="mt-14">
      <h2 className="display gold-rule text-[26px] text-ink">Members on ClubMatch</h2>
      {!signedIn ? (
        <p className="text-[15px] leading-relaxed text-ink-soft">
          <Link href={`/login?next=${encodeURIComponent(`/clubs/${slug}`)}`} className="link-isu">
            Sign in
          </Link>{" "}
          with your Iowa State email to see which students are in this club.
        </p>
      ) : members === null ? (
        <div className="skeleton h-14 w-72 rounded-[4px]" />
      ) : members.length === 0 ? (
        <p className="text-[15px] text-ink-soft">
          No one has added this club yet. In it? Tap I&apos;m a member at the top of the page.
        </p>
      ) : (
        <>
          <ul className="flex flex-wrap gap-x-5 gap-y-4">
            {members.map((member) => (
              <li key={member.id}>
                <Link
                  href={`/students/${member.id}`}
                  className="group flex items-center gap-3 rounded-[4px] pr-2"
                >
                  <Avatar
                    name={member.display_name}
                    url={member.avatar_url}
                    preset={member.avatar_preset}
                    size={44}
                  />
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-semibold text-ink group-hover:text-cardinal">
                      {member.display_name || "Iowa State student"}
                    </span>
                    {(member.major || member.class_year) && (
                      <span className="block text-[13px] text-ink-muted">
                        {[member.major, member.class_year].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {total > members.length && (
            <p className="mt-4 text-[13.5px] text-ink-muted">
              and {total - members.length} more
            </p>
          )}
        </>
      )}
    </section>
  );
}

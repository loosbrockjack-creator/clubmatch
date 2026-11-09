"use client";

import { Info } from "lucide-react";
import type { GoodFitLead, InterestedLead } from "@/lib/club-types";
import { EmptyState, PanelError, PanelSkeleton, SectionTitle, StudentRow, usePanelData } from "./shared";

type Data = {
  goodFit: GoodFitLead[];
  goodFitTotal: number;
  interested: InterestedLead[];
  hiddenInterested: number;
};

export function LeadsTab({ slug, clubName }: { slug: string; clubName: string }) {
  const { data, error, reload } = usePanelData<Data>(`/api/manage/${slug}/leads`);
  if (error) return <PanelError message={error} onRetry={() => void reload()} />;
  if (!data) return <PanelSkeleton />;

  return (
    <div className="max-w-3xl space-y-12">
      <section>
        <SectionTitle
          title="Told you they're interested"
          intro={`These students asked to let ${clubName}'s officers know. Reach them with a campaign, or through the links on their profile.`}
        />
        {data.interested.length === 0 && data.hiddenInterested === 0 ? (
          <EmptyState title="No one has asked yet">
            Students can tap I&apos;m interested, let the officers know on your page. A full page and an upcoming
            event give them a reason to.
          </EmptyState>
        ) : (
          <>
            {data.interested.length > 0 && (
              <ul className="card px-5" data-leads-interested>
                {data.interested.map((student) => (
                  <StudentRow key={student.id} student={student}>
                    <span className="text-[13px] text-ink-muted">
                      {new Date(student.since).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </StudentRow>
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
              ? `Your strongest ${data.goodFit.length} of ${data.goodFitTotal} students who fit ${clubName}, not counting current members.`
              : `Students who fit ${clubName}, not counting current members.`
          }
        />
        <p className="mb-4 flex gap-2 text-[13.5px] leading-relaxed text-ink-muted">
          <Info size={15} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0" />
          Only students who left Let clubs find me on. You see their public profile and match, never their quiz answers.
        </p>
        {data.goodFit.length === 0 ? (
          <EmptyState title="No good fits right now">
            When students take the quiz and fit your club, they&apos;ll show up here. New students join all the time,
            so check back.
          </EmptyState>
        ) : (
          <ul className="card px-5" data-leads-goodfit>
            {data.goodFit.map((student) => (
              <StudentRow key={student.id} student={student}>
                <span className="inline-flex h-7 items-center rounded-[3px] bg-cardinal-tint px-2.5 text-[13px] font-bold tabular-nums text-cardinal">
                  {student.match}% fit
                </span>
              </StudentRow>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

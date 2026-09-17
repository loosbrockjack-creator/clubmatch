import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, FileText, UserPlus } from "lucide-react";
import { ClubMark } from "@/components/club-mark";
import { InterestedButton } from "@/components/interested-button";
import { WhyItFits } from "@/components/why-it-fits";
import { ClubCard } from "@/components/club-card";
import { clubs, getClub } from "@/lib/clubs";
import { CAREER_BY_ID } from "@/lib/taxonomy";

export function generateStaticParams() {
  return clubs.map((club) => ({ slug: club.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const club = getClub(slug);
  if (!club) return { title: "Club not found" };
  return { title: club.name, description: club.tagline };
}

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const club = getClub(slug);
  if (!club) notFound();

  const facts = [
    { icon: Clock, label: "Time", value: club.commitmentText },
    { icon: CalendarDays, label: "Meetings", value: club.meetingFrequency },
    {
      icon: UserPlus,
      label: "Freshmen",
      value: club.freshmenWelcome ? "Welcome" : "Better after year one",
    },
    {
      icon: FileText,
      label: "Application",
      value: club.applicationRequired ? "Required" : "Not required",
    },
  ];

  const related = clubs
    .filter(
      (other) =>
        other.id !== club.id &&
        other.categories.some((category) => club.categories.includes(category)),
    )
    .slice(0, 3);

  return (
    <div className="shell pb-8 pt-6 sm:pt-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={2} aria-hidden />
          All clubs
        </Link>

        <header className="mt-5 rounded-[22px] border border-line bg-muted px-6 py-8 sm:px-9 sm:py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <ClubMark mark={club.mark} size="xl" />
              <div>
                <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[36px]">
                  {club.name}
                </h1>
                <p className="mt-2 text-[14px] font-medium text-ink-muted">
                  {club.college}
                </p>
                <p className="mt-1 text-[14px] font-medium text-ink-muted">
                  {club.categories.join(" · ")}
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <InterestedButton slug={club.slug} clubName={club.name} />
            </div>
          </div>

          <p className="mt-7 max-w-2xl text-[17px] leading-relaxed text-ink sm:text-[18px]">
            {club.tagline}
          </p>
        </header>

        <WhyItFits club={club} />

        <section className="mt-10">
          <h2 className="sr-only">Quick facts</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="card p-5">
                <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                  <Icon size={13} strokeWidth={2} aria-hidden />
                  {label}
                </span>
                <p className="mt-2.5 text-[15px] font-bold leading-snug tracking-tight text-ink">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-[22px] font-bold tracking-tight text-ink">
            About the club
          </h2>
          <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
            {club.summary}
          </p>
        </section>

        <div className="mt-12 grid gap-10 sm:grid-cols-2">
          <section>
            <h2 className="text-[22px] font-bold tracking-tight text-ink">
              What you would actually do
            </h2>
            <ul className="mt-4 space-y-3">
              {club.whatYouDo.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-[15px] leading-relaxed text-ink-soft"
                >
                  <span
                    aria-hidden
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[22px] font-bold tracking-tight text-ink">
              What you would gain
            </h2>
            <ul className="mt-4 space-y-3">
              {club.whatYouGain.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-[15px] leading-relaxed text-ink-soft"
                >
                  <span
                    aria-hidden
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-12">
          <h2 className="text-[22px] font-bold tracking-tight text-ink">
            Best for
          </h2>
          <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
            {club.bestFor}
          </p>

          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-full text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-muted sm:w-[104px]">
                Majors
              </span>
              {club.majors.map((major) => (
                <span key={major} className="chip">
                  {major}
                </span>
              ))}
              {club.openToAllMajors && (
                <span className="chip border-cardinal bg-cardinal-tint text-cardinal">
                  Open to all majors
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-full text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-muted sm:w-[104px]">
                Careers
              </span>
              {club.careerPaths.map((id) => (
                <span key={id} className="chip">
                  {CAREER_BY_ID[id].label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-12 rounded-[16px] border border-line bg-surface px-6 py-8 sm:px-9">
          <h2 className="text-[20px] font-bold tracking-tight text-ink">
            How to get involved
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-muted">
            Add {club.name} to your list, then look the group up in Iowa State&apos;s
            student organization directory for their current officers and next
            meeting. Most groups here welcome students who simply show up.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <InterestedButton slug={club.slug} clubName={club.name} />
            <Link href="/explore" className="btn btn-secondary w-full sm:w-auto">
              Compare with other clubs
            </Link>
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-[22px] font-bold tracking-tight text-ink">
              Similar clubs
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((other) => (
                <ClubCard key={other.id} club={other} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

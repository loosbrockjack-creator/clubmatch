import Link from "next/link";
import { ArrowRight, Clock, Compass, Target } from "lucide-react";
import { ClubCard } from "@/components/club-card";
import { clubs } from "@/lib/clubs";

const valueProps = [
  {
    icon: Target,
    title: "Personalized matches",
    body: "Ranked on your major, goals, career interests, and how much time you actually have.",
  },
  {
    icon: Clock,
    title: "Honest commitments",
    body: "Every club shows expected weekly hours before you walk into a first meeting.",
  },
  {
    icon: Compass,
    title: "A real next step",
    body: "Each profile explains what you would do, what you would gain, and how to join.",
  },
];

const steps = [
  {
    title: "Answer five questions",
    body: "Major, goals, career interests, time, and the kind of experience you want. Under a minute.",
  },
  {
    title: "Get a ranked shortlist",
    body: "Each club comes with a fit score and a plain explanation of why it surfaced for you.",
  },
  {
    title: "Decide with real detail",
    body: "Compare what you would actually do week to week, then take the next step.",
  },
];

export default function LandingPage() {
  const featured = [
    "isu-investment-group",
    "cyclone-racing",
    "information-assurance-student-group",
  ]
    .map((slug) => clubs.find((club) => club.slug === slug))
    .filter((club) => club !== undefined);

  return (
    <>
      <section className="shell pt-16 pb-14 sm:pt-24 sm:pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Iowa State student organizations
          </p>
          <h1 className="mt-5 text-[38px] font-bold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[56px]">
            Find the clubs that fit you.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-ink-muted sm:text-[18px]">
            Iowa State has more than seven hundred student organizations. Tell us
            what you are studying and what you want out of one, and we will narrow
            it to the handful worth your time.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/match" className="btn btn-primary w-full sm:w-auto">
              Find my clubs
              <ArrowRight size={17} strokeWidth={2} aria-hidden />
            </Link>
            <Link href="/explore" className="btn btn-secondary w-full sm:w-auto">
              Browse all clubs
            </Link>
          </div>

          <p className="mt-6 text-[14px] text-ink-muted">
            All {clubs.length} registered organizations. No account needed.
          </p>
        </div>
      </section>

      <section className="shell pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {valueProps.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-cardinal-tint text-cardinal">
                <Icon size={19} strokeWidth={1.75} aria-hidden />
              </span>
              <h2 className="mt-5 text-[18px] font-bold tracking-tight text-ink">
                {title}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-line bg-surface">
        <div className="shell py-16 sm:py-20">
          <h2 className="text-[26px] font-bold tracking-tight text-ink sm:text-[30px]">
            How it works
          </h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {steps.map((step, index) => (
              <li key={step.title}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-[13px] font-bold tabular-nums text-ink-soft">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-[17px] font-bold tracking-tight text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="shell py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[26px] font-bold tracking-tight text-ink sm:text-[30px]">
              A sample of what is inside
            </h2>
            <p className="mt-2 text-[15px] text-ink-muted">
              Every profile is written to answer one question: would you
              actually join this?
            </p>
          </div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink hover:text-cardinal"
          >
            See all {clubs.length}
            <ArrowRight size={15} strokeWidth={2} aria-hidden />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </div>
      </section>
    </>
  );
}

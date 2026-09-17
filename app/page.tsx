import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronRight } from "lucide-react";
import { ClubCard } from "@/components/club-card";
import { clubs } from "@/lib/clubs";
import { INTEREST_TILES, photoAlt, photoSrc } from "@/lib/photos";

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

/**
 * Hand-picked for range: a build team, a finance group, and a service org.
 * These are slugs from the live dataset, so they can go stale if the scrape
 * renames a club. FEATURED_FALLBACK keeps the section from silently emptying
 * out the way it did when the placeholder dataset was replaced.
 */
const FEATURED_SLUGS = ["solar-car", "investment-group", "dance-marathon"];

export default function LandingPage() {
  const picked = FEATURED_SLUGS.map((slug) =>
    clubs.find((club) => club.slug === slug),
  ).filter((club) => club !== undefined);

  const featured =
    picked.length === FEATURED_SLUGS.length
      ? picked
      : [
          ...picked,
          ...clubs
            .filter((club) => !picked.some((p) => p.id === club.id))
            .slice(0, FEATURED_SLUGS.length - picked.length),
        ];

  return (
    <>
      {/* ---- Hero ------------------------------------------------------ */}
      <section className="relative isolate">
        <div className="absolute inset-0 -z-10">
          <Image
            src={photoSrc("hero")}
            alt={photoAlt("hero")}
            fill
            priority
            sizes="100vw"
            className="object-cover object-[50%_35%]"
          />
          {/* A left-weighted gradient keeps the photo readable behind the
              headline on wide screens. At phone width the text spans the full
              frame, so it gets a flat scrim instead. */}
          <div className="absolute inset-0 bg-black/55 sm:hidden" />
          <div className="absolute inset-0 hidden bg-gradient-to-r from-black/80 via-black/55 to-black/20 sm:block" />
        </div>

        <div className="on-cardinal shell flex min-h-[520px] flex-col justify-center py-20 sm:min-h-[600px] sm:py-28">
          <div className="max-w-2xl">
            <p className="eyebrow text-gold">Iowa State University</p>
            <h1 className="display mt-5 text-[42px] text-white sm:text-[64px]">
              Find the clubs
              <br />
              that fit <span className="text-gold">you</span>.
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-white/90 sm:text-[18px]">
              Iowa State has {clubs.length} student organizations. Tell us what
              you are studying and what you want out of one, and we will narrow
              it to the handful worth your time.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/match" className="btn btn-on-cardinal w-full sm:w-auto">
                Find my clubs
                <ChevronRight size={17} strokeWidth={2.25} aria-hidden />
              </Link>
              <Link
                href="/explore"
                className="btn btn-ghost-on-cardinal w-full sm:w-auto"
              >
                Browse all clubs
                <ChevronRight size={17} strokeWidth={2.25} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Browse by interest ---------------------------------------- */}
      <section className="shell py-16 sm:py-24">
        <div className="max-w-2xl">
          <h2 className="display gold-rule text-[30px] text-ink sm:text-[38px]">
            Start with what you are into
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
            Eight of the largest areas on campus. Every one opens a filtered
            list you can search and narrow further.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-4">
          {INTEREST_TILES.map((tile) => (
            <Link
              key={tile.category}
              href={`/explore?category=${encodeURIComponent(tile.category)}`}
              className="tile group"
            >
              <div className="tile-image relative aspect-[4/3]">
                <Image
                  src={photoSrc(tile.photo)}
                  alt={photoAlt(tile.photo)}
                  fill
                  sizes="(min-width: 1024px) 280px, 45vw"
                  className="object-cover"
                />
              </div>
              {/* The chevron stays inline so it trails the last word when the
                  label wraps, instead of floating off to the right edge. */}
              <h3 className="mt-3 text-[15px] font-bold leading-snug tracking-[-0.01em] text-ink">
                {tile.label}
                <ChevronRight
                  size={15}
                  strokeWidth={2.5}
                  aria-hidden
                  className="ml-1 inline-block shrink-0 align-[-2px] text-cardinal transition-transform group-hover:translate-x-0.5"
                />
              </h3>
              <p className="mt-0.5 text-[13px] text-ink-muted">
                {clubs.filter((c) => c.categories.includes(tile.category)).length}{" "}
                clubs
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ---- Cardinal panel over photo --------------------------------- */}
      {/* Iowa State's signature block: a solid cardinal card offset over an  */}
      {/* image, rather than text laid on top of it.                         */}
      <section className="shell pb-16 sm:pb-24">
        <div className="relative lg:grid lg:grid-cols-12 lg:items-center">
          <div className="on-cardinal panel-cardinal relative z-10 p-9 sm:p-12 lg:col-span-5 lg:col-start-1 lg:row-start-1">
            <p className="eyebrow">Not sure where to start?</p>
            <h2 className="display mt-4 text-[30px] text-white sm:text-[36px]">
              Most students never find their club.
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-white/90">
              Scrolling {clubs.length} names in a directory is how good groups
              get missed. Five questions gets you a ranked shortlist with the
              reasoning shown, so you can tell a real fit from a long list.
            </p>
            <Link href="/match" className="btn btn-on-cardinal mt-8">
              Take the quiz
              <ChevronRight size={17} strokeWidth={2.25} aria-hidden />
            </Link>
          </div>

          <div className="relative hidden aspect-[4/3] lg:col-span-8 lg:col-start-5 lg:row-start-1 lg:block lg:aspect-[16/10]">
            <Image
              src={photoSrc("community")}
              alt={photoAlt("community")}
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ---- How it works ---------------------------------------------- */}
      <section id="how-it-works" className="border-y border-line bg-muted">
        <div className="shell py-16 sm:py-24">
          <h2 className="display gold-rule text-[30px] text-cardinal sm:text-[38px]">
            How it works
          </h2>
          <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {steps.map((step, index) => (
              <li key={step.title} className="border-t-2 border-cardinal pt-5">
                <span className="display text-[15px] font-semibold tabular-nums text-cardinal">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-[18px] font-bold tracking-[-0.01em] text-ink">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- Featured clubs -------------------------------------------- */}
      <section className="shell py-16 sm:py-24">
        <div className="max-w-2xl">
          <h2 className="display gold-rule text-[30px] text-ink sm:text-[38px]">
            A sample of what is inside
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
            Every profile answers one question: would you actually join this?
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </div>

        <Link href="/explore" className="btn btn-secondary mt-10">
          See all {clubs.length} clubs
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </Link>
      </section>
    </>
  );
}

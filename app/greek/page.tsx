import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { GreekBrowser } from "@/components/greek-browser";
import { clubs } from "@/lib/clubs";
import { COUNCILS } from "@/lib/taxonomy";

export const metadata: Metadata = {
  title: "Greek life",
  description:
    "Compare every Iowa State fraternity and sorority by council, affiliation, and housing, with photos and details from the chapters themselves.",
};

/** A chapter house at golden hour, from the chapter's own SFE page. */
const HERO_SLUG = "phi-kappa-psi";

export default function GreekPage() {
  const chapters = clubs.filter((club) => club.greek);
  const hero = chapters.find((club) => club.slug === HERO_SLUG) ?? chapters.find((c) => c.greek?.photo);
  const fraternities = chapters.filter((c) => c.greek?.kind === "fraternity").length;
  const sororities = chapters.length - fraternities;
  const housed = chapters.filter((c) => c.greek?.housed).length;

  return (
    <>
      {/* ---- Hero ------------------------------------------------------ */}
      <section className="relative isolate">
        {hero?.greek?.photo && (
          <div className="absolute inset-0 -z-10">
            <Image
              src={hero.greek.photo}
              alt={`${hero.name} chapter house at Iowa State`}
              fill
              priority
              sizes="100vw"
              className="object-cover object-[60%_50%]"
            />
            <div className="absolute inset-0 bg-black/55 sm:hidden" />
            <div className="absolute inset-0 hidden bg-gradient-to-r from-black/80 via-black/55 to-black/15 sm:block" />
          </div>
        )}

        <div className="on-cardinal shell flex min-h-[500px] flex-col justify-center py-20 sm:min-h-[560px] sm:py-24">
          <div className="max-w-2xl">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-1.5 text-[13px] font-medium">
                <li>
                  <Link href="/" className="link-on-cardinal">
                    Home
                  </Link>
                </li>
                <li className="flex items-center gap-1.5">
                  <ChevronRight size={13} strokeWidth={2.5} aria-hidden className="text-white/60" />
                  <span aria-current="page" className="text-white/80">
                    Greek life
                  </span>
                </li>
              </ol>
            </nav>
            <h1 className="display mt-6 text-[42px] text-white sm:text-[64px]">
              Find your <span className="text-gold">chapter</span>.
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-white/90 sm:text-[18px]">
              Every fraternity and sorority at Iowa State, compared by council,
              housing, and philanthropy, in the chapters&apos; own words.
            </p>

            <dl className="mt-9 grid grid-cols-2 gap-x-10 gap-y-5 border-t border-white/25 pt-6 sm:flex">
              {[
                { value: fraternities, label: "Fraternities" },
                { value: sororities, label: "Sororities" },
                { value: COUNCILS.length, label: "Councils" },
                { value: housed, label: "Houses" },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/70">
                    {stat.label}
                  </dt>
                  <dd className="display mt-1 text-[30px] tabular-nums text-white sm:text-[34px]">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <Suspense fallback={<BrowserFallback />}>
        <GreekBrowser />
      </Suspense>
    </>
  );
}

function BrowserFallback() {
  return (
    <div className="shell py-16 sm:py-24">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-[168px] rounded-[14px]" />
        ))}
      </div>
      <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-[360px] rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}

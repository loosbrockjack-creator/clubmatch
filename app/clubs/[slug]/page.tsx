import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  Clock,
  FileText,
  Flag,
  House,
  Landmark,
  UserPlus,
} from "lucide-react";
import { ClubMark } from "@/components/club-mark";
import { InterestedButton } from "@/components/interested-button";
import { MemberButton } from "@/components/member-button";
import { ClubCommunity } from "@/components/club-community";
import { ClubInterestButton, ClubInterestNote } from "@/components/club-interest-button";
import { TrackedLink, ViewTracker } from "@/components/club-trackers";
import { WhyItFits } from "@/components/why-it-fits";
import { ClubCard } from "@/components/club-card";
import { ChapterFacts } from "@/components/chapter-facts";
import { ChapterQuote } from "@/components/chapter-quote";
import { clubs } from "@/lib/clubs";
import { getClub } from "@/lib/clubs-detail";
import { getClubOverlay } from "@/lib/club-overlay";
import { clubUrl, shareDescription, shareTitle, SITE_URL } from "@/lib/club-seo";
import { photoForClub } from "@/lib/photos";
import {
  CAREER_BY_ID,
  COMMITMENT_TEXT,
  COUNCIL_BY_ID,
  GREEK_KIND_LABEL,
  SFE_INTEREST_FORM,
  majorsForAreas,
} from "@/lib/taxonomy";

/**
 * Pages stay statically generated (ISR). Officer edits come from club_profiles
 * through getClubOverlay: a save revalidates this page right away, and this
 * window is the backstop for anything else, like a plan lapsing by date.
 */
export const revalidate = 60;

export function generateStaticParams() {
  return clubs.map((club) => ({ slug: club.slug }));
}

/** How many clubs carry each category, used to weight overlap by rarity. */
const CATEGORY_COUNTS = clubs.reduce((counts, club) => {
  for (const category of club.categories) {
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return counts;
}, new Map<string, number>());

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const club = getClub(slug);
  if (!club) return { title: "Club not found" };
  const overlay = await getClubOverlay(slug);
  const description = shareDescription(overlay?.tagline, overlay?.description, club.tagline);
  const image = overlay?.photos[0] ?? photoForClub(club).src;
  const title = shareTitle(club.name);
  return {
    metadataBase: new URL(SITE_URL),
    title: club.name,
    description,
    alternates: { canonical: `/clubs/${slug}` },
    openGraph: {
      title,
      description,
      url: `/clubs/${slug}`,
      siteName: "ClubMatch",
      type: "website",
      images: [{ url: image, alt: `${club.name} on ClubMatch` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

/** Categories so broad that sharing one says little about two clubs. */
const CATCH_ALL = new Set(["Hobbies & Special Interest", "Leadership & Government"]);

const TOPIC_STOPWORDS = new Set(["club", "and", "the", "of", "for", "students", "student"]);

function sharedWords(a: string[], b: string[]) {
  const words = (topics: string[]) =>
    new Set(
      topics
        .flatMap((t) => t.toLowerCase().split(/[^a-z0-9]+/))
        .filter((w) => w.length > 2 && !TOPIC_STOPWORDS.has(w)),
    );
  const left = words(a);
  let count = 0;
  for (const word of words(b)) if (left.has(word)) count += 1;
  return count;
}

/** Stable per club pair, so ties spread out instead of sorting A to Z. */
function tieBreak(base: string, slug: string) {
  let h = 5381;
  const input = base + slug;
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
  return h >>> 0;
}

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const directoryClub = getClub(slug);
  if (!directoryClub) notFound();

  // A row exists only while the club is active, so this is also the claim check.
  const overlay = await getClubOverlay(slug);
  const verified = Boolean(overlay);
  const club = overlay?.tagline ? { ...directoryClub, tagline: overlay.tagline } : directoryClub;
  const officerDescription = overlay?.description ?? null;
  const officerMeeting = overlay?.meeting_info ?? null;
  const officerLinks = overlay?.links ?? [];
  const officerPhotos = overlay?.photos ?? [];

  const majors = majorsForAreas(club.academicAreas);
  const greek = club.greek;
  const chapter = club.greekDetail;
  const council = greek?.council ? COUNCIL_BY_ID[greek.council] : null;

  // Thin registry entries give a one-line description, which then becomes both
  // the tagline and the whole summary. Don't print the same sentence twice.
  const taglineStem = club.tagline.replace(/\.\.\.$/, "").trim();
  const summaryIsOneSentence = !/[.!?]\s+\S/.test(club.summary);
  const summaryAddsNothing =
    !officerDescription && club.summary.startsWith(taglineStem) && summaryIsOneSentence;
  // A chapter's tagline is the first sentence of its own description, so the
  // About section picks up where the header left off instead of repeating it.
  const aboutText = officerDescription
    ? officerDescription
    : greek && !club.tagline.endsWith("...") && club.summary.startsWith(club.tagline)
      ? club.summary.slice(club.tagline.length).trim()
      : club.summary;

  // "Biweekly" on its own reads like a stray word under a how-to heading.
  const meetingNote = officerMeeting || (club.meetingDetail.length >= 40 ? club.meetingDetail : "");

  // Chapter tiles show only what SFE states. SFE publishes no time
  // commitment, so there is no Time tile, and a fact SFE leaves out is
  // dropped rather than shown as "not listed".
  const chapterFacts = greek
    ? [
        council && { icon: Landmark, label: "Council", value: council.name },
        chapter?.foundedLocal && {
          icon: CalendarDays,
          label: "At Iowa State",
          value: `Since ${chapter.foundedLocal}`,
        },
        greek.housed !== null && {
          icon: House,
          label: "Housing",
          value: greek.housed ? "Chapter house" : "No chapter house",
        },
        chapter?.foundedNational && {
          icon: Flag,
          label: "Founded",
          value: `Nationally in ${chapter.foundedNational}`,
        },
      ].filter((fact) => Boolean(fact)) as {
        icon: typeof Clock;
        label: string;
        value: string;
      }[]
    : [];

  const facts = greek
    ? chapterFacts
    : [
    { icon: Clock, label: "Time", value: COMMITMENT_TEXT[club.commitmentLevel] },
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

  // Chapters compare against chapters: same council first, then same kind.
  // Ties break on a hash of both slugs, so each chapter gets its own set of
  // neighbors instead of every page listing the same "Alpha" chapters.
  const pairHash = (other: string) => {
    let h = 5381;
    const key = `${club.slug}:${other}`;
    for (let i = 0; i < key.length; i++) h = (h * 33) ^ key.charCodeAt(i);
    return h >>> 0;
  };
  const relatedChapters = greek
    ? clubs
        .filter((other) => other.greek && other.id !== club.id)
        .map((other) => ({
          club: other,
          score:
            (other.greek?.council === greek.council ? 2 : 0) +
            (other.greek?.kind === greek.kind ? 1 : 0) +
            (other.greek?.photo ? 0.5 : 0),
        }))
        .sort((a, b) => b.score - a.score || pairHash(a.club.slug) - pairHash(b.club.slug))
        .slice(0, 3)
        .map((entry) => entry.club)
    : [];

  // Raw overlap counts are useless here: "Special Interest" covers 143 clubs,
  // and 33 clubs are tagged with a dozen-plus categories, so a plain count made
  // Solar Car look similar to every student association on campus. Weight each
  // shared tag by how rare it is, then damp clubs that are tagged with
  // everything, so a genuinely narrow overlap outranks a broad one.
  const rarity = (count: number) => Math.log(clubs.length / Math.max(count, 1));

  const related = clubs
    .filter((other) => other.id !== club.id)
    .map((other) => {
      const shared =
        other.categories
          .filter((c) => club.categories.includes(c))
          .reduce(
            (sum, c) =>
              sum + rarity(CATEGORY_COUNTS.get(c) ?? 1) * (CATCH_ALL.has(c) ? 0.3 : 1),
            0,
          ) +
        other.academicAreas.filter((a) => club.academicAreas.includes(a)).length *
          1.5 +
        other.careerPaths.filter((c) => club.careerPaths.includes(c)).length * 1.2 +
        // Shared topics ("dance", "k-pop") are the most specific overlap.
        other.topics.filter((t) => club.topics.includes(t)).length * 2.5 +
        // "k-pop dance" and "dance" share a word; that still counts, less.
        sharedWords(club.topics, other.topics) * 0.8 +
        (other.wants[0] && other.wants[0] === club.wants[0] ? 0.3 : 0);

      // Damp breadth: a club tagged with everything should not win on volume.
      return {
        club: other,
        score: shared / Math.sqrt(Math.max(other.categories.length, 1)),
      };
    })
    .filter((entry) => entry.score > 0)
    // Equal scores would otherwise fall back to the alphabet, which handed
    // every hobby club the same three "A" neighbors. Hash against this club.
    .sort((a, b) => b.score - a.score || tieBreak(club.slug, a.club.slug) - tieBreak(club.slug, b.club.slug))
    .slice(0, 3)
    .map((entry) => entry.club);
  const similar = greek ? relatedChapters : related;

  // Two chapters are on SFE's list without a page of their own; link the list.
  const sfeLink = chapter?.sfeUrl
    ? { href: chapter.sfeUrl, label: "Chapter page on SFE" }
    : greek
      ? {
          href: `https://sfe.dso.iastate.edu/${greek.kind === "fraternity" ? "fraternities" : "sororities"}`,
          label: "SFE chapter list",
        }
      : { href: undefined, label: "" };

  const chapterLinks = [
    sfeLink,
    { href: chapter?.chapterWebsite, label: "Chapter website" },
    { href: chapter?.nationalWebsite, label: "National website" },
    {
      href: chapter?.socialUrl,
      label: chapter?.socialUrl.includes("instagram.com") ? "Instagram" : "Social media",
    },
    { href: club.stuorgUrl, label: "Stuorg page" },
    { href: council?.url, label: `About the ${council?.name}` },
  ].filter((link): link is { href: string; label: string } => Boolean(link.href));

  // Credit only what this chapter's record actually draws on. Chapters with an
  // empty SFE page carry stuorg text, and eight use a stock cover photo.
  const hasSfeText = Boolean(chapter?.motto || chapter?.philanthropy || chapter?.quote || chapter?.foundedLocal);
  const chapterSource = greek
    ? [
        hasSfeText
          ? greek.photo
            ? "Chapter details and photo come from Iowa State's Office of Sorority and Fraternity Engagement"
            : "Chapter details come from Iowa State's Office of Sorority and Fraternity Engagement; the cover is a stock photo"
          : club.stuorgUrl
            ? "This chapter's SFE page is empty, so details come from Iowa State's student organization directory; the cover is a stock photo"
            : "This chapter is on SFE's list, but its SFE page has no details yet; the cover is a stock photo",
        club.memberCount ? `${club.memberCount} student members listed on stuorg` : "",
      ]
        .filter(Boolean)
        .join(" · ") + "."
    : "";

  // Clubs have no photos of their own, so the banner is keyed to category.
  // Only one is ever on screen at a time, so the reuse is invisible. Greek
  // chapters show the photo from their own SFE page.
  const directoryPhoto = photoForClub(club);
  // Officer uploads are already sized and live on Supabase, so they skip the optimizer.
  const photo = officerPhotos[0]
    ? {
        src: officerPhotos[0],
        alt: `${club.name}, photo from the club's officers`,
        quality: undefined,
        own: true,
        unoptimized: true,
      }
    : { ...directoryPhoto, unoptimized: false };

  // Only what's on record about this club. A stock photo or watercolor isn't its
  // image, and anything an officer typed is escaped below, because it lands inside
  // a script tag.
  const realPhoto = officerPhotos[0] ?? (greek?.photo ? directoryPhoto.src : undefined);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: club.name,
    url: clubUrl(club.slug),
    description: officerDescription || club.tagline || undefined,
    alternateName: chapter?.nickname || undefined,
    image: realPhoto ? new URL(realPhoto, SITE_URL).toString() : undefined,
    memberOf: { "@type": "CollegeOrUniversity", name: "Iowa State University" },
    sameAs: [
      ...officerLinks.map((link) => link.url),
      club.stuorgUrl,
      chapter?.chapterWebsite,
      chapter?.nationalWebsite,
      chapter?.socialUrl,
    ].filter(Boolean),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ViewTracker slug={club.slug} />
      {/* Category banner, or the chapter's own photo */}
      {/* A chapter's own photo is often a group shot, so it gets a taller
          frame anchored higher to keep faces clear of the header card. */}
      <div
        className={`relative ${photo.own ? "h-[240px] sm:h-[420px]" : "h-[180px] sm:h-[280px]"}`}
      >
        <Image
          src={photo.src}
          alt={photo.alt}
          quality={photo.quality}
          unoptimized={photo.unoptimized}
          fill
          priority
          sizes="100vw"
          className={`object-cover ${photo.own ? "object-[50%_30%]" : "object-[50%_40%]"}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-black/10" />
      </div>

      <div className="shell pb-8">
        <div className="mx-auto max-w-4xl">
          <header className="card relative -mt-14 border-t-[3px] border-t-cardinal px-6 py-8 sm:-mt-20 sm:px-9 sm:py-10">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium">
                <li>
                  <Link href="/" className="link-isu">
                    Home
                  </Link>
                </li>
                <li className="flex items-center gap-1.5">
                  <ChevronRight
                    size={13}
                    strokeWidth={2.5}
                    aria-hidden
                    className="text-ink-muted"
                  />
                  <Link href={greek ? "/greek" : "/explore"} className="link-isu">
                    {greek ? "Greek life" : "Explore"}
                  </Link>
                </li>
                <li className="flex min-w-0 items-center gap-1.5">
                  <ChevronRight
                    size={13}
                    strokeWidth={2.5}
                    aria-hidden
                    className="shrink-0 text-ink-muted"
                  />
                  <span aria-current="page" className="truncate text-ink-soft">
                    {club.name}
                  </span>
                </li>
              </ol>
            </nav>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <ClubMark mark={greek?.letters || club.mark} size="xl" />
                <div>
                  <h1 className="display text-[30px] text-ink sm:text-[40px]">
                    {club.name}
                  </h1>
                  {verified && (
                    <p
                      data-verified-badge
                      className="mt-2.5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink"
                    >
                      <BadgeCheck size={16} strokeWidth={2} aria-hidden className="text-cardinal" />
                      Verified by officers
                    </p>
                  )}
                  {greek ? (
                    <>
                      <p className="mt-2.5 text-[14px] font-semibold text-cardinal">
                        {GREEK_KIND_LABEL[greek.kind]}
                        {council && ` · ${council.name}`}
                      </p>
                      {(chapter?.nickname || greek.affiliations.length > 0) && (
                        <p className="mt-1 text-[14px] text-ink-muted">
                          {[
                            chapter?.nickname && `Known as ${chapter.nickname}`,
                            ...greek.affiliations,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      {club.college && (
                        <p className="mt-2.5 text-[14px] font-semibold text-cardinal">
                          {club.college}
                        </p>
                      )}
                      {/* Over-tagged clubs list 18 categories. Four is the most
                          that stays readable; the rest are just noise. */}
                      <p className="mt-1 text-[14px] text-ink-muted">
                        {club.categories.slice(0, 4).join(" · ")}
                        {club.categories.length > 4 &&
                          ` + ${club.categories.length - 4} more`}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div id="club-actions" className="mt-7 scroll-mt-[96px]" data-club-actions>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
                {verified && <ClubInterestButton slug={club.slug} clubName={club.name} />}
                <InterestedButton slug={club.slug} clubName={club.name} quiet={verified} />
                <MemberButton slug={club.slug} clubName={club.name} />
              </div>
              {verified && <ClubInterestNote slug={club.slug} />}
            </div>
            <div className="mt-7 h-1 w-[54px] bg-gold" />

            <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-ink sm:text-[18px]">
              {club.tagline}
            </p>

          </header>

          <WhyItFits club={club} />

          {facts.length > 0 && (
          <section className="mt-10">
            <h2 className="sr-only">Quick facts</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="border-t-2 border-line pt-4">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                    <Icon size={13} strokeWidth={2} aria-hidden />
                    {label}
                  </span>
                  <p className="mt-2.5 text-[15px] font-bold leading-snug tracking-[-0.01em] text-ink">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>
          )}

          {!summaryAddsNothing && aboutText && (
            <section className="mt-14">
              <h2 className="display gold-rule text-[26px] text-ink">
                {greek ? "About the chapter" : "About the club"}
              </h2>
              <p className="mt-4 max-w-2xl whitespace-pre-line text-[16px] leading-relaxed text-ink-soft">
                {aboutText}
              </p>
            </section>
          )}

          {officerPhotos.length > 1 && (
            <section className="mt-10">
              <h2 className="sr-only">Club photos</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {officerPhotos.slice(1).map((src) => (
                  <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-[12px] bg-muted">
                    <Image
                      src={src}
                      alt={`${club.name}, photo from the club's officers`}
                      fill
                      unoptimized
                      sizes="(min-width: 640px) 280px, 45vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {officerLinks.length > 0 && (
            <section className="mt-10">
              <h2 className="eyebrow">Find the club online</h2>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2.5 text-[15px]">
                {officerLinks.map((link) => (
                  <li key={link.url}>
                    <TrackedLink
                      slug={club.slug}
                      href={link.url}
                      className="link-isu inline-flex min-h-11 items-center gap-1 sm:min-h-0"
                    >
                      {link.label}
                      <ArrowUpRight size={13} strokeWidth={2} aria-hidden />
                    </TrackedLink>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {chapter?.quote && (
            <ChapterQuote quote={chapter.quote} author={chapter.quoteAuthor} />
          )}

          {greek && chapter && <ChapterFacts club={club} chapter={chapter} />}

          {(club.whatYouDo.length > 0 || club.whatYouGain.length > 0) && (
            <div className="mt-14 grid gap-10 sm:grid-cols-2">
              {club.whatYouDo.length > 0 && (
                <section>
                  <h2 className="display gold-rule text-[24px] text-ink">
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
                          className="mt-[9px] h-1.5 w-1.5 shrink-0 bg-cardinal"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {club.whatYouGain.length > 0 && (
                <section>
                  <h2 className="display gold-rule text-[24px] text-ink">
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
                          className="mt-[9px] h-1.5 w-1.5 shrink-0 bg-gold"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {!greek && (
          <section className="mt-14">
            <h2 className="display gold-rule text-[26px] text-ink">Best for</h2>
            {club.bestFor && (
              <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
                {club.bestFor}
              </p>
            )}

            <div className="mt-6 space-y-4">
              {(majors.length > 0 || club.openToAllMajors) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-full text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted sm:w-[104px]">
                    Majors
                  </span>
                  {majors.map((major) => (
                    <span key={major} className="chip">
                      {major}
                    </span>
                  ))}
                  {club.openToAllMajors && (
                    <span className="chip chip-cardinal">Open to all majors</span>
                  )}
                </div>
              )}
              {club.careerPaths.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-full text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted sm:w-[104px]">
                    Careers
                  </span>
                  {club.careerPaths.map((id) => (
                    <span key={id} className="chip">
                      {CAREER_BY_ID[id].label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
          )}

          {greek ? (
            <section className="on-cardinal panel-cardinal mt-14 px-6 py-9 sm:px-9 sm:py-10">
              <h2 className="display text-[26px] text-white">How to join</h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/90">
                {council
                  ? council.joining
                  : `${club.name} is not listed with a council, so reach out to the chapter directly or start with the SFE office's interest form.`}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <InterestedButton slug={club.slug} clubName={club.name} onCardinal />
                <a
                  href={SFE_INTEREST_FORM}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost-on-cardinal w-full sm:w-auto"
                >
                  SFE interest form
                  <ArrowUpRight size={15} strokeWidth={2} aria-hidden />
                </a>
              </div>

              {chapterLinks.length > 0 && (
                <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2.5 border-t border-white/20 pt-6 text-[14px]">
                  {chapterLinks.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="link-on-cardinal inline-flex items-center gap-1 font-semibold"
                      >
                        {link.label}
                        <ArrowUpRight size={13} strokeWidth={2} aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-6 text-[13px] text-white/70">
                {chapterSource}
              </p>
            </section>
          ) : (
          <section className="on-cardinal panel-cardinal mt-14 px-6 py-9 sm:px-9 sm:py-10">
            <h2 className="display text-[26px] text-white">
              How to get involved
            </h2>
            {meetingNote ? (
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/90">
                {meetingNote}
              </p>
            ) : (
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/90">
                Add {club.name} to your list, then check their Iowa State page
                for current officers and the next meeting. Most groups here
                welcome students who simply show up.
              </p>
            )}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <InterestedButton slug={club.slug} clubName={club.name} onCardinal />
              <TrackedLink
                slug={club.slug}
                href={club.stuorgUrl}
                className="btn btn-ghost-on-cardinal w-full sm:w-auto"
              >
                Visit club on stuorg
                <ArrowUpRight size={15} strokeWidth={2} aria-hidden />
              </TrackedLink>
            </div>
            <p className="mt-5 text-[13px] text-white/70">
              {`${
                verified
                  ? "Officers keep this page up to date; other details"
                  : "Details"
              } come from Iowa State's student organization directory${
                club.memberCount
                  ? ` · ${club.memberCount} student members listed`
                  : ""
              }.`}
            </p>
          </section>
          )}

          <ClubCommunity slug={club.slug} clubName={club.name} claimed={verified} />

          {similar.length > 0 && (
            <section className="mt-16">
              <h2 className="display gold-rule text-[26px] text-ink">
                {greek ? "Similar chapters" : "Similar clubs"}
              </h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {similar.map((other) => (
                  <ClubCard key={other.id} club={other} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

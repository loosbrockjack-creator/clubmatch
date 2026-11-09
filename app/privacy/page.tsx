import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What ClubMatch stores about you, who can see it, and how to delete it.",
};

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "What we store",
    body: (
      <>
        <p>
          Without an account, your quiz answers and saved clubs stay in your browser. Nothing
          is sent to us.
        </p>
        <p>
          With an account we store your Iowa State email, the profile details you choose to add
          (name, photo, major, class year, bio, interests, what you&apos;re looking for, and
          links), your quiz answers, the clubs you save, and the clubs you say you&apos;re in.
        </p>
      </>
    ),
  },
  {
    title: "Other students",
    body: (
      <>
        <p>
          Your public profile is your name, photo, major, class year, bio, interests, what
          you&apos;re looking for, links, and the clubs you&apos;re in. Signed-in Iowa State
          students can see it. People who aren&apos;t signed in and search engines can&apos;t.
        </p>
        <p>
          You choose which interests show. You can hide your whole profile in{" "}
          <Link href="/account#settings" className="link-isu">
            Account settings
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    title: "Club officers",
    body: (
      <>
        <p>
          Club officers on ClubMatch can see your public profile and a match %, which is how well
          you fit their club, even if you&apos;ve never contacted that club, unless you turn off{" "}
          <Link href="/account#settings" className="link-isu">
            Let clubs find me
          </Link>
          . It&apos;s on by default. Hiding your profile also takes you out of these lists.
        </p>
        <p>
          Separately, if you mark yourself a member of a club, or tell a club you&apos;re
          interested, that club&apos;s officers can see your public profile even with Let clubs
          find me off. This works club by club, and you can undo it.
        </p>
        <p>
          Officers never see your raw quiz answers, your email, or the clubs you&apos;ve saved.
          They can see totals, like how many students saved their club or viewed its page, and
          which majors those students are in, but not who they are.
        </p>
      </>
    ),
  },
  {
    title: "Always private",
    body: (
      <p>
        Your email, your quiz answers, and your saved clubs are for you only. Nobody else on
        ClubMatch can see them.
      </p>
    ),
  },
  {
    title: "What we don't do",
    body: (
      <p>
        Your information is never shared outside ClubMatch. We don&apos;t sell your data, show ads,
        or give your information to the university or anyone else. ClubMatch is an independent
        student project and is not affiliated with Iowa State University.
      </p>
    ),
  },
  {
    title: "Where it lives",
    body: (
      <p>
        Accounts and data are stored with Supabase (database and file storage) and the site
        is hosted on Vercel, both in the United States. Sign-in codes are sent by email.
      </p>
    ),
  },
  {
    title: "Deleting your data",
    body: (
      <p>
        Delete your account any time from Account, then Settings. That permanently removes
        your profile, photo, quiz answers, saved clubs, and memberships. Questions or requests:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="link-isu">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        title="Privacy"
        intro="The short version: your info stays inside ClubMatch, you control who sees your profile, and you can delete it any time."
      />
      <div className="shell max-w-3xl space-y-12 pb-12 pt-12">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="display gold-rule mb-4 text-[24px] text-ink">{section.title}</h2>
            <div className="space-y-4 text-[15.5px] leading-relaxed text-ink-soft">
              {section.body}
            </div>
          </section>
        ))}
        <p className="text-[13px] text-ink-muted">Last updated November 2026.</p>
      </div>
    </>
  );
}

import type { Metadata } from "next";
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
          (name, photo, major, class year, bio, links), your quiz answers, the clubs you save,
          and the clubs you say you&apos;re in.
        </p>
      </>
    ),
  },
  {
    title: "Who can see it",
    body: (
      <>
        <p>
          Your profile and the clubs you&apos;re in are visible to other signed-in Iowa State
          students. Never to search engines or people who aren&apos;t signed in.
        </p>
        <p>
          Your email, quiz answers, and saved clubs are private to you. You can hide your
          profile entirely in Account settings.
        </p>
      </>
    ),
  },
  {
    title: "What we don't do",
    body: (
      <p>
        We don&apos;t sell your data, show ads, or share your information with clubs or the
        university. ClubMatch is an independent student project and is not affiliated with
        Iowa State University.
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
        your profile, photo, saved clubs, and memberships. Questions or requests:{" "}
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
        crumbs={[{ href: "/privacy", label: "Privacy" }]}
        title="Privacy"
        intro="The short version: we keep only what makes your account work, and you can delete it any time."
      />
      <div className="shell max-w-3xl space-y-12 pb-12 pt-12">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="display gold-rule text-[24px] text-ink">{section.title}</h2>
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

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
          Without an account, your quiz answers and saved clubs stay in your browser. The one
          exception is what we record to give clubs totals: which clubs appeared in your results,
          which club pages you open and links you click, and your general academic area, with a
          random device ID and not your name. It&apos;s used only for totals clubs can see. Your
          other answers stay on your device.
        </p>
        <p>
          With an account we store your Iowa State email, the profile details you choose to add
          (name, photo, major, class year, bio, interests, what you&apos;re looking for, and
          links), your quiz answers, the clubs you save, and the clubs you say you&apos;re in.
        </p>
        <p>
          If you upload a resume or LinkedIn PDF, or paste your LinkedIn profile, to fill in the
          quiz, it&apos;s read once to pick your answers and then discarded. We never store the
          file or the text. That upload or paste, and your quiz answers when we write your match
          reasons, are processed by our AI provider, Anthropic, only to do that. Your gender and
          communities are never sent.
        </p>
        <p>
          The communities question (faith, culture, and similar) is optional. The gender question
          only decides whether we show clubs built for women or for men. Clubs never see either
          answer or the interests you pick, and none of them affects which students a club can
          find.
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
          Officers of a paid club you fit can also send you one in-app invite per club. They
          can&apos;t see whether you read it or muted their club. Mute a club or turn off Let clubs
          find me to stop invites.
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
        We never sell your information or share it outside ClubMatch, except with the service
        providers listed below that we need to run the site. We don&apos;t show ads or give your
        information to the university. ClubMatch is an independent student project and is not
        affiliated with Iowa State University.
      </p>
    ),
  },
  {
    title: "Where it lives",
    body: (
      <>
        <p>
          Accounts and data are stored with Supabase (database and file storage) and the site
          is hosted on Vercel, both in the United States. Sign-in codes are sent by email.
        </p>
        <p>
          If you&apos;re an officer who pays for a club, Stripe handles the payment and receives
          your email and card details. If you ask to claim a club, your email, role, and note are
          sent to us by email through Resend so we can review it.
        </p>
      </>
    ),
  },
  {
    title: "Deleting your data",
    body: (
      <>
        <p>
          Delete your account any time from Account, then Settings. That permanently removes
          your profile, photo, quiz answers, saved clubs, and memberships. Questions or requests:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="link-isu">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <p>
          If you paid for a club, we stop your subscription: at the end of the paid period, or right
          away if you were its last officer. Stripe keeps its own billing records, such as receipts,
          as payment rules require. Email us to ask about those.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        title="Privacy"
        intro="The short version: we never sell your info, you control who sees your profile, and you can delete it any time."
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

import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: "The ground rules for using ClubMatch.",
};

const RULES: { title: string; body: string }[] = [
  {
    title: "Who can join",
    body: "Accounts are for people with an active @iastate.edu email. One account per person.",
  },
  {
    title: "Be real and be decent",
    body: "Use your own name and photo, and only say you're in clubs you're actually in. No harassment, hate, spam, impersonation, or explicit content in your profile. We can remove content or accounts that break these rules.",
  },
  {
    title: "Club information",
    body: "Club details come from Iowa State's public directories and our own summaries. They can be out of date, so check a club's own page before you show up. Fit scores are suggestions, not guarantees.",
  },
  {
    title: "Claiming a club",
    body: "Officers can ask to claim their club's page. We confirm each request by hand before the admin panel turns on. If a club's page is turned off, it goes back to its directory listing and we keep what officers added. Featured spots are always labeled, and running a page never changes a student's match scores.",
  },
  {
    title: "Good-fit students and messages",
    body: "Officers of a paid club can see students who fit it: public profile details and a match percentage, never quiz answers. Turning off Let clubs find me, or hiding your profile, keeps you off that list. If you leave Let clubs find me on, officers of a club you fit can send you one in-app invite. Officers can also send in-app messages to members and to students who told them they're interested. You can mute any club from your inbox.",
  },
  {
    title: "Not an official service",
    body: "ClubMatch is an independent student project. It is not affiliated with or endorsed by Iowa State University, and it's provided as is.",
  },
  {
    title: "Changes",
    body: "If these terms change in a way that matters, we'll update this page and the date below.",
  },
];

export default function TermsPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ href: "/terms", label: "Terms" }]}
        title="Terms"
        intro="Short and plain. Using a ClubMatch account means you agree to these."
      />
      <div className="shell max-w-3xl space-y-12 pb-12 pt-12">
        {RULES.map((rule) => (
          <section key={rule.title}>
            <h2 className="display gold-rule text-[24px] text-ink">{rule.title}</h2>
            <p className="text-[15.5px] leading-relaxed text-ink-soft">{rule.body}</p>
          </section>
        ))}
        <p className="text-[14px] text-ink-soft">
          See something that breaks the rules? Use Report on the profile, or email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="link-isu">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <p className="text-[13px] text-ink-muted">Last updated November 2026.</p>
      </div>
    </>
  );
}

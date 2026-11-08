import Link from "next/link";
import { clubs } from "@/lib/clubs";
import { CONTACT_EMAIL } from "@/lib/site";

const columns = [
  {
    heading: "Find clubs",
    links: [
      { href: "/match", label: "Take the quiz" },
      { href: "/explore", label: "Browse all clubs" },
      { href: "/greek", label: "Greek life" },
      { href: "/saved", label: "Saved clubs" },
    ],
  },
  {
    heading: "Your account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/account", label: "My account" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
  {
    heading: "Iowa State",
    links: [
      { href: "https://www.stuorg.iastate.edu/", label: "Student organizations" },
      { href: "https://sfe.dso.iastate.edu/", label: "Sorority and Fraternity Engagement" },
      { href: "https://www.student.iastate.edu/", label: "Student life" },
      { href: "https://www.iastate.edu/", label: "iastate.edu" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="on-cardinal mt-16 bg-cardinal text-white">
      <div className="shell py-14">
        <p className="wordmark text-[30px] leading-none">ClubMatch</p>
        <p className="mt-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/70">
          Iowa State University
        </p>

        <div className="mt-10 h-px bg-white/25" />

        <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <p className="max-w-sm text-[14px] leading-relaxed text-white/85">
            An independent student project, not affiliated with or endorsed
            by Iowa State University. It covers{" "}
            {clubs.length} organizations from Iowa State&apos;s student
            organization directory and its Sorority and Fraternity Engagement
            office. Fit scores and category tags are ours, so check a
            group&apos;s own page before you show up.
          </p>

          {columns.map((column) => (
            <nav key={column.heading}>
              <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-gold">
                {column.heading}
              </h2>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => {
                  const external = link.href.startsWith("http");
                  return (
                    <li key={link.href}>
                      {external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="link-on-cardinal text-[14px] font-medium"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="link-on-cardinal text-[14px] font-medium"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="bg-cardinal-deep">
        <div className="shell py-5">
          <div className="flex flex-col gap-2 text-[12.5px] text-white/70 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Built for ENTSP 3100 at Iowa State University. Club images are
              original watercolors or Pexels photos; chapter photos come from
              each chapter&apos;s SFE page.
            </p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="link-on-cardinal font-medium">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

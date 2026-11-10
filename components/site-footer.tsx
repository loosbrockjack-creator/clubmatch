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
    <footer className="site-footer on-cardinal overflow-hidden bg-cardinal text-white">
      <div className="shell pt-14 sm:pt-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="wordmark text-[30px] leading-none">ClubMatch</p>
            <p className="mt-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/70">
              Iowa State University
            </p>
            <p className="mt-6 max-w-sm text-[14px] leading-relaxed text-white/85">
              An independent student project, not affiliated with or endorsed
              by Iowa State University. It covers{" "}
              {clubs.length} organizations from Iowa State&apos;s student
              organization directory and its Sorority and Fraternity Engagement
              office. Fit scores and category tags are ours, so check a
              group&apos;s own page before you show up.
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
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

        <div className="mt-12 flex flex-col gap-2 border-t border-white/25 pt-6 text-[12.5px] text-white/70 sm:flex-row sm:items-center sm:justify-between">
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

      {/* Decorative: the wordmark at full width, cropped by the footer edge. */}
      <div aria-hidden className="footer-bigword-wrap">
        <p className="wordmark footer-bigword">ClubMatch</p>
      </div>
    </footer>
  );
}

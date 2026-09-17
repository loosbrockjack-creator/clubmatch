import Link from "next/link";
import { clubs } from "@/lib/clubs";

const columns = [
  {
    heading: "Find clubs",
    links: [
      { href: "/match", label: "Take the quiz" },
      { href: "/explore", label: "Browse all clubs" },
      { href: "/saved", label: "Saved clubs" },
    ],
  },
  {
    heading: "Iowa State",
    links: [
      { href: "https://www.stuorg.iastate.edu/", label: "Student organizations" },
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

        <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]">
          <p className="max-w-sm text-[14px] leading-relaxed text-white/85">
            A student project, not an official university service. It covers all{" "}
            {clubs.length} organizations in Iowa State&apos;s student
            organization directory. Fit scores and category tags are ours, so
            check a group&apos;s own page before you show up.
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
          <p className="text-[12.5px] text-white/70">
            Built for ENTSP 3100 at Iowa State University. Photography from
            Pexels.
          </p>
        </div>
      </div>
    </footer>
  );
}

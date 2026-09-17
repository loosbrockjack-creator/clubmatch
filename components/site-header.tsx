"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/explore", label: "Explore" },
  { href: "/saved", label: "Saved" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const onMatch = pathname === "/match";
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white">
      {/* Gold hairline over cardinal, the ISU masthead signature. */}
      <div className="h-[3px] bg-gold" />

      <div className="border-b border-line">
        <div className="shell flex h-[68px] items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-baseline gap-2.5 text-ink"
            aria-label="ClubMatch home"
          >
            <span className="wordmark text-[22px] leading-none text-cardinal">
              ClubMatch
            </span>
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted sm:inline">
              Iowa State
            </span>
          </Link>

          {!onMatch && (
            <>
              <nav className="hidden items-center gap-1 sm:flex">
                {links.map((link) => {
                  const active = pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={`relative px-3 py-2 text-[15px] font-semibold transition-colors after:absolute after:inset-x-3 after:bottom-1 after:h-[2px] after:transition-colors ${
                        active
                          ? "text-ink after:bg-cardinal"
                          : "text-ink-soft after:bg-transparent hover:text-cardinal"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <Link
                  href="/match"
                  className="ml-3 inline-flex h-10 items-center rounded-[4px] bg-cardinal px-5 text-[14px] font-semibold text-white transition-colors hover:bg-cardinal-dark"
                >
                  Find my clubs
                </Link>
              </nav>

              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="mobile-nav"
                aria-label={open ? "Close menu" : "Open menu"}
                className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-[4px] text-cardinal transition-colors hover:bg-muted sm:hidden"
              >
                {open ? <X size={22} /> : <Menu size={22} />}
              </button>
            </>
          )}

          {onMatch && (
            <Link
              href="/"
              className="px-3 py-2 text-[15px] font-semibold text-ink-soft transition-colors hover:text-cardinal"
            >
              Exit
            </Link>
          )}
        </div>
      </div>

      {open && !onMatch && (
        <nav
          id="mobile-nav"
          className="border-b border-line bg-white shadow-sm sm:hidden"
        >
          <div className="shell flex flex-col py-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-line py-3.5 text-[16px] font-semibold text-ink"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/match"
              onClick={() => setOpen(false)}
              className="btn btn-primary my-4 w-full"
            >
              Find my clubs
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

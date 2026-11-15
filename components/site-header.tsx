"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { AccountMenu, InboxLink, MobileAccountLinks } from "./account-menu";
import { SaveTracker } from "./club-trackers";

const links = [
  { href: "/explore", label: "Explore" },
  { href: "/greek", label: "Greek life" },
  { href: "/saved", label: "Saved" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const onMatch = pathname === "/match";
  const [open, setOpen] = useState(false);

  // Close on navigation (back/forward included) and on Escape.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    // Hold the page still behind the open menu.
    const root = document.documentElement;
    root.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      root.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 bg-white">
      <SaveTracker />
      {/* Gold hairline over cardinal, the ISU masthead signature. */}
      <div className="h-[3px] bg-gold" />

      <div className="border-b border-line">
        <div
          className={`shell h-[68px] items-center gap-4 ${
            onMatch ? "flex justify-between" : "flex justify-between sm:grid sm:grid-cols-[1fr_auto_1fr]"
          }`}
        >
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
              <nav
                aria-label="Main"
                className="hidden items-center gap-2 sm:flex"
              >
                {links.map((link) => {
                  const active = pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className="nav-link"
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="hidden items-center justify-self-end sm:flex">
                <AccountMenu />
                <InboxLink className="mr-3 ml-1" />
                <Link href="/match" className="btn btn-primary h-10 gap-2 px-5 text-[14px]">
                  Find my clubs
                  <ArrowRight size={15} strokeWidth={2} aria-hidden className="btn-arrow" />
                </Link>
              </div>

              <div className="-mr-2 flex items-center gap-1 sm:hidden">
                <InboxLink className="h-11 w-11" />
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  aria-expanded={open}
                  aria-controls="mobile-nav"
                  aria-label={open ? "Close menu" : "Open menu"}
                  data-open={open}
                  className="menu-toggle inline-flex h-11 w-11 items-center justify-center rounded-[4px] text-cardinal transition-colors hover:bg-muted"
                >
                  <span aria-hidden className="menu-bars">
                    <span />
                    <span />
                    <span />
                  </span>
                </button>
              </div>
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

      {!onMatch && (
        <>
          {/* Dims the page under the open menu; tapping it closes the menu. */}
          <div
            aria-hidden
            data-open={open}
            onClick={() => setOpen(false)}
            className="mobile-nav-scrim sm:hidden"
          />
          <nav
            id="mobile-nav"
            aria-label="Menu"
            data-open={open}
            inert={!open}
            className="mobile-nav sm:hidden"
          >
            <div className="mobile-nav-inner">
              <div className="shell flex flex-col py-2">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="mobile-nav-item border-b border-line py-3.5 text-[16px] font-semibold text-ink"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="mobile-nav-item flex flex-col">
                  <MobileAccountLinks onNavigate={() => setOpen(false)} />
                </div>
                <Link
                  href="/match"
                  onClick={() => setOpen(false)}
                  className="mobile-nav-item btn btn-primary my-4 w-full"
                >
                  Find my clubs
                </Link>
              </div>
            </div>
          </nav>
        </>
      )}
    </header>
  );
}

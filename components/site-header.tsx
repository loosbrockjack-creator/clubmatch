"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/explore", label: "Explore" },
  { href: "/saved", label: "Saved" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const onMatch = pathname === "/match";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-sm">
      <div className="shell flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-[17px] font-bold tracking-tight text-ink"
        >
          <span
            aria-hidden
            className="inline-block h-[18px] w-[18px] rounded-[6px] bg-cardinal"
          />
          ClubMatch
        </Link>

        {!onMatch && (
          <nav className="flex items-center gap-1 sm:gap-2">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "text-ink"
                      : "text-ink-muted hover:bg-muted hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/match"
              className="ml-1 hidden h-10 items-center rounded-xl bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-black sm:inline-flex"
            >
              Find my clubs
            </Link>
          </nav>
        )}

        {onMatch && (
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-muted hover:text-ink"
          >
            Exit
          </Link>
        )}
      </div>
    </header>
  );
}

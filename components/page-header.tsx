import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * The Iowa State interior-page masthead: breadcrumb, serif title, gold rule.
 * Shared by Explore, Results, Saved and the club detail page so every interior
 * surface opens the same way.
 */
export function PageHeader({
  crumbs = [],
  title,
  intro,
  children,
}: {
  crumbs?: { href: string; label: string }[];
  title: string;
  intro?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b border-line bg-muted">
      <div className="shell py-10 sm:py-14">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium">
            <li>
              <Link href="/" className="link-isu">
                Home
              </Link>
            </li>
            {crumbs.map((crumb) => (
              <li key={crumb.href} className="flex items-center gap-1.5">
                <ChevronRight
                  size={13}
                  strokeWidth={2.5}
                  aria-hidden
                  className="text-ink-muted"
                />
                <Link href={crumb.href} className="link-isu">
                  {crumb.label}
                </Link>
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <ChevronRight
                size={13}
                strokeWidth={2.5}
                aria-hidden
                className="text-ink-muted"
              />
              <span aria-current="page" className="text-ink-soft">
                {title}
              </span>
            </li>
          </ol>
        </nav>

        <h1 className="display mt-5 text-[34px] text-cardinal sm:text-[46px]">
          {title}
        </h1>

        <div className="mt-5 h-1 w-[54px] bg-gold" />

        {intro && (
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-ink-soft">
            {intro}
          </p>
        )}

        {children}
      </div>
    </div>
  );
}

import Link from "next/link";
import { clubs } from "@/lib/clubs";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="shell flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md">
          <p className="text-[15px] font-semibold text-ink">ClubMatch</p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
            A student project for Iowa State. Covers all {clubs.length}{" "}
            organizations listed in the university&apos;s student organization
            directory. Fit scores and category tags are our own, so check each
            group&apos;s ISU page before you show up.
          </p>
        </div>
        <nav className="flex gap-6 text-[13px] font-medium text-ink-muted">
          <Link href="/match" className="hover:text-ink">
            Find my clubs
          </Link>
          <Link href="/explore" className="hover:text-ink">
            Explore
          </Link>
          <Link href="/saved" className="hover:text-ink">
            Saved
          </Link>
        </nav>
      </div>
    </footer>
  );
}

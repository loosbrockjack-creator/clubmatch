import { ArrowUpRight } from "lucide-react";
import { LinkIcon } from "./profile-link-icons";
import type { ResolvedLink } from "@/lib/profile-links";

/** Link tiles on a student page. Only ever receives links from resolveProfileLinks. */
export function ProfileLinkTiles({ links }: { links: ResolvedLink[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {links.map((link, index) => (
        <li key={`${link.href}-${index}`}>
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="card card-interactive group flex items-center gap-3.5 p-3.5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-muted text-ink">
              <LinkIcon kind={link.kind} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14.5px] font-semibold text-ink">{link.title}</span>
              <span className="block truncate text-[13px] text-ink-muted">{link.detail}</span>
            </span>
            <ArrowUpRight
              size={16}
              strokeWidth={1.75}
              aria-hidden
              className="shrink-0 text-ink-muted transition-colors duration-150 group-hover:text-ink"
            />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

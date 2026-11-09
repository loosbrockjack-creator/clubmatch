"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Inbox } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { signOut, useAccount } from "@/lib/account";
import { refreshUnread, useOfficerClubs, useUnreadCount } from "@/lib/club-client";
import { getClubSummary } from "@/lib/clubs";

/** Header inbox icon with an unread dot. Renders nothing when signed out. */
export function InboxLink({ className = "" }: { className?: string }) {
  const account = useAccount();
  const pathname = usePathname();
  const unread = useUnreadCount();
  const userId = account.userId;

  useEffect(() => {
    void refreshUnread(userId);
    const onFocus = () => void refreshUnread(userId);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [userId, pathname]);

  if (account.status !== "signed-in") return null;
  return (
    <Link
      href="/inbox"
      aria-label={unread > 0 ? `Inbox, ${unread} unread` : "Inbox"}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-[4px] text-ink-soft transition-colors hover:bg-muted hover:text-cardinal ${className}`}
    >
      <Inbox size={20} strokeWidth={1.75} aria-hidden />
      {unread > 0 && (
        <span
          aria-hidden
          data-unread-dot
          className="absolute right-[7px] top-[7px] h-2.5 w-2.5 rounded-full border-2 border-white bg-cardinal"
        />
      )}
    </Link>
  );
}

/** Desktop header control: "Sign in", or the student's avatar with a menu. */
export function AccountMenu() {
  const account = useAccount();
  const pathname = usePathname();
  const router = useRouter();
  // The menu remembers the page it was opened on, so navigating closes it
  // without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (next: boolean | ((v: boolean) => boolean)) =>
    setOpenOn((typeof next === "function" ? next(open) : next) ? pathname : null);
  const ref = useRef<HTMLDivElement>(null);
  const officerClubs = useOfficerClubs();

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpenOn(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenOn(null);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (account.status === "loading") {
    return <span aria-hidden className="ml-2 inline-block h-9 w-9 rounded-full bg-muted" />;
  }

  if (account.status === "signed-out") {
    const next = pathname === "/" || pathname === "/login" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return (
      <Link
        href={`/login${next}`}
        className="ml-1 px-3 py-2 text-[15px] font-semibold text-ink-soft transition-colors hover:text-cardinal"
      >
        Sign in
      </Link>
    );
  }

  const profile = account.profile;
  const name = profile?.display_name || account.email;
  const manageItems = officerClubs.map((slug) => ({
    href: `/manage/${slug}`,
    label: `Manage ${getClubSummary(slug)?.name ?? "club"}`,
  }));

  return (
    <div ref={ref} className="relative ml-2">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Your account"
        onClick={() => setOpen((v) => !v)}
        className="flex rounded-full"
      >
        <Avatar name={name} url={profile?.avatar_url} preset={profile?.avatar_preset} size={36} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] w-60 overflow-hidden rounded-[8px] border border-line bg-white py-1.5 shadow-lg"
        >
          <div className="border-b border-line px-4 pb-3 pt-2">
            <p className="truncate text-[14px] font-semibold text-ink">{profile?.display_name || "Signed in"}</p>
            <p className="truncate text-[12.5px] text-ink-muted">{account.email}</p>
          </div>
          {[
            { href: "/account", label: "My account" },
            { href: "/account#clubs", label: "My clubs" },
            ...(profile ? [{ href: `/students/${profile.id}`, label: "View my profile" }] : []),
            { href: "/inbox", label: "Inbox" },
            ...manageItems,
          ].map((item) => (
            <Link
              key={item.href}
              role="menuitem"
              href={item.href}
              className="block px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.push("/");
            }}
            className="block w-full border-t border-line px-4 py-2.5 text-left text-[14px] font-medium text-ink-soft hover:bg-muted hover:text-ink"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/** Mobile menu rows for the same actions. */
export function MobileAccountLinks({ onNavigate }: { onNavigate: () => void }) {
  const account = useAccount();
  const router = useRouter();
  const officerClubs = useOfficerClubs();

  if (account.status !== "signed-in") {
    return (
      <Link href="/login" onClick={onNavigate} className="border-b border-line py-3.5 text-[16px] font-semibold text-ink">
        Sign in
      </Link>
    );
  }
  return (
    <>
      <Link href="/account" onClick={onNavigate} className="border-b border-line py-3.5 text-[16px] font-semibold text-ink">
        My account
      </Link>
      <Link href="/inbox" onClick={onNavigate} className="border-b border-line py-3.5 text-[16px] font-semibold text-ink">
        Inbox
      </Link>
      {officerClubs.map((slug) => (
        <Link
          key={slug}
          href={`/manage/${slug}`}
          onClick={onNavigate}
          className="border-b border-line py-3.5 text-[16px] font-semibold text-ink"
        >
          Manage {getClubSummary(slug)?.name ?? "club"}
        </Link>
      ))}
      <button
        type="button"
        onClick={async () => {
          onNavigate();
          await signOut();
          router.push("/");
        }}
        className="border-b border-line py-3.5 text-left text-[16px] font-semibold text-ink-soft"
      >
        Sign out
      </button>
    </>
  );
}

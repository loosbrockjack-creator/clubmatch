"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Building2, Flag, Gauge, Radar, Users } from "lucide-react";
import { useAccount } from "@/lib/account";
import { apiFetch } from "@/lib/club-client";
import { ADMIN_SECTIONS, type AdminOverview, type AdminSection } from "@/lib/admin-types";
import { ClaimsTab, ClubsTab, DemandTab, OverviewTab, ReportsTab, StudentsTab } from "./admin-tabs";

const TABS: { id: AdminSection; label: string; icon: typeof Gauge }[] = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "claims", label: "Claims", icon: BadgeCheck },
  { id: "students", label: "Students", icon: Users },
  { id: "clubs", label: "Clubs", icon: Building2 },
  { id: "demand", label: "Demand", icon: Radar },
  { id: "reports", label: "Reports", icon: Flag },
];

type Gate = { userId: string; state: "allowed" | "denied" | "error"; pending?: number };

export function AdminPanel() {
  const account = useAccount();
  const router = useRouter();
  const search = useSearchParams();
  const userId = account.userId;
  const [gate, setGate] = useState<Gate | null>(null);

  const asked = search.get("tab");
  const tab: AdminSection = (ADMIN_SECTIONS as readonly string[]).includes(asked ?? "")
    ? (asked as AdminSection)
    : "overview";

  useEffect(() => {
    if (account.status === "signed-out") router.replace(`/login?next=${encodeURIComponent("/admin")}`);
  }, [account.status, router]);

  // The overview call doubles as the access check: 404 means not an admin.
  useEffect(() => {
    if (account.status !== "signed-in" || !userId) return;
    let cancelled = false;
    void apiFetch<AdminOverview>("/api/admin/overview").then((res) => {
      if (cancelled) return;
      if (res.data) setGate({ userId, state: "allowed", pending: res.data.claims.pending });
      else setGate({ userId, state: res.status === 404 ? "denied" : "error" });
    });
    return () => {
      cancelled = true;
    };
  }, [account.status, userId]);

  const current = gate?.userId === userId ? gate : null;
  const tabList = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = tabList.current;
    const active = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !active) return;
    list.scrollTo({ left: active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2 });
  }, [tab, current?.state]);

  if (current?.state === "denied") return <NotFound />;

  if (current?.state === "error") {
    return (
      <div className="shell py-20">
        <div role="alert" className="card mx-auto max-w-md px-6 py-10 text-center">
          <p className="text-[15px] text-ink-soft">Couldn&apos;t reach the dashboard. Check your connection.</p>
          <button type="button" onClick={() => window.location.reload()} className="btn btn-secondary mt-5">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="shell py-12" aria-busy="true" aria-label="Loading">
        <div className="skeleton h-10 w-56 rounded-[8px]" />
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 rounded-[14px]" />
          ))}
        </div>
        <div className="skeleton mt-6 h-64 rounded-[14px]" />
      </div>
    );
  }

  return (
    <>
      <header className="border-b border-line bg-muted">
        <div className="shell flex flex-col gap-1 py-8 sm:py-10">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Owner dashboard</p>
          <h1 className="display text-[30px] leading-tight text-ink sm:text-[36px]">ClubMatch admin</h1>
          <p className="text-[14px] text-ink-soft">Only your account can open this page. Signed in as {account.email}.</p>
        </div>
      </header>

      <nav aria-label="Dashboard sections" className="sticky top-[71px] z-30 border-b border-line bg-white">
        <div className="shell">
          <ul ref={tabList} className="relative -mx-5 flex gap-1 overflow-x-auto px-5 md:mx-0 md:px-0">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = id === tab;
              return (
                <li key={id} className="shrink-0">
                  <Link
                    href={`/admin?tab=${id}`}
                    scroll={false}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex h-[52px] items-center gap-2 px-3 text-[14.5px] font-semibold transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:transition-colors ${
                      active ? "text-ink after:bg-cardinal" : "text-ink-muted after:bg-transparent hover:text-ink"
                    }`}
                  >
                    <Icon size={15} strokeWidth={1.75} aria-hidden />
                    {label}
                    {id === "claims" && (current.pending ?? 0) > 0 && (
                      <span className="rounded-full bg-cardinal px-1.5 py-px text-[11.5px] font-bold tabular-nums text-white">
                        {current.pending}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="shell pb-16 pt-9">
        {tab === "overview" && <OverviewTab />}
        {tab === "claims" && (
          <ClaimsTab onPendingChange={(pending) => userId && setGate({ userId, state: "allowed", pending })} />
        )}
        {tab === "students" && <StudentsTab />}
        {tab === "clubs" && <ClubsTab />}
        {tab === "demand" && <DemandTab />}
        {tab === "reports" && <ReportsTab />}
      </div>
    </>
  );
}

/** Same look as the site's 404, so the page doesn't confirm it exists. */
function NotFound() {
  return (
    <div className="shell py-28">
      <div className="mx-auto max-w-md text-center">
        <p className="eyebrow">404</p>
        <h1 className="display mt-5 text-[34px] text-cardinal">We could not find that page.</h1>
        <div className="mx-auto mt-5 h-1 w-[54px] bg-gold" />
        <p className="mt-5 text-[15.5px] leading-relaxed text-ink-soft">
          The club or page you were looking for may have moved.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/explore" className="btn btn-primary">
            Browse all clubs
          </Link>
          <Link href="/" className="btn btn-secondary">
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

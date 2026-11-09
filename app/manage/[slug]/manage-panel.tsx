"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  ExternalLink,
  Lock,
  Megaphone,
  PencilLine,
  Sparkles,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useAccount } from "@/lib/account";
import { apiFetch } from "@/lib/club-client";
import type { ManageAccess } from "@/lib/club-types";
import { PanelSkeleton } from "./shared";
import { ProfileTab } from "./tab-profile";
import { EventsTab } from "./tab-events";
import { MembersTab } from "./tab-members";
import { LeadsTab } from "./tab-leads";
import { CampaignsTab } from "./tab-campaigns";
import { AnalyticsTab } from "./tab-analytics";
import { BillingTab } from "./tab-billing";

const TABS = [
  { id: "profile", label: "Profile", icon: PencilLine },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "members", label: "Members", icon: Users },
  { id: "leads", label: "Leads", icon: Sparkles },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "billing", label: "Billing", icon: CreditCard },
] as const;
type TabId = (typeof TABS)[number]["id"];

type Denied = { status: number; message: string };

export function ManagePanel({ slug, clubName }: { slug: string; clubName: string }) {
  const account = useAccount();
  const router = useRouter();
  const search = useSearchParams();
  const userId = account.userId;
  const [access, setAccess] = useState<{ userId: string; value: ManageAccess } | null>(null);
  const [denied, setDenied] = useState<{ userId: string; value: Denied } | null>(null);

  const asked = search.get("tab");
  const tab: TabId = TABS.some((t) => t.id === asked) ? (asked as TabId) : "profile";

  useEffect(() => {
    if (account.status === "signed-out") {
      router.replace(`/login?next=${encodeURIComponent(`/manage/${slug}`)}`);
    }
  }, [account.status, router, slug]);

  useEffect(() => {
    if (account.status !== "signed-in" || !userId) return;
    let cancelled = false;
    void apiFetch<ManageAccess | { allowed: false }>(`/api/manage/${slug}/access`).then((res) => {
      if (cancelled) return;
      if (res.data?.allowed) setAccess({ userId, value: res.data });
      else if (res.data) setDenied({ userId, value: { status: 403, message: "" } });
      else setDenied({ userId, value: { status: res.status, message: res.error ?? "" } });
    });
    return () => {
      cancelled = true;
    };
  }, [account.status, userId, slug]);

  const header = (
    <PageHeader crumbs={[{ href: `/clubs/${slug}`, label: clubName }]} title={`Manage ${clubName}`} />
  );

  const current = access?.userId === userId ? access.value : null;
  const refusal = denied?.userId === userId ? denied.value : null;

  if (refusal) {
    return (
      <>
        {header}
        <div className="shell py-12">
          <Denial slug={slug} clubName={clubName} refusal={refusal} />
        </div>
      </>
    );
  }

  if (!current) {
    return (
      <>
        {header}
        <div className="shell py-10">
          <PanelSkeleton />
        </div>
      </>
    );
  }

  if (current.status === "lapsed" || current.status === "unclaimed") {
    return (
      <>
        {header}
        <div className="shell py-12">
          <div className="card mx-auto max-w-xl px-6 py-10 text-center">
            <Lock size={24} strokeWidth={1.5} aria-hidden className="mx-auto text-ink-muted" />
            <h2 className="display mt-4 text-[24px] text-ink">
              {current.status === "lapsed" ? "Your plan has ended" : "This club isn't claimed yet"}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-ink-soft">
              {current.status === "lapsed"
                ? `${clubName}'s page is back to the directory listing. Everything you added is saved and comes back as soon as you renew.`
                : `You're listed as an officer of ${clubName}. Claim the page to open the admin panel.`}
            </p>
            <Link href={`/clubs/${slug}/claim`} className="btn btn-primary mt-6">
              {current.status === "lapsed" ? "Renew the plan" : "Claim this club"}
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader crumbs={[{ href: `/clubs/${slug}`, label: clubName }]} title={`Manage ${clubName}`}>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px]">
          <Link href={`/clubs/${slug}`} className="link-isu inline-flex items-center gap-1.5">
            View your public page
            <ExternalLink size={13} strokeWidth={2} aria-hidden />
          </Link>
          {current.status === "past_due" && (
            <Link href={`/manage/${slug}?tab=billing`} className="chip chip-gold">
              Payment problem: check Billing
            </Link>
          )}
        </div>
      </PageHeader>

      <nav aria-label="Admin sections" className="sticky top-[71px] z-30 border-b border-line bg-white">
        <div className="shell">
          <ul className="-mx-5 flex gap-1 overflow-x-auto px-5 md:mx-0 md:px-0">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = id === tab;
              return (
                <li key={id} className="shrink-0">
                  <Link
                    href={`/manage/${slug}?tab=${id}`}
                    scroll={false}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex h-[52px] items-center gap-2 px-3 text-[14.5px] font-semibold transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:transition-colors ${
                      active ? "text-ink after:bg-cardinal" : "text-ink-muted after:bg-transparent hover:text-ink"
                    }`}
                  >
                    <Icon size={15} strokeWidth={1.75} aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="shell pb-12 pt-9">
        {tab === "profile" && <ProfileTab slug={slug} clubName={clubName} access={current} onAccess={(value) => userId && setAccess({ userId, value })} />}
        {tab === "events" && <EventsTab slug={slug} />}
        {tab === "members" && <MembersTab slug={slug} clubName={clubName} />}
        {tab === "leads" && <LeadsTab slug={slug} clubName={clubName} />}
        {tab === "campaigns" && <CampaignsTab slug={slug} />}
        {tab === "analytics" && <AnalyticsTab slug={slug} />}
        {tab === "billing" && <BillingTab slug={slug} access={current} />}
      </div>
    </>
  );
}

function Denial({ slug, clubName, refusal }: { slug: string; clubName: string; refusal: Denied }) {
  if (refusal.status === 403) {
    return (
      <div className="card mx-auto max-w-xl px-6 py-10 text-center" data-manage-denied>
        <Lock size={24} strokeWidth={1.5} aria-hidden className="mx-auto text-ink-muted" />
        <h2 className="display mt-4 text-[24px] text-ink">This panel is for {clubName}&apos;s officers</h2>
        <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-ink-soft">
          Your account isn&apos;t an officer of this club. If you run it, claim the page. If it&apos;s
          already claimed, ask another officer to add you.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={`/clubs/${slug}/claim`} className="btn btn-primary">
            Claim this club
          </Link>
          <Link href={`/clubs/${slug}`} className="btn btn-secondary">
            Back to the club
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div role="alert" className="card mx-auto max-w-xl px-6 py-10 text-center">
      <p className="text-[15px] text-ink-soft">{refusal.message || "Couldn't open this panel."}</p>
      <Link href={`/clubs/${slug}`} className="btn btn-secondary mt-5">
        Back to the club
      </Link>
    </div>
  );
}

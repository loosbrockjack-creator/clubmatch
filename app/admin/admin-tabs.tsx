"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Copy, Download, Search, X } from "lucide-react";
import { apiFetch } from "@/lib/club-client";
import { getSupabase } from "@/lib/supabase";
import { EmptyState, PanelError, PanelSkeleton, SectionTitle, usePanelData } from "@/app/manage/[slug]/shared";
import type {
  AdminClaim,
  AdminClub,
  AdminDemand,
  AdminOverview,
  AdminReport,
  AdminStudent,
  ClubHealth,
  Count,
  Exportable,
} from "@/lib/admin-types";

/* ---------- small helpers ---------- */

const DAY = 86_400_000;

function ago(iso: string | null) {
  if (!iso) return "Never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60 * 60_000) return `${Math.max(1, Math.round(ms / 60_000))}m ago`;
  if (ms < DAY) return `${Math.round(ms / 3_600_000)}h ago`;
  if (ms < 30 * DAY) return `${Math.round(ms / DAY)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

const pct = (part: number, whole: number) => (whole === 0 ? "0%" : `${Math.round((part / whole) * 100)}%`);

function Pill({ tone = "neutral", children }: { tone?: "neutral" | "good" | "warn" | "bad" | "accent"; children: React.ReactNode }) {
  const tones = {
    neutral: "border-line bg-muted text-ink-soft",
    good: "border-[#cfe6d6] bg-[#f1f8f3] text-[#1f6b3a]",
    warn: "border-gold-deep/40 bg-gold-tint text-[#7a5a10]",
    bad: "border-cardinal/25 bg-cardinal-tint text-cardinal-dark",
    accent: "border-cardinal/25 bg-cardinal-tint text-cardinal",
  } as const;
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-[6px] border px-1.5 py-px text-[12px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

function ExportButton({ table }: { table: Exportable }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function download() {
    setBusy(true);
    setFailed(false);
    try {
      const session = (await getSupabase()?.auth.getSession())?.data.session;
      const res = await fetch(`/api/admin/${table}?format=csv`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `clubmatch-${table}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" onClick={() => void download()} disabled={busy} className="btn btn-secondary h-9 gap-1.5 px-3 text-[13.5px]">
      <Download size={14} strokeWidth={2} aria-hidden />
      {busy ? "Exporting" : failed ? "Retry CSV" : "Export CSV"}
    </button>
  );
}

function Header({ title, intro, table }: { title: string; intro: string; table?: Exportable }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <SectionTitle title={title} intro={intro} />
      {table && <div className="mb-5 shrink-0">{<ExportButton table={table} />}</div>}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return (
    <div className="card px-5 py-5">
      <p className="text-[13px] font-medium text-ink-muted">{label}</p>
      <p className="mt-1.5 text-[30px] font-semibold leading-none tabular-nums text-ink">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {note && <p className="mt-2 text-[12.5px] text-ink-muted">{note}</p>}
    </div>
  );
}

function Bars({ rows, empty }: { rows: Count[]; empty: string }) {
  if (rows.length === 0) return <p className="text-[14px] text-ink-muted">{empty}</p>;
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.label} className="grid grid-cols-[minmax(0,1fr)_88px_32px] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_160px_32px]">
          <span className="truncate text-[13.5px] text-ink-soft">{row.label}</span>
          <span className="h-2 rounded-r-[3px] bg-muted-deep" aria-hidden>
            <span className="block h-full rounded-r-[3px] bg-ink/70" style={{ width: `${(row.count / max) * 100}%` }} />
          </span>
          <span className="text-right text-[13.5px] font-semibold tabular-nums text-ink">{row.count}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Overview ---------- */

export function OverviewTab() {
  const { data, error, reload } = usePanelData<AdminOverview>("/api/admin/overview");
  if (error) return <PanelError message={error} onRetry={() => void reload()} />;
  if (!data) return <PanelSkeleton />;
  const s = data.students;
  const trend = s.last7d - s.prev7d;
  const maxWeek = Math.max(1, ...data.weekly.map((w) => w.count));

  const attention = [
    data.claims.pending > 0 && {
      href: "/admin?tab=claims",
      text: `${data.claims.pending} claim ${data.claims.pending === 1 ? "request" : "requests"} waiting`,
      sub: data.claims.oldestPendingAt ? `Oldest sent ${ago(data.claims.oldestPendingAt)}` : "",
    },
    data.clubs.pastDue > 0 && { href: "/admin?tab=clubs", text: `${data.clubs.pastDue} club payment past due`, sub: "" },
    data.clubs.canceling > 0 && { href: "/admin?tab=clubs", text: `${data.clubs.canceling} club set to cancel`, sub: "" },
    data.clubs.quiet > 0 && {
      href: "/admin?tab=clubs",
      text: `${data.clubs.quiet} active ${data.clubs.quiet === 1 ? "club has" : "clubs have"} gone quiet`,
      sub: "No event or profile edit in 30 days",
    },
  ].filter(Boolean) as { href: string; text: string; sub: string }[];

  return (
    <div className="space-y-10">
      <section aria-label="Students">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Stat
            label="Signed up"
            value={s.signedUp}
            note={`${s.last7d} this week${trend === 0 ? "" : `, ${trend > 0 ? "+" : ""}${trend} vs last`}`}
          />
          <Stat label="Made a profile" value={s.onboarded} note={`${pct(s.onboarded, s.signedUp)} of signups`} />
          <Stat label="Took the quiz" value={s.tookQuiz} note={`${pct(s.tookQuiz, s.signedUp)} of signups`} />
          <Stat label="Interested in a club" value={s.interested} note={`${pct(s.interested, s.signedUp)} of signups`} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="card px-5 py-6 sm:px-7">
          <h2 className="text-[15.5px] font-semibold text-ink">Signups by week</h2>
          <p className="mt-1 text-[13px] text-ink-muted">Last 12 weeks, weeks start Monday.</p>
          <div className="mt-6 flex h-40 items-end gap-1.5 sm:gap-2" role="img" aria-label={`Weekly signups: ${data.weekly.map((w) => `${shortDate(w.weekStart)} ${w.count}`).join(", ")}`}>
            {data.weekly.map((week, i) => (
              <div key={week.weekStart} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[11.5px] font-semibold tabular-nums text-ink-muted">{week.count || ""}</span>
                <span
                  className={`w-full rounded-t-[3px] ${i === data.weekly.length - 1 ? "bg-cardinal" : "bg-ink/70"}`}
                  style={{ height: `${Math.max(week.count > 0 ? 4 : 1, (week.count / maxWeek) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11.5px] text-ink-muted">
            <span>{shortDate(data.weekly[0].weekStart)}</span>
            <span>This week</span>
          </div>
        </section>

        <section className="card px-5 py-6 sm:px-7">
          <h2 className="text-[15.5px] font-semibold text-ink">Needs your attention</h2>
          {attention.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 text-[14px] text-ink-soft">
              <Check size={16} strokeWidth={2} aria-hidden className="text-[#1f6b3a]" />
              Nothing waiting on you.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {attention.map((item) => (
                <li key={item.text}>
                  <Link href={item.href} scroll={false} className="flex items-start gap-2.5 py-3 hover:text-cardinal">
                    <AlertTriangle size={16} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 text-cardinal" />
                    <span>
                      <span className="block text-[14.5px] font-semibold">{item.text}</span>
                      {item.sub && <span className="block text-[13px] text-ink-muted">{item.sub}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-5">
            {[
              ["Clubs running", data.clubs.active + data.clubs.pastDue + data.clubs.canceling],
              ["On a paid plan", data.clubs.paid],
              ["Claim page views", data.claimViews30d],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[12.5px] text-ink-muted">{label}</dt>
                <dd className="mt-0.5 text-[18px] font-semibold tabular-nums text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[12px] text-ink-muted">Claim page views are the last 30 days.</p>
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card px-5 py-6 sm:px-7">
          <h2 className="mb-4 text-[15.5px] font-semibold text-ink">Top majors</h2>
          <Bars rows={data.majors} empty="No majors entered yet." />
        </section>
        <section className="card px-5 py-6 sm:px-7">
          <h2 className="mb-4 text-[15.5px] font-semibold text-ink">Class year</h2>
          <Bars rows={data.classYears} empty="No class years entered yet." />
        </section>
      </div>
    </div>
  );
}

/* ---------- Claims ---------- */

export function ClaimsTab({ onPendingChange }: { onPendingChange: (pending: number) => void }) {
  const { data, setData, error, reload } = usePanelData<AdminClaim[]>("/api/admin/claims");
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  if (error) return <PanelError message={error} onRetry={() => void reload()} />;
  if (!data) return <PanelSkeleton />;
  const pending = data.filter((c) => c.status === "pending");
  const rows = filter === "pending" ? pending : data;

  function decided(id: string, status: "approved" | "rejected") {
    const next = (data ?? []).map((c) => (c.id === id ? { ...c, status, reviewedAt: new Date().toISOString() } : c));
    setData(next);
    onPendingChange(next.filter((c) => c.status === "pending").length);
  }

  return (
    <div>
      <Header
        title="Claim requests"
        intro="Officers asking to run their club's page. Approving turns on their admin panel and emails them, the same as the links in your alert email."
        table="claims"
      />
      <div role="group" aria-label="Filter" className="mb-5 flex gap-1.5">
        {(["pending", "all"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`chip transition-colors ${filter === value ? "border-cardinal bg-cardinal-tint text-cardinal" : "hover:border-line-strong hover:bg-muted-deep"}`}
          >
            {value === "pending" ? `Waiting (${pending.length})` : `All (${data.length})`}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState title={filter === "pending" ? "No requests waiting" : "No claim requests yet"}>
          When an officer asks to claim a club, it shows up here and in your email.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((claim) => (
            <ClaimCard key={claim.id} claim={claim} onDecided={decided} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ClaimCard({ claim, onDecided }: { claim: AdminClaim; onDecided: (id: string, status: "approved" | "rejected") => void }) {
  const [confirm, setConfirm] = useState<"approved" | "rejected" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approved" | "rejected") {
    setBusy(true);
    setError(null);
    const res = await apiFetch<{ status: string }>("/api/admin/claims", {
      method: "POST",
      body: JSON.stringify({ id: claim.id, decision }),
    });
    setBusy(false);
    if (res.data) onDecided(claim.id, decision);
    else setError(res.error);
    setConfirm(null);
  }

  return (
    <li className="card px-5 py-5 sm:px-6" data-claim={claim.id}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/clubs/${claim.clubSlug}`} className="text-[16px] font-semibold text-ink hover:text-cardinal">
              {claim.clubName}
            </Link>
            {claim.status === "pending" && <Pill tone="accent">Waiting</Pill>}
            {claim.status === "approved" && <Pill tone="good">Approved</Pill>}
            {claim.status === "rejected" && <Pill>Rejected</Pill>}
          </div>
          <p className="mt-1 break-all text-[14px] text-ink-soft">
            {claim.email} <span className="text-ink-muted">·</span> {claim.role}
          </p>
          {claim.note && <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-soft">&ldquo;{claim.note}&rdquo;</p>}
          <p className="mt-2 text-[12.5px] text-ink-muted">
            Sent {ago(claim.createdAt)}
            {claim.reviewedAt && `, decided ${ago(claim.reviewedAt)}`}
            {claim.claimViews30d > 0 && `, claim page viewed ${claim.claimViews30d}x in 30 days`}
          </p>
        </div>
        {claim.status === "pending" && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {confirm ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void decide(confirm)}
                  className={`btn h-9 px-3.5 text-[13.5px] ${confirm === "approved" ? "btn-primary" : "btn-secondary"}`}
                >
                  {busy ? "Saving" : confirm === "approved" ? "Yes, approve and email" : "Yes, reject and email"}
                </button>
                <button type="button" disabled={busy} onClick={() => setConfirm(null)} className="btn btn-secondary h-9 px-3 text-[13.5px]">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setConfirm("approved")} className="btn btn-primary h-9 gap-1.5 px-3.5 text-[13.5px]">
                  <Check size={14} strokeWidth={2.25} aria-hidden />
                  Approve
                </button>
                <button type="button" onClick={() => setConfirm("rejected")} className="btn btn-secondary h-9 gap-1.5 px-3.5 text-[13.5px]">
                  <X size={14} strokeWidth={2.25} aria-hidden />
                  Reject
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[13.5px] text-cardinal">
          {error}
        </p>
      )}
    </li>
  );
}

/* ---------- Students ---------- */

const PAGE = 50;
type StudentFilter = "all" | "profile" | "no-profile" | "officers";

export function StudentsTab() {
  const { data, error, reload } = usePanelData<AdminStudent[]>("/api/admin/students");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StudentFilter>("all");
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((s) => {
      if (filter === "profile" && !s.onboarded) return false;
      if (filter === "no-profile" && s.onboarded) return false;
      if (filter === "officers" && s.officerOf.length === 0) return false;
      if (!q) return true;
      return [s.name, s.email, s.major, ...s.officerOf].some((v) => v?.toLowerCase().includes(q));
    });
  }, [data, query, filter]);

  if (error) return <PanelError message={error} onRetry={() => void reload()} />;
  if (!data) return <PanelSkeleton />;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  const filters: [StudentFilter, string][] = [
    ["all", `All (${data.length})`],
    ["profile", `Made a profile (${data.filter((s) => s.onboarded).length})`],
    ["no-profile", `No profile yet (${data.filter((s) => !s.onboarded).length})`],
    ["officers", `Officers (${data.filter((s) => s.officerOf.length > 0).length})`],
  ];

  return (
    <div>
      <Header title="Students" intro="Everyone who signed up, newest first. Signed up means they verified an @iastate.edu email. Made a profile means they finished onboarding." table="students" />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter" className="flex flex-wrap gap-1.5">
          {filters.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(value);
                setPage(0);
              }}
              className={`chip transition-colors ${filter === value ? "border-cardinal bg-cardinal-tint text-cardinal" : "hover:border-line-strong hover:bg-muted-deep"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="relative block lg:w-72">
          <span className="sr-only">Search students</span>
          <Search size={15} strokeWidth={2} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Name, email, major, club"
            className="field h-10 w-full pl-9"
          />
        </label>
      </div>

      {shown.length === 0 ? (
        <EmptyState title={data.length === 0 ? "No signups yet" : "No students match"}>
          {data.length === 0 ? "Students appear here as soon as they sign in for the first time." : "Try a different search or filter."}
        </EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-[14px]">
            <thead className="border-b border-line bg-muted text-[12.5px] font-semibold text-ink-muted">
              <tr>
                <th className="px-4 py-2.5 sm:px-5">Student</th>
                <th className="hidden px-4 py-2.5 md:table-cell">Major, year</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="hidden px-4 py-2.5 text-right lg:table-cell">Interested</th>
                <th className="hidden px-4 py-2.5 text-right lg:table-cell">Saved</th>
                <th className="hidden px-4 py-2.5 sm:table-cell">Joined</th>
                <th className="hidden px-4 py-2.5 xl:table-cell">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((s) => (
                <tr key={s.id} className="align-top">
                  <td className="max-w-0 px-4 py-3 sm:px-5">
                    {s.onboarded && s.visible ? (
                      <Link href={`/students/${s.id}`} className="block truncate font-semibold text-ink hover:text-cardinal">
                        {s.name || "No name"}
                      </Link>
                    ) : (
                      <span className="block truncate font-semibold text-ink">{s.name || "No name"}</span>
                    )}
                    <span className="block truncate text-[13px] text-ink-muted">{s.email ?? "No email"}</span>
                    <span className="block truncate text-[13px] text-ink-muted md:hidden">
                      {[s.major, s.classYear].filter(Boolean).join(", ")}
                    </span>
                    {s.officerOf.length > 0 && (
                      <span className="mt-1 block truncate text-[12.5px] text-cardinal">Officer: {s.officerOf.join(", ")}</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft md:table-cell">
                    {s.major || <span className="text-ink-muted">No major</span>}
                    {s.classYear && <span className="block text-[13px] text-ink-muted">{s.classYear}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {s.onboarded ? <Pill tone="good">Profile</Pill> : <Pill>No profile</Pill>}
                      {s.tookQuiz && <Pill>Quiz</Pill>}
                      {!s.visible && <Pill tone="warn">Hidden</Pill>}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-right tabular-nums lg:table-cell">{s.interests}</td>
                  <td className="hidden px-4 py-3 text-right tabular-nums lg:table-cell">{s.saves}</td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-ink-soft sm:table-cell">{ago(s.createdAt)}</td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-ink-soft xl:table-cell">{ago(s.lastSignIn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-[13.5px] text-ink-muted">
          <span>
            {page * PAGE + 1} to {Math.min(rows.length, (page + 1) * PAGE)} of {rows.length}
          </span>
          <div className="flex gap-2">
            <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="btn btn-secondary h-9 px-3 text-[13.5px]">
              Previous
            </button>
            <button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="btn btn-secondary h-9 px-3 text-[13.5px]">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Clubs ---------- */

const HEALTH: Record<ClubHealth, { label: string; tone: "good" | "warn" | "bad" | "neutral" }> = {
  active: { label: "Active", tone: "good" },
  past_due: { label: "Past due", tone: "bad" },
  canceling: { label: "Canceling", tone: "warn" },
  lapsed: { label: "Lapsed", tone: "neutral" },
};

export function ClubsTab() {
  const { data, error, reload } = usePanelData<AdminClub[]>("/api/admin/clubs");
  if (error) return <PanelError message={error} onRetry={() => void reload()} />;
  if (!data) return <PanelSkeleton />;
  const running = data.filter((c) => c.health !== "lapsed");

  return (
    <div>
      <Header
        title="Clubs on ClubMatch"
        intro="Every club with an approved officer. Quiet means no new event and no profile edit in 30 days, the clubs most likely to drift away."
        table="clubs"
      />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Running" value={running.length} />
        <Stat label="Paid plan" value={running.filter((c) => c.paid).length} note="Free while pricing is open" />
        <Stat label="Quiet" value={data.filter((c) => c.quiet).length} />
        <Stat label="Lapsed" value={data.length - running.length} />
      </div>
      {data.length === 0 ? (
        <EmptyState title="No clubs yet">Clubs show up here once you approve an officer&apos;s claim.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-[14px]">
            <thead className="border-b border-line bg-muted text-[12.5px] font-semibold text-ink-muted">
              <tr>
                <th className="px-4 py-2.5 sm:px-5">Club</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="hidden px-4 py-2.5 text-right md:table-cell">Officers</th>
                <th className="hidden px-4 py-2.5 text-right md:table-cell">Members</th>
                <th className="hidden px-4 py-2.5 lg:table-cell">Last event</th>
                <th className="hidden px-4 py-2.5 lg:table-cell">Profile edited</th>
                <th className="hidden px-4 py-2.5 text-right sm:table-cell">Views, 30d</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((club) => (
                <tr key={club.slug} className="align-top">
                  <td className="max-w-0 px-4 py-3 sm:px-5">
                    <Link href={`/clubs/${club.slug}`} className="block truncate font-semibold text-ink hover:text-cardinal">
                      {club.name}
                    </Link>
                    <span className="block text-[13px] text-ink-muted">Since {ago(club.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Pill tone={HEALTH[club.health].tone}>{HEALTH[club.health].label}</Pill>
                      {club.paid && <Pill tone="accent">Paid</Pill>}
                      {club.quiet && <Pill tone="warn">Quiet</Pill>}
                      {club.payerGone && club.paid && <Pill tone="bad">Payer left</Pill>}
                      {club.renewsSoon && club.periodEnd && <Pill>Renews {ago(club.periodEnd).replace(" ago", "")}</Pill>}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-right tabular-nums md:table-cell">{club.officers}</td>
                  <td className="hidden px-4 py-3 text-right tabular-nums md:table-cell">{club.members}</td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-ink-soft lg:table-cell">{ago(club.lastEventAt)}</td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-ink-soft lg:table-cell">{ago(club.profileUpdatedAt)}</td>
                  <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">{club.views30d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- Demand ---------- */

function pitchLine(row: AdminDemand) {
  const parts = [];
  if (row.interests > 0) parts.push(`${row.interests} ${row.interests === 1 ? "student has" : "students have"} said they're interested`);
  if (row.saves > 0) parts.push(`${row.saves} saved it`);
  if (row.views30d > 0) parts.push(`the page was opened ${row.views30d} ${row.views30d === 1 ? "time" : "times"} in the last 30 days`);
  return parts.length
    ? `On ClubMatch, ${row.name} is getting attention: ${parts.join(", ")}. Claim the page to see who and reach them.`
    : `${row.name} is listed on ClubMatch. Claim the page to see who's finding you.`;
}

export function DemandTab() {
  const { data, error, reload } = usePanelData<AdminDemand[]>("/api/admin/demand");
  const [copied, setCopied] = useState<string | null>(null);
  if (error) return <PanelError message={error} onRetry={() => void reload()} />;
  if (!data) return <PanelSkeleton />;

  async function copy(row: AdminDemand) {
    try {
      await navigator.clipboard.writeText(pitchLine(row));
      setCopied(row.slug);
      window.setTimeout(() => setCopied((c) => (c === row.slug ? null : c)), 1800);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div>
      <Header
        title="Unclaimed demand"
        intro="Clubs students are paying attention to that don't have an officer on ClubMatch yet. Your outreach list, strongest first. Copy a pitch line to paste into an email."
        table="demand"
      />
      {data.length === 0 ? (
        <EmptyState title="No signal yet">Clubs show up here once students view, save, or mark interest in them.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-[14px]">
            <thead className="border-b border-line bg-muted text-[12.5px] font-semibold text-ink-muted">
              <tr>
                <th className="px-4 py-2.5 sm:px-5">Club</th>
                <th className="px-4 py-2.5 text-right">Interested</th>
                <th className="hidden px-4 py-2.5 text-right sm:table-cell">Saved</th>
                <th className="hidden px-4 py-2.5 text-right md:table-cell">Page views, 30d</th>
                <th className="hidden px-4 py-2.5 text-right md:table-cell">Claim page, 30d</th>
                <th className="px-4 py-2.5 text-right">
                  <span className="sr-only">Pitch</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((row) => (
                <tr key={row.slug} className="align-top">
                  <td className="max-w-0 px-4 py-3 sm:px-5">
                    <Link href={`/clubs/${row.slug}`} className="block truncate font-semibold text-ink hover:text-cardinal">
                      {row.name}
                    </Link>
                    <span className="mt-0.5 flex flex-wrap gap-1">
                      {row.pendingClaim && <Pill tone="accent">Claim waiting</Pill>}
                      {row.claimViews30d > 0 && !row.pendingClaim && <Pill tone="warn">Officer looking</Pill>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.interests}
                    {row.interests30d > 0 && <span className="block text-[12px] text-ink-muted">+{row.interests30d} new</span>}
                  </td>
                  <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">{row.saves}</td>
                  <td className="hidden px-4 py-3 text-right tabular-nums md:table-cell">{row.views30d}</td>
                  <td className="hidden px-4 py-3 text-right tabular-nums md:table-cell">{row.claimViews30d}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void copy(row)}
                      aria-label={`Copy pitch line for ${row.name}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-line px-2.5 text-[12.5px] font-semibold text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
                    >
                      {copied === row.slug ? <Check size={13} strokeWidth={2.25} aria-hidden /> : <Copy size={13} strokeWidth={2} aria-hidden />}
                      <span className="hidden sm:inline">{copied === row.slug ? "Copied" : "Pitch"}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[12.5px] text-ink-muted">
        Page views include signed-out visitors, so treat them as a rough signal. Interested and saved are verified students.
      </p>
    </div>
  );
}

/* ---------- Reports ---------- */

export function ReportsTab() {
  const { data, error, reload } = usePanelData<AdminReport[]>("/api/admin/reports");
  if (error) return <PanelError message={error} onRetry={() => void reload()} />;
  if (!data) return <PanelSkeleton />;
  return (
    <div>
      <Header title="Reported profiles" intro="Students who reported another student's profile. Read only for now: follow up by email or in Supabase." />
      {data.length === 0 ? (
        <EmptyState title="No reports">Nobody has reported a profile. Reports show up here when they do.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {data.map((report) => (
            <li key={report.id} className="card px-5 py-5 sm:px-6">
              <p className="text-[14.5px] text-ink">
                <Link href={`/students/${report.target.id}`} className="font-semibold hover:text-cardinal">
                  {report.target.name || "No name"}
                </Link>{" "}
                <span className="text-ink-muted">({report.target.email ?? "no email"})</span>
              </p>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-soft">&ldquo;{report.reason}&rdquo;</p>
              <p className="mt-2 text-[12.5px] text-ink-muted">
                Reported by {report.reporter.name || "No name"} ({report.reporter.email ?? "no email"}), {ago(report.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

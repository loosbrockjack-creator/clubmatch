"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ExternalLink, Loader2, LogOut } from "lucide-react";
import { AccountGate } from "@/components/account-gate";
import { Avatar } from "@/components/avatar";
import { ClubCard } from "@/components/club-card";
import { PolicyNotice } from "@/components/policy-notice";
import { ProfileForm } from "@/components/profile-form";
import { LetClubsFindMe, ProfileVisibility } from "@/components/profile-settings";
import {
  deleteAccount,
  signOut,
  useAccount,
  type Profile,
} from "@/lib/account";
import { clubBySlug } from "@/lib/clubs";
import { useSavedClubs } from "@/lib/preferences";

const TABS = [
  { id: "saved", label: "Saved" },
  { id: "clubs", label: "My clubs" },
  { id: "profile", label: "Profile" },
  { id: "settings", label: "Settings" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function AccountPage() {
  return <AccountGate>{(profile, email) => <Dashboard profile={profile} email={email} />}</AccountGate>;
}

function Dashboard({ profile, email }: { profile: Profile; email: string | null }) {
  const router = useRouter();
  // Deep links like /account#settings open that tab. Safe to read the hash
  // here: the dashboard only renders client-side, after the account loads.
  const [tab, setTab] = useState<TabId>(() => {
    const fromHash = window.location.hash.slice(1);
    return TABS.some((t) => t.id === fromHash) ? (fromHash as TabId) : "saved";
  });

  useEffect(() => {
    if (!profile.onboarded) router.replace("/account/welcome");
  }, [profile.onboarded, router]);

  // Links to /account#settings from inside the account area change only the hash.
  useEffect(() => {
    function onHashChange() {
      const fromHash = window.location.hash.slice(1);
      if (TABS.some((t) => t.id === fromHash)) setTab(fromHash as TabId);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function choose(id: TabId) {
    setTab(id);
    window.history.replaceState(null, "", `#${id}`);
  }

  function onTabKey(event: React.KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = TABS[(index + step + TABS.length) % TABS.length].id;
    choose(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  const meta = [profile.major, profile.class_year].filter(Boolean).join(" · ");

  return (
    <>
      <div className="border-b border-line bg-muted">
        <div className="shell flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:py-14">
          <div className="flex items-center gap-5">
            <Avatar
              name={profile.display_name ?? email}
              url={profile.avatar_url}
              preset={profile.avatar_preset}
              size={84}
            />
            <div className="min-w-0">
              <h1 className="display truncate text-[32px] leading-tight text-cardinal sm:text-[42px]">
                {profile.display_name || "Your account"}
              </h1>
              <p className="mt-1 text-[14.5px] text-ink-soft">{meta || email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/students/${profile.id}`} className="btn btn-secondary h-10 px-4 text-[14px]">
              View my profile
              <ExternalLink size={14} aria-hidden />
            </Link>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.replace("/");
              }}
              className="btn btn-quiet h-10 px-4 text-[14px]"
            >
              <LogOut size={15} aria-hidden />
              Sign out
            </button>
          </div>
        </div>

        <div className="shell">
          <div role="tablist" aria-label="Account sections" className="-mb-px flex gap-1 overflow-x-auto">
            {TABS.map((t, index) => (
              <button
                key={t.id}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => choose(t.id)}
                onKeyDown={(event) => onTabKey(event, index)}
                className={`whitespace-nowrap border-b-2 px-4 py-3 text-[15px] font-semibold transition-colors ${
                  tab === t.id
                    ? "border-cardinal text-ink"
                    : "border-transparent text-ink-soft hover:text-cardinal"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="shell pb-20 pt-10"
      >
        {profile.onboarded && !profile.policy_notice_seen && (
          <PolicyNotice onOpenSetting={() => choose("settings")} />
        )}
        {tab === "saved" && <SavedTab />}
        {tab === "clubs" && <ClubsTab />}
        {tab === "profile" && (
          <div className="max-w-3xl">
            <ProfileForm profile={profile} submitLabel="Save changes" />
          </div>
        )}
        {tab === "settings" && <SettingsTab profile={profile} email={email} />}
      </div>
    </>
  );
}

function ClubGrid({ slugs }: { slugs: string[] }) {
  const clubs = slugs.map((slug) => clubBySlug.get(slug)).filter((club) => club !== undefined);
  return (
    <>
      <p className="border-b border-line pb-4 text-[14px] font-semibold text-ink">
        {clubs.length} {clubs.length === 1 ? "club" : "clubs"}
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {clubs.map((club) => (
          <ClubCard key={club.id} club={club} />
        ))}
      </div>
    </>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="card px-6 py-16 text-center">
      <h2 className="display text-[24px] text-ink">{title}</h2>
      <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-ink-soft">{body}</p>
      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/match" className="btn btn-primary">
          Find my clubs
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </Link>
        <Link href="/explore" className="btn btn-secondary">
          Browse all clubs
        </Link>
      </div>
    </div>
  );
}

function SavedTab() {
  const { saved } = useSavedClubs();
  if (saved.length === 0) {
    return <Empty title="Nothing saved yet." body="Tap the heart on any club to keep it here." />;
  }
  return <ClubGrid slugs={saved} />;
}

function ClubsTab() {
  const { memberships } = useAccount();
  if (memberships.length === 0) {
    return (
      <Empty
        title="No clubs yet."
        body="Already in a club? Open its page and tap I'm a member. It'll show up here and on your profile."
      />
    );
  }
  return <ClubGrid slugs={memberships} />;
}

function SettingsTab({ profile, email }: { profile: Profile; email: string | null }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <div className="max-w-2xl space-y-12">
      <section>
        <h2 className="display gold-rule text-[24px] text-ink">Privacy</h2>
        <div className="space-y-8">
          <ProfileVisibility profile={profile} />
          <LetClubsFindMe profile={profile} />
        </div>
        <p className="mt-6 text-[14px] leading-relaxed text-ink-soft">
          Your email, quiz answers, and saves are always private.{" "}
          <Link href="/privacy" className="link-isu">
            How privacy works
          </Link>
        </p>
      </section>

      <section>
        <h2 className="display gold-rule text-[24px] text-ink">Sign-in</h2>
        <p className="text-[15px] text-ink-soft">
          You sign in with a one-time code sent to <span className="font-semibold text-ink">{email}</span>.
        </p>
      </section>

      <section>
        <h2 className="display gold-rule text-[24px] text-ink">Delete account</h2>
        <p className="text-[15px] leading-relaxed text-ink-soft">
          This permanently removes your profile, photo, saved clubs, and memberships. It can&apos;t
          be undone. Type <span className="font-semibold text-ink">DELETE</span> to confirm.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <input
            aria-label="Type DELETE to confirm"
            className="field max-w-[200px]"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button
            type="button"
            disabled={confirm !== "DELETE" || deleting}
            onClick={async () => {
              setDeleting(true);
              const problem = await deleteAccount();
              setDeleting(false);
              if (problem) setDeleteError(problem);
              else router.replace("/");
            }}
            className="btn btn-outline-cardinal"
          >
            {deleting && <Loader2 size={16} className="animate-spin" aria-hidden />}
            Delete my account
          </button>
        </div>
        {deleteError && (
          <p role="alert" className="mt-3 text-[14px] font-medium text-cardinal">
            {deleteError}
          </p>
        )}
      </section>
    </div>
  );
}

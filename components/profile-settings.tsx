"use client";

import { useState } from "react";
import { updateProfile, type Profile } from "@/lib/account";

/** A real switch: a button with role="switch", so Space and Enter both work. */
export function SwitchRow({
  id,
  title,
  body,
  checked,
  busy,
  error,
  onToggle,
}: {
  id: string;
  title: string;
  body: React.ReactNode;
  checked: boolean;
  busy?: boolean;
  error?: string | null;
  onToggle: () => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p id={`${id}-title`} className="text-[15.5px] font-semibold text-ink">
            {title}
          </p>
          <p id={`${id}-body`} className="mt-1 text-[14px] leading-relaxed text-ink-soft">
            {body}
          </p>
        </div>
        <button
          type="button"
          id={id}
          role="switch"
          aria-checked={checked}
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-body`}
          aria-busy={busy || undefined}
          onClick={onToggle}
          className={`relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ease-out ${
            checked ? "bg-cardinal" : "bg-line-strong"
          }`}
        >
          <span
            aria-hidden
            className={`inline-block h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
              checked ? "translate-x-[23px]" : "translate-x-[3px]"
            }`}
          />
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[14px] font-medium text-cardinal">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * A privacy switch saves the moment it's flipped: turning one off should never
 * depend on also finding the Save button.
 */
function usePrivacySwitch(column: "discoverable" | "visible", initial: boolean) {
  const [checked, setChecked] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (busy) return;
    const next = !checked;
    setChecked(next);
    setBusy(true);
    const problem = await updateProfile({ [column]: next });
    setBusy(false);
    if (problem) setChecked(!next);
    setError(problem);
  }

  return { checked, busy, error, onToggle: toggle };
}

export function LetClubsFindMe({ profile, id = "let-clubs-find-me" }: { profile: Profile; id?: string }) {
  const control = usePrivacySwitch("discoverable", profile.discoverable);
  return (
    <SwitchRow
      id={id}
      title="Let clubs find me"
      body="Club officers on ClubMatch can see your public profile and how well you match their club, shown as a match %. They never see your quiz answers or your email. Turn this off and you won't show up in their lists of good-fit students."
      {...control}
    />
  );
}

export function ProfileVisibility({ profile }: { profile: Profile }) {
  const control = usePrivacySwitch("visible", profile.visible);
  return (
    <SwitchRow
      id="profile-visible"
      title="Show my profile to other students"
      body="Signed-in Iowa State students can see your name, photo, major, class year, bio, interests, links, what you're looking for, and the clubs you're in. Turn this off and your profile and club memberships are hidden from everyone but you."
      {...control}
    />
  );
}

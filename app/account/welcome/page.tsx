"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountGate } from "@/components/account-gate";
import { ProfileForm } from "@/components/profile-form";
import { updateProfile, type Profile } from "@/lib/account";

export default function WelcomePage() {
  return <AccountGate>{(profile) => <Welcome profile={profile} />}</AccountGate>;
}

function Welcome({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [skipError, setSkipError] = useState<string | null>(null);

  return (
    <div className="shell max-w-3xl pb-20 pt-14 sm:pt-20">
      <p className="eyebrow">Welcome to ClubMatch</p>
      <h1 className="display mt-3 text-[38px] leading-tight text-cardinal sm:text-[52px]">
        Set up your profile
      </h1>
      <div className="mt-5 h-[3px] w-12 bg-gold" />
      <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
        Other Iowa State students on ClubMatch can see this. Fill in as much as you like, and
        change it any time.
      </p>
      <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
        Club officers on ClubMatch can also see your profile and a match %, unless you turn off Let
        clubs find me below. Your quiz answers stay private, and nothing is shared outside
        ClubMatch.{" "}
        <Link href="/privacy" className="link-isu">
          How privacy works
        </Link>
      </p>

      <div className="mt-10">
        <ProfileForm
          profile={profile}
          submitLabel="Finish"
          markOnboarded
          onSaved={() => router.replace("/account")}
        />
      </div>

      <button
        type="button"
        onClick={async () => {
          const problem = await updateProfile({ onboarded: true, policy_notice_seen: true });
          if (problem) setSkipError(problem);
          else router.replace("/account");
        }}
        className="mt-6 text-[14px] font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
      >
        Skip for now
      </button>
      {skipError && (
        <p role="alert" className="mt-2 text-[14px] font-medium text-cardinal">
          {skipError}
        </p>
      )}
    </div>
  );
}

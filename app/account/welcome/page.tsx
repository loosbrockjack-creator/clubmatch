"use client";

import { useRouter } from "next/navigation";
import { AccountGate } from "@/components/account-gate";
import { ProfileForm } from "@/components/profile-form";
import { updateProfile } from "@/lib/account";

export default function WelcomePage() {
  const router = useRouter();

  return (
    <AccountGate>
      {(profile) => (
        <div className="shell max-w-3xl pb-20 pt-14 sm:pt-20">
          <p className="eyebrow">Welcome to ClubMatch</p>
          <h1 className="display mt-3 text-[38px] leading-tight text-cardinal sm:text-[52px]">
            Set up your profile
          </h1>
          <div className="mt-5 h-[3px] w-12 bg-gold" />
          <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
            Other Iowa State students on ClubMatch can see this. Fill in as much as you like,
            and change it any time.
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
              await updateProfile({ onboarded: true });
              router.replace("/account");
            }}
            className="mt-6 text-[14px] font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          >
            Skip for now
          </button>
        </div>
      )}
    </AccountGate>
  );
}

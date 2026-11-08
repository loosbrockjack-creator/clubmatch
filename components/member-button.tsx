"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, UserPlus } from "lucide-react";
import { toggleMembership, useAccount } from "@/lib/account";

/** "I'm a member": self-declared, no approval. Signed out, it leads to sign-in. */
export function MemberButton({ slug, clubName }: { slug: string; clubName: string }) {
  const account = useAccount();
  const [error, setError] = useState<string | null>(null);
  const isMember = account.memberships.includes(slug);

  if (account.status !== "signed-in") {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/clubs/${slug}`)}`}
        className="btn btn-secondary w-full sm:w-auto"
        aria-disabled={account.status === "loading"}
      >
        <UserPlus size={16} strokeWidth={2} aria-hidden />
        I&apos;m a member
        <span className="sr-only"> of {clubName} (sign in first)</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-pressed={isMember}
        onClick={async () => setError(await toggleMembership(slug))}
        className={`btn w-full sm:w-auto ${isMember ? "btn-outline-cardinal" : "btn-secondary"}`}
      >
        {isMember ? (
          <Check size={16} strokeWidth={2.25} aria-hidden />
        ) : (
          <UserPlus size={16} strokeWidth={2} aria-hidden />
        )}
        {isMember ? "You're a member" : "I'm a member"}
        <span className="sr-only"> of {clubName}</span>
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[13px] font-medium text-cardinal">
          {error}
        </p>
      )}
    </div>
  );
}

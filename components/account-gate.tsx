"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccount, type Profile } from "@/lib/account";

/**
 * Wraps signed-in-only pages. Signed-out visitors go to /login and come back
 * afterwards. The data itself is protected by row-level security; this only
 * decides what to render.
 */
export function AccountGate({
  children,
  fallback,
}: {
  children: (profile: Profile, email: string | null) => React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const account = useAccount();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (account.status === "signed-out") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [account.status, pathname, router]);

  if (account.status === "signed-in" && account.profile) {
    return <>{children(account.profile, account.email)}</>;
  }

  if (account.status === "signed-in" && !account.profile) {
    return (
      <div className="shell py-24 text-center">
        <p className="text-[15px] text-ink-soft">
          We couldn&apos;t load your account. Check your connection and refresh the page.
        </p>
      </div>
    );
  }

  return (
    fallback ?? (
      <div className="shell py-14">
        <div className="skeleton h-28 rounded-[14px]" />
        <div className="skeleton mt-6 h-64 rounded-[14px]" />
      </div>
    )
  );
}

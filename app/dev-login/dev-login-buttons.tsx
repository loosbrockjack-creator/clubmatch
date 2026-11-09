"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "@/lib/account";
import { getSupabase } from "@/lib/supabase";

type Account = { key: string; label: string; email: string };

export function DevLoginButtons({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signInAs(key: string) {
    setBusy(key);
    setError(null);
    const res = await fetch("/api/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account: key }),
    });
    const body = (await res.json().catch(() => ({}))) as { tokenHash?: string; error?: string };
    const sb = getSupabase();
    if (!res.ok || !body.tokenHash || !sb) {
      setError(body.error ?? "Dev sign-in failed.");
      setBusy(null);
      return;
    }
    await signOut();
    const { error: authError } = await sb.auth.verifyOtp({ token_hash: body.tokenHash, type: "email" });
    if (authError) {
      setError(authError.message);
      setBusy(null);
      return;
    }
    router.push(params.get("next") ?? "/account");
  }

  return (
    <div className="mt-8 grid max-w-xl gap-3">
      {accounts.map((account) => (
        <button
          key={account.key}
          type="button"
          data-dev-account={account.key}
          onClick={() => void signInAs(account.key)}
          disabled={busy !== null}
          className="flex items-center justify-between rounded-[12px] border border-line bg-white px-5 py-4 text-left transition-colors hover:border-ink/30 disabled:opacity-60"
        >
          <span>
            <span className="block text-[15px] font-semibold text-ink">{account.label}</span>
            <span className="block text-[13px] text-ink-soft">{account.email}</span>
          </span>
          <span className="text-[13px] text-ink-soft">{busy === account.key ? "Signing in..." : "Sign in"}</span>
        </button>
      ))}
      {error && <p role="alert" className="text-[14px] text-cardinal">{error}</p>}
    </div>
  );
}

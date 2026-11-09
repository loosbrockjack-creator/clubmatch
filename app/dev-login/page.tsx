import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DEV_ACCOUNTS, devLoginEnabled } from "@/lib/dev-accounts";
import { DevLoginButtons } from "./dev-login-buttons";

export const metadata: Metadata = {
  title: "Dev sign-in",
  robots: { index: false, follow: false },
};

/** Localhost-only page for signing in as a seeded test account. 404 elsewhere. */
export default async function DevLoginPage() {
  const host = (await headers()).get("host");
  if (!devLoginEnabled(host)) notFound();

  return (
    <section className="shell py-16">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">
        Local development only
      </p>
      <h1 className="display mt-2 text-[34px] text-ink">Sign in as a test account</h1>
      <p className="mt-3 max-w-xl text-[15px] text-ink-soft">
        These accounts live in the clubmatch-dev database. This page doesn&apos;t exist in
        production.
      </p>
      <DevLoginButtons accounts={DEV_ACCOUNTS.map(({ key, label, email }) => ({ key, label, email }))} />
    </section>
  );
}

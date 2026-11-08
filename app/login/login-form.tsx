"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";
import { CodeInput } from "@/components/code-input";
import { normalizeIsuEmail, sendCode, useAccount, verifyCode } from "@/lib/account";

/** Must match Auth > Email OTP length in the Supabase dashboard. */
const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

/** Only same-site paths, so ?next= can't bounce anyone off ClubMatch. */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const account = useAccount();

  const [step, setStep] = useState<"email" | "code">("email");
  const [emailInput, setEmailInput] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  // Already signed in (or just finished): go where they were headed.
  useEffect(() => {
    if (account.status !== "signed-in") return;
    router.replace(account.profile && !account.profile.onboarded ? "/account/welcome" : next);
  }, [account.status, account.profile, next, router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function requestCode(target: string) {
    setBusy(true);
    setError(null);
    const problem = await sendCode(target);
    setBusy(false);
    if (problem) {
      setError(problem);
      return false;
    }
    setResendIn(RESEND_SECONDS);
    return true;
  }

  async function onEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeIsuEmail(emailInput);
    if (!normalized) {
      setError("Use your Iowa State email, like netid@iastate.edu.");
      return;
    }
    if (await requestCode(normalized)) {
      setEmail(normalized);
      setCode("");
      setStep("code");
    }
  }

  async function submitCode(value: string) {
    if (busy || value.length !== CODE_LENGTH) return;
    setBusy(true);
    setError(null);
    const problem = await verifyCode(email, value);
    setBusy(false);
    if (problem) setError(problem);
    // On success the account state flips to signed-in and the effect redirects.
  }

  if (step === "code") {
    return (
      <form
        className="mt-7"
        onSubmit={(event) => {
          event.preventDefault();
          void submitCode(code);
        }}
      >
        <p className="text-[15.5px] leading-relaxed text-ink-soft">
          We emailed a {CODE_LENGTH}-digit code to{" "}
          <span className="font-semibold text-ink">{email}</span>. It expires in an hour.
        </p>
        <div className="mt-6">
          <CodeInput
            length={CODE_LENGTH}
            value={code}
            disabled={busy}
            invalid={Boolean(error)}
            onChange={(value) => {
              setCode(value);
              setError(null);
              if (value.length === CODE_LENGTH) void submitCode(value);
            }}
          />
        </div>
        {error && (
          <p role="alert" className="mt-3 text-[14px] font-medium text-cardinal">
            {error}
          </p>
        )}
        <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
          <button
            type="submit"
            disabled={busy || code.length !== CODE_LENGTH}
            className="btn btn-outline-cardinal rounded-full"
          >
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
            Sign in
            {!busy && <ChevronRight size={16} strokeWidth={2.25} aria-hidden />}
          </button>
          <button
            type="button"
            disabled={busy || resendIn > 0}
            onClick={() => void requestCode(email)}
            className="text-[14px] font-semibold text-cardinal underline-offset-4 hover:underline disabled:text-ink-muted disabled:no-underline"
          >
            {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setError(null);
            }}
            className="text-[14px] font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          >
            Wrong email?
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="mt-7" onSubmit={onEmailSubmit} noValidate>
      <p className="text-[15.5px] leading-relaxed text-ink-soft">
        New and returning students use the same form. We&apos;ll email you a one-time code,
        so there&apos;s no password to remember.
      </p>
      <label htmlFor="email" className="field-label mt-6">
        Iowa State email
      </label>
      <input
        id="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="netid@iastate.edu"
        value={emailInput}
        onChange={(event) => {
          setEmailInput(event.target.value);
          setError(null);
        }}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "email-error" : undefined}
        className="field max-w-md"
      />
      {error && (
        <p id="email-error" role="alert" className="mt-3 text-[14px] font-medium text-cardinal">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn btn-outline-cardinal mt-7 rounded-full">
        {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
        Email me a code
        {!busy && <ChevronRight size={16} strokeWidth={2.25} aria-hidden />}
      </button>
    </form>
  );
}

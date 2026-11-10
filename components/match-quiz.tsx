"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText, LoaderCircle, Upload, X } from "lucide-react";
import { OptionCard } from "@/components/option-card";
import { clubs } from "@/lib/clubs";
import { displayTopic, wantsFor } from "@/lib/matching";
import {
  ACADEMIC_AREAS,
  CAREERS,
  COMMITMENTS,
  COMMUNITIES,
  FLEXIBLE_OPTION,
  GREEK_OPTIONS,
  MAX_WANTS,
  UNDECIDED_OPTION,
  WANTS,
  experiencesFromWants,
  goalsFromWants,
} from "@/lib/taxonomy";
import {
  emptyPreferences,
  savePreferences,
  useStoredPreferences,
} from "@/lib/preferences";
import type {
  AcademicAreaId,
  CareerId,
  CommitmentId,
  CommunityId,
  GreekInterest,
  Preferences,
  WantId,
} from "@/lib/types";

type Draft = Preferences;

const CHAPTER_COUNT = clubs.filter((club) => club.greek).length;
const MAX_TEXT = 200;
/** Matches lib/ai.ts: Vercel refuses function bodies over 4.5 MB. */
const MAX_UPLOAD = 4 * 1024 * 1024;

/** fetch with a deadline, so a slow AI call never strands the student. */
async function fetchWithin(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

const subscribeNothing = () => () => {};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Read from the URL after hydration (false on the server), so the quiz still
 * prerenders as HTML instead of waiting on useSearchParams and Suspense.
 */
function useWantsGreekStep() {
  return useSyncExternalStore(
    subscribeNothing,
    () => new URLSearchParams(window.location.search).get("step") === "greek",
    () => false,
  );
}

type Upload =
  | { state: "idle" }
  | { state: "reading"; name: string }
  | { state: "done"; summary: string }
  | { state: "error"; message: string };

export function MatchQuiz({ ai }: { ai: boolean }) {
  const router = useRouter();
  const stored = useStoredPreferences();
  const wantsGreek = useWantsGreekStep();
  // The upload step only exists when AI is available; it is step 0 then.
  const offset = ai ? 1 : 0;
  const totalSteps = 6 + offset;
  // null until the student moves. Results links students whose saved answers
  // predate the Greek question straight to it, but only when those answers
  // exist; otherwise the earlier steps would be skipped and saved empty.
  const [chosenStep, setStep] = useState<number | null>(null);
  // A retake starts at the first question; the resume step is a link there.
  const step =
    chosenStep ?? (wantsGreek && stored ? totalSteps - 1 : stored ? offset : 0);
  const [edits, setEdits] = useState<Draft | null>(null);
  const [upload, setUpload] = useState<Upload>({ state: "idle" });
  const [mapping, setMapping] = useState(false);
  const [textFailed, setTextFailed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const firstRender = useRef(true);

  // Answers from a previous run seed the quiz until the student changes one.
  // Older answers carry goals and experiences; wantsFor merges them.
  const base: Draft = stored ? { ...emptyPreferences, ...stored } : emptyPreferences;
  const draft: Draft = edits ?? { ...base, wants: wantsFor(base).slice(0, MAX_WANTS) };
  const setDraft = (update: (current: Draft) => Draft) => setEdits(update(draft));
  const wants = draft.wants ?? [];
  const communities = draft.communities ?? [];
  const resumeTopics = draft.resumeTopics ?? [];

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  async function readResume(file: File) {
    if (file.type && file.type !== "application/pdf") {
      setUpload({ state: "error", message: "That isn't a PDF. Export your resume or LinkedIn profile as a PDF." });
      return;
    }
    if (file.size > MAX_UPLOAD) {
      setUpload({ state: "error", message: "That file is over 4 MB." });
      return;
    }
    setUpload({ state: "reading", name: file.name });
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetchWithin("/api/ai/resume", { method: "POST", body: form }, 25_000);
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        academicArea?: AcademicAreaId | "undecided";
        careers?: CareerId[];
        wants?: WantId[];
        resumeTopics?: string[];
        summary?: string;
      };
      if (!res.ok || data.error) {
        setUpload({ state: "error", message: data.error ?? "We couldn't read that file. Answer the quiz instead." });
        return;
      }
      setEdits({
        ...draft,
        academicArea: data.academicArea ?? draft.academicArea,
        careers: data.careers?.length ? data.careers : draft.careers,
        wants: data.wants?.length ? data.wants.slice(0, MAX_WANTS) : wants,
        resumeTopics: data.resumeTopics ?? [],
      });
      setUpload({ state: "done", summary: data.summary ?? "" });
      setStep(1);
    } catch {
      setUpload({
        state: "error",
        message: "That took too long or the reader is down. Answer the quiz instead.",
      });
    }
  }

  const prefilled = upload.state === "done";

  const uploadStep = {
    question: "Start with your resume?",
    subtitle:
      "Optional. Upload a resume or your LinkedIn profile as a PDF and we'll fill in the quiz for you. We read it once and never store it.",
    columns: "",
    valid: true,
    render: () => (
      <div className="mx-auto w-full max-w-xl">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          id="resume-file"
          disabled={upload.state === "reading"}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) readResume(file);
            event.target.value = "";
          }}
        />
        <label
          htmlFor="resume-file"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (file && upload.state !== "reading") readResume(file);
          }}
          className={`flex flex-col items-center justify-center gap-3 rounded-[6px] border border-dashed bg-white px-6 py-10 text-center transition-colors duration-200 ${
            upload.state === "reading"
              ? "border-cardinal"
              : "cursor-pointer border-line-strong hover:border-cardinal focus-within:border-cardinal"
          }`}
        >
          {upload.state === "reading" ? (
            <>
              <LoaderCircle size={26} strokeWidth={1.75} className="animate-spin text-cardinal" aria-hidden />
              <span className="text-[15px] font-semibold text-ink">Reading {upload.name}</span>
              <span className="text-[13px] text-ink-muted">This takes a few seconds.</span>
            </>
          ) : (
            <>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cardinal-tint text-cardinal">
                <Upload size={20} strokeWidth={1.75} aria-hidden />
              </span>
              <span className="text-[15px] font-semibold text-ink">Choose a PDF or drop it here</span>
              <span className="text-[13px] text-ink-muted">
                On LinkedIn: your profile, More, Save to PDF. Up to 4 MB.
              </span>
            </>
          )}
        </label>
        <p role="status" aria-live="polite" className="mt-4 min-h-[22px] text-center text-[14px] text-cardinal">
          {upload.state === "error"
            ? upload.message
            : upload.state === "reading"
              ? "Reading your file."
              : ""}
        </p>
        <p className="mt-2 text-center text-[13px] text-ink-muted">
          We use it only to pick your quiz answers. Your name, contact info, and anything personal are ignored.
        </p>
      </div>
    ),
  };

  const steps = [
    ...(ai ? [uploadStep] : []),
    {
      question: "What are you studying?",
      subtitle: "Pick the area closest to your major.",
      columns: "sm:grid-cols-2",
      valid: draft.academicArea !== null,
      render: () => (
        <>
          {ACADEMIC_AREAS.map((option) => (
            <OptionCard
              key={option.id}
              type="radio"
              name="academic-area"
              value={option.id}
              checked={draft.academicArea === option.id}
              onChange={() =>
                setDraft((d) => ({ ...d, academicArea: option.id as AcademicAreaId }))
              }
              label={option.label}
              hint={option.hint}
            />
          ))}
          <OptionCard
            type="radio"
            name="academic-area"
            value={UNDECIDED_OPTION.id}
            checked={draft.academicArea === "undecided"}
            onChange={() => setDraft((d) => ({ ...d, academicArea: "undecided" }))}
            label={UNDECIDED_OPTION.label}
            hint={UNDECIDED_OPTION.hint}
          />
        </>
      ),
    },
    {
      question: "Which career areas interest you?",
      subtitle: "Choose one or a few. You are not locking anything in.",
      columns: "sm:grid-cols-2 lg:grid-cols-3",
      valid: draft.careers.length > 0,
      render: () =>
        CAREERS.map((option) => (
          <OptionCard
            key={option.id}
            type="checkbox"
            name="careers"
            value={option.id}
            compact
            checked={draft.careers.includes(option.id)}
            onChange={() =>
              setDraft((d) => ({ ...d, careers: toggle<CareerId>(d.careers, option.id) }))
            }
            label={option.label}
            hint={option.hint}
          />
        )),
    },
    {
      question: "What do you want from a club?",
      subtitle: `Pick up to ${MAX_WANTS}. The ones that matter most.`,
      columns: "sm:grid-cols-2 lg:grid-cols-3",
      valid: wants.length > 0,
      render: () =>
        WANTS.map((option) => {
          const checked = wants.includes(option.id);
          return (
            <OptionCard
              key={option.id}
              type="checkbox"
              name="wants"
              value={option.id}
              compact
              checked={checked}
              disabled={!checked && wants.length >= MAX_WANTS}
              onChange={() =>
                setDraft((d) => ({ ...d, wants: toggle<WantId>(d.wants ?? [], option.id) }))
              }
              label={option.label}
              hint={option.hint}
            />
          );
        }),
    },
    {
      question: "How much time do you have?",
      subtitle: "Be realistic. A club you can show up to beats one you cannot.",
      columns: "sm:grid-cols-2",
      valid: draft.commitment !== null,
      render: () => (
        <>
          {COMMITMENTS.map((option) => (
            <OptionCard
              key={option.id}
              type="radio"
              name="commitment"
              value={option.id}
              checked={draft.commitment === option.id}
              onChange={() =>
                setDraft((d) => ({ ...d, commitment: option.id as CommitmentId }))
              }
              label={option.label}
              hint={option.hint}
            />
          ))}
          <OptionCard
            type="radio"
            name="commitment"
            value={FLEXIBLE_OPTION.id}
            checked={draft.commitment === "flexible"}
            onChange={() => setDraft((d) => ({ ...d, commitment: "flexible" }))}
            label={FLEXIBLE_OPTION.label}
            hint={FLEXIBLE_OPTION.hint}
          />
        </>
      ),
    },
    {
      question: ai ? "Anything specific?" : "Looking for a community?",
      subtitle: ai
        ? "Both optional. A hobby or field you're into, and any community you'd like to find."
        : "Optional. Some clubs are built around a faith, a culture, or an identity. We only include them if you ask.",
      columns: "",
      valid: true,
      render: () => (
        <div className="space-y-10">
          {ai && (
            <div>
              <label htmlFor="interest-text" className="block text-[15px] font-semibold text-ink">
                Anything specific you&apos;re into?
              </label>
              <p id="interest-text-hint" className="mt-1 text-[13px] text-ink-muted">
                A hobby, a sport, a cause, a field. We&apos;ll look for clubs that do it.
              </p>
              <textarea
                id="interest-text"
                aria-describedby="interest-text-hint"
                rows={2}
                maxLength={MAX_TEXT}
                value={draft.interestText ?? ""}
                onChange={(event) =>
                  setDraft((d) => ({ ...d, interestText: event.target.value }))
                }
                placeholder="e.g. rock climbing, investing, K-pop dance, robotics"
                className="mt-3 w-full resize-none rounded-[4px] border border-line-strong bg-white px-4 py-3 text-[15px] text-ink placeholder:text-ink-muted focus:border-cardinal focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cardinal"
              />
              <div className="mt-1 flex items-start justify-between gap-4">
                <p role="status" aria-live="polite" className="text-[13px] text-cardinal">
                  {textFailed
                    ? "We couldn't read that just now. Continue again to try once more or skip it."
                    : ""}
                </p>
                <p className="shrink-0 text-[12px] tabular-nums text-ink-muted">
                  {(draft.interestText ?? "").length}/{MAX_TEXT}
                </p>
              </div>
              {resumeTopics.length > 0 && (
                <div className="mt-2">
                  <p className="text-[13px] text-ink-muted">From your resume. Remove any you don&apos;t want clubs for.</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {resumeTopics.map((topic) => (
                      <li key={topic}>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              resumeTopics: (d.resumeTopics ?? []).filter((t) => t !== topic),
                            }))
                          }
                          className="chip transition-colors hover:border-cardinal"
                          aria-label={`Remove ${displayTopic(topic)}`}
                        >
                          {capitalize(displayTopic(topic))}
                          <X size={13} strokeWidth={2.25} aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <fieldset className="min-w-0 border-0 p-0">
            <legend className="text-[15px] font-semibold text-ink">
              {ai ? "Want to find any of these communities?" : "Pick any that you'd like to find."}
            </legend>
            {ai && (
              <p className="mt-1 text-[13px] text-ink-muted">
                Some clubs are built around a faith, a culture, or an identity. We only include them if you ask.
              </p>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {COMMUNITIES.map((option) => (
                <OptionCard
                  key={option.id}
                  type="checkbox"
                  name="communities"
                  value={option.id}
                  compact
                  checked={communities.includes(option.id)}
                  onChange={() =>
                    setDraft((d) => ({
                      ...d,
                      communities: toggle<CommunityId>(d.communities ?? [], option.id),
                    }))
                  }
                  label={option.label}
                  hint={option.hint}
                />
              ))}
            </div>
          </fieldset>
        </div>
      ),
    },
    {
      question: "Open to Greek life?",
      subtitle: `Iowa State has ${CHAPTER_COUNT} fraternities and sororities. We can include a few that fit.`,
      columns: "sm:grid-cols-2",
      valid: draft.greek != null,
      render: () =>
        GREEK_OPTIONS.map((option) => (
          <OptionCard
            key={option.id}
            type="radio"
            name="greek"
            value={option.id}
            checked={draft.greek === option.id}
            onChange={() => setDraft((d) => ({ ...d, greek: option.id as GreekInterest }))}
            label={option.label}
            hint={option.hint}
          />
        )),
    },
  ];

  const current = steps[step];
  const isLast = step === totalSteps - 1;
  const isUploadStep = ai && step === 0;
  const isTextStep = step === totalSteps - 2;
  const numbered = step - offset + 1;
  const numberedTotal = totalSteps - offset;

  /** Map the free-text box onto club topics. Resume topics stay separate. */
  async function resolveTopics(): Promise<string[] | null> {
    const text = (draft.interestText ?? "").trim();
    if (!ai || !text) return [];
    // Reuse a previous read of the same text, but never a failed (empty) one.
    if (stored && stored.interestText === text && (stored.topics ?? []).length > 0) {
      return stored.topics ?? [];
    }
    try {
      const res = await fetchWithin(
        "/api/ai/interests",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        },
        10_000,
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { topics?: string[] };
      return data.topics ?? [];
    } catch {
      return null;
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!current.valid || mapping) return;
    if (isTextStep) {
      setMapping(true);
      const topics = await resolveTopics();
      setMapping(false);
      // On a failed read, say so once; a second Continue moves on without it.
      if (topics === null && !textFailed) {
        setTextFailed(true);
        return;
      }
      setTextFailed(false);
      setEdits({ ...draft, topics: topics ?? [] });
      setStep(step + 1);
      return;
    }
    if (isLast) {
      const finalWants = wants.slice(0, MAX_WANTS);
      savePreferences({
        ...draft,
        wants: finalWants,
        goals: goalsFromWants(finalWants),
        experiences: experiencesFromWants(finalWants),
        communities,
        topics: draft.topics ?? [],
        resumeTopics,
        completedAt: new Date().toISOString(),
      });
      router.push("/results");
      return;
    }
    setStep(step + 1);
  }

  return (
    <div className="shell pb-24 pt-6 sm:pt-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] font-semibold text-ink-muted">
            {isUploadStep ? "Optional shortcut" : `Step ${numbered} of ${numberedTotal}`}
          </p>
          {ai && step === offset && !prefilled ? (
            <button
              type="button"
              onClick={() => setStep(0)}
              className="link-isu text-[13px] font-semibold"
            >
              Start from your resume instead
            </button>
          ) : (
            <p className="text-[13px] text-ink-muted">About a minute</p>
          )}
        </div>

        <div
          className="mt-3 h-1.5 w-full overflow-hidden bg-muted-deep"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={numberedTotal}
          aria-valuenow={Math.max(0, numbered)}
          aria-label="Quiz progress"
        >
          <div
            className="h-full bg-cardinal transition-[width] duration-300 ease-out"
            style={{ width: `${(Math.max(0, numbered) / numberedTotal) * 100}%` }}
          />
        </div>

        {prefilled && !isUploadStep && step <= 3 && (
          <div
            role="status"
            className="rise mt-6 flex items-start gap-3 border-l-[3px] border-gold bg-gold-tint px-4 py-3"
          >
            <FileText size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-cardinal" aria-hidden />
            <p className="flex-1 text-[14px] leading-relaxed text-ink-soft">
              {upload.summary ? `${upload.summary} ` : ""}
              We filled in your answers from your resume. Change anything that&apos;s off.
            </p>
            <button
              type="button"
              onClick={() => setUpload({ state: "idle" })}
              className="text-ink-muted transition-colors hover:text-ink"
              aria-label="Dismiss"
            >
              <X size={16} strokeWidth={2} aria-hidden />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <fieldset key={step} className="rise mt-12 min-w-0 border-0 p-0">
            <legend className="sr-only">{current.question}</legend>

            <h1
              ref={headingRef}
              tabIndex={-1}
              className="display gold-rule gold-rule-center text-center text-[30px] text-ink outline-none sm:text-[40px]"
            >
              {current.question}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-center text-[15.5px] text-ink-soft sm:text-[16.5px]">
              {current.subtitle}
            </p>

            <div className={`mt-9 ${current.columns ? `grid gap-3 ${current.columns}` : ""}`}>
              {current.render()}
            </div>
          </fieldset>

          <div className="mt-10 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="btn btn-quiet disabled:invisible"
            >
              <ArrowLeft size={16} strokeWidth={2} aria-hidden />
              Back
            </button>

            <div className="flex items-center gap-4">
              {!current.valid && (
                <p className="hidden text-[13px] text-ink-muted sm:block">
                  Pick at least one to continue
                </p>
              )}
              <button
                type="submit"
                disabled={!current.valid || mapping || upload.state === "reading"}
                className="btn btn-primary min-w-[160px]"
              >
                {mapping ? (
                  <>
                    <LoaderCircle size={16} strokeWidth={2} className="animate-spin" aria-hidden />
                    Reading that
                  </>
                ) : (
                  <>
                    {isLast ? "See my matches" : isUploadStep ? "Skip, I'll answer" : "Continue"}
                    <ArrowRight size={16} strokeWidth={2} aria-hidden />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

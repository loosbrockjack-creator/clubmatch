"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FileText,
  LoaderCircle,
  Upload,
  X,
} from "lucide-react";
import { InterestSearch } from "@/components/interest-search";
import { OptionCard } from "@/components/option-card";
import { MAX_INTERESTS, topicsOf } from "@/lib/interests";
import { clubs } from "@/lib/clubs";
import { displayTopic, wantsFor } from "@/lib/matching";
import {
  ACADEMIC_AREAS,
  CAREERS,
  CAREER_BY_ID,
  COMMITMENTS,
  COMMUNITIES,
  FLEXIBLE_OPTION,
  OTHER_CAREER,
  GENDER_OPTIONS,
  GREEK_QUIZ_OPTIONS,
  MAX_AREAS,
  MAX_WANTS,
  UNDECIDED_OPTION,
  WANTS,
  areasFor,
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
  GenderId,
  GreekInterest,
  Preferences,
  WantId,
} from "@/lib/types";

type Draft = Preferences;

const CHAPTER_COUNT = clubs.filter((club) => club.greek).length;
/** Pasted LinkedIn profile text. Matches the server's limits. */
const MIN_PASTE = 80;
const MAX_PASTE = 12_000;
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
  const totalSteps = 7 + offset;
  // null until the student moves. Results links students whose saved answers
  // predate the Greek question straight to it, but only when those answers
  // exist; otherwise the earlier steps would be skipped and saved empty.
  const [chosenStep, setStep] = useState<number | null>(null);
  // A retake starts at the first question; the resume step is a link there.
  const step =
    chosenStep ?? (wantsGreek && stored ? totalSteps - 1 : stored ? offset : 0);
  const [edits, setEdits] = useState<Draft | null>(null);
  const [upload, setUpload] = useState<Upload>({ state: "idle" });
  const [source, setSource] = useState<"resume" | "linkedin">("resume");
  // The "Other" career: what they typed, whether we're reading it, and what we found.
  const [otherText, setOtherText] = useState("");
  const [mapping, setMapping] = useState(false);
  const [otherPhase, setOtherPhase] = useState<
    { kind: "idle" } | { kind: "matched"; labels: string[] } | { kind: "none" } | { kind: "failed" }
  >({ kind: "idle" });
  const [pasted, setPasted] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const firstRender = useRef(true);

  // Answers from a previous run seed the quiz until the student changes one.
  // Older answers carry goals and experiences; wantsFor merges them.
  const base: Draft = stored ? { ...emptyPreferences, ...stored } : emptyPreferences;
  const draft: Draft = edits ?? {
    ...base,
    wants: wantsFor(base).slice(0, MAX_WANTS),
    academicAreas: areasFor(base),
    greek: base.greek === "either" ? null : base.greek,
  };
  const setDraft = (update: (current: Draft) => Draft) => setEdits(update(draft));
  const wants = draft.wants ?? [];
  const areas = draft.academicAreas ?? [];
  const communities = draft.communities ?? [];
  const resumeTopics = draft.resumeTopics ?? [];
  const interests = draft.interests ?? [];

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  /** Both the PDF and the pasted profile come back as the same answers. */
  async function applyAnswers(res: Response) {
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      academicAreas?: AcademicAreaId[];
      careers?: CareerId[];
      wants?: WantId[];
      resumeTopics?: string[];
      summary?: string;
    };
    if (!res.ok || data.error) {
      setUpload({
        state: "error",
        message: data.error ?? "We couldn't read that. Answer the quiz instead.",
      });
      return;
    }
    const found = (data.academicAreas ?? []).slice(0, MAX_AREAS);
    setEdits({
      ...draft,
      academicArea: found[0] ?? draft.academicArea,
      academicAreas: found.length > 0 ? found : areas,
      careers: data.careers?.length ? data.careers : draft.careers,
      wants: data.wants?.length ? data.wants.slice(0, MAX_WANTS) : wants,
      resumeTopics: data.resumeTopics ?? [],
    });
    setUpload({ state: "done", summary: data.summary ?? "" });
    setStep(1);
  }

  function readFailed() {
    setUpload({
      state: "error",
      message: "That took too long or the reader is down. Answer the quiz instead.",
    });
  }

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
      await applyAnswers(await fetchWithin("/api/ai/resume", { method: "POST", body: form }, 25_000));
    } catch {
      readFailed();
    }
  }

  async function readProfileText() {
    const text = pasted.trim();
    if (text.length < MIN_PASTE) {
      setUpload({
        state: "error",
        message: "Paste a bit more of your profile: your headline, About, and Experience.",
      });
      return;
    }
    setUpload({ state: "reading", name: "your profile" });
    try {
      await applyAnswers(
        await fetchWithin(
          "/api/ai/resume",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          },
          25_000,
        ),
      );
    } catch {
      readFailed();
    }
  }

  const prefilled = upload.state === "done";

  const reading = upload.state === "reading";

  /** The PDF drop zone, full size for a resume, smaller under the paste box. */
  const dropZone = (compact: boolean) => (
    <label
      htmlFor="resume-file"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];
        if (file && !reading) readResume(file);
      }}
      className={`flex flex-col items-center justify-center gap-3 rounded-[6px] border border-dashed bg-white text-center transition-colors duration-200 ${
        compact ? "px-5 py-6" : "px-6 py-10"
      } ${
        reading
          ? "border-cardinal"
          : "cursor-pointer border-line-strong hover:border-cardinal focus-within:border-cardinal"
      }`}
    >
      {reading ? (
        <>
          <LoaderCircle size={24} strokeWidth={1.75} className="animate-spin text-cardinal" aria-hidden />
          <span className="text-[15px] font-semibold text-ink">Reading {upload.name}</span>
          <span className="text-[13px] text-ink-muted">This takes a few seconds.</span>
        </>
      ) : (
        <>
          {!compact && (
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cardinal-tint text-cardinal">
              <Upload size={20} strokeWidth={1.75} aria-hidden />
            </span>
          )}
          <span className="text-[15px] font-semibold text-ink">
            {compact ? "Drop the PDF here or choose it" : "Choose a PDF or drop it here"}
          </span>
          <span className="text-[13px] text-ink-muted">Up to 4 MB.</span>
        </>
      )}
    </label>
  );

  const uploadStep = {
    question: "Start with your resume or LinkedIn?",
    subtitle:
      "Optional. We'll read it once to fill in the quiz for you, then throw it away. Nothing is stored.",
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
          disabled={reading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) readResume(file);
            event.target.value = "";
          }}
        />

        <div
          role="group"
          aria-label="What to start from"
          className="mx-auto mb-6 grid w-full max-w-xs grid-cols-2 rounded-[6px] border border-line bg-muted p-1"
        >
          {(["resume", "linkedin"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={source === option}
              disabled={reading}
              onClick={() => {
                setSource(option);
                if (upload.state === "error") setUpload({ state: "idle" });
              }}
              className={`h-9 rounded-[4px] text-[14px] font-semibold transition-colors duration-150 ${
                source === option ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              {option === "resume" ? "Resume" : "LinkedIn"}
            </button>
          ))}
        </div>

        {source === "resume" ? (
          dropZone(false)
        ) : (
          <div className="space-y-6">
            <div>
              <label htmlFor="linkedin-text" className="block text-[15px] font-semibold text-ink">
                Paste your profile
              </label>
              <p id="linkedin-text-hint" className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                <a
                  href="https://www.linkedin.com/in/me/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-isu inline-flex items-center gap-1"
                >
                  Open your LinkedIn profile
                  <ExternalLink size={12} strokeWidth={2} aria-hidden />
                </a>
                , copy your headline, About, and Experience, and paste them here. Works on your phone too.
              </p>
              <textarea
                id="linkedin-text"
                aria-describedby="linkedin-text-hint"
                rows={6}
                maxLength={MAX_PASTE}
                value={pasted}
                disabled={reading}
                onChange={(event) => setPasted(event.target.value)}
                placeholder="Finance student at Iowa State. Investment analyst intern..."
                className="mt-3 w-full resize-y rounded-[4px] border border-line-strong bg-white px-4 py-3 text-[15px] text-ink placeholder:text-ink-muted focus:border-cardinal focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cardinal disabled:opacity-60"
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={readProfileText}
                  disabled={reading || pasted.trim().length === 0}
                  className="btn btn-secondary"
                >
                  {reading ? (
                    <>
                      <LoaderCircle size={16} strokeWidth={2} className="animate-spin" aria-hidden />
                      Reading
                    </>
                  ) : (
                    "Fill in my answers"
                  )}
                </button>
              </div>
            </div>

            <div>
              <p className="text-[15px] font-semibold text-ink">Or save it as a PDF</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                On a computer, open your profile, click Resources (or More), then Save to PDF.
              </p>
              <div className="mt-3">{dropZone(true)}</div>
            </div>
          </div>
        )}

        <p role="status" aria-live="polite" className="mt-4 min-h-[22px] text-center text-[14px] text-cardinal">
          {upload.state === "error"
            ? upload.message
            : reading
              ? `Reading ${upload.name}.`
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
      subtitle: `Pick up to ${MAX_AREAS}, like a double major or a minor.`,
      columns: "sm:grid-cols-2",
      valid: areas.length > 0 || draft.academicArea === "undecided",
      render: () => (
        <>
          {ACADEMIC_AREAS.map((option) => {
            const checked = areas.includes(option.id);
            return (
              <OptionCard
                key={option.id}
                type="checkbox"
                name="academic-areas"
                value={option.id}
                checked={checked}
                disabled={!checked && areas.length >= MAX_AREAS}
                onChange={() =>
                  setDraft((d) => {
                    const next = toggle<AcademicAreaId>(d.academicAreas ?? [], option.id);
                    return { ...d, academicAreas: next, academicArea: next[0] ?? null };
                  })
                }
                label={option.label}
                hint={option.hint}
              />
            );
          })}
          <OptionCard
            type="checkbox"
            name="academic-areas"
            value={UNDECIDED_OPTION.id}
            checked={draft.academicArea === "undecided"}
            onChange={() =>
              // Still deciding is the opposite of picking: it clears the picks.
              setDraft((d) =>
                d.academicArea === "undecided"
                  ? { ...d, academicArea: null }
                  : { ...d, academicArea: "undecided", academicAreas: [] },
              )
            }
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
      render: () => (
        <>
          {CAREERS.map((option) => (
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
          ))}
          {/* Spans the row so it reads as the last, catch-all choice. */}
          <div className="sm:col-span-2 lg:col-span-3">
            <OptionCard
              type="checkbox"
              name="careers"
              value={OTHER_CAREER.id}
              compact
              checked={draft.careers.includes(OTHER_CAREER.id)}
              onChange={() =>
                setDraft((d) => ({ ...d, careers: toggle<CareerId>(d.careers, OTHER_CAREER.id) }))
              }
              label={OTHER_CAREER.label}
              hint={OTHER_CAREER.hint}
            />
            {ai && draft.careers.includes(OTHER_CAREER.id) && (
              <div className="mt-3">
                <label htmlFor="other-career" className="block text-[13px] font-semibold text-ink">
                  What field is it?
                </label>
                <input
                  id="other-career"
                  type="text"
                  maxLength={120}
                  autoComplete="off"
                  value={otherText}
                  disabled={mapping}
                  onChange={(event) => {
                    setOtherText(event.target.value);
                    setOtherPhase({ kind: "idle" });
                  }}
                  placeholder="e.g. sports medicine, film production, law"
                  className="mt-1.5 h-11 w-full rounded-[4px] border border-line-strong bg-white px-4 text-[15px] text-ink placeholder:text-ink-muted focus:border-cardinal focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cardinal disabled:opacity-60"
                />
              </div>
            )}
          </div>
          <p
            role="status"
            aria-live="polite"
            className="col-span-full min-h-[20px] text-[14px] text-ink-soft"
          >
            {otherPhase.kind === "matched"
              ? `We read that as ${otherPhase.labels.join(" and ")}. Change anything that's off, then continue.`
              : otherPhase.kind === "none"
                ? "That doesn't match a field on the list, so we'll lean on your major and interests."
                : otherPhase.kind === "failed"
                  ? "We couldn't read that just now. Continue to skip it, or pick the closest field."
                  : ""}
          </p>
        </>
      ),
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
      question: "Anything specific?",
      subtitle:
        "Both optional. Something you're into, and any community you'd like to find.",
      columns: "",
      valid: true,
      render: () => (
        <div className="space-y-10">
          <div>
            <label htmlFor="interest-search" className="block text-[15px] font-semibold text-ink">
              What are you into?
            </label>
            <p id="interest-search-hint" className="mb-3 mt-1 text-[13px] text-ink-muted">
              A hobby, a sport, a cause, a field. Pick up to {MAX_INTERESTS} from the suggestions.
            </p>
            <InterestSearch
              picks={interests}
              onChange={(next) => setDraft((d) => ({ ...d, interests: next }))}
            />
            {resumeTopics.length > 0 && (
              <div className="mt-6">
                <p className="text-[13px] text-ink-muted">
                  From your {source === "linkedin" ? "profile" : "resume"}. Remove any you don&apos;t want clubs for.
                </p>
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

          <fieldset className="min-w-0 border-0 p-0">
            <legend className="text-[15px] font-semibold text-ink">
              Want to find any of these communities?
            </legend>
            <p className="mt-1 text-[13px] text-ink-muted">
              Some clubs are built around a faith, a culture, or an identity. We only include them if you ask.
            </p>
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
      question: "What's your gender?",
      subtitle:
        "Some clubs are built for one gender, like the men's and women's club teams. This only decides which of those we show. Clubs never see it.",
      columns: "sm:grid-cols-3",
      valid: draft.gender != null,
      render: () =>
        GENDER_OPTIONS.map((option) => (
          <OptionCard
            key={option.id}
            type="radio"
            name="gender"
            value={option.id}
            checked={draft.gender === option.id}
            onChange={() => setDraft((d) => ({ ...d, gender: option.id as GenderId }))}
            label={option.label}
            hint={option.hint}
          />
        )),
    },
    {
      question: "Open to Greek life?",
      subtitle: `Iowa State has ${CHAPTER_COUNT} fraternities and sororities. We can include a few that fit.`,
      columns: "sm:grid-cols-2",
      valid: draft.greek != null,
      render: () =>
        GREEK_QUIZ_OPTIONS.map((option) => (
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
  const numbered = step - offset + 1;
  const numberedTotal = totalSteps - offset;

  /** Careers the typed "Other" field fits, or null if the reader failed. */
  async function readOtherCareer(text: string): Promise<CareerId[] | null> {
    try {
      const res = await fetchWithin(
        "/api/ai/career",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        },
        10_000,
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { careers?: CareerId[] };
      return data.careers ?? [];
    } catch {
      return null;
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!current.valid || mapping) return;

    // "Other" with a typed field: read it once. Matches replace Other and wait
    // for a confirming Continue; a miss or failure says so, then lets them on.
    const isCareersStep = step === offset + 1;
    const typed = otherText.trim();
    if (
      ai &&
      isCareersStep &&
      draft.careers.includes(OTHER_CAREER.id) &&
      typed.length >= 2 &&
      otherPhase.kind === "idle"
    ) {
      setMapping(true);
      const found = await readOtherCareer(typed);
      setMapping(false);
      if (found === null) {
        setOtherPhase({ kind: "failed" });
        return;
      }
      if (found.length === 0) {
        setOtherPhase({ kind: "none" });
        return;
      }
      setDraft((d) => ({
        ...d,
        careers: Array.from(new Set([...d.careers.filter((c) => c !== OTHER_CAREER.id), ...found])),
      }));
      setOtherPhase({ kind: "matched", labels: found.map((id) => CAREER_BY_ID[id].label) });
      return;
    }
    if (isLast) {
      const finalWants = wants.slice(0, MAX_WANTS);
      savePreferences({
        ...draft,
        academicArea: areas[0] ?? "undecided",
        academicAreas: areas,
        wants: finalWants,
        goals: goalsFromWants(finalWants),
        experiences: experiencesFromWants(finalWants),
        communities,
        interests,
        topics: topicsOf(interests),
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
              Start from your resume or LinkedIn
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
              We filled in your answers from {source === "linkedin" ? "your profile" : "your resume"}. Change anything that&apos;s off.
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
              className="display text-center text-[30px] text-ink outline-none sm:text-[40px]"
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

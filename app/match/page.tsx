"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { OptionCard } from "@/components/option-card";
import {
  ACADEMIC_AREAS,
  CAREERS,
  COMMITMENTS,
  EXPERIENCES,
  FLEXIBLE_OPTION,
  GOALS,
  UNDECIDED_OPTION,
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
  ExperienceId,
  GoalId,
  Preferences,
} from "@/lib/types";

type Draft = Preferences;

const TOTAL_STEPS = 5;

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export default function MatchPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const stored = useStoredPreferences();
  const [edits, setEdits] = useState<Draft | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Answers from a previous run seed the quiz until the student changes one.
  const draft: Draft = edits ?? (stored ? stored : emptyPreferences);
  const setDraft = (update: (current: Draft) => Draft) =>
    setEdits(update(draft));

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const steps = [
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
                setDraft((d) => ({
                  ...d,
                  academicArea: option.id as AcademicAreaId,
                }))
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
      question: "What do you want from a club?",
      subtitle: "Pick everything that matters to you.",
      columns: "sm:grid-cols-2",
      valid: draft.goals.length > 0,
      render: () =>
        GOALS.map((option) => (
          <OptionCard
            key={option.id}
            type="checkbox"
            name="goals"
            value={option.id}
            checked={draft.goals.includes(option.id)}
            onChange={() =>
              setDraft((d) => ({
                ...d,
                goals: toggle<GoalId>(d.goals, option.id),
              }))
            }
            label={option.label}
            hint={option.hint}
          />
        )),
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
              setDraft((d) => ({
                ...d,
                careers: toggle<CareerId>(d.careers, option.id),
              }))
            }
            label={option.label}
            hint={option.hint}
          />
        )),
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
                setDraft((d) => ({
                  ...d,
                  commitment: option.id as CommitmentId,
                }))
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
      question: "What should it feel like?",
      subtitle: "The kind of experience you want week to week.",
      columns: "sm:grid-cols-2",
      valid: draft.experiences.length > 0,
      render: () =>
        EXPERIENCES.map((option) => (
          <OptionCard
            key={option.id}
            type="checkbox"
            name="experiences"
            value={option.id}
            checked={draft.experiences.includes(option.id)}
            onChange={() =>
              setDraft((d) => ({
                ...d,
                experiences: toggle<ExperienceId>(d.experiences, option.id),
              }))
            }
            label={option.label}
            hint={option.hint}
          />
        )),
    },
  ];

  const current = steps[step];
  const isLast = step === TOTAL_STEPS - 1;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!current.valid) return;
    if (isLast) {
      savePreferences({ ...draft, completedAt: new Date().toISOString() });
      router.push("/results");
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <div className="shell pb-24 pt-6 sm:pt-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] font-semibold text-ink-muted">
            Step {step + 1} of {TOTAL_STEPS}
          </p>
          <p className="text-[13px] text-ink-muted">About a minute</p>
        </div>

        <div
          className="mt-3 h-1.5 w-full overflow-hidden bg-muted-deep"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step + 1}
          aria-label="Quiz progress"
        >
          <div
            className="h-full bg-cardinal transition-[width] duration-300 ease-out"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>

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
            <p className="mt-4 text-center text-[15.5px] text-ink-soft sm:text-[16.5px]">
              {current.subtitle}
            </p>

            <div className={`mt-9 grid gap-3 ${current.columns}`}>
              {current.render()}
            </div>
          </fieldset>

          <div className="mt-10 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
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
                disabled={!current.valid}
                className="btn btn-primary min-w-[160px]"
              >
                {isLast ? "See my matches" : "Continue"}
                <ArrowRight size={16} strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

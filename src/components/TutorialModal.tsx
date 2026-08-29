"use client";

import { useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  EyeOff,
  Rocket,
} from "lucide-react";
import { useLocalStorageFlag } from "@/lib/useLocalStorageFlag";

const CLOSE_ANIMATION_MS = 180;

interface Step {
  eyebrow: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    eyebrow: "The problem",
    title: "Bias enters before qualifications do",
    body:
      "In most hiring pipelines, a name, age, gender, or photo reaches a recruiter's screen before a single qualification is weighed — and by then, unconscious bias has already had its chance to act.",
  },
  {
    eyebrow: "How FairHire works",
    title: "A local score, proven — not shown",
    body:
      "Your qualification data is scored locally in your browser, then a zero-knowledge circuit proves you meet a job's bar without revealing the data itself.",
  },
  {
    eyebrow: "What the employer sees",
    title: "A result, not a resume",
    body:
      "The employer dashboard has no field for a name, age, or photo — only a qualified / not-qualified result and an anti-replay nullifier, exactly like the Employer tab you're about to see.",
  },
  {
    eyebrow: "Ready",
    title: "Try it yourself",
    body:
      "Pick a candidate preset, generate a real zero-knowledge proof, then switch to the Employer tab to see exactly what does — and doesn't — arrive there.",
  },
];

export default function TutorialModal() {
  const [seen, markSeen] = useLocalStorageFlag("fairhire_tutorial_seen");
  const [stepIndex, setStepIndex] = useState(0);
  const [closing, setClosing] = useState(false);

  if (seen) return null;

  function handleClose() {
    setClosing(true);
    setTimeout(markSeen, CLOSE_ANIMATION_MS);
  }

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm ${
        closing ? "animate-backdrop-out" : "animate-fade-in"
      }`}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-modal-title"
        className={`flex w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-strong)] bg-[var(--surface)] ${
          closing ? "animate-modal-out" : "animate-modal-in"
        }`}
        style={{ boxShadow: "var(--shadow-modal), var(--hairline-top)" }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <p className="eyebrow">{step.eyebrow}</p>
          <button
            onClick={handleClose}
            aria-label="Skip tutorial"
            className="rounded-[var(--radius-sm)] p-2 text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="px-6 py-6">
          <h2 id="tutorial-modal-title" className="mb-3 text-xl font-semibold tracking-tight">
            {step.title}
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-[var(--muted)]">{step.body}</p>

          {stepIndex === 1 && <HowItWorksDiagram />}
          {stepIndex === 2 && (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-3 text-xs text-[var(--muted)]">
              <EyeOff className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
              What you see: qualification result only.
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-[var(--border)] px-6 py-4">
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Tutorial progress">
            {STEPS.map((s, i) => (
              <span
                key={s.title}
                role="tab"
                aria-selected={i === stepIndex}
                aria-label={`Step ${i + 1} of ${STEPS.length}`}
                className={`h-1.5 w-1.5 rounded-full transition-colors duration-200 ${
                  i === stepIndex ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                onClick={() => setStepIndex((i) => i - 1)}
                className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                Back
              </button>
            )}
            <button
              onClick={isLast ? handleClose : () => setStepIndex((i) => i + 1)}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] px-4 py-2 text-xs font-semibold text-white transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLast ? (
                <>
                  <Rocket className="h-3.5 w-3.5" aria-hidden />
                  Get started
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Candidate data -> local score -> ZK proof -> boolean result, as icon chips. */
function HowItWorksDiagram() {
  const chips = [
    { icon: Users, label: "Your data" },
    { icon: Calculator, label: "Local score" },
    { icon: ShieldCheck, label: "ZK proof" },
    { icon: CheckCircle2, label: "Result" },
  ];
  return (
    <div className="mb-2 flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-inset)] p-4">
      {chips.map((chip, i) => {
        const Icon = chip.icon;
        return (
          <div key={chip.label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-center text-[0.65rem] leading-tight text-[var(--muted)]">{chip.label}</span>
            </div>
            {i < chips.length - 1 && (
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted-2)]" aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}

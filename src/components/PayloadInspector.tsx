"use client";

import { useEffect, useState } from "react";
import { X, Lock, LockOpen, KeyRound, Eye, ShieldCheck } from "lucide-react";
import type { Application } from "@/app/page";

interface Props {
  application: Application;
  onClose: () => void;
}

const CLOSE_ANIMATION_MS = 180;

export default function PayloadInspector({ application, onClose }: Props) {
  const [closing, setClosing] = useState(false);

  function handleClose() {
    setClosing(true);
    setTimeout(onClose, CLOSE_ANIMATION_MS);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm ${
        closing ? "animate-backdrop-out" : "animate-fade-in"
      }`}
      onClick={handleClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payload-inspector-title"
        className={`flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-strong)] bg-[var(--surface)] ${
          closing ? "animate-modal-out" : "animate-modal-in"
        }`}
        style={{ boxShadow: "var(--shadow-modal), var(--hairline-top)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden />
            <div>
              <p className="eyebrow">Under the hood</p>
              <h2 id="payload-inspector-title" className="text-lg font-semibold tracking-tight">
                Payload Inspector
              </h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            autoFocus
            aria-label="Close payload inspector"
            className="rounded-[var(--radius-sm)] p-2 text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-px overflow-y-auto bg-[var(--border)] scrollbar-thin lg:grid-cols-2">
          <div className="relative overflow-hidden bg-[var(--surface)] p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-[var(--danger)]/60"
            />
            <LockOpen
              aria-hidden
              className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 text-[var(--danger)]/[0.05]"
            />
            <div className="relative mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--danger)]">
              <LockOpen className="h-4 w-4" aria-hidden />
              Raw candidate input
            </div>
            <p className="relative mb-3 text-xs text-[var(--muted)]">Stays in the browser. Never transmitted.</p>
            <pre className="font-mono-ui relative overflow-x-hidden whitespace-pre-wrap break-all rounded-[var(--radius-md)] border border-[var(--danger)]/15 bg-[var(--surface-inset)] p-4 text-[0.7rem] leading-relaxed text-[var(--muted)]">
{JSON.stringify(application.rawCandidateInput, null, 2)}
            </pre>
          </div>

          <div className="relative overflow-hidden bg-[var(--surface)] p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-[var(--success)]/60"
            />
            <Lock
              aria-hidden
              className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 text-[var(--success)]/[0.05]"
            />
            <div className="relative mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--success)]">
              <Lock className="h-4 w-4" aria-hidden />
              Transaction payload sent to Midnight
            </div>
            <p className="relative mb-3 text-xs text-[var(--muted)]">
              What actually leaves the browser — nullifier, proof, and result only.
            </p>
            <pre className="font-mono-ui relative overflow-x-hidden whitespace-pre-wrap break-all rounded-[var(--radius-md)] border border-[var(--success)]/15 bg-[var(--surface-inset)] p-4 text-[0.7rem] leading-relaxed">
              <PayloadJson application={application} />
            </pre>
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--border)] px-6 py-4">
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <LegendRow field="candidateName" status="hidden" />
            <LegendRow field="age" status="hidden" />
            <LegendRow field="matchScore" status="hidden" />
            <LegendRow field="zkProof" status="present" note={application.zkProof.slice(0, 18) + "…"} />
            <LegendRow field="qualifies" status="public" note={String(application.qualifies)} />
            <LegendRow
              field="expiryTimestamp"
              status="public"
              note={formatExpiry(application.payload.disclosed.expiryTimestamp)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Display-only truncation so a ~2000-char proof hex doesn't dwarf the rest
 * of the panel — the real, full value is still what's actually transmitted;
 * this component never sees or sends anything shorter. */
/** Formats the disclosed `nullifierExpiry` timestamp for the legend row. */
function formatExpiry(expiryTimestampSeconds: number): string {
  const date = new Date(expiryTimestampSeconds * 1000);
  const expired = expiryTimestampSeconds * 1000 <= Date.now();
  return `${date.toLocaleString()}${expired ? " (expired)" : ""}`;
}

function truncateForDisplay(hex: string, headLen = 28, tailLen = 8): string {
  if (hex.length <= headLen + tailLen + 1) return hex;
  return `${hex.slice(0, headLen)}…${hex.slice(-tailLen)}`;
}

function PayloadJson({ application }: { application: Application }) {
  const { payload } = application;
  const displayPayload = { ...payload, zkProof: truncateForDisplay(payload.zkProof) };
  const lines = JSON.stringify(displayPayload, null, 2).split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const isHidden = /HIDDEN \/ NOT IN PAYLOAD/.test(line);
        const isPublic = /"qualifies"|"nullifier"|"expiryTimestamp"/.test(line);
        return (
          <div key={i} className={isHidden ? "text-[var(--danger)]" : isPublic ? "text-[var(--success)]" : "text-[var(--muted)]"}>
            {line}
          </div>
        );
      })}
      <div className="mt-2 text-[var(--muted-2)]">
        // zkProof shown truncated for readability — {payload.zkProof.length} chars in the
        actual payload
      </div>
    </>
  );
}

function LegendRow({
  field,
  status,
  note,
}: {
  field: string;
  status: "hidden" | "present" | "public";
  note?: string;
}) {
  const config = {
    hidden: {
      className: "bg-[var(--danger-soft)] text-[var(--danger)]",
      icon: Lock,
      text: "HIDDEN / NOT IN PAYLOAD",
    },
    present: {
      className: "bg-[var(--accent-soft)] text-[var(--accent)]",
      icon: KeyRound,
      text: "CRYPTOGRAPHIC PROOF PRESENT",
    },
    public: {
      className: "bg-[var(--success-soft)] text-[var(--success)]",
      icon: Eye,
      text: "PUBLIC RESULT",
    },
  } as const;
  const { className, icon: Icon, text } = config[status];

  return (
    <div className={`font-mono-ui flex items-center justify-between gap-2 rounded-[var(--radius-sm)] px-3 py-2 ${className}`}>
      <span className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {field}
      </span>
      <span className="truncate pl-2 text-right">{note ?? text}</span>
    </div>
  );
}

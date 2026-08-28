"use client";

import { X, Lock, Unlock, ShieldCheck } from "lucide-react";
import type { Application } from "@/app/page";

interface Props {
  application: Application;
  onClose: () => void;
}

export default function PayloadInspector({ application, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Payload Inspector — under the hood</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid max-h-[70vh] grid-cols-1 gap-px overflow-y-auto bg-[var(--border)] scrollbar-thin lg:grid-cols-2">
          <div className="bg-[var(--surface)] p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-red-300">
              <Unlock className="h-4 w-4" />
              Raw candidate input (never leaves the browser)
            </div>
            <pre className="overflow-x-auto rounded-xl bg-[var(--surface-2)] p-4 text-xs leading-relaxed text-[var(--muted)]">
{JSON.stringify(application.rawCandidateInput, null, 2)}
            </pre>
          </div>

          <div className="bg-[var(--surface)] p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-300">
              <Lock className="h-4 w-4" />
              Actual transaction payload sent to Midnight
            </div>
            <pre className="overflow-x-auto rounded-xl bg-[var(--surface-2)] p-4 text-xs leading-relaxed">
              <PayloadJson application={application} />
            </pre>
          </div>
        </div>

        <div className="border-t border-[var(--border)] px-6 py-4">
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <LegendRow field="candidateName" status="hidden" />
            <LegendRow field="age" status="hidden" />
            <LegendRow field="matchScore" status="hidden" />
            <LegendRow field="zkProof" status="present" note={application.zkProof.slice(0, 18) + "…"} />
            <LegendRow field="qualifies" status="public" note={String(application.qualifies)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PayloadJson({ application }: { application: Application }) {
  const { payload } = application;
  const lines = JSON.stringify(payload, null, 2).split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const isHidden = /HIDDEN \/ NOT IN PAYLOAD/.test(line);
        const isPublic = /"qualifies"|"nullifier"/.test(line);
        return (
          <div
            key={i}
            className={
              isHidden
                ? "text-red-400"
                : isPublic
                ? "text-emerald-400"
                : "text-[var(--muted)]"
            }
          >
            {line}
          </div>
        );
      })}
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
  const styles = {
    hidden: "bg-red-500/10 text-red-300",
    present: "bg-indigo-500/10 text-indigo-300",
    public: "bg-emerald-500/10 text-emerald-300",
  } as const;
  const text = {
    hidden: "HIDDEN / NOT IN PAYLOAD",
    present: "CRYPTOGRAPHIC PROOF PRESENT",
    public: "PUBLIC RESULT",
  } as const;

  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 font-mono ${styles[status]}`}>
      <span>{field}</span>
      <span className="truncate pl-2">{note ?? text[status]}</span>
    </div>
  );
}

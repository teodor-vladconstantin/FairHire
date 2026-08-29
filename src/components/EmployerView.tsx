"use client";

import { CheckCircle2, CircleSlash, ShieldOff, EyeOff, Search } from "lucide-react";
import RoiCalculator from "@/components/RoiCalculator";
import type { Application } from "@/app/page";

interface Props {
  applications: Application[];
  qualifiesCount: number;
  usedNullifiers: Set<string>;
  onInspect: (app: Application) => void;
}

export default function EmployerView({ applications, qualifiesCount, usedNullifiers, onInspect }: Props) {
  return (
    <div className="space-y-6">
      <div
        className="rounded-[var(--radius-lg)] border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-4 text-sm text-[var(--muted)]"
        style={{ boxShadow: "var(--hairline-top)" }}
      >
        <div className="flex items-center gap-2 font-medium text-[var(--foreground)]">
          <EyeOff className="h-4 w-4 text-[var(--accent)]" aria-hidden />
          What you see: qualification result only.
        </div>
        <p className="mt-1">
          No name, age, gender, or photo is ever transmitted to this dashboard — only a
          boolean <span className="font-mono-ui text-[var(--foreground)]">qualifies</span> flag
          and an anti-replay nullifier proven by a zero-knowledge circuit.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Applications received" value={applications.length} />
        <StatCard label="qualifiesCount (public ledger)" value={qualifiesCount} accent />
        <StatCard label="usedNullifiers registered" value={usedNullifiers.size} />
      </div>

      <div
        className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]"
        style={{ boxShadow: "var(--shadow-card), var(--hairline-top)" }}
      >
        <div className="border-b border-[var(--border)] px-6 py-4">
          <p className="eyebrow mb-1">Ledger view</p>
          <h2 className="text-lg font-semibold tracking-tight">Active applications</h2>
        </div>

        {applications.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-[var(--muted)]">
            No applications yet. Switch to the Candidate tab to generate one.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {applications.map((app) => (
              <ApplicationRow key={app.id} app={app} onInspect={onInspect} />
            ))}
          </ul>
        )}
      </div>

      <RoiCalculator />
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5"
      style={{ boxShadow: "var(--shadow-card), var(--hairline-top)" }}
    >
      <div className="eyebrow">{label}</div>
      <div
        className={`font-mono-ui mt-2 text-3xl font-bold tabular-nums ${
          accent ? "text-[var(--accent)]" : "text-[var(--foreground)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ApplicationRow({
  app,
  onInspect,
}: {
  app: Application;
  onInspect: (app: Application) => void;
}) {
  return (
    <li
      className={`flex flex-col gap-3 px-6 py-4 transition-colors duration-150 animate-rise-in sm:flex-row sm:items-center sm:justify-between ${
        app.qualifies
          ? "bg-gradient-to-r from-transparent to-[var(--success-soft)] hover:to-[var(--success-soft)]"
          : "hover:bg-[var(--surface-2)]/50"
      }`}
    >
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {app.qualifies ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" aria-hidden />
            ) : (
              <CircleSlash className="h-4 w-4 shrink-0 text-[var(--neutral-outcome)]" aria-hidden />
            )}
            <span className="truncate">{app.jobId}</span>
          </div>
          <div className="font-mono-ui mt-1.5 flex items-center gap-1.5 truncate text-xs text-[var(--muted)]">
            <ShieldOff className="h-3 w-3 shrink-0" aria-hidden />
            {app.nullifier.slice(0, 24)}…
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-[var(--radius-sm)] px-3 py-1 font-mono-ui text-[0.7rem] font-semibold tracking-wide ${
              app.qualifies
                ? "bg-[var(--success-soft)] text-[var(--success)]"
                : "bg-[var(--neutral-outcome-soft)] text-[var(--neutral-outcome)]"
            }`}
          >
            {app.qualifies ? "QUALIFIED" : "NOT QUALIFIED"}
          </span>
          <button
            onClick={() => onInspect(app)}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] transition-colors duration-150 hover:border-[var(--accent)]/50 hover:text-[var(--foreground)]"
          >
            <Search className="h-3 w-3" aria-hidden />
            Inspect payload
          </button>
        </div>
      </div>
    </li>
  );
}

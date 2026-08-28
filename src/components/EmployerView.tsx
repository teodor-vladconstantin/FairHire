"use client";

import { CheckCircle2, XCircle, ShieldOff, EyeOff, Search } from "lucide-react";
import type { Application } from "@/app/page";

interface Props {
  applications: Application[];
  qualifiesCount: number;
  usedNullifiers: Set<string>;
  onInspect: (app: Application) => void;
}

export default function EmployerView({
  applications,
  qualifiesCount,
  usedNullifiers,
  onInspect,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-dashed border-[var(--accent)]/40 bg-[var(--accent)]/5 p-4 text-sm text-[var(--muted)]">
        <div className="flex items-center gap-2 font-medium text-[var(--foreground)]">
          <EyeOff className="h-4 w-4 text-[var(--accent)]" />
          What you see: qualification result only.
        </div>
        No name, age, gender, or photo is ever transmitted to this dashboard —
        only a boolean <span className="font-mono">qualifies</span> flag and an
        anti-replay nullifier proven by a zero-knowledge circuit.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Applications received" value={applications.length} />
        <StatCard label="qualifiesCount (public ledger)" value={qualifiesCount} accent />
        <StatCard label="usedNullifiers registered" value={usedNullifiers.size} />
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold">Active applications</h2>
        </div>

        {applications.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[var(--muted)]">
            No applications yet. Switch to the Candidate tab to generate one.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {applications.map((app) => (
              <div
                key={app.id}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {app.qualifies ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                    )}
                    {app.jobId}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        app.mode === "live"
                          ? "bg-indigo-500/15 text-indigo-300"
                          : "bg-[var(--surface-2)] text-[var(--muted)]"
                      }`}
                    >
                      {app.mode === "live" ? "proof server" : "mock proof"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 truncate font-mono text-xs text-[var(--muted)]">
                    <ShieldOff className="h-3 w-3 shrink-0" />
                    nullifier: {app.nullifier.slice(0, 24)}…
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                      app.qualifies
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-red-500/10 text-red-300"
                    }`}
                  >
                    {app.qualifies ? "QUALIFIED" : "NOT QUALIFIED"}
                  </span>
                  <button
                    onClick={() => onInspect(app)}
                    className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                  >
                    <Search className="h-3 w-3" />
                    Inspect payload
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div
        className={`mt-1 text-3xl font-bold ${accent ? "text-[var(--accent)]" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

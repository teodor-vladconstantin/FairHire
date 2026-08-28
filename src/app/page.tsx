"use client";

import { useState } from "react";
import { ShieldCheck, Users, Eye } from "lucide-react";
import CandidateView from "@/components/CandidateView";
import EmployerView from "@/components/EmployerView";
import PayloadInspector from "@/components/PayloadInspector";
import type { TransactionPayload } from "@/lib/midnight";

export interface RawCandidateInput {
  fictionalName: string;
  fictionalAge: number;
  yearsExperience: number;
  skillsMatched: number;
  totalSkillsRequired: number;
  hasCertification: boolean;
  matchScore: number;
  meetsMinCriteria: boolean;
  candidateSecret: string;
}

export interface Application {
  id: string;
  jobId: string;
  qualifies: boolean;
  nullifier: string;
  zkProof: string;
  mode: "live" | "mock";
  timestamp: number;
  payload: TransactionPayload;
  rawCandidateInput: RawCandidateInput;
}

type Tab = "candidate" | "employer";

export default function Home() {
  const [tab, setTab] = useState<Tab>("candidate");
  const [applications, setApplications] = useState<Application[]>([]);
  const [usedNullifiers, setUsedNullifiers] = useState<Set<string>>(new Set());
  const [inspectorApp, setInspectorApp] = useState<Application | null>(null);

  function handleNewApplication(app: Application) {
    setApplications((prev) => [app, ...prev]);
    setUsedNullifiers((prev) => new Set(prev).add(app.nullifier));
    setInspectorApp(app);
  }

  const qualifiesCount = applications.filter((a) => a.qualifies).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] shadow-lg shadow-violet-900/30">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">FairHire</h1>
            <p className="text-sm text-[var(--muted)]">
              Bias-free candidate screening, proven with zero-knowledge on Midnight
            </p>
          </div>
        </div>

        <nav className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
          <button
            onClick={() => setTab("candidate")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "candidate"
                ? "bg-[var(--accent)] text-white shadow"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Users className="h-4 w-4" />
            Candidate
          </button>
          <button
            onClick={() => setTab("employer")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "employer"
                ? "bg-[var(--accent)] text-white shadow"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Eye className="h-4 w-4" />
            Employer
          </button>
        </nav>
      </header>

      {tab === "candidate" ? (
        <CandidateView
          usedNullifiers={usedNullifiers}
          onSubmitted={handleNewApplication}
        />
      ) : (
        <EmployerView
          applications={applications}
          qualifiesCount={qualifiesCount}
          usedNullifiers={usedNullifiers}
          onInspect={setInspectorApp}
        />
      )}

      {inspectorApp && (
        <PayloadInspector
          application={inspectorApp}
          onClose={() => setInspectorApp(null)}
        />
      )}
    </main>
  );
}

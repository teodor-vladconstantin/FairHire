"use client";

import { useState } from "react";
import { ShieldCheck, Users, Eye, GitCompare } from "lucide-react";
import CandidateView from "@/components/CandidateView";
import EmployerView from "@/components/EmployerView";
import PayloadInspector from "@/components/PayloadInspector";
import ComparisonView from "@/components/ComparisonView";
import TutorialModal from "@/components/TutorialModal";
import ContractStatusBadge from "@/components/ContractStatusBadge";
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

type Tab = "candidate" | "employer" | "compare";

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "candidate", label: "Candidate", icon: Users },
  { id: "employer", label: "Employer", icon: Eye },
  { id: "compare", label: "Compare", icon: GitCompare },
];

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
  const activeIndex = TABS.findIndex((t) => t.id === tab);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <TutorialModal />

      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)]"
            style={{ boxShadow: "0 8px 20px -6px rgb(139 92 246 / 0.55)" }}
          >
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-mono-ui text-lg font-semibold tracking-tight">FairHire</h1>
            <p className="text-sm text-[var(--muted)]">
              Bias-free candidate screening, proven with zero-knowledge on Midnight
            </p>
          </div>
          <ContractStatusBadge />
        </div>

        <nav
          role="tablist"
          aria-label="View"
          className="relative flex w-full max-w-full gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-1 sm:w-96"
        >
          <div
            aria-hidden
            className="absolute inset-y-1 w-[calc(33.333%-0.1667rem)] rounded-[calc(var(--radius-md)-2px)] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(${activeIndex * 100}%)`,
              boxShadow: "0 4px 14px -4px rgb(139 92 246 / 0.5)",
            }}
          />
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-[calc(var(--radius-md)-2px)] px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  active ? "text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <div key={tab} className="animate-rise-in">
        {tab === "candidate" ? (
          <CandidateView usedNullifiers={usedNullifiers} onSubmitted={handleNewApplication} />
        ) : tab === "employer" ? (
          <EmployerView
            applications={applications}
            qualifiesCount={qualifiesCount}
            usedNullifiers={usedNullifiers}
            onInspect={setInspectorApp}
          />
        ) : (
          <ComparisonView latestApplication={applications[0] ?? null} />
        )}
      </div>

      {inspectorApp && (
        <PayloadInspector application={inspectorApp} onClose={() => setInspectorApp(null)} />
      )}
    </main>
  );
}

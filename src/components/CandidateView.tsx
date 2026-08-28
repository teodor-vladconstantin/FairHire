"use client";

import { useMemo, useState } from "react";
import { Sparkles, FileSearch, Loader2, AlertTriangle } from "lucide-react";
import {
  calculateMatchScore,
  SCORING_FORMULA_TEXT,
} from "@/lib/scoring";
import {
  CANDIDATE_PRESETS,
  generateAttestation,
  generateCandidateSecret,
} from "@/lib/issuer";
import { generateProof, buildTransactionPayload } from "@/lib/midnight";
import type { Application } from "@/app/page";

type PresetKey = keyof typeof CANDIDATE_PRESETS;

interface Props {
  usedNullifiers: Set<string>;
  onSubmitted: (app: Application) => void;
}

export default function CandidateView({ usedNullifiers, onSubmitted }: Props) {
  const [presetKey, setPresetKey] = useState<PresetKey>("senior");
  const [jobId, setJobId] = useState("job-frontend-eng-001");
  const [minYearsRequired, setMinYearsRequired] = useState(3);
  const [totalSkillsRequired, setTotalSkillsRequired] = useState(10);
  const [minScoreThreshold, setMinScoreThreshold] = useState(50);
  const [isGenerating, setIsGenerating] = useState(false);
  const [replayError, setReplayError] = useState<string | null>(null);

  const preset = CANDIDATE_PRESETS[presetKey];

  const breakdown = useMemo(
    () =>
      calculateMatchScore(
        preset.yearsExperience,
        preset.skillsMatched,
        totalSkillsRequired,
        preset.hasCertification,
        minYearsRequired,
        minScoreThreshold
      ),
    [preset, totalSkillsRequired, minYearsRequired, minScoreThreshold]
  );

  async function handleGenerateProof() {
    setReplayError(null);
    setIsGenerating(true);
    try {
      const candidateSecret = generateCandidateSecret();
      const attestation = await generateAttestation(
        breakdown.matchScore,
        breakdown.meetsMinCriteria
      );
      const proof = await generateProof({
        matchScore: breakdown.matchScore,
        meetsMinCriteria: breakdown.meetsMinCriteria,
        candidateSecret,
        issuerPublicKey: attestation.issuerPublicKey,
        issuerSignature: attestation.issuerSignature,
        jobId,
        minScoreThreshold,
      });

      if (usedNullifiers.has(proof.nullifier)) {
        setReplayError("Proof already used for this job! (nullifier collision)");
        return;
      }

      const payload = buildTransactionPayload(
        attestation,
        proof,
        jobId,
        minScoreThreshold
      );

      const app: Application = {
        id: proof.nullifier,
        jobId,
        qualifies: proof.qualifies,
        nullifier: proof.nullifier,
        zkProof: proof.zkProof,
        mode: proof.mode,
        timestamp: Date.now(),
        payload,
        rawCandidateInput: {
          fictionalName: preset.fictionalName,
          fictionalAge: preset.fictionalAge,
          yearsExperience: preset.yearsExperience,
          skillsMatched: preset.skillsMatched,
          totalSkillsRequired,
          hasCertification: preset.hasCertification,
          matchScore: breakdown.matchScore,
          meetsMinCriteria: breakdown.meetsMinCriteria,
          candidateSecret,
        },
      };

      onSubmitted(app);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="mb-4 text-lg font-semibold">Your qualification data</h2>

        <label className="mb-1 block text-sm text-[var(--muted)]">Profile preset</label>
        <div className="mb-4 flex gap-2">
          {(Object.keys(CANDIDATE_PRESETS) as PresetKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setPresetKey(key)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                presetKey === key
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--foreground)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {CANDIDATE_PRESETS[key].label}
            </button>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3 rounded-xl bg-[var(--surface-2)] p-3 text-sm">
          <div>
            <div className="text-[var(--muted)]">Years exp.</div>
            <div className="font-medium">{preset.yearsExperience}</div>
          </div>
          <div>
            <div className="text-[var(--muted)]">Skills matched</div>
            <div className="font-medium">{preset.skillsMatched}</div>
          </div>
          <div>
            <div className="text-[var(--muted)]">Certified</div>
            <div className="font-medium">{preset.hasCertification ? "Yes" : "No"}</div>
          </div>
        </div>

        <label className="mb-1 block text-sm text-[var(--muted)]">Job ID</label>
        <input
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          className="mb-4 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />

        <div className="mb-4 grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Min years</label>
            <input
              type="number"
              min={0}
              value={minYearsRequired}
              onChange={(e) => setMinYearsRequired(Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Skills req.</label>
            <input
              type="number"
              min={1}
              value={totalSkillsRequired}
              onChange={(e) => setTotalSkillsRequired(Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--muted)]">Min score</label>
            <input
              type="number"
              min={0}
              max={100}
              value={minScoreThreshold}
              onChange={(e) => setMinScoreThreshold(Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {replayError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {replayError}
          </div>
        )}

        <button
          onClick={handleGenerateProof}
          disabled={isGenerating}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-violet-900/30 transition hover:opacity-90 disabled:opacity-60"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Generate ZK Proof
        </button>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-4 flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-[var(--accent)]" />
          <h2 className="text-lg font-semibold">Match score (local, transparent)</h2>
        </div>

        <div className="mb-4 rounded-xl bg-[var(--surface-2)] p-4 font-mono text-xs leading-relaxed text-[var(--muted)]">
          {SCORING_FORMULA_TEXT.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>

        <div className="mb-4 space-y-2 text-sm">
          <Row label="Experience score" value={breakdown.experienceScore.toFixed(1)} />
          <Row label="Skills score" value={breakdown.skillsScore.toFixed(1)} />
          <Row label="Certification bonus" value={breakdown.certBonus.toString()} />
        </div>

        <div className="mb-4 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <span className="text-sm text-[var(--muted)]">Match score</span>
          <span className="text-3xl font-bold">{breakdown.matchScore}</span>
        </div>

        <div
          className={`rounded-xl px-4 py-3 text-center text-sm font-medium ${
            breakdown.qualifies
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-red-500/10 text-red-300"
          }`}
        >
          {breakdown.qualifies ? "Qualifies for this job" : "Does not meet threshold"}
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

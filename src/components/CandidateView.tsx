"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  FileSearch,
  Loader2,
  AlertTriangle,
  Check,
  Calculator,
  Stamp,
  ShieldCheck,
  CircleSlash,
  Clock,
  Rocket,
} from "lucide-react";
import { calculateMatchScore, SCORING_FORMULA_TEXT } from "@/lib/scoring";
import {
  CANDIDATE_PRESETS,
  DEFAULT_EXPIRY_DAYS,
  computeExpiryTimestamp,
  generateAttestation,
  generateCandidateSecret,
} from "@/lib/issuer";
import { generateProof, buildTransactionPayload } from "@/lib/midnight";
import { useLocalStorageFlag } from "@/lib/useLocalStorageFlag";
import type { Application } from "@/app/page";

type PresetKey = keyof typeof CANDIDATE_PRESETS;

type GenerationStep = "idle" | "scoring" | "attesting" | "proving" | "done";

const STEPS: { id: GenerationStep; label: string; icon: typeof Calculator; hint?: string }[] = [
  { id: "scoring", label: "Computing match score locally", icon: Calculator },
  { id: "attesting", label: "Attesting score with issuer", icon: Stamp },
  { id: "proving", label: "Generating zero-knowledge proof", icon: ShieldCheck, hint: "up to ~15s" },
];

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
  const [expiresInDays, setExpiresInDays] = useState(DEFAULT_EXPIRY_DAYS);
  const [step, setStep] = useState<GenerationStep>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [introDismissed, dismissIntro] = useLocalStorageFlag("fairhire_intro_seen");

  const isGenerating = step !== "idle" && step !== "done";
  const preset = CANDIDATE_PRESETS[presetKey];

  // `now` is deliberately client-only (set post-mount, not during render):
  // computing it during render would make the server's snapshot of "now"
  // differ from the client's own Date.now() a few ms/seconds later, which
  // is a hydration mismatch. Server and the pre-effect client render both
  // see `now === null`, so they agree; the real value fills in right after.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
  }, []);
  const previewExpiryTimestamp = useMemo(
    () => (now === null ? null : computeExpiryTimestamp(expiresInDays, now)),
    [expiresInDays, now]
  );
  const isAlreadyExpired = previewExpiryTimestamp !== null && previewExpiryTimestamp * 1000 <= now!;

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
    setSubmitError(null);
    setStep("scoring");
    try {
      // The score above is already computed locally (useMemo) — this brief
      // step just makes that first, always-local stage visible in the flow.
      await new Promise((r) => setTimeout(r, 300));

      setStep("attesting");
      const candidateSecret = generateCandidateSecret();
      const attestation = await generateAttestation(breakdown.matchScore, breakdown.meetsMinCriteria);
      const expiryTimestamp = computeExpiryTimestamp(expiresInDays);

      setStep("proving");
      const proof = await generateProof({
        matchScore: breakdown.matchScore,
        meetsMinCriteria: breakdown.meetsMinCriteria,
        candidateSecret,
        issuerPublicKey: attestation.issuerPublicKey,
        issuerSignature: attestation.issuerSignature,
        jobId,
        minScoreThreshold,
        expiryTimestamp,
      });

      if (usedNullifiers.has(proof.nullifier)) {
        setSubmitError("Proof already used for this job! (nullifier collision)");
        return;
      }

      const payload = buildTransactionPayload(attestation, proof, jobId, minScoreThreshold, expiryTimestamp);

      setStep("done");
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
    } catch (err) {
      // Surfaces circuit-level rejections (e.g. the expiryTimestamp check)
      // instead of letting them vanish as an unhandled promise rejection.
      setSubmitError(err instanceof Error ? err.message : "Proof generation failed.");
    } finally {
      setStep("idle");
    }
  }

  if (!introDismissed) {
    return (
      <div className="mx-auto max-w-xl animate-rise-in">
        <section
          className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center"
          style={{ boxShadow: "var(--shadow-card), var(--hairline-top)" }}
        >
          <p className="eyebrow mb-2">Candidate</p>
          <h2 className="mb-3 text-2xl font-semibold tracking-tight">
            Prove you qualify — without exposing who you are
          </h2>
          <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-[var(--muted)]">
            Enter your qualification data, get a locally-computed match score, and generate a
            real zero-knowledge proof the employer can check without ever seeing your name, age,
            or raw profile.
          </p>
          <button
            onClick={dismissIntro}
            className="mx-auto flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] px-6 py-3 text-sm font-semibold text-white transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
            style={{ boxShadow: "0 8px 20px -6px rgb(139 92 246 / 0.45)" }}
          >
            <Rocket className="h-4 w-4" aria-hidden />
            Get started
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 animate-rise-in">
      <section
        className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6"
        style={{ boxShadow: `var(--shadow-card), var(--hairline-top)` }}
      >
        <p className="eyebrow mb-1">Step 1</p>
        <h2 className="mb-5 text-lg font-semibold tracking-tight">Your qualification data</h2>

        <div role="radiogroup" aria-label="Profile preset" className="mb-5">
          <span className="mb-2 block text-sm text-[var(--muted)]">Profile preset</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(CANDIDATE_PRESETS) as PresetKey[]).map((key) => {
              const active = presetKey === key;
              return (
                <button
                  key={key}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPresetKey(key)}
                  className={`rounded-[var(--radius-sm)] border px-3 py-2 text-center text-xs font-medium leading-tight transition-colors duration-150 ${
                    active
                      ? "border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--foreground)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {CANDIDATE_PRESETS[key].label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3 rounded-[var(--radius-md)] bg-[var(--surface-inset)] p-3 text-sm">
          <div>
            <div className="text-xs text-[var(--muted)]">Years exp.</div>
            <div className="font-mono-ui font-medium">{preset.yearsExperience}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--muted)]">Skills matched</div>
            <div className="font-mono-ui font-medium">{preset.skillsMatched}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--muted)]">Certified</div>
            <div className="font-mono-ui font-medium">{preset.hasCertification ? "Yes" : "No"}</div>
          </div>
        </div>

        <div className="mb-5">
          <label htmlFor="jobId" className="mb-1.5 block text-sm text-[var(--muted)]">
            Job ID
          </label>
          <input
            id="jobId"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-inset)] px-3 py-2 text-sm transition-colors duration-150 focus:border-[var(--accent)]"
          />
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="minYears" className="mb-1.5 block text-sm text-[var(--muted)]">
              Min years
            </label>
            <input
              id="minYears"
              type="number"
              min={0}
              value={minYearsRequired}
              onChange={(e) => setMinYearsRequired(Number(e.target.value))}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-inset)] px-3 py-2 text-sm transition-colors duration-150 focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="skillsReq" className="mb-1.5 block text-sm text-[var(--muted)]">
              Skills req.
            </label>
            <input
              id="skillsReq"
              type="number"
              min={1}
              value={totalSkillsRequired}
              onChange={(e) => setTotalSkillsRequired(Number(e.target.value))}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-inset)] px-3 py-2 text-sm transition-colors duration-150 focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="minScore" className="mb-1.5 block text-sm text-[var(--muted)]">
              Min score
            </label>
            <input
              id="minScore"
              type="number"
              min={0}
              max={100}
              value={minScoreThreshold}
              onChange={(e) => setMinScoreThreshold(Number(e.target.value))}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-inset)] px-3 py-2 text-sm transition-colors duration-150 focus:border-[var(--accent)]"
            />
          </div>
        </div>

        <div className="mb-5">
          <label htmlFor="expiresInDays" className="mb-1.5 flex items-center gap-1.5 text-sm text-[var(--muted)]">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            Job posting expires in (days)
          </label>
          <input
            id="expiresInDays"
            type="number"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(Number(e.target.value))}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-inset)] px-3 py-2 text-sm transition-colors duration-150 focus:border-[var(--accent)]"
          />
          <p className={`mt-1.5 text-xs ${isAlreadyExpired ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>
            {previewExpiryTimestamp === null
              ? " "
              : isAlreadyExpired
                ? "Already expired — the circuit will reject this proof (try a positive value)."
                : `Expires ${new Date(previewExpiryTimestamp * 1000).toLocaleString()}`}
          </p>
        </div>

        {submitError && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {submitError}
          </div>
        )}

        {isGenerating ? (
          <div
            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-inset)] p-4 animate-fade-in"
            role="status"
            aria-live="polite"
          >
            <ol className="space-y-3">
              {STEPS.map((s, i) => {
                const currentIndex = STEPS.findIndex((x) => x.id === step);
                const state = i < currentIndex ? "done" : i === currentIndex ? "active" : "pending";
                const Icon = s.icon;
                return (
                  <li key={s.id} className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                        state === "done"
                          ? "border-[var(--success)]/40 bg-[var(--success-soft)] text-[var(--success)]"
                          : state === "active"
                            ? "border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "border-[var(--border)] text-[var(--muted-2)]"
                      }`}
                    >
                      {state === "done" ? (
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Icon className={`h-3.5 w-3.5 ${state === "active" ? "animate-pulse-soft" : ""}`} aria-hidden />
                      )}
                    </span>
                    <span
                      className={`text-sm ${
                        state === "pending" ? "text-[var(--muted-2)]" : "text-[var(--foreground)]"
                      }`}
                    >
                      {s.label}
                      {state === "active" && s.hint && (
                        <span className="ml-1.5 text-xs text-[var(--muted)]">({s.hint})</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <button
            onClick={handleGenerateProof}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] px-4 py-3 text-sm font-semibold text-white transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99]"
            style={{ boxShadow: "0 8px 20px -6px rgb(139 92 246 / 0.45)" }}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Generate ZK Proof
          </button>
        )}
      </section>

      <section
        className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6"
        style={{ boxShadow: `var(--shadow-card), var(--hairline-top)` }}
      >
        <p className="eyebrow mb-1">Step 2</p>
        <div className="mb-5 flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-[var(--accent)]" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight">Match score — local &amp; transparent</h2>
        </div>

        <div className="font-mono-ui mb-5 space-y-0.5 rounded-[var(--radius-md)] bg-[var(--surface-inset)] p-4 text-[0.7rem] leading-relaxed text-[var(--muted)]">
          {SCORING_FORMULA_TEXT.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>

        <div className="mb-5 space-y-2 text-sm">
          <Row label="Experience score" value={breakdown.experienceScore.toFixed(1)} />
          <Row label="Skills score" value={breakdown.skillsScore.toFixed(1)} />
          <Row label="Certification bonus" value={breakdown.certBonus.toString()} />
        </div>

        <div className="mb-5 flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-inset)] p-4">
          <span className="text-sm text-[var(--muted)]">Match score</span>
          <span className="font-mono-ui text-3xl font-bold">{breakdown.matchScore}</span>
        </div>

        <div
          className={`flex items-center justify-center gap-2 rounded-[var(--radius-md)] border px-4 py-3 text-center text-sm font-medium transition-colors duration-300 ${
            breakdown.qualifies
              ? "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]"
              : "border-[var(--border)] bg-[var(--neutral-outcome-soft)] text-[var(--neutral-outcome)]"
          }`}
        >
          {breakdown.qualifies ? (
            <ShieldCheck className="h-4 w-4" aria-hidden />
          ) : (
            <CircleSlash className="h-4 w-4" aria-hidden />
          )}
          {breakdown.qualifies ? "Qualifies for this job" : "Below threshold — not a match yet"}
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-mono-ui font-medium">{value}</span>
    </div>
  );
}

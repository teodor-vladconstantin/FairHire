"use client";

import {
  GitCompare,
  ImageOff,
  Cake,
  GraduationCap,
  MapPin,
  Music,
  LockOpen,
  Lock,
  ShieldOff,
  CheckCircle2,
  CircleSlash,
  ArrowLeftRight,
} from "lucide-react";
import { CANDIDATE_PRESETS } from "@/lib/issuer";
import type { Application } from "@/app/page";

interface Props {
  latestApplication: Application | null;
}

/**
 * Flavor text only — these bias vectors (school, neighborhood, hobbies)
 * aren't fields the real form collects; they exist here purely to make the
 * traditional-resume side of the comparison feel like a real CV, since
 * that's exactly the kind of incidental detail that leaks bias in practice.
 */
const RESUME_FLAVOR = {
  university: "Alma Mater State University, Class of 2016",
  neighborhood: "Lives in Maple Heights",
  hobbies: "Weekend soccer league, church choir, salsa dancing",
  summary:
    "Motivated, detail-oriented professional with a proven track record of delivering results in fast-paced environments. Excellent communicator and team player, seeking to bring energy and dedication to a growing organization.",
};

export default function ComparisonView({ latestApplication }: Props) {
  const preset = CANDIDATE_PRESETS.senior;
  const name = latestApplication?.rawCandidateInput.fictionalName ?? preset.fictionalName;
  const age = latestApplication?.rawCandidateInput.fictionalAge ?? preset.fictionalAge;
  const yearsExperience = latestApplication?.rawCandidateInput.yearsExperience ?? preset.yearsExperience;
  const jobId = latestApplication?.jobId ?? "job-frontend-eng-001";
  const qualifies = latestApplication?.qualifies ?? true;
  const nullifier = latestApplication?.nullifier ?? null;

  return (
    <div className="space-y-6">
      <div
        className="rounded-[var(--radius-lg)] border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-4 text-sm text-[var(--muted)]"
        style={{ boxShadow: "var(--hairline-top)" }}
      >
        <div className="flex items-center gap-2 font-medium text-[var(--foreground)]">
          <GitCompare className="h-4 w-4 text-[var(--accent)]" aria-hidden />
          Same candidate, same qualifications — two very different screens.
        </div>
        <p className="mt-1">
          A traditional application exposes name, age, photo, and a full resume before a single
          qualification is weighed. FairHire's employer screen never receives any of it — only a
          zero-knowledge-proven qualified / not-qualified result.
          {latestApplication
            ? " The right side below reflects the most recent proof you generated."
            : " Generate a proof in the Candidate tab to see your own result reflected here."}
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 z-10 hidden h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] lg:flex"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <ArrowLeftRight className="h-4 w-4 text-[var(--muted)]" aria-hidden />
        </div>

        {/* Traditional resume — everything exposed */}
        <section
          className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--danger)]/25 bg-[var(--surface)] p-6"
          style={{ boxShadow: "var(--shadow-card), var(--hairline-top)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-[var(--danger)]/60"
          />
          <div className="relative mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--danger)]">
            <LockOpen className="h-4 w-4" aria-hidden />
            Traditional hiring — screened by a human, first
          </div>

          <div className="mb-5 flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--danger)]/40 bg-[var(--danger-soft)]"
              aria-label="Photo placeholder"
            >
              <ImageOff className="h-6 w-6 text-[var(--danger)]" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold tracking-tight">{name}</div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <Cake className="h-3.5 w-3.5" aria-hidden />
                {age} years old
              </div>
            </div>
          </div>

          <div className="mb-4 space-y-1.5 text-xs text-[var(--muted)]">
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {RESUME_FLAVOR.university}
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {RESUME_FLAVOR.neighborhood}
            </div>
            <div className="flex items-center gap-1.5">
              <Music className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {RESUME_FLAVOR.hobbies}
            </div>
          </div>

          <p className="font-mono-ui mb-4 rounded-[var(--radius-md)] border border-[var(--danger)]/15 bg-[var(--surface-inset)] p-3 text-[0.7rem] leading-relaxed text-[var(--muted)]">
            {RESUME_FLAVOR.summary} {yearsExperience} years of experience, applying for{" "}
            <span className="text-[var(--foreground)]">{jobId}</span>.
          </p>

          <p className="text-xs text-[var(--danger)]">
            Every field above reaches the recruiter's screen before qualifications are read —
            each one is a documented channel for unconscious bias.
          </p>
        </section>

        {/* FairHire — only the verdict + nullifier */}
        <section
          className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--success)]/25 bg-[var(--surface)] p-6"
          style={{ boxShadow: "var(--shadow-card), var(--hairline-top)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-[var(--success)]/60"
          />
          <div className="relative mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--success)]">
            <Lock className="h-4 w-4" aria-hidden />
            FairHire — screened by a zero-knowledge proof
          </div>

          <div className="mb-5 flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[var(--success)]/30 bg-[var(--success-soft)]"
              aria-label="No identity data available"
            >
              <ShieldOff className="h-6 w-6 text-[var(--success)]" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-tight">Anonymous candidate</div>
              <div className="text-xs text-[var(--muted)]">
                No name · No age · No photo · No resume
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-inset)] p-4">
            <span className="text-sm text-[var(--muted)]">Result for {jobId}</span>
            <span
              className={`flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1 font-mono-ui text-[0.7rem] font-semibold tracking-wide ${
                qualifies
                  ? "bg-[var(--success-soft)] text-[var(--success)]"
                  : "bg-[var(--neutral-outcome-soft)] text-[var(--neutral-outcome)]"
              }`}
            >
              {qualifies ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <CircleSlash className="h-3.5 w-3.5" aria-hidden />}
              {qualifies ? "QUALIFIED" : "NOT QUALIFIED"}
            </span>
          </div>

          <div className="font-mono-ui mb-4 overflow-x-hidden break-all rounded-[var(--radius-md)] border border-[var(--success)]/15 bg-[var(--surface-inset)] p-3 text-[0.7rem] leading-relaxed text-[var(--muted)]">
            nullifier: {nullifier ? nullifier.slice(0, 40) + "…" : "(generate a proof to see one)"}
          </div>

          <p className="text-xs text-[var(--success)]">
            That's the entire payload. The employer's dashboard has no field that could even
            hold a name, age, or photo — see the Employer tab.
          </p>
        </section>
      </div>
    </div>
  );
}

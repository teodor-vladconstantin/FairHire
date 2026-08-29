"use client";

import { useState } from "react";
import { BarChart3, TrendingDown, BookOpen, ExternalLink, Info } from "lucide-react";

/**
 * Effect size cited below is the headline estimate from the source paper,
 * not something this app measured. Kept as a single named constant so the
 * one number driving the math is easy to audit against the citation.
 */
const KRW_CONTACT_RATE_GAP = 0.021; // 2.1 percentage points, Kline, Rose & Walters (2022)

export default function RoiCalculator() {
  const [applicationsPerMonth, setApplicationsPerMonth] = useState(500);

  const safeApplications = Number.isFinite(applicationsPerMonth) && applicationsPerMonth > 0 ? applicationsPerMonth : 0;
  const monthlyEstimate = Math.round(safeApplications * KRW_CONTACT_RATE_GAP);
  const annualEstimate = Math.round(safeApplications * 12 * KRW_CONTACT_RATE_GAP);

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6"
      style={{ boxShadow: "var(--shadow-card), var(--hairline-top)" }}
    >
      <div className="mb-1 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-[var(--accent)]" aria-hidden />
        <h2 className="text-lg font-semibold tracking-tight">ROI: reducing bias in first-screening</h2>
      </div>
      <p className="mb-5 text-sm text-[var(--muted)]">
        A rough, honest estimate of how much name-based signal FairHire removes from your
        screening pipeline — grounded in published field-experiment research, not a promise about
        your specific hiring outcomes.
      </p>

      <div className="mb-5 max-w-xs">
        <label htmlFor="applicationsPerMonth" className="mb-1.5 block text-sm text-[var(--muted)]">
          Applications per month
        </label>
        <input
          id="applicationsPerMonth"
          type="number"
          min={0}
          value={applicationsPerMonth}
          onChange={(e) => setApplicationsPerMonth(Number(e.target.value))}
          className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-inset)] px-3 py-2 text-sm transition-colors duration-150 focus:border-[var(--accent)]"
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-[var(--radius-md)] border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-4">
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <TrendingDown className="h-3.5 w-3.5" aria-hidden />
            Estimated affected decisions / month
          </div>
          <div className="font-mono-ui mt-1 text-3xl font-bold tabular-nums text-[var(--foreground)]">
            ≈ {monthlyEstimate.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {applicationsPerMonth.toLocaleString() || 0} applications × 2.1 percentage-point
            average contact-rate gap
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-inset)] p-4">
          <div className="text-xs text-[var(--muted)]">Annualized</div>
          <div className="font-mono-ui mt-1 text-3xl font-bold tabular-nums text-[var(--foreground)]">
            ≈ {annualEstimate.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">screening decisions per year</p>
        </div>
      </div>

      <div className="mb-4 space-y-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-inset)] p-4 text-xs text-[var(--muted)]">
        <div className="flex items-start gap-2">
          <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <p>
            <strong className="text-[var(--foreground)]">Kline, Rose &amp; Walters (2022)</strong>,
            &ldquo;Systemic Discrimination Among Large U.S. Employers,&rdquo;{" "}
            <em>Quarterly Journal of Economics</em> — 83,000+ fictitious applications sent to 108
            of the largest U.S. employers found distinctively Black names reduced the probability
            of employer contact by 2.1 percentage points on average versus distinctively White
            names, on otherwise-identical resumes.{" "}
            <a
              href="https://www.nber.org/papers/w29053"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
            >
              NBER working paper <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </p>
        </div>
        <div className="flex items-start gap-2 border-t border-[var(--border)] pt-3">
          <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <p>
            <strong className="text-[var(--foreground)]">Bertrand &amp; Mullainathan (2004)</strong>,
            &ldquo;Are Emily and Greg More Employable Than Lakisha and Jamal?&rdquo;{" "}
            <em>American Economic Review</em> — identical resumes with White-sounding names
            received about 50% more callbacks than the same resumes with Black-sounding names
            (roughly 1 callback per 10 resumes sent, versus 1 per 15).{" "}
            <a
              href="https://www.aeaweb.org/articles?id=10.1257/0002828042002561"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
            >
              AEA article <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-[var(--muted-2)]">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <p>
          Estimated potential impact based on published research, applied linearly to your input —
          not a guaranteed outcome for any specific employer, role, or applicant pool. FairHire's
          screening step structurally removes name, age, and photo from the decision, which is the
          exact signal channel both studies measured.
        </p>
      </div>
    </div>
  );
}

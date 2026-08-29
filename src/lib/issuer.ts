import type { CandidateProfile } from "./scoring";

/**
 * Mock local "issuer" — stands in for a credential/attestation authority.
 * Signs (matchScore, meetsMinCriteria) with a SHA-256 commitment so the
 * Compact circuit can verify the score wasn't tampered with, without ever
 * seeing the candidate's raw profile.
 */

export const ISSUER_PUBLIC_KEY =
  "fa1rh1re000000000000000000000000000000000000000000000000000001";

export interface Attestation {
  matchScore: number;
  meetsMinCriteria: boolean;
  issuerPublicKey: string;
  issuerSignature: string;
}

export interface NamedCandidatePreset extends CandidateProfile {
  label: string;
  fictionalName: string;
  fictionalAge: number;
}

/**
 * Five presets spanning the scoring formula's range against the Candidate
 * form's default thresholds (minYears: 3, skillsReq: 10, minScore: 50), so
 * a demo can show the formula handling more than just "clearly qualifies"
 * vs. "clearly doesn't":
 *
 *   preset        | matchScore | qualifies | why
 *   senior        |     92     |    yes    | high on every axis
 *   overqualified |     76     |    yes    | high exp/skills, NOT certified —
 *                 |            |           | shows certification isn't the
 *                 |            |           | sole gatekeeper
 *   mid           |     60     |    yes    | moderate exp/skills, uncertified
 *   junior        |     25     |    no     | below minYears, low skills
 *   underqualified|      4     |    no     | far below minYears and skills
 */
export const CANDIDATE_PRESETS: Record<
  "senior" | "overqualified" | "mid" | "junior" | "underqualified",
  NamedCandidatePreset
> = {
  senior: {
    label: "Senior Candidate",
    fictionalName: "Alex Morgan",
    fictionalAge: 34,
    yearsExperience: 6,
    skillsMatched: 8,
    totalSkillsRequired: 10,
    hasCertification: true,
  },
  overqualified: {
    label: "Overqualified (No Cert)",
    fictionalName: "Priya Chen",
    fictionalAge: 41,
    yearsExperience: 7,
    skillsMatched: 9,
    totalSkillsRequired: 10,
    hasCertification: false,
  },
  mid: {
    label: "Mid-Level Candidate",
    fictionalName: "Sam Rivera",
    fictionalAge: 29,
    yearsExperience: 3,
    skillsMatched: 5,
    totalSkillsRequired: 10,
    hasCertification: false,
  },
  junior: {
    label: "Junior Candidate",
    fictionalName: "Jamie Lee",
    fictionalAge: 23,
    yearsExperience: 1,
    skillsMatched: 3,
    totalSkillsRequired: 10,
    hasCertification: false,
  },
  underqualified: {
    label: "Underqualified Candidate",
    fictionalName: "Taylor Brooks",
    fictionalAge: 22,
    yearsExperience: 0,
    skillsMatched: 1,
    totalSkillsRequired: 10,
    hasCertification: false,
  },
};

/**
 * Default "Job posting expires in" preset shown on the Candidate form.
 * The circuit itself only ever sees the resolved Unix timestamp — see
 * `computeExpiryTimestamp` below and the `expiryTimestamp` parameter on
 * `verifyAndApply` in contracts/eligibility.compact.
 */
export const DEFAULT_EXPIRY_DAYS = 30;

/**
 * Resolves a candidate-facing "expires in N days" preset into the Unix
 * epoch seconds timestamp the circuit's `expiryTimestamp` parameter and
 * `blockTimeLt` assertion expect. `expiresInDays` may be zero or negative
 * so the demo can show the circuit rejecting an already-expired posting.
 */
export function computeExpiryTimestamp(expiresInDays: number, now: number = Date.now()): number {
  return Math.floor(now / 1000) + Math.round(expiresInDays * 24 * 60 * 60);
}

export function generateCandidateSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * expectedCommitment = persistentHash<[Bytes<32>, Uint<8>, Boolean]>(
 *   [issuerPublicKey, matchScore, meetsMinCriteria]
 * )
 * Mirrors the assertion made inside contracts/eligibility.compact exactly —
 * computed via the real Midnight runtime's `persistentHash` over the
 * aligned tuple encoding, not a generic string hash, since that's what the
 * circuit itself checks against. The runtime's `persistentHash` depends on
 * native WASM that only runs server-side, so this delegates entirely to
 * src/app/api/attest/route.ts. No client-side fallback: a fallback
 * signature computed here would never satisfy the real circuit's
 * assertion, so it would just mask a real server-side failure behind a
 * proof that's guaranteed to be rejected later — better to fail fast and
 * surface the real error.
 */
export async function generateAttestation(
  matchScore: number,
  meetsMinCriteria: boolean
): Promise<Attestation> {
  const issuerSignature = await computeIssuerSignature(matchScore, meetsMinCriteria);
  return {
    matchScore,
    meetsMinCriteria,
    issuerPublicKey: ISSUER_PUBLIC_KEY,
    issuerSignature,
  };
}

async function computeIssuerSignature(
  matchScore: number,
  meetsMinCriteria: boolean
): Promise<string> {
  const res = await fetch("/api/attest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matchScore, meetsMinCriteria }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body?.error === "string" ? body.error : `attest request failed: ${res.status}`
    );
  }
  const data = await res.json();
  if (typeof data.issuerSignature !== "string") {
    throw new Error("attest response missing issuerSignature");
  }
  return data.issuerSignature;
}

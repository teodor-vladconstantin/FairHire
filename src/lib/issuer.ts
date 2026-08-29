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

export const CANDIDATE_PRESETS: Record<"senior" | "junior", NamedCandidatePreset> = {
  senior: {
    label: "Senior Candidate",
    fictionalName: "Alex Morgan",
    fictionalAge: 34,
    yearsExperience: 6,
    skillsMatched: 8,
    totalSkillsRequired: 10,
    hasCertification: true,
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

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
 * native WASM that only runs server-side, so this delegates to
 * src/app/api/attest/route.ts. Falls back to the previous local
 * approximation only if that request fails for any reason, so the app
 * never breaks outright — that fallback signature will not satisfy the
 * real circuit's assertion, so it only matters for Mock Proof Mode.
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
  try {
    const res = await fetch("/api/attest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchScore, meetsMinCriteria }),
    });
    if (!res.ok) {
      throw new Error(`attest request failed: ${res.status}`);
    }
    const data = await res.json();
    if (typeof data.issuerSignature !== "string") {
      throw new Error("attest response missing issuerSignature");
    }
    return data.issuerSignature;
  } catch (err) {
    console.warn(
      "Real persistentHash attestation unavailable, falling back to local approximation:",
      err
    );
    return sha256Hex(`${ISSUER_PUBLIC_KEY}:${matchScore}:${meetsMinCriteria}`);
  }
}

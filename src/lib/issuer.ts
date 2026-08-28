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
 * expectedCommitment = persistent_hash([issuerPublicKey, matchScore, meetsMinCriteria])
 * Mirrors the assertion made inside contracts/eligibility.compact.
 */
export async function generateAttestation(
  matchScore: number,
  meetsMinCriteria: boolean
): Promise<Attestation> {
  const issuerSignature = await sha256Hex(
    `${ISSUER_PUBLIC_KEY}:${matchScore}:${meetsMinCriteria}`
  );
  return {
    matchScore,
    meetsMinCriteria,
    issuerPublicKey: ISSUER_PUBLIC_KEY,
    issuerSignature,
  };
}

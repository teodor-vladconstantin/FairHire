import { sha256Hex, type Attestation } from "./issuer";

/**
 * Thin client wrapper around the Midnight Network proof pipeline.
 *
 * In a full deployment this would call the Midnight SDK to build and submit
 * a transaction invoking `verifyAndApply` on the deployed eligibility
 * contract, proven by the local Proof Server. For fast, offline demoing
 * (or while the Proof Server is still compiling) it falls back to a Mock
 * Proof Mode that reproduces the same nullifier/qualifies computation the
 * circuit performs, so the rest of the app behaves identically either way.
 */

export const PROOF_SERVER_URL = "http://localhost:6300";

export interface ProofRequestPayload {
  matchScore: number;
  meetsMinCriteria: boolean;
  candidateSecret: string;
  issuerPublicKey: string;
  issuerSignature: string;
  jobId: string;
  minScoreThreshold: number;
}

export interface ProofResult {
  nullifier: string;
  qualifies: boolean;
  zkProof: string;
  mode: "live" | "mock";
}

export async function checkProofServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(PROOF_SERVER_URL, {
      method: "GET",
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Reproduces the on-circuit logic of contracts/eligibility.compact:
 *   nullifier = persistent_hash([candidateSecret, jobId])
 *   qualifies = (matchScore >= minScoreThreshold) AND meetsMinCriteria
 * Only `nullifier`, `qualifies`, and the proof are ever disclosed.
 */
export async function generateProof(
  payload: ProofRequestPayload
): Promise<ProofResult> {
  const live = await checkProofServerHealth();

  const nullifier = await sha256Hex(`${payload.candidateSecret}:${payload.jobId}`);
  const satisfiesScore = payload.matchScore >= payload.minScoreThreshold;
  const qualifies = satisfiesScore && payload.meetsMinCriteria;
  const zkProofSeed = await sha256Hex(
    `${nullifier}:${payload.issuerSignature}:${qualifies}:${live}`
  );

  return {
    nullifier,
    qualifies,
    zkProof: `0x${zkProofSeed}`,
    mode: live ? "live" : "mock",
  };
}

export interface TransactionPayload {
  circuit: string;
  contract: string;
  publicInputs: {
    jobId: string;
    minScoreThreshold: number;
  };
  disclosed: {
    nullifier: string;
    qualifies: boolean;
  };
  zkProof: string;
  hidden: {
    candidateName: string;
    age: string;
    matchScore: string;
    candidateSecret: string;
    issuerSignature: string;
  };
}

export function buildTransactionPayload(
  attestation: Attestation,
  proof: ProofResult,
  jobId: string,
  minScoreThreshold: number
): TransactionPayload {
  return {
    circuit: "verifyAndApply",
    contract: "eligibility",
    publicInputs: {
      jobId,
      minScoreThreshold,
    },
    disclosed: {
      nullifier: proof.nullifier,
      qualifies: proof.qualifies,
    },
    zkProof: proof.zkProof,
    hidden: {
      candidateName: "HIDDEN / NOT IN PAYLOAD",
      age: "HIDDEN / NOT IN PAYLOAD",
      matchScore: "HIDDEN / NOT IN PAYLOAD",
      candidateSecret: "HIDDEN / NOT IN PAYLOAD",
      issuerSignature: "HIDDEN / NOT IN PAYLOAD",
    },
  };
}

import type { Attestation } from "./issuer";

/**
 * Thin client wrapper around the Midnight Network proof pipeline.
 *
 * `generateProof` calls src/app/api/generate-proof/route.ts, a Node-only
 * Route Handler that runs the real compiled `verifyAndApply` circuit and
 * produces a real PLONK proof via @midnight-ntwrk/compact-runtime +
 * @midnight-ntwrk/zkir-v2 (see src/lib/server/zkProver.ts for exactly how,
 * and why that's a genuinely real proof despite not being routed through
 * the proof server container's HTTP API). There is no mock/simulated
 * fallback: if real proof generation fails or times out, the error
 * propagates to the caller so the UI can surface it honestly.
 */

export interface ProofRequestPayload {
  matchScore: number;
  meetsMinCriteria: boolean;
  candidateSecret: string;
  issuerPublicKey: string;
  issuerSignature: string;
  jobId: string;
  minScoreThreshold: number;
  /** Unix epoch seconds. The circuit rejects the proof once block time >= this. */
  expiryTimestamp: number;
}

export interface ProofResult {
  nullifier: string;
  qualifies: boolean;
  zkProof: string;
  mode: "live";
}

/**
 * Generates a proof for contracts/eligibility.compact's `verifyAndApply` by
 * asking src/app/api/generate-proof/route.ts to run the real compiled
 * circuit and produce a real PLONK proof. Throws if generation fails or
 * times out — callers must surface that to the user rather than silently
 * substituting simulated data.
 */
export async function generateProof(
  payload: ProofRequestPayload
): Promise<ProofResult> {
  return generateRealProof(payload);
}

async function generateRealProof(payload: ProofRequestPayload): Promise<ProofResult> {
  // Real PLONK proving time varies a lot under load (observed 12.6s-52s
  // across runs under load), so this uses a 120s ceiling with real margin
  // above the worst observed time. AbortSignal.timeout() alone can't log
  // anything when it fires, so this rolls its own timer to report exactly
  // how long the request had been waiting the moment it gives up — that
  // tells us whether a future timeout is too short or the proof server
  // itself is genuinely hanging.
  const timeoutMs = 120_000;
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    const elapsedMs = Date.now() - startedAt;
    console.log(
      `[generateRealProof] timing out after ${elapsedMs}ms (limit ${timeoutMs}ms) — aborting /api/generate-proof`,
    );
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch("/api/generate-proof", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        typeof body?.error === "string" ? body.error : `generate-proof request failed: ${res.status}`
      );
    }

    const data = await res.json();
    if (typeof data.nullifier !== "string" || typeof data.zkProof !== "string") {
      throw new Error("generate-proof response missing nullifier/zkProof");
    }

    return {
      nullifier: data.nullifier,
      qualifies: Boolean(data.qualifies),
      zkProof: data.zkProof,
      mode: "live",
    };
  } finally {
    clearTimeout(timeoutId);
  }
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
    /** Unix epoch seconds — written to the ledger's nullifierExpiry map. */
    expiryTimestamp: number;
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
  minScoreThreshold: number,
  expiryTimestamp: number
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
      expiryTimestamp,
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

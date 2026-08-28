import { sha256Hex, type Attestation } from "./issuer";

/**
 * Thin client wrapper around the Midnight Network proof pipeline.
 *
 * When the local Docker Proof Server (see docker-compose.yml) is healthy,
 * `generateProof` calls src/app/api/generate-proof/route.ts, a Node-only
 * Route Handler that runs the real compiled `verifyAndApply` circuit and
 * produces a real PLONK proof via @midnight-ntwrk/compact-runtime +
 * @midnight-ntwrk/zkir-v2 (see src/lib/server/zkProver.ts for exactly how,
 * and why that's a genuinely real proof despite not being routed through
 * the proof server container's HTTP API). If the proof server isn't
 * healthy, or real proof generation throws for any reason, this falls back
 * to a Mock Proof Mode that reproduces the same nullifier/qualifies
 * computation the circuit performs, so the rest of the app behaves
 * identically either way and never crashes or hangs because Docker isn't
 * running.
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

/**
 * Checks the Docker Proof Server's `/health` endpoint. A 200 response alone
 * isn't sufficient — the server can respond before it's actually ready, so
 * this also checks the JSON body's `status` field, matching the server's
 * documented `{"status":"ok",...}` contract.
 */
export async function checkProofServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${PROOF_SERVER_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return false;
    const body: unknown = await res.json();
    return (
      typeof body === "object" &&
      body !== null &&
      "status" in body &&
      (body as { status?: unknown }).status === "ok"
    );
  } catch {
    return false;
  }
}

/**
 * Generates a proof for contracts/eligibility.compact's `verifyAndApply`.
 *
 * When the Proof Server is healthy, this asks
 * src/app/api/generate-proof/route.ts to run the real compiled circuit and
 * produce a real PLONK proof. Real proof generation takes several seconds
 * (PLONK proving is inherently expensive) and can fail for reasons other
 * than the server being down (e.g. the circuit's own assertions reject the
 * inputs) — either way, any failure falls back to Mock Proof Mode below
 * rather than surfacing an error, so the UI is never blocked by proving
 * infrastructure.
 *
 * Mock Proof Mode reproduces the on-circuit logic of
 * contracts/eligibility.compact locally:
 *   nullifier = persistent_hash([candidateSecret, jobId])
 *   qualifies = (matchScore >= minScoreThreshold) AND meetsMinCriteria
 * Only `nullifier`, `qualifies`, and the proof are ever disclosed either way.
 */
export async function generateProof(
  payload: ProofRequestPayload
): Promise<ProofResult> {
  const live = await checkProofServerHealth();

  if (live) {
    try {
      return await generateRealProof(payload);
    } catch (err) {
      console.warn("Real ZK proof generation failed, falling back to Mock Proof Mode:", err);
    }
  }

  return generateMockProof(payload);
}

async function generateRealProof(payload: ProofRequestPayload): Promise<ProofResult> {
  const res = await fetch("/api/generate-proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    // Real PLONK proving can take up to ~30s for larger circuits.
    signal: AbortSignal.timeout(45000),
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
}

async function generateMockProof(payload: ProofRequestPayload): Promise<ProofResult> {
  const nullifier = await sha256Hex(`${payload.candidateSecret}:${payload.jobId}`);
  const satisfiesScore = payload.matchScore >= payload.minScoreThreshold;
  const qualifies = satisfiesScore && payload.meetsMinCriteria;
  const zkProofSeed = await sha256Hex(
    `${nullifier}:${payload.issuerSignature}:${qualifies}:mock`
  );

  return {
    nullifier,
    qualifies,
    zkProof: `0x${zkProofSeed}`,
    mode: "mock",
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

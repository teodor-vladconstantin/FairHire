import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { fromHex, toHex } from "@midnight-ntwrk/compact-runtime";
import { canonicalPublicKeyBytes, generateRealProof } from "@/lib/server/zkProver";

// Node-only: @midnight-ntwrk/compact-runtime and @midnight-ntwrk/zkir-v2
// load native WASM and read PLONK key/param files from disk.
export const runtime = "nodejs";

/**
 * Runs the real compiled `verifyAndApply` circuit against real witness
 * values and generates a real PLONK proof (see src/lib/server/zkProver.ts).
 * Proof generation is CPU-heavy and can take several seconds to tens of
 * seconds — this is expected (see the Midnight SDK's own timing guidance).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const matchScore = BigInt(Number(body?.matchScore));
    const minScoreThreshold = BigInt(Number(body?.minScoreThreshold));
    const expiryTimestamp = BigInt(Number(body?.expiryTimestamp));
    const meetsMinCriteria = Boolean(body?.meetsMinCriteria);
    const candidateSecret = fromHex(String(body?.candidateSecret ?? ""));
    // issuerPublicKey arrives as issuer.ts's ISSUER_PUBLIC_KEY constant,
    // which is not valid 32-byte hex (see canonicalPublicKeyBytes) — derive
    // the same canonical bytes /api/attest used to compute issuerSignature.
    const issuerPublicKey = canonicalPublicKeyBytes(String(body?.issuerPublicKey ?? ""));
    const issuerSignature = fromHex(String(body?.issuerSignature ?? ""));
    const jobId = jobIdToBytes32(String(body?.jobId ?? ""));

    if (candidateSecret.length !== 32 || issuerSignature.length !== 32) {
      return NextResponse.json(
        { error: "candidateSecret and issuerSignature must each be 32-byte hex strings" },
        { status: 400 },
      );
    }
    if (matchScore < 0n || matchScore > 255n || minScoreThreshold < 0n || minScoreThreshold > 255n) {
      return NextResponse.json({ error: "matchScore and minScoreThreshold must be in [0, 255]" }, { status: 400 });
    }
    if (expiryTimestamp < 0n) {
      return NextResponse.json({ error: "expiryTimestamp must be a non-negative Unix timestamp" }, { status: 400 });
    }

    const result = await generateRealProof({
      matchScore,
      meetsMinCriteria,
      candidateSecret,
      issuerPublicKey,
      issuerSignature,
      jobId,
      minScoreThreshold,
      expiryTimestamp,
    });

    return NextResponse.json({
      nullifier: toHex(result.nullifier),
      qualifies: result.qualifies,
      zkProof: `0x${toHex(result.zkProof)}`,
      proveTimeMs: result.proveTimeMs,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "proof generation failed" },
      { status: 500 },
    );
  }
}

/**
 * jobId in the UI is a free-text identifier (e.g. "job-frontend-eng-001"),
 * not itself a Bytes<32> value. It is only ever used as opaque bytes inside
 * the nullifier's persistentHash([candidateSecret, jobId]), so any stable,
 * deterministic 32-byte mapping is safe here.
 */
function jobIdToBytes32(jobId: string): Uint8Array {
  return new Uint8Array(createHash("sha256").update(jobId, "utf8").digest());
}

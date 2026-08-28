import { NextResponse } from "next/server";
import { toHex } from "@midnight-ntwrk/compact-runtime";
import { ISSUER_PUBLIC_KEY } from "@/lib/issuer";
import { canonicalPublicKeyBytes, computeAttestationSignature } from "@/lib/server/zkProver";

// Node-only: @midnight-ntwrk/compact-runtime loads native WASM.
export const runtime = "nodejs";

/**
 * Computes the real issuer attestation signature:
 *   persistentHash<[Bytes<32>, Uint<8>, Boolean]>([issuerPublicKey, matchScore, meetsMinCriteria])
 * exactly as asserted by contracts/eligibility.compact's `verifyAndApply`.
 * This must run server-side because it needs the Midnight runtime's real
 * `persistentHash`, which only runs in Node (see src/lib/server/zkProver.ts).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const matchScore = Number(body?.matchScore);
    const meetsMinCriteria = Boolean(body?.meetsMinCriteria);

    if (!Number.isInteger(matchScore) || matchScore < 0 || matchScore > 255) {
      return NextResponse.json({ error: "matchScore must be an integer in [0, 255]" }, { status: 400 });
    }

    const issuerPublicKeyBytes = canonicalPublicKeyBytes(ISSUER_PUBLIC_KEY);
    const signature = computeAttestationSignature(issuerPublicKeyBytes, BigInt(matchScore), meetsMinCriteria);

    return NextResponse.json({ issuerSignature: toHex(signature) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "attestation computation failed" },
      { status: 500 },
    );
  }
}

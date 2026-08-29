import { createHash } from "node:crypto";
import { describe, it, expect, beforeEach } from "vitest";
import * as rt from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger, type Ledger } from "./managed/eligibility/contract/index.js";
import { canonicalPublicKeyBytes, computeAttestationSignature } from "../src/lib/server/zkProver";
import { ISSUER_PUBLIC_KEY } from "../src/lib/issuer";

/**
 * Exercises the compiled `verifyAndApply` circuit directly through
 * @midnight-ntwrk/compact-runtime — the same execution engine the real
 * proof pipeline (src/lib/server/zkProver.ts) runs against — without the
 * expensive PLONK `prove()` step, since these tests only need to check
 * circuit assertions and resulting ledger state, not proof bytes.
 *
 * Requires the contract to already be compiled:
 *   compact compile contracts/eligibility.compact contracts/managed/eligibility
 */

const COIN_PUBLIC_KEY: rt.EncodedCoinPublicKey = { bytes: new Uint8Array(32) };
const ISSUER_PK = canonicalPublicKeyBytes(ISSUER_PUBLIC_KEY);
const NULLIFIER_TYPE = new rt.CompactTypeVector(2, new rt.CompactTypeBytes(32));

function bytes32(label: string): Uint8Array {
  return new Uint8Array(createHash("sha256").update(label).digest());
}

function nullifierFor(candidateSecret: Uint8Array, jobId: Uint8Array): Uint8Array {
  return rt.persistentHash(NULLIFIER_TYPE, [candidateSecret, jobId]);
}

function attestationFor(matchScore: number, meetsMinCriteria: boolean): Uint8Array {
  return computeAttestationSignature(ISSUER_PK, BigInt(matchScore), meetsMinCriteria);
}

interface CallArgs {
  matchScore: number;
  meetsMinCriteria: boolean;
  candidateSecret: Uint8Array;
  issuerPublicKey?: Uint8Array;
  issuerSignature?: Uint8Array;
  jobId: Uint8Array;
  minScoreThreshold: number;
  expiryTimestamp: number;
}

async function freshContract() {
  const contract = new Contract({});
  const init = await contract.initialState({
    initialZswapLocalState: rt.emptyZswapLocalState(COIN_PUBLIC_KEY),
    initialPrivateState: {},
  });
  return { contract, state: init.currentContractState.data as rt.ChargedState };
}

async function callVerifyAndApply(
  contract: Contract<Record<string, never>>,
  state: rt.ChargedState,
  args: CallArgs,
  atTimeSeconds?: number,
): Promise<{ nextState: rt.ChargedState; view: Ledger }> {
  const context = rt.createCircuitContext(
    rt.dummyContractAddress(),
    COIN_PUBLIC_KEY,
    state,
    {},
    undefined,
    undefined,
    atTimeSeconds,
  );
  const result = await contract.circuits.verifyAndApply(
    context,
    BigInt(args.matchScore),
    args.meetsMinCriteria,
    args.candidateSecret,
    args.issuerPublicKey ?? ISSUER_PK,
    args.issuerSignature ?? attestationFor(args.matchScore, args.meetsMinCriteria),
    args.jobId,
    BigInt(args.minScoreThreshold),
    BigInt(args.expiryTimestamp),
  );
  const nextState = new rt.ChargedState(result.context.currentQueryContext.state.state);
  return { nextState, view: ledger(nextState) };
}

const NOW = Math.floor(Date.now() / 1_000);
const FUTURE_EXPIRY = NOW + 30 * 24 * 60 * 60;
const PAST_EXPIRY = NOW - 24 * 60 * 60;

describe("eligibility.compact — verifyAndApply", () => {
  let contract: Contract<Record<string, never>>;
  let state: rt.ChargedState;

  beforeEach(async () => {
    ({ contract, state } = await freshContract());
  });

  it("1. accepts a valid attestation above threshold and increments qualifiesCount", async () => {
    const args: CallArgs = {
      matchScore: 80,
      meetsMinCriteria: true,
      candidateSecret: bytes32("candidate-1"),
      jobId: bytes32("job-1"),
      minScoreThreshold: 50,
      expiryTimestamp: FUTURE_EXPIRY,
    };
    const { view } = await callVerifyAndApply(contract, state, args, NOW);
    expect(view.qualifiesCount).toBe(1n);
    expect(view.usedNullifiers.member(nullifierFor(args.candidateSecret, args.jobId))).toBe(true);
  });

  it("2. does not increment qualifiesCount when the score is below threshold, but still records the nullifier", async () => {
    const args: CallArgs = {
      matchScore: 30,
      meetsMinCriteria: true,
      candidateSecret: bytes32("candidate-2"),
      jobId: bytes32("job-2"),
      minScoreThreshold: 50,
      expiryTimestamp: FUTURE_EXPIRY,
    };
    const { view } = await callVerifyAndApply(contract, state, args, NOW);
    expect(view.qualifiesCount).toBe(0n);
    expect(view.usedNullifiers.member(nullifierFor(args.candidateSecret, args.jobId))).toBe(true);
  });

  it("3. does not increment qualifiesCount when meetsMinCriteria is false, even with a high score", async () => {
    const args: CallArgs = {
      matchScore: 95,
      meetsMinCriteria: false,
      candidateSecret: bytes32("candidate-3"),
      jobId: bytes32("job-3"),
      minScoreThreshold: 50,
      expiryTimestamp: FUTURE_EXPIRY,
    };
    const { view } = await callVerifyAndApply(contract, state, args, NOW);
    expect(view.qualifiesCount).toBe(0n);
  });

  it("4. rejects a forged attestation (issuerSignature does not match the score/criteria)", async () => {
    const args: CallArgs = {
      matchScore: 80,
      meetsMinCriteria: true,
      candidateSecret: bytes32("candidate-4"),
      jobId: bytes32("job-4"),
      minScoreThreshold: 50,
      expiryTimestamp: FUTURE_EXPIRY,
      issuerSignature: bytes32("forged-signature"),
    };
    await expect(callVerifyAndApply(contract, state, args, NOW)).rejects.toThrow(/Invalid Score Attestation/);
  });

  it("5. rejects replaying the same nullifier for the same job", async () => {
    const args: CallArgs = {
      matchScore: 80,
      meetsMinCriteria: true,
      candidateSecret: bytes32("candidate-5"),
      jobId: bytes32("job-5"),
      minScoreThreshold: 50,
      expiryTimestamp: FUTURE_EXPIRY,
    };
    const first = await callVerifyAndApply(contract, state, args, NOW);
    await expect(callVerifyAndApply(contract, first.nextState, args, NOW)).rejects.toThrow(
      /Proof already used for this job/,
    );
  });

  it("6. allows the same candidateSecret to be reused for a different jobId (not a replay)", async () => {
    const candidateSecret = bytes32("candidate-6");
    const first = await callVerifyAndApply(
      contract,
      state,
      {
        matchScore: 80,
        meetsMinCriteria: true,
        candidateSecret,
        jobId: bytes32("job-6a"),
        minScoreThreshold: 50,
        expiryTimestamp: FUTURE_EXPIRY,
      },
      NOW,
    );
    const second = await callVerifyAndApply(
      contract,
      first.nextState,
      {
        matchScore: 80,
        meetsMinCriteria: true,
        candidateSecret,
        jobId: bytes32("job-6b"),
        minScoreThreshold: 50,
        expiryTimestamp: FUTURE_EXPIRY,
      },
      NOW,
    );
    expect(second.view.qualifiesCount).toBe(2n);
  });

  it("7. qualifies when the score exactly equals the threshold (boundary, >=)", async () => {
    const args: CallArgs = {
      matchScore: 50,
      meetsMinCriteria: true,
      candidateSecret: bytes32("candidate-7"),
      jobId: bytes32("job-7"),
      minScoreThreshold: 50,
      expiryTimestamp: FUTURE_EXPIRY,
    };
    const { view } = await callVerifyAndApply(contract, state, args, NOW);
    expect(view.qualifiesCount).toBe(1n);
  });

  it("8. records the nullifier's expiry even when the candidate does not qualify", async () => {
    const args: CallArgs = {
      matchScore: 10,
      meetsMinCriteria: false,
      candidateSecret: bytes32("candidate-8"),
      jobId: bytes32("job-8"),
      minScoreThreshold: 50,
      expiryTimestamp: FUTURE_EXPIRY,
    };
    const { view } = await callVerifyAndApply(contract, state, args, NOW);
    const nullifier = nullifierFor(args.candidateSecret, args.jobId);
    expect(view.qualifiesCount).toBe(0n);
    expect(view.nullifierExpiry.lookup(nullifier)).toBe(BigInt(FUTURE_EXPIRY));
  });

  it("9. rejects a proof once the job posting's expiryTimestamp has passed", async () => {
    const args: CallArgs = {
      matchScore: 80,
      meetsMinCriteria: true,
      candidateSecret: bytes32("candidate-9"),
      jobId: bytes32("job-9"),
      minScoreThreshold: 50,
      expiryTimestamp: PAST_EXPIRY,
    };
    await expect(callVerifyAndApply(contract, state, args, NOW)).rejects.toThrow(/Job posting has expired/);
  });
});

import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  verifyAndApply(context: __compactRuntime.CircuitContext<PS>,
                 matchScore_0: bigint,
                 meetsMinCriteria_0: boolean,
                 candidateSecret_0: Uint8Array,
                 issuerPublicKey_0: Uint8Array,
                 issuerSignature_0: Uint8Array,
                 jobId_0: Uint8Array,
                 minScoreThreshold_0: bigint,
                 expiryTimestamp_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  verifyAndApply(context: __compactRuntime.CircuitContext<PS>,
                 matchScore_0: bigint,
                 meetsMinCriteria_0: boolean,
                 candidateSecret_0: Uint8Array,
                 issuerPublicKey_0: Uint8Array,
                 issuerSignature_0: Uint8Array,
                 jobId_0: Uint8Array,
                 minScoreThreshold_0: bigint,
                 expiryTimestamp_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  verifyAndApply(context: __compactRuntime.CircuitContext<PS>,
                 matchScore_0: bigint,
                 meetsMinCriteria_0: boolean,
                 candidateSecret_0: Uint8Array,
                 issuerPublicKey_0: Uint8Array,
                 issuerSignature_0: Uint8Array,
                 jobId_0: Uint8Array,
                 minScoreThreshold_0: bigint,
                 expiryTimestamp_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly qualifiesCount: bigint;
  usedNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  nullifierExpiry: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;

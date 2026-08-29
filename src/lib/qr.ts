/**
 * Result summary encoded into the Employer view's QR code. Deliberately
 * mirrors the same three fields the Compact circuit discloses on-chain
 * (see contracts/eligibility.compact's `disclose(...)` calls) — nothing
 * more, so the QR never leaks anything the ledger itself doesn't already
 * carry.
 */
export interface ResultQrInput {
  jobId: string;
  qualifies: boolean;
  nullifier: string;
}

export function buildResultQrPayload(app: ResultQrInput): string {
  return JSON.stringify({
    jobId: app.jobId,
    qualifies: app.qualifies,
    nullifier: app.nullifier,
  });
}

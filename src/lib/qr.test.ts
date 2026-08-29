import { describe, it, expect } from "vitest";
import { buildResultQrPayload } from "./qr";

describe("buildResultQrPayload", () => {
  it("encodes jobId, qualifies, and nullifier as JSON", () => {
    const payload = buildResultQrPayload({
      jobId: "job-frontend-eng-001",
      qualifies: true,
      nullifier: "abc123",
    });
    expect(JSON.parse(payload)).toEqual({
      jobId: "job-frontend-eng-001",
      qualifies: true,
      nullifier: "abc123",
    });
  });

  it("omits every other field even if present on the input object", () => {
    const payload = buildResultQrPayload({
      jobId: "job-x",
      qualifies: false,
      nullifier: "def456",
      // @ts-expect-error - extra fields shouldn't leak into the payload
      matchScore: 92,
      zkProof: "0xsecret",
    });
    const parsed = JSON.parse(payload);
    expect(Object.keys(parsed).sort()).toEqual(["jobId", "nullifier", "qualifies"]);
  });
});

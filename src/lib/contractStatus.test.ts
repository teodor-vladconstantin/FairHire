import { describe, it, expect } from "vitest";
import { buildContractStatusQuery, parseContractStatusResponse } from "./contractStatus";

describe("buildContractStatusQuery", () => {
  it("builds the exact query the Midnight indexer SDK uses for a contract's latest block height", () => {
    const { query, variables } = buildContractStatusQuery("67502bdf1510382bcaafa156b51a4a10ddc2ed7c490190bcd9bb2b31d76f325a");
    expect(query).toContain("contractAction(address: $address)");
    expect(query).toContain("block {");
    expect(query).toContain("height");
    expect(variables).toEqual({ address: "67502bdf1510382bcaafa156b51a4a10ddc2ed7c490190bcd9bb2b31d76f325a" });
  });
});

describe("parseContractStatusResponse", () => {
  it("reports connected with the block height when the indexer resolves the contract", () => {
    const json = {
      data: {
        contractAction: {
          transaction: { block: { height: 2319530 } },
        },
      },
    };
    const result = parseContractStatusResponse(json, "0xaddr", "preprod");
    expect(result).toEqual({ status: "connected", address: "0xaddr", network: "preprod", blockHeight: 2319530 });
  });

  it("reports connected without a block height when the indexer responds but finds no contract action", () => {
    const json = { data: { contractAction: null } };
    const result = parseContractStatusResponse(json, "0xaddr", "preprod");
    expect(result).toEqual({ status: "connected", address: "0xaddr", network: "preprod" });
  });

  it("reports unreachable when the response carries GraphQL errors", () => {
    const json = { errors: [{ message: "bad request" }] };
    const result = parseContractStatusResponse(json, "0xaddr", "preprod");
    expect(result).toEqual({ status: "unreachable", address: "0xaddr", network: "preprod" });
  });

  it("reports unreachable for a malformed or empty response", () => {
    expect(parseContractStatusResponse(null, "0xaddr", "preprod")).toEqual({
      status: "unreachable",
      address: "0xaddr",
      network: "preprod",
    });
    expect(parseContractStatusResponse({}, "0xaddr", "preprod")).toEqual({
      status: "unreachable",
      address: "0xaddr",
      network: "preprod",
    });
  });
});

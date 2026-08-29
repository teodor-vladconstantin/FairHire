import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  INDEXER_HTTP_URL,
  buildContractStatusQuery,
  parseContractStatusResponse,
  type ContractStatusResult,
} from "@/lib/contractStatus";

// Reads config/deployed-contracts.json from disk — Node-only, same as
// generate-proof's route.
export const runtime = "nodejs";

const TIMEOUT_MS = 5000;

interface DeployedContracts {
  eligibility: { address: string; network: string };
}

export async function GET() {
  const deployedPath = path.join(process.cwd(), "config", "deployed-contracts.json");
  const deployed = JSON.parse(readFileSync(deployedPath, "utf8")) as DeployedContracts;
  const { address, network } = deployed.eligibility;

  try {
    const res = await fetch(INDEXER_HTTP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildContractStatusQuery(address)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      const fallback: ContractStatusResult = { status: "unreachable", address, network };
      return NextResponse.json(fallback);
    }

    const json = await res.json();
    return NextResponse.json(parseContractStatusResponse(json, address, network));
  } catch {
    const fallback: ContractStatusResult = { status: "unreachable", address, network };
    return NextResponse.json(fallback);
  }
}

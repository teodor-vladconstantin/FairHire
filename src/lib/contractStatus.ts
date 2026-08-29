/**
 * Same Preprod indexer endpoint scripts/deploy-contract.ts's PREPROD config
 * already points at — reused here rather than duplicated as an env var
 * since there is exactly one deployment target for this project.
 */
export const INDEXER_HTTP_URL = "https://indexer.preprod.midnight.network/api/v4/graphql";

/**
 * Identical to the LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY document generated
 * inside @midnight-ntwrk/midnight-js-indexer-public-data-provider — reusing
 * the SDK's own known-good query text instead of guessing indexer schema,
 * without pulling in that package's heavier WebSocket-polyfilled client
 * just to answer "is this contract reachable".
 */
export function buildContractStatusQuery(address: string): { query: string; variables: { address: string } } {
  return {
    query: `
  query LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY($address: HexEncoded!) {
    contractAction(address: $address) {
      transaction {
        block {
          height
        }
      }
    }
  }`,
    variables: { address },
  };
}

export interface ContractStatusResult {
  status: "connected" | "unreachable";
  address: string;
  network: string;
  blockHeight?: number;
}

/**
 * "Connected" means the indexer answered this specific query about our
 * deployed address without transport or GraphQL errors — not that the
 * contract necessarily has on-chain history yet. A resolved block height
 * is reported when available as extra, genuinely-observed confirmation.
 */
export function parseContractStatusResponse(json: unknown, address: string, network: string): ContractStatusResult {
  const isWellFormed =
    typeof json === "object" &&
    json !== null &&
    !("errors" in json) &&
    "data" in json &&
    typeof (json as { data: unknown }).data === "object" &&
    (json as { data: unknown }).data !== null;

  if (!isWellFormed) {
    return { status: "unreachable", address, network };
  }

  const height = (
    json as {
      data: { contractAction?: { transaction?: { block?: { height?: unknown } } } | null };
    }
  ).data.contractAction?.transaction?.block?.height;

  return {
    status: "connected",
    address,
    network,
    ...(typeof height === "number" ? { blockHeight: height } : {}),
  };
}

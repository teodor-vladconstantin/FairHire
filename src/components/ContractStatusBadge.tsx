"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import type { ContractStatusResult } from "@/lib/contractStatus";

type State =
  | { phase: "checking" }
  | { phase: "done"; result: ContractStatusResult };

function truncateAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

export default function ContractStatusBadge() {
  const [state, setState] = useState<State>({ phase: "checking" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/contract-status")
      .then((res) => res.json())
      .then((result: ContractStatusResult) => {
        if (!cancelled) setState({ phase: "done", result });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            phase: "done",
            result: { status: "unreachable", address: "", network: "preprod" },
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.phase === "checking") {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted)]">
        <span className="h-2 w-2 shrink-0 animate-pulse-soft rounded-full bg-[var(--muted-2)]" aria-hidden />
        Checking Preprod…
      </span>
    );
  }

  const { status, address, network } = state.result;
  const connected = status === "connected";
  const title = address
    ? `${network} contract ${address}`
    : `${network} — unable to reach the indexer`;

  return (
    <span
      title={title}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
        connected
          ? "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]"
          : "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]"
      }`}
    >
      {connected ? (
        <Wifi className="h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      {network[0].toUpperCase() + network.slice(1)}: {connected ? "Connected" : "Unreachable"}
      {connected && address && (
        <span className="font-mono-ui text-[0.65rem] text-[var(--muted)]">{truncateAddress(address)}</span>
      )}
    </span>
  );
}

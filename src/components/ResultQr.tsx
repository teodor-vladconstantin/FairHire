"use client";

import { QRCodeSVG } from "qrcode.react";
import { Info } from "lucide-react";
import { buildResultQrPayload, type ResultQrInput } from "@/lib/qr";

interface Props {
  application: ResultQrInput;
}

export default function ResultQr({ application }: Props) {
  const payload = buildResultQrPayload(application);

  return (
    <div className="flex flex-col items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-inset)] p-4 sm:flex-row sm:items-center">
      <div className="shrink-0 rounded-[var(--radius-sm)] bg-white p-2">
        <QRCodeSVG value={payload} size={96} bgColor="#ffffff" fgColor="#08080d" level="M" />
      </div>
      <div className="flex items-start gap-1.5 text-xs text-[var(--muted)]">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          Encodes the job ID, qualification result, and nullifier — the same three fields the
          circuit discloses on-chain. Demo-only: there is no shareable endpoint, so scanning this
          from another device just reveals the same summary locally.
        </span>
      </div>
    </div>
  );
}

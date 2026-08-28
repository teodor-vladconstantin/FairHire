// @midnight-ntwrk/midnight-js-protocol@4.1.1 pulls in @midnight-ntwrk/compact-js@2.5.1,
// which pins an EXACT, nested copy of @midnight-ntwrk/compact-runtime@0.16.0 (three minor
// versions behind the 0.19.0 our compiled contract requires — see
// contracts/managed/eligibility/compiler/contract-info.json's "runtime-version"). If left in
// place, compact-js constructs WASM objects (e.g. ContractMaintenanceAuthority) against ITS
// OWN 0.16.0-vintage @midnightntwrk/onchain-runtime-v4 instantiation, which the *contract's*
// ContractState (built via this project's root compact-runtime@0.19.0) then rejects as
// "expected instance of ContractMaintenanceAuthority" — a wasm-bindgen cross-instantiation
// identity failure, not a real type error.
//
// Deleting compact-js's nested copy makes Node's module resolution fall through to this
// project's root @midnight-ntwrk/compact-runtime (0.19.0) instead, so compact-js and the
// contract share a single WASM instantiation. This is a workaround for a genuine upstream
// version-skew bug, not a supported configuration — see the deploy-contract.ts script header
// and the accompanying patch in patches/@midnight-ntwrk+compact-js+2.5.1.patch for the related
// (also-required) async/signing-key fixes. Re-run automatically via the "postinstall" script
// (after patch-package) since a plain `npm install`/`npm ci` recreates the nested copy.
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nestedRuntimeDir = path.resolve(
  __dirname,
  "..",
  "node_modules",
  "@midnight-ntwrk",
  "compact-js",
  "node_modules",
  "@midnight-ntwrk",
  "compact-runtime",
);

if (existsSync(nestedRuntimeDir)) {
  rmSync(nestedRuntimeDir, { recursive: true, force: true });
  console.log(`[fix-compact-js-runtime] Removed nested ${nestedRuntimeDir}`);
} else {
  console.log("[fix-compact-js-runtime] Nothing to do (nested compact-runtime not present).");
}

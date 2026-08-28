# FairHire

Bias-free candidate screening for the **MLH x Midnight Hackathon** (August 28–30, 2026).

**Track:** Best Beginner Hack (first hackathon)
**Author:** Duku Constantin (solo)

## The problem

Recruitment screening carries bias before a candidate's qualifications are ever
evaluated: names, age, gender, and photos on a CV influence the decision before
skills do.

## The solution

The candidate enters qualification data only (years of experience, skills,
certifications — no name, age, gender, or photo). A local, deterministic,
transparent formula computes a match score against a job's requirements. A
Compact circuit on Midnight Network proves *"this candidate qualifies"*
without ever revealing the raw inputs to the employer. The employer's
screening view shows only a boolean qualified/not-qualified result plus an
anti-replay nullifier — never the underlying CV data.

The scoring formula is a simple, explicitly-chosen weighted sum — not a model
trained on a dataset. That's a deliberate business argument: deterministic and
auditable, with no black-box that could discriminate illegally, rather than a
limitation.

## Architecture

- **Contract:** Compact (`contracts/eligibility.compact`), compiled for the
  Midnight Proof Server.
- **Frontend:** Next.js (App Router, TypeScript) + Tailwind CSS + lucide-react.
- **Scoring:** 100% local, runs in the browser, never touches a server
  (`src/lib/scoring.ts`).
- **Mock issuer:** local SHA-256-based attestation authority for the demo
  (`src/lib/issuer.ts`).
- **Midnight client:** talks to a local Proof Server at `http://localhost:6300`,
  falling back to a Mock Proof Mode when it's unavailable so the demo always
  runs (`src/lib/midnight.ts`).

### Core cryptographic logic

1. **Attestation check:** `persistent_hash([issuerPK, matchScore, meetsMinCriteria]) == issuerSignature`
2. **Nullifier anti-replay:** `nullifier = persistent_hash([candidateSecret, jobId])`, recorded in the public `usedNullifiers` ledger map.
3. **Composite ZK predicate:** `matchScore >= minScoreThreshold AND meetsMinCriteria`.
4. **Selective disclosure:** only `nullifier` and `qualifies` are ever disclosed on-chain.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Use the **Candidate** tab to pick a preset profile,
set job requirements, and generate a ZK proof. Switch to the **Employer** tab
to see the qualification-only dashboard. The **Payload Inspector** modal opens
automatically after each proof, showing exactly what stays private vs. what's
sent on-chain.

To compile the contract (Compact CLI 0.34.0 / language version 0.26 — on Windows the
CLI only runs inside WSL, since `compact` on the native PATH collides with the
Windows built-in NTFS-compression tool of the same name):

```bash
wsl.exe -d Ubuntu -- bash -lc "cd /mnt/c/path/to/FairHire && compact compile contracts/eligibility.compact contracts/managed/eligibility"
```

This produces `contracts/managed/eligibility/{contract,keys,zkir,compiler}` —
the compiled circuit, PLONK prover/verifier keys, and ZKIR. The circuit was
exercised directly against `@midnight-ntwrk/compact-runtime` (valid
attestation, replay, forged score, sub-threshold score, and
`meetsMinCriteria == false` cases) and every assertion fired as designed.

### Known limitation / production roadmap

`src/lib/scoring.ts`, `src/lib/issuer.ts`, and `src/lib/midnight.ts` reproduce
the circuit's logic (attestation check, nullifier, composite predicate) in
plain browser JS with `crypto.subtle.digest`, exactly as the "Mock Proof
Mode" this spec calls for — the app never leaves the browser and needs no
running Proof Server to demo end-to-end. That mock hash does **not** binary-
match `persistentHash` over Midnight's aligned tuple encoding, so it can't be
swapped in as-is against the real deployed circuit; wiring an actual
transaction against `contracts/managed/eligibility` would mean computing the
attestation with `@midnight-ntwrk/compact-runtime`'s own `persistentHash` (a
Node/WASM API) rather than Web Crypto, plus a deployment + wallet + proof
server flow — out of scope for this hackathon window, and explicitly what
"Mock Proof Mode" is for per this project's spec.

### Compact syntax notes

The spec draft in `CLAUDE.md` targeted an earlier Compact syntax; the actual
compiler (0.34.0) required these adaptations, discovered by compiling and
iterating rather than assumed:

- `persistent_hash` → `persistentHash` (camelCase).
- The hash's type parameter is the **input** type, not the output (output is
  always `Bytes<32>`). Hashing three different types (`Bytes<32>`, `Uint<8>`,
  `Boolean`) needs a tuple type; hashing two `Bytes<32>` values (the
  nullifier) uses `Vector<2, Bytes<32>>`.
- `assert cond "msg"` → `assert(cond, "msg")` (function-call form).
- `Map.lookup()` throws on a missing key rather than returning an optional —
  `Map.member()` is the existence check, which is what a first-time
  applicant's nullifier check actually needs.
- Exported circuit parameters are treated as witness values by default; the
  compiler rejects any read of them (directly or via a ledger `member`/
  `insert` call) that reaches a public disclosure without an explicit
  `disclose()`. This is a compiler-enforced guarantee, not a convention.

## AI usage declaration

Claude Code was used to generate the code for this project, following the
executable spec in `CLAUDE.md`. The business logic, the scoring formula
design, and the contract's cryptographic design (attestation + nullifier +
composite predicate + selective disclosure) were designed by me.

## License

MIT

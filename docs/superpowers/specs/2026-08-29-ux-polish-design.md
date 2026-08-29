# UX Polish Pass — Design

**Date:** 2026-08-29
**Branch:** features
**Scope:** Additive UX/UI only. No changes to scoring formula, Compact circuit, proof generation, or the Payload Inspector's data model.

## Context

FairHire's core flow (Candidate → Employer → Payload Inspector → Compare → ROI) is working end-to-end against the deployed Preprod contract. This pass adds five UX improvements inspired by patterns seen in other credential/identity products, without touching business logic.

## 1. QR code for result sharing

- New dependency: `qrcode.react@4.2.0`.
- New component `src/components/ResultQr.tsx` wrapping `<QRCodeSVG>`, encoding `JSON.stringify({ jobId, qualifies, nullifier })`.
- Wired into each ledger row in `EmployerView.tsx` via a "Show QR" toggle button next to the existing "Inspect payload" button — expands an inline panel with the QR code and a muted note: "Demo-only — no shareable endpoint; scanning just reveals this same summary locally."
- No new component state lifted to `Home`; toggle is local to the row.

## 2. First-visit guided tutorial

- New component `src/components/TutorialModal.tsx`, mounted once at the root of `Home` (`src/app/page.tsx`).
- Shown on mount when `localStorage.getItem("fairhire_tutorial_seen")` is not `"1"`. Guarded with the same SSR-safe pattern already used in `CandidateView` for `now` (state starts `null`/`false`, set in a `useEffect`, so server and first client render agree and there's no hydration mismatch).
- Visual structure reuses `PayloadInspector`'s modal pattern exactly: backdrop (`animate-fade-in` / `animate-backdrop-out`), dialog (`animate-modal-in` / `animate-modal-out`), `role="dialog" aria-modal="true"`, Escape-to-close, focus on mount.
- 4 steps, each with an icon + heading + 1–2 sentences:
  1. **The problem** — hiring bias enters at screening, before qualifications are read.
  2. **How FairHire works** — one sentence + a small inline SVG diagram (candidate data → local score → ZK proof → boolean result), reusing existing CSS variables for stroke/fill.
  3. **What the employer sees vs. doesn't** — mirrors the `EyeOff` banner already in `EmployerView`.
  4. **Ready to try it** — CTA to close and land on the Candidate tab (default tab already).
- Dot progress indicator (4 dots, filled = current/past step), Back/Next buttons, a persistent Skip (top-right, matches `PayloadInspector`'s close button position/style).
- Skip or finishing step 4 both call `localStorage.setItem("fairhire_tutorial_seen", "1")` and close.

## 3. Candidate intro screen

- `Home` (`page.tsx`) owns a new boolean, initialized `false` and synced from `localStorage.getItem("fairhire_intro_seen") === "1"` in a mount-only `useEffect` (same SSR-safe pattern as above).
- Passed to `CandidateView` as a prop (`introDismissed`) along with a callback (`onDismissIntro`) that sets state + `localStorage.setItem("fairhire_intro_seen", "1")`.
- When `!introDismissed`, `CandidateView` renders a short intro block instead of the form: headline, one-line value prop, "Get Started" button. Same card chrome (`rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]`) as the rest of the view so it doesn't feel like a different product.
- Persisted permanently (per user decision) — a judge reloading mid-demo won't see it again.

## 4. Live status indicator

- New server route `src/app/api/contract-status/route.ts`. Reads the deployed address/network from `config/deployed-contracts.json`, issues a minimal POST to `https://indexer.preprod.midnight.network/api/v4/graphql` (a tiny query checking the contract action exists at that address) with an ~5s timeout via `AbortSignal.timeout`. Returns `{ status: "connected" | "unreachable", address, network, blockHeight? }`. No new env vars — reuses the same indexer URL already hardcoded in `scripts/deploy-contract.ts`'s `PREPROD` config.
- New component `src/components/ContractStatusBadge.tsx` in the header (`page.tsx`), calls the route once on mount (no polling interval — a header badge doesn't need live polling for a hackathon demo, and avoids unnecessary background fetches).
- Three visual states: checking (amber dot, `animate-pulse-soft`), connected (green dot) — label "Preprod: Connected", unreachable (red dot) — label "Preprod: Unreachable". Truncated address (`675…f325a`) shown via `title` attribute tooltip, using the same truncation convention as the nullifier display in `EmployerView`.

## 5. Visual polish

- **Credential card**: merged into #1's ledger row — subtle gradient background (`bg-gradient-to-br from-[var(--surface)] to-[var(--accent-soft)]`-style, reusing existing tokens, no new colors), qualifies badge promoted visually, nullifier/job-id de-emphasized as secondary text.
- **Icon consistency**: no new icon vocabulary. New components reuse the existing conventions verbatim: `Lock`/`LockOpen` for hidden vs. exposed, `ShieldCheck`/`ShieldOff` for verified vs. anonymous, `CheckCircle2`/`CircleSlash` for qualified vs. not, `Eye`/`EyeOff` for visibility framing.
- **Transitions**: `page.tsx` already wraps tab content in `key={tab} className="animate-rise-in"`, which is already `prefers-reduced-motion`-safe via the global media query in `globals.css`. This already satisfies the ask; the tutorial and intro reuse the same animation classes rather than introducing new ones.

## Out of scope

- Scoring formula, Compact circuit, proof generation/timeout logic, Payload Inspector's JSON diffing — all untouched.
- No polling/websocket for live status; single check on mount is sufficient for a hackathon demo.
- No backend for actually resolving a shared QR code from another device — explicitly called out as a demo limitation in the UI.

## Testing plan

- `npm run build` (Next.js production build) and `npm test` (vitest) after implementation — both must pass.
- Manual smoke check in dev server: tutorial appears on first load (with localStorage cleared), dismisses and stays dismissed; candidate intro shows once then stays dismissed; QR toggle renders a scannable-looking code; status badge shows a real connected/unreachable state (not a hardcoded string).

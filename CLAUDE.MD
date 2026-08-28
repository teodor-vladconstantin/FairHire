# CLAUDE.md — FairHire Master Executable PRD (One-Shot Build)

**Hackathon:** MLH x Midnight Hackathon, 28-30 august 2026
**Fereastră:** vineri 19:00 – duminică 18:45 (ora României)
**Autor:** Duku Constantin (solo)
**Track:** Best Beginner Hack (prima participare la un hackathon)

> Nimic din cod nu se scrie înainte de vineri 19:00. Ce se păstrează dinainte sunt doar conceptele învățate (nullifier, domain separation, selective disclosure), nu fișiere.

---

## CONCEPT

**Problema:** procesul de recrutare are bias încă din faza de screening — nume, vârstă, gen, poză influențează decizia înainte ca angajatorul să evalueze calificările reale.

**Soluția:** candidatul introduce date de calificare (ani experiență, skill-uri, certificări — fără nume, vârstă, gen, poză). O formulă locală, transparentă și deterministă calculează un scor de match față de cerințele jobului. Circuitul Compact dovedește "candidatul se califică" fără să expună datele brute către angajator. Angajatorul vede în faza de screening doar rezultatul boolean (calificat/necalificat) + un nullifier anti-replay, nu CV-ul complet.

> Notă: fără AI/ML antrenat, fără API extern. Formula de scoring e o sumă ponderată simplă, aleasă explicit, nu învățată dintr-un dataset — asta e un argument de business (determinist, auditabil, fără black-box care poate discrimina ilegal), nu o slăbiciune.

---

## DIRECTIVE FOR CLAUDE CODE
Build the entire **FairHire** project in a single autonomous run.
- Create all required folders and files.
- Write complete, working code for every component (no placeholders or `// TODO` comments).
- Compile the Compact contract and build the Next.js application.
- Optimize for speed, zero fluff, and minimal token usage.
- Do not ask for confirmation between files.

---

## 🛠️ ARCHITECTURE & TECH STACK

- **Contract Language**: Compact (`pragma language_version >= 0.23.0;`)
- **Frontend**: Next.js (App Router, TS), Tailwind CSS, Lucide React icons.
- **Backend / SDK**: Midnight Network SDK + Proof Server (`http://localhost:6300`).
- **Core Cryptographic Logic**:
  1. **Attestation Check**: `persistent_hash([issuerPK, matchScore, meetsMinCriteria]) == issuerSignature`
  2. **Nullifier Anti-Replay**: `nullifier = persistent_hash([candidateSecret, jobId])`, stored on public ledger `usedNullifiers`.
  3. **Composite ZK Predicate**: `matchScore >= minScoreThreshold AND meetsMinCriteria == true`.
  4. **Selective Disclosure**: `disclose(nullifier)` and `disclose(qualifies)` ONLY.

---

## 📁 REQUIRED FILE STRUCTURE TO GENERATE

```text
fairhire/
├── contracts/
│   └── eligibility.compact
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── CandidateView.tsx
│   │   ├── EmployerView.tsx
│   │   └── PayloadInspector.tsx
│   └── lib/
│       ├── scoring.ts
│       ├── issuer.ts
│       └── midnight.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📝 CODE SPECIFICATIONS FOR ONE-SHOT GENERATION

### 1. Compact Contract (`contracts/eligibility.compact`)

```
pragma language_version >= 0.23.0;
import CompactStandardLibrary;

export ledger qualifiesCount: Counter;
export ledger usedNullifiers: Map<Bytes<32>, Boolean>;

export circuit verifyAndApply(
  matchScore: Uint<8>,
  meetsMinCriteria: Boolean,
  candidateSecret: Bytes<32>,
  issuerPublicKey: Bytes<32>,
  issuerSignature: Bytes<32>,
  jobId: Bytes<32>,
  minScoreThreshold: Uint<8>
): [] {
  // 1. Verify Issuer Attestation (scorul a fost calculat corect, semnat de "issuer" local)
  const expectedCommitment = persistent_hash<Bytes<32>>([
    issuerPublicKey,
    matchScore,
    meetsMinCriteria
  ]);
  assert issuerSignature == expectedCommitment "Invalid Score Attestation!";

  // 2. Prevent Replay via Nullifier (nu poți refolosi aceeași dovadă pentru alt job)
  const nullifier = persistent_hash<Bytes<32>>([candidateSecret, jobId]);
  const isUsed = usedNullifiers.lookup(nullifier);
  assert !isUsed "Proof already used for this job!";

  // 3. Evaluate Composite Criteria
  const satisfiesScore = matchScore >= minScoreThreshold;
  const qualifies = satisfiesScore && meetsMinCriteria;

  // 4. Selective Disclosure
  usedNullifiers.insert(disclose(nullifier), true);

  const publicQualifies = disclose(qualifies);
  if (publicQualifies) {
    qualifiesCount.increment(1);
  }
}
```

> Verifică la compilare sintaxa exactă a `persistent_hash<Bytes<32>>` cu array ca input — unele versiuni Compact cer tip de array explicit sau `Vector` în loc de literal array.

### 2. Scoring Formula (`src/lib/scoring.ts`)

Formulă ponderată, deterministă, 100% locală — rulează în browser, nu ajunge niciodată la niciun server:

- `calculateMatchScore(yearsExperience: number, skillsMatched: number, totalSkillsRequired: number, hasCertification: boolean): number`
- Exemplu de ponderare (0-100):
  - `experienceScore = min(yearsExperience / minYearsRequired, 1) * 40`
  - `skillsScore = (skillsMatched / totalSkillsRequired) * 40`
  - `certBonus = hasCertification ? 20 : 0`
  - `matchScore = experienceScore + skillsScore + certBonus`
- `meetsMinCriteria = yearsExperience >= minYearsRequired`
- Formula trebuie afișată explicit în UI (Candidate View), ca argument de transparență/auditabilitate.

### 3. Mock Issuer Library (`src/lib/issuer.ts`)

Provide mock attestation generation using SHA256/crypto hashing:
- `generateAttestation(matchScore: number, meetsMinCriteria: boolean, candidateSecret: string)`
- Preset candidate profiles for fast demo:
  - Senior Candidate: `{ yearsExperience: 6, skillsMatched: 8, totalSkillsRequired: 10, hasCertification: true }`
  - Junior Candidate: `{ yearsExperience: 1, skillsMatched: 3, totalSkillsRequired: 10, hasCertification: false }`

### 4. Midnight SDK Client Wrapper (`src/lib/midnight.ts`)

- Configured to talk to `http://localhost:6300` (Local Proof Server) or fallback to Mock Proof Mode for instant frontend demo testing if the proof server is compiling.

### 5. Frontend Components (`src/app/page.tsx` & `src/components/`)

- Dark Theme (Tailwind CSS) matching Web3 / Midnight Network aesthetics (deep dark gray/black background, purple/indigo accents).
- **Candidate View**: Form with preset selection (Senior vs Junior), Job ID input, Min Years/Skills inputs, live-calculated match score shown with formula breakdown, and a "Generate ZK Proof" button.
- **Employer View**: Dashboard showing active applications, public ledger `qualifiesCount`, and registered `usedNullifiers`. Explicitly NO name, age, gender, or photo fields anywhere in this view — subliniază vizual asta ("What you see: qualification result only").
- **Payload Inspector Modal** (split screen "under the hood"):
  - Displays the exact JSON transaction payload sent to Midnight, side by side cu inputul brut al candidatului (nume fictiv, vârstă, skill-uri complete).
  - Clearly highlights in green/red:
    - `candidateName`: HIDDEN / NOT IN PAYLOAD
    - `age`: HIDDEN / NOT IN PAYLOAD
    - `matchScore`: HIDDEN / NOT IN PAYLOAD
    - `zkProof`: `0x7f8a39b...` (CRYPTOGRAPHIC PROOF PRESENT)
    - `qualifies`: `true` (PUBLIC RESULT)
  - Acesta e elementul central de demo — arată clar juriului ce rămâne privat vs ce ajunge public, exact locul unde se vede diferența față de recrutare tradițională.

---

## ⚡ EXECUTION TASKS FOR CLAUDE CODE

Execute these steps in order:

1. Create all directory paths if they do not exist.
2. Create `contracts/eligibility.compact` with the exact Compact code provided above.
3. Install dependencies (`lucide-react`, `clsx`, `tailwind-merge`) if missing.
4. Generate `src/lib/scoring.ts`, `src/lib/issuer.ts`, `src/lib/midnight.ts`, and all UI components (`CandidateView.tsx`, `EmployerView.tsx`, `PayloadInspector.tsx`).
5. Update `src/app/page.tsx` to combine both views with a tab switcher and the Payload Inspector.
6. Run `compact compile contracts/eligibility.compact contracts/managed/eligibility` or output compilation instructions if Compact CLI requires environment flags.
7. Verify Next.js build (`npm run build` or `yarn build`).
8. Write `README.md` including the sections in the Submission Checklist below.

---

## ✅ SUBMISSION CHECKLIST (obligatoriu, verificat din regulamentul oficial Devpost)

- [ ] **Declarație AI în README** — ex: "Am folosit Claude Code pentru generarea codului conform CLAUDE.md; logica de business, formula de scoring și designul contractului au fost gândite de mine."
- [ ] **Track menționat explicit în README**: Best Beginner Hack (prima participare la un hackathon).
- [ ] **Repo public** pe GitHub, rămâne public și după eveniment (altfel pierzi eligibilitatea pentru premii).
- [ ] **Video demo, sub 2 minute**, filmat în acest weekend (28-30 august 2026):
  - Începe verbal cu: "Salut, sunt Duku și acesta e demo-ul meu pentru Midnight Hackathon."
  - Nu e obligatorie camera pe față — voiceover peste screen recording e acceptat.
  - Arată: problema (bias în recrutare), demo live (Candidate → Employer → Payload Inspector), ce rămâne privat vs public.
- [ ] Toți pașii de înregistrare completați pe Devpost, email identic pe Devpost și pe pagina MLH.
- [ ] Un singur proiect submis la acest hackathon (nu se poate submite și în altă parte).

---

**Surse:** docs.midnight.network (Getting Started, Hello World, Compact reference, Concepts/Ledgers, Smart Contract Security, SDKs, API Reference), regulament oficial Devpost pentru Midnight Hackathon August 2026, Midnight Academy (certificat Midnight Learner obținut).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

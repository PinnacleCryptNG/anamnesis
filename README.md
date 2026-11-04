# Anamnesis

Live demo: https://anamnesis-inky.vercel.app (a sample migraine history, 50 memories on Walrus mainnet)

*Anamnesis* (Greek: recollection) is the medical word for a patient's history. This app is a medical history the patient owns. After each visit, flare-up or new prescription, you write or dictate what happened. Anamnesis breaks the note into separate facts and files each one as a memory on **Walrus Memory (Sui mainnet)**. Each fact is checked against everything filed before. Before an appointment, it recalls what matters and writes a one-page brief, with every line citing the memory it came from.

Built for **Total Recall: the Tatum × Walrus Memory Hackathon** (Smart Agents for Real Life track).

## How it learns over time

| Memories filed | What the brief can do |
| --- | --- |
| 1 visit | Repeat back what you said |
| A few visits | List current meds with doses and what changed since last time |
| Weeks of notes | Link events across dates, e.g. "nausea began 3 days after the metformin increase [4][7]", or a falling BP trend across readings |
| Earlier briefs | Every brief is filed too, so the next one knows which questions you already asked and which are still open |

Intake also recalls the most related older memories *before* filing. When a new note connects to the past, it writes a `pattern` memory, so later recalls find the link directly.

## How it uses Walrus Memory

- `@mysten-incubation/memwal` against the mainnet relayer `https://relayer.memory.walrus.xyz`, namespace `anamnesis`.
- `rememberBulk` + `waitForRememberJobs` write atomic facts tagged `[kind · date]` (symptom, medication, reaction, diagnosis, clinician, measurement, followup, pattern, brief).
- `recall` runs several targeted queries in parallel (purpose, meds, reactions, instructions, earlier briefs) and dedupes the results by blob ID.
- `listMemories` lists the stored blobs and how long their storage is paid for.
- **Doctor sharing via delegate keys:** the app generates a fresh Ed25519 delegate key (`generateDelegateKey`). The patient registers its public key in their Walrus Memory dashboard and sends the doctor a link carrying the private key in the URL fragment. The doctor's view reads the record *with the doctor's own key*. Revoking the key in the dashboard ends access.

## How it uses Tatum

All onchain reads go through **Tatum's Sui mainnet gRPC gateway** (`sui-mainnet-grpc.gateway.tatum.io`, `x-api-key` auth). Tatum documents JSON-RPC as deprecated, so the app uses `SuiGrpcClient` from `@mysten/sui` over a native gRPC transport:

- **Ledger:** reads the patient's MemWal `Account` object (owner, version, digest, registered delegate keys, last transaction), the Walrus system object's current epoch, and the latest checkpoint.
- **Live access check:** every time a doctor link is opened, the server derives the link key's public key and confirms over Tatum that it is still registered on the account object. If it isn't, nothing is recalled.

## Run it

```bash
pnpm install
cp .env.example .env.local   # fill in the four values
pnpm dev
```

Node 22.23+ / 24.22+ (required by the MemWal SDK).

## Stack

Next.js 15 (App Router), React 19, `@mysten-incubation/memwal`, `@mysten/sui` gRPC, `@anthropic-ai/sdk` (Claude Sonnet 4.6), zod. Typography: Libre Caslon Text, Atkinson Hyperlegible (designed for low-vision readers), IBM Plex Mono.

Anamnesis organises what you tell it. It does not diagnose or give medical advice.

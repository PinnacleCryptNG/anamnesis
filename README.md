# Anamnesis

A medical history you own. Tell it what happened at a visit, or photograph the prescription, and Anamnesis files each fact as a Walrus Memory on Sui mainnet. It recalls related history before filing, so later notes link back to earlier ones. Before an appointment it writes a one-page brief where every line cites its memory. A doctor gets a time-limited, revocable link to a clinician view, and every proof is read from Sui through Tatum.

Live: https://anamnesis-inky.vercel.app

## Using it

- **Start my record** (`/start`) creates a private record. A 20-character record key is generated on your device and stored there, so a refresh or a visit weeks later opens the same record. The **record card** (key + QR to `/open#k=…`) opens it on another device. Nothing is shared between visitors.
- **Today** (`/today`) is the home screen: what you take now, open follow-ups, allergies, conditions, last visit and what to raise next time, each with citations to its memories.
- **Timeline** (`/timeline`) holds the full record grouped by month and day, with kind filters, text filter and "ask the record" answers with citations.
- **New note** (`/record`) keeps the ruled notepad. Type, dictate, or attach a photo of a prescription, lab sheet or discharge letter; Claude vision reads it and the facts are filed.
- **Brief** (`/brief`) prepares a cited appointment brief and files it, so the next brief knows what you asked last time. Tapping a citation shows its memories and checks each one's Walrus blob object on Sui through Tatum (`/api/verify`).
- **Share** (`/share`) issues doctor links for 1 day to 3 months and revokes them. Doctors open `/doctor#t=…`: summary, allergies, a dose chart of medicines over time, what changed, flags, open questions and readings, all cited. The doctor can mark a flag or question **Addressed** or **Keep watching**; that files a `review` memory in the patient's record, and the next Today, brief and doctor view drop addressed items and keep watched ones.
- **Emergency card** (`/emergency`) puts allergies, medicines, conditions and an emergency contact on one card with a QR to `/e#t=…` for responders.
- **Proof on Sui** (`/ledger`) reads the Walrus account, delegate keys, Walrus epoch, Sui checkpoint and blob list.
- **Sample patient** (`/sample`) is a read-only five-month migraine history for trying everything without writing.

## Privacy model

- Each hosted record is its own Walrus Memory namespace, `p_` + the first 32 hex chars of `sha256("anamnesis-record:" + key)`. The key never leaves the browser except in the `x-record` header of the patient's own requests; the server cannot list keys.
- Anyone holding a record key can read that record, so the record card should be kept like a house key.
- For full ownership, link your own Walrus Memory account on `/start` (account ID + delegate key, kept on the device and sent as `x-memwal-account` / `x-memwal-key`). Share that record by adding a delegate key in the Walrus dashboard; the doctor view checks on Sui through Tatum that the key is still registered.
- Doctor and emergency links are HMAC-signed tokens (`SHARE_SECRET`) carrying the namespace, scope and expiry. Issuing and revoking are filed as `share` memories in the patient's record, and every open checks revocations first.
- The sample patient can't be written to without `APP_PASSCODE`.

## How it learns over time

Every note is compared with recalled history before filing. The model writes atomic facts (`symptom`, `medication`, `reaction`, `allergy`, `diagnosis`, `clinician`, `measurement`, `followup`) plus `pattern` memories that link them and `review` memories from doctors, for example a headache trend that started after a dose change. Today, briefs and the doctor view are built from recall, so they get sharper as memories accumulate; briefs are filed too.

## How it uses Walrus Memory

`@mysten-incubation/memwal` against the public relayer on Sui mainnet: `rememberBulk` + `waitForRememberJobs` for filing, semantic `recall` across several queries for Today, briefs, answers and the doctor view, and `listMemories` for the timeline and ledger. Each memory is a Walrus blob linked on walruscan.

## How it uses Tatum

Tatum's Sui mainnet gRPC gateway (`sui-mainnet-grpc.gateway.tatum.io:443`, native gRPC with TLS and `x-api-key`) reads the Walrus Memory account object and its delegate keys, the Walrus system object's dynamic field for the current epoch, and the latest checkpoint. For citations it lists the account owner's Walrus `Blob` objects (`listOwnedObjects`, type `…::blob::Blob`), decodes each u256 `blob_id` to base64url and returns the object ID, certified epoch and paid-through epoch of every cited memory. The doctor view stamps each open with the checkpoint and epoch it was checked at, and delegate-key sharing is verified there.

## Run it

```bash
pnpm install
cp .env.example .env.local   # or set the variables below
pnpm dev
```

| Variable | Purpose |
| --- | --- |
| `MEMWAL_ACCOUNT_ID` | Walrus Memory account ID (the `0x…` account object, not the delegate public key) |
| `MEMWAL_KEY` | Delegate private key registered on that account |
| `TATUM_API_KEY` | Tatum API key for Sui mainnet gRPC |
| `LLM_API_KEY` | Anthropic key (Claude Sonnet, including vision) |
| `SHARE_SECRET` | Secret that signs doctor and emergency links |
| `APP_PASSCODE` | Optional; allows writes to the sample patient |
| `MEMWAL_NAMESPACE` | Sample patient namespace (default `anamnesis`) |
| `MEMWAL_SAMPLE_UNTIL` | Optional; hide sample memories dated after this day |
| `MEMWAL_RELAYER` | Optional relayer URL |

## Stack

Next.js 16 (App Router) on Vercel, TypeScript, CSS Modules, Libre Caslon + Instrument Sans + a mono face, `qrcode` for record and emergency cards. Logo, favicon, share image and every icon are drawn for this project in `src/components/Icons.tsx`.

# Anamnesis: a medical history that remembers for you

Every new doctor starts with the same question: "So, what's your history?" Most of us answer from memory, badly. We forget when a dose changed or which pill caused the rash, and we can't remember what the last specialist said to watch for. *Anamnesis*, the Greek word for recollection, is also the medical term for that history. I built Anamnesis for the Tatum × Walrus Memory "Total Recall" hackathon, so the patient holds that history and it gets more useful with every visit.

## What it does

1. **Record.** After a visit, flare-up, prescription or reading, you write or dictate what happened in plain words. Anamnesis splits it into atomic facts (symptom, medication, reaction, diagnosis, clinician instruction, measurement, follow-up), each dated, and files every fact as its own memory on Walrus.
2. **Brief.** Before an appointment you say what it's for. Anamnesis recalls what matters and writes a one-page brief: what changed since last time, current meds, patterns across visits, questions to ask, and safety flags to raise. Every line cites the memories it came from.
3. **Share.** Each doctor gets their own key. You switch it on in your Walrus Memory dashboard and off whenever you like. The doctor's link checks Sui on every open.
4. **Ledger.** Shows proof, read live from Sui mainnet, that the record is yours and how long its storage is paid for.

## How it learns over time

The demo record is a migraine history, five months and six notes long, now 50 memories on mainnet. Here's what Anamnesis said back when each note was filed:

- **June, first visit:** "This is your first entry, so no historical patterns yet." It only files what you said.
- **July:** the GP says daily ibuprofen causes rebound headaches. Anamnesis connects that to June: "the ibuprofen you've been taking most days since at least June ... may explain why frequency stayed so high."
- **August:** after two weeks on topiramate, headaches are "down to about 2 a week (a big drop from the 14 days recorded on 2026-07-24)". It knows the baseline because it recalled the July memory before filing.
- **September:** three ibuprofen days in one week. It flags that this breaks "the 2-day limit Dr. Okafor set in July".
- **October, neurology:** it files the switch to propranolol as "the final step in a chain that began with the cognitive side effects first noted after the dose increase back in August."

That works because intake recalls related history *before* filing, and when a new note connects to the past it files a `pattern` memory. Later recalls find the link directly instead of working it out again.

The brief for the 8-week neurology follow-up then asks whether the ECG was done, whether the word-finding trouble has cleared since stopping topiramate, and whether ibuprofen is staying under the limit. It also flags watching for wheeze on propranolol, given the childhood asthma. Each line cites the memories behind it. Briefs are filed too, so the next one knows which questions were already asked.

## How it uses Walrus Memory

- `@mysten-incubation/memwal` on the mainnet relayer, namespace `anamnesis`.
- `rememberBulk` + `waitForRememberJobs` for multi-fact intake, with each fact tagged `[kind · date]` so the record view can sort and filter it.
- `recall` runs several targeted queries in parallel (purpose, meds, reactions, instructions, earlier briefs) and merges the results by blob ID.
- `listMemories` provides the ledger: blob IDs, sizes, and the epoch storage is paid through.
- Delegate keys provide sharing. `generateDelegateKey` creates a key per doctor, and the doctor's view recalls with *their* key, not the app's.

## How it uses Tatum

All chain reads go through Tatum's Sui mainnet gRPC gateway. Tatum marks Sui JSON-RPC as deprecated, so this uses the modern path: `SuiGrpcClient` over native gRPC with `x-api-key` metadata. One gotcha: the gateway speaks native gRPC, not gRPC-web, so you need `@protobuf-ts/grpc-transport` with `@grpc/grpc-js` rather than the default fetch transport.

- The **Ledger** reads the patient's MemWal `Account` object (owner, version, registered delegate keys, last transaction), the Walrus system object's current epoch, and the latest checkpoint.
- **Live revocation:** when a doctor opens their link, the server derives the key's public key and checks over Tatum that it's still on the account object. If you've revoked it, nothing is recalled.

## Try it

- Demo: <!-- vercel URL -->
- Code: https://github.com/PinnacleCryptNG/anamnesis

Built with Next.js, Walrus Memory, Tatum, and Claude. Anamnesis organises what you tell it; it does not diagnose.

@Tatum_io @WalrusFoundation

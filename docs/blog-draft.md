# Anamnesis: a medical history that remembers for you

Every new doctor starts with the same question: "So, what's your history?" Most of us answer from memory, badly. We forget when a dose changed or which pill caused the rash, and we can't remember what the last specialist said to watch for. *Anamnesis*, the Greek word for recollection, is also the medical term for that history. I built Anamnesis for the Tatum × Walrus Memory "Total Recall" hackathon, so the patient holds that history and it gets more useful with every visit.

## What it does

1. **Record.** After a visit, flare-up, prescription or reading, you write or dictate what happened in plain words. Anamnesis splits it into atomic facts (symptom, medication, reaction, diagnosis, clinician instruction, measurement, follow-up), each dated, and files every fact as its own memory on Walrus.
2. **Brief.** Before an appointment you say what it's for. Anamnesis recalls what matters and writes a one-page brief: what changed since last time, current meds, patterns across visits, questions to ask, and safety flags to raise. Every line cites the memories it came from.
3. **Share.** Each doctor gets their own key. You switch it on in your Walrus Memory dashboard and off whenever you like. The doctor's link checks Sui on every open.
4. **Ledger.** Shows proof, read live from Sui mainnet, that the record is yours and how long its storage is paid for.

## How it learns over time

<!-- Fill in with real screenshots and numbers from the demo account -->
- **Day 1:** the brief only repeats what you said.
- **After a few visits:** it tracks dose changes and lists what's new since the last visit.
- **After weeks:** intake recalls related history *before* filing. When a new note connects to the past, e.g. "nausea started three days after metformin went to 1000 mg", it files a `pattern` memory. Later recalls find that link directly instead of rediscovering it.
- **Briefs remember briefs:** each brief is filed too, so the next one knows which questions you already asked and which are still open.

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

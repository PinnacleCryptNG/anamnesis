# Anamnesis: a medical history that remembers for you

Every new doctor starts with the same question: "So, what's your history?" Most of us answer from memory, badly. We forget when a dose changed or which pill caused the rash, and we can't remember what the last specialist said to watch for. *Anamnesis*, the Greek word for recollection, is also the medical term for that history. I built Anamnesis for the Tatum × Walrus Memory "Total Recall" hackathon, so the patient holds that history and it gets more useful with every visit.

## What it does

1. **Your own record.** Tapping "Start my record" creates a private record key that stays on your device, plus a record card (the key and a QR code) for opening it on another phone. Each key maps to its own Walrus Memory namespace, so a refresh or a visit a week later brings back your history and nobody else's. If you want the account itself to be yours, you can link your own Walrus Memory account instead.
2. **Note.** After a visit, flare-up, prescription or reading, write or dictate what happened in plain words, or photograph the prescription, lab sheet or discharge letter. Anamnesis splits it into atomic facts (symptom, medication, reaction, diagnosis, clinician instruction, measurement, follow-up), each dated, and files every fact as its own memory.
3. **Today.** The home screen is a snapshot, not a feed: what you take now, what's still open (for example "ECG due"), allergies, the last visit, and what to raise next time. Every line links to the memories behind it. The full history lives in a searchable timeline.
4. **Brief.** Before an appointment, say what it's for. Anamnesis writes a one-page brief: what changed, current meds, patterns across visits, questions to ask, and flags to raise. Every line is cited.
5. **Doctor links and an emergency card.** A signed link gives one doctor read access to your record for a day, a week or three months, and you can revoke it whenever you like. The doctor sees medicines over time as a dose chart, what changed, flags and your questions, each with its source. The emergency card puts allergies, current medicines, conditions and a contact behind a QR code that responders can scan.
6. **Proof.** The Ledger shows, live from Sui mainnet, that the record is held on Walrus and how long its storage is paid for.

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

- `@mysten-incubation/memwal` on the mainnet relayer. Every patient's record gets its own namespace, `p_` followed by a hash of their record key. The sample patient sits in its own namespace and is read-only.
- `rememberBulk` + `waitForRememberJobs` handle multi-fact intake. Each fact is tagged `[kind · date]`, which lets Today, the timeline and the doctor view sort and filter.
- `recall` runs several targeted queries in parallel (purpose, meds, reactions, instructions, earlier briefs) and merges the results by blob ID. Every citation links to its Walrus blob.
- Sharing is memory too. Issuing and revoking a doctor or emergency link each files a `share` memory, and every open checks the signed link against those memories. Revoking takes effect on the next open.
- `listMemories` feeds the ledger with blob IDs, sizes, and the epoch the storage is paid through.

## How it uses Tatum

All chain reads go through Tatum's Sui mainnet gRPC gateway. Tatum marks Sui JSON-RPC as deprecated, so this uses the modern path: `SuiGrpcClient` over native gRPC with `x-api-key` metadata. One gotcha: the gateway speaks native gRPC, not gRPC-web, so you need `@protobuf-ts/grpc-transport` with `@grpc/grpc-js` rather than the default fetch transport.

- The **Ledger** reads the MemWal `Account` object (owner, version, registered delegate keys, last transaction), the Walrus system object's current epoch, and the latest checkpoint.
- The **doctor view** puts the same proof under every page: the Sui checkpoint and the Walrus epoch at the moment the doctor opened the link.
- **Your own account:** if a patient links their own Walrus account, a doctor can also use one of its delegate keys. Over Tatum, the server then checks that the key is still registered on the account object before it recalls anything.

## Try it

- Demo: https://anamnesis-inky.vercel.app (start a record, or open the sample patient)
- Code: https://github.com/PinnacleCryptNG/anamnesis

Built with Next.js, Walrus Memory, Tatum, and Claude. Anamnesis organises what you tell it; it does not diagnose.

@Tatum_io @WalrusFoundation

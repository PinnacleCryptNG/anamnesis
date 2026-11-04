import { NextResponse } from "next/server";
import { z } from "zod";
import { MemWal } from "@mysten-incubation/memwal";
import { readAccount, type AccountProof } from "@/lib/account";
import { completeJson } from "@/lib/llm";
import { asLines, numbered, recallMany, SAMPLE, today, type Ctx } from "@/lib/memory";
import { openShare } from "@/lib/record";
import { CLINICAL_SYSTEM, normalizeClinical } from "@/lib/clinical";

export const maxDuration = 60;

const Body = z.object({
  t: z.string().max(2000).optional(),
  key: z.string().min(32).max(200).optional(),
  account: z.string().regex(/^0x[0-9a-f]{64}$/i).optional(),
  purpose: z.string().max(300).optional(),
  sample: z.boolean().optional(),
});

const QUERIES = [
  "current medications and doses",
  "dose changes and stopped medications",
  "allergies and adverse reactions",
  "side effects and red-flag symptoms",
  "recent symptoms and how they changed",
  "doctor instructions, diagnoses and follow-ups",
  "measurements, readings and lab results",
  "questions the patient wants answered",
  "patterns noticed",
];

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success || (!parsed.data.t && !parsed.data.key && !parsed.data.sample))
    return NextResponse.json({ error: "This link is incomplete. Ask the patient to send it again." }, { status: 400 });
  const { t, key, account, purpose, sample } = parsed.data;
  let ctx: Ctx;
  let who: string | undefined;
  let exp: number | null = null;
  let proof: AccountProof | null = null;
  let via: "link" | "delegate" | "sample";
  if (sample) {
    ctx = SAMPLE;
    who = "Sample patient";
    via = "sample";
    proof = await readAccount().catch(() => null);
  } else if (t) {
    const opened = await openShare(t, "doctor");
    if (opened instanceof NextResponse) return opened;
    ctx = opened.ctx;
    who = opened.share.who;
    exp = opened.share.exp;
    via = "link";
    proof = await readAccount().catch(() => null);
  } else {
    let pk: string;
    try {
      pk = (await MemWal.create({ key: key!, accountId: account || process.env.MEMWAL_ACCOUNT_ID || "" }).getPublicKeyHex()).replace(/^0x/, "").toLowerCase();
    } catch {
      return NextResponse.json({ error: "This link's key is not valid." }, { status: 400 });
    }
    proof = await readAccount(account);
    if (!proof.delegates.some((d) => d.publicKeyHex === pk))
      return NextResponse.json({ status: "not-active", error: "This key is not registered on the patient's account.", publicKeyHex: pk, accountVersion: proof.version }, { status: 403 });
    ctx = { ns: "anamnesis", key, accountId: account };
    via = "delegate";
  }
  try {
    const entries = await recallMany(purpose ? [purpose, ...QUERIES] : QUERIES, { limit: 12, ctx });
    const sources = numbered(entries.filter((e) => e.kind !== "share" && e.kind !== "brief"));
    if (!sources.length) return NextResponse.json({ status: "active", empty: true, who, exp, via });
    const clinical = normalizeClinical(await completeJson<unknown>(
      CLINICAL_SYSTEM,
      `Today: ${today()}.${purpose ? ` Reason for visit: ${purpose}.` : ""}\n\nRecord:\n${asLines(sources)}`,
      2600,
    ));
    return NextResponse.json({
      status: "active",
      via,
      who,
      exp,
      clinical,
      sources,
      proof: proof && { accountId: proof.accountId, version: proof.version, checkpoint: proof.checkpoint, walrusEpoch: proof.walrusEpoch, checkedAt: proof.checkedAt },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

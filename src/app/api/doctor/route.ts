import { NextResponse } from "next/server";
import { z } from "zod";
import { MemWal } from "@mysten-incubation/memwal";
import { readAccount } from "@/lib/account";
import { completeJson } from "@/lib/llm";
import { recallMany, today } from "@/lib/memory";
import { BRIEF_SYSTEM, type Brief } from "@/lib/brief";

export const maxDuration = 60;

const Body = z.object({ key: z.string().min(32).max(200), purpose: z.string().max(300).optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "This link is missing its key." }, { status: 400 });
  const { key } = parsed.data;
  const purpose = parsed.data.purpose || "general review";
  let publicKeyHex: string;
  try {
    publicKeyHex = await MemWal.create({ key, accountId: process.env.MEMWAL_ACCOUNT_ID || "" }).getPublicKeyHex();
  } catch {
    return NextResponse.json({ error: "This link's key is not valid." }, { status: 400 });
  }
  const account = await readAccount();
  const pk = publicKeyHex.replace(/^0x/, "").toLowerCase();
  const delegate = account.delegates.find((d) => d.publicKeyHex === pk);
  if (!delegate) {
    return NextResponse.json(
      { status: "not-active", publicKeyHex: pk, checkedAt: account.checkedAt, accountVersion: account.version },
      { status: 403 },
    );
  }
  try {
    const entries = await recallMany([purpose, "current medications and doses", "recent symptoms", "reactions", "doctor instructions", "patterns noticed"], { limit: 12, key });
    const sources = entries.filter((e) => e.kind !== "brief").map((e, i) => ({ ...e, n: i + 1 }));
    const brief = await completeJson<Brief>(
      BRIEF_SYSTEM + "\nThe reader is the clinician, not the patient. Phrase questions as things to clarify with the patient.",
      `Today: ${today()}. Appointment: ${purpose}.\n\nRecord:\n${sources.map((s) => `[${s.n}] (${s.kind}, ${s.date}) ${s.body}`).join("\n")}`,
      2200,
    );
    return NextResponse.json({ status: "active", delegate, brief, sources, checkedAt: account.checkedAt, accountVersion: account.version });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { completeJson } from "@/lib/llm";
import { formatEntry, KINDS, recallMany, rememberAll, today, type Kind } from "@/lib/memory";

export const maxDuration = 60;

const Body = z.object({ note: z.string().min(3).max(4000), date: z.string().optional() });

type Extracted = {
  facts: { kind: Kind; date: string; text: string }[];
  patterns: { text: string }[];
  ack: string;
};

const SYSTEM = `You are the clerk of a patient's personal medical record called Anamnesis.
The patient dictates notes after visits, flare-ups, pharmacy runs, or test results.
Split the note into atomic, self-contained facts a future clinician could read alone.
Each fact: kind (one of ${KINDS.filter((k) => k !== "brief" && k !== "pattern").join(", ")}), date (YYYY-MM-DD), text (one plain sentence, include names, doses, units, who said it).
Then compare with the prior record you are given and add "patterns": only links that the new note plus older facts genuinely support (e.g. a symptom that began after a dose change, a reading trend, a repeated trigger). Cite the old dates in the text. Never diagnose. Zero patterns is fine.
"ack": one short sentence back to the patient about what was filed and anything that connected to older history.`;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Write a note first." }, { status: 400 });
  const { note } = parsed.data;
  const date = parsed.data.date || today();
  try {
    const prior = await recallMany([note], { limit: 15 }).catch(() => []);
    const priorText = prior.length
      ? prior.map((e) => `- [${e.kind} ${e.date}] ${e.body}`).join("\n")
      : "(empty record, this is the first entry)";
    const out = await completeJson<Extracted>(
      SYSTEM,
      `Today: ${today()}. Note date: ${date}.\n\nPrior record (most related):\n${priorText}\n\nNew note:\n${note}`,
    );
    const facts = (out.facts || []).filter((f) => f.text && KINDS.includes(f.kind)).slice(0, 10);
    const patterns = (out.patterns || []).filter((p) => p.text).slice(0, 3);
    const texts = [
      ...facts.map((f) => formatEntry(f.kind, f.date || date, f.text)),
      ...patterns.map((p) => formatEntry("pattern", date, p.text)),
    ];
    const written = await rememberAll(texts);
    return NextResponse.json({ ack: out.ack, written, related: prior.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

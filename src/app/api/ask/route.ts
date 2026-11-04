import { NextResponse } from "next/server";
import { z } from "zod";
import { completeJson } from "@/lib/llm";
import { recallMany, today } from "@/lib/memory";

export const maxDuration = 60;

const Body = z.object({ q: z.string().min(2).max(500) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Ask a question." }, { status: 400 });
  try {
    const entries = await recallMany([parsed.data.q], { limit: 12 });
    const sources = entries.map((e, i) => ({ n: i + 1, ...e }));
    const out = await completeJson<{ answer: string; refs: number[] }>(
      `You answer a patient's question about their own medical record using only the numbered lines given. Cite line numbers in "refs". If the record does not say, say so plainly. Never diagnose or advise dose changes. Max 80 words.`,
      `Today: ${today()}.\nQuestion: ${parsed.data.q}\n\nRecord:\n${sources.map((s) => `[${s.n}] (${s.kind}, ${s.date}) ${s.body}`).join("\n") || "(empty)"}`,
      600,
    );
    return NextResponse.json({ ...out, sources });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

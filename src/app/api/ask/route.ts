import { NextResponse } from "next/server";
import { z } from "zod";
import { completeJson } from "@/lib/llm";
import { asLines, numbered, recallMany, today } from "@/lib/memory";
import { recordCtx } from "@/lib/record";

export const maxDuration = 60;

const Body = z.object({ q: z.string().min(2).max(500) });

export async function POST(req: Request) {
  const ctx = recordCtx(req);
  if (ctx instanceof NextResponse) return ctx;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Ask a question." }, { status: 400 });
  try {
    const entries = await recallMany([parsed.data.q], { limit: 12, ctx });
    const sources = numbered(entries.filter((e) => e.kind !== "share"));
    const out = await completeJson<{ answer: string; refs: number[] }>(
      `You answer a patient's question about their own medical record using only the numbered lines given. Cite line numbers in "refs". If the record does not say, say so plainly. Never diagnose or advise dose changes. Max 80 words.`,
      `Today: ${today()}.\nQuestion: ${parsed.data.q}\n\nRecord:\n${asLines(sources)}`,
      600,
    );
    return NextResponse.json({ ...out, sources });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

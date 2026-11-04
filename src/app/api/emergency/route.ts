import { NextResponse } from "next/server";
import { z } from "zod";
import { completeJson } from "@/lib/llm";
import { asLines, numbered, recallMany, today } from "@/lib/memory";
import { openShare } from "@/lib/record";
import { normalizeSnapshot, SNAPSHOT_SYSTEM } from "@/lib/clinical";

export const maxDuration = 60;

const Body = z.object({ t: z.string().max(3000) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "This card link is incomplete." }, { status: 400 });
  const opened = await openShare(parsed.data.t, "emergency");
  if (opened instanceof NextResponse) return opened;
  try {
    const entries = await recallMany(
      ["allergies and serious reactions", "current medications and doses", "diagnoses and long-term conditions", "stopped medications"],
      { limit: 14, ctx: opened.ctx },
    );
    const sources = numbered(entries.filter((e) => e.kind !== "share" && e.kind !== "brief"));
    const snapshot = sources.length
      ? normalizeSnapshot(await completeJson<unknown>(SNAPSHOT_SYSTEM, `Today: ${today()}.\n\nRecord:\n${asLines(sources)}`, 1400))
      : null;
    return NextResponse.json({ card: opened.share.card ?? {}, snapshot, sources });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

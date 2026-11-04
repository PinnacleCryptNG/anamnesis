import { NextResponse } from "next/server";
import { completeJson } from "@/lib/llm";
import { asLines, numbered, recallMany, today } from "@/lib/memory";
import { recordCtx } from "@/lib/record";
import { normalizeSnapshot, SNAPSHOT_SYSTEM } from "@/lib/clinical";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const QUERIES = [
  "current medications and doses",
  "dose changes and stopped medications",
  "allergies and serious reactions",
  "diagnoses and conditions",
  "most recent doctor visit and instructions",
  "follow-ups, tests due and referrals",
  "recent symptoms",
  "doctor reviews: marked addressed or keep watching",
];

export async function GET(req: Request) {
  const ctx = recordCtx(req);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const entries = (await recallMany(QUERIES, { limit: 14, ctx })).filter((e) => e.kind !== "brief" && e.kind !== "share");
    if (!entries.length) return NextResponse.json({ snapshot: null, sources: [], recent: [], count: 0 });
    const sources = numbered(entries);
    const snapshot = normalizeSnapshot(await completeJson<unknown>(SNAPSHOT_SYSTEM, `Today is ${today()}. Only call something due, overdue or "today" by comparing its date with today.\n\nRecord:\n${asLines(sources)}`, 1600));
    return NextResponse.json({ snapshot, sources, recent: sources.slice(0, 5), count: entries.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

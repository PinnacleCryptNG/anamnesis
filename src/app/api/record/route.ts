import { NextResponse } from "next/server";
import { recallMany } from "@/lib/memory";
import { recordCtx } from "@/lib/record";

export const dynamic = "force-dynamic";

const SWEEP = [
  "symptoms and how they changed",
  "medications, doses, and dose changes",
  "side effects, reactions and allergies",
  "what doctors said, diagnoses and instructions",
  "measurements, readings and lab results",
  "follow-ups, referrals and open questions",
  "patterns noticed across visits",
];

export async function GET(req: Request) {
  const ctx = recordCtx(req);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const entries = await recallMany(SWEEP, { limit: 25, ctx });
    return NextResponse.json({ entries: entries.filter((e) => e.kind !== "brief" && e.kind !== "share"), sample: !!ctx.sample });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, entries: [] }, { status: 502 });
  }
}

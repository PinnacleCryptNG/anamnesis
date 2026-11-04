import { NextResponse } from "next/server";
import { recallMany } from "@/lib/memory";

export const dynamic = "force-dynamic";

const SWEEP = [
  "symptoms and how they changed",
  "medications, doses, and dose changes",
  "side effects and reactions",
  "what doctors said, diagnoses and instructions",
  "measurements, readings and lab results",
  "follow-ups, referrals and open questions",
  "patterns noticed across visits",
];

export async function GET() {
  try {
    const entries = await recallMany(SWEEP, { limit: 25 });
    return NextResponse.json({ entries: entries.filter((e) => e.kind !== "brief") });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, entries: [] }, { status: 502 });
  }
}

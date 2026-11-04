import { NextResponse } from "next/server";
import { z } from "zod";
import { completeJson } from "@/lib/llm";
import { asLines, formatEntry, numbered, recallMany, rememberAll, today } from "@/lib/memory";
import { recordCtx } from "@/lib/record";
import { BRIEF_SYSTEM, type Brief } from "@/lib/brief";
import { asText, asCited } from "@/lib/cite";

export const maxDuration = 60;

const Body = z.object({ purpose: z.string().min(2).max(300) });

export async function POST(req: Request) {
  const ctx = recordCtx(req);
  if (ctx instanceof NextResponse) return ctx;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Say what the appointment is for." }, { status: 400 });
  const { purpose } = parsed.data;
  try {
    const entries = await recallMany(
      [
        purpose,
        `history relevant to ${purpose}`,
        "current medications and doses",
        "recent symptoms",
        "reactions, allergies and side effects",
        "doctor instructions and follow-ups",
        "patterns noticed",
        "previous appointment brief",
      ],
      { limit: 12, ctx },
    );
    const sources = numbered(entries.filter((e) => e.kind !== "share"));
    if (!sources.length) return NextResponse.json({ error: "Nothing is filed yet. Add a note first, then prepare a brief." }, { status: 400 });
    const brief = await completeJson<Brief>(BRIEF_SYSTEM, `Today: ${today()}. Appointment: ${purpose}.\n\nRecord:\n${asLines(sources)}`, 2200);
    let savedJob: string | null = null;
    if (!ctx.sample) {
      const [saved] = await rememberAll(
        [formatEntry("brief", today(), `Prepared for "${purpose}": ${asText(brief.headline)} Open questions: ${asCited(brief.questions).map((q) => q.text).join(" / ")}`)],
        ctx,
      ).catch(() => [undefined]);
      savedJob = saved?.jobId ?? null;
    }
    return NextResponse.json({ brief, sources, savedJob });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

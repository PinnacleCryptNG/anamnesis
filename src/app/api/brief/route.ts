import { NextResponse } from "next/server";
import { z } from "zod";
import { completeJson } from "@/lib/llm";
import { formatEntry, recallMany, rememberAll, today } from "@/lib/memory";
import { BRIEF_SYSTEM, type Brief } from "@/lib/brief";

export const maxDuration = 60;

const Body = z.object({ purpose: z.string().min(2).max(300) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Say what the appointment is for." }, { status: 400 });
  const { purpose } = parsed.data;
  try {
    const entries = await recallMany(
      [
        purpose,
        `history relevant to ${purpose}`,
        "current medications and doses",
        "recent symptoms",
        "reactions and side effects",
        "doctor instructions and follow-ups",
        "patterns noticed",
        "previous appointment brief",
      ],
      { limit: 12 },
    );
    const sources = entries.map((e, i) => ({ n: i + 1, ...e }));
    const brief = await completeJson<Brief>(
      BRIEF_SYSTEM,
      `Today: ${today()}. Appointment: ${purpose}.\n\nRecord:\n${sources
        .map((s) => `[${s.n}] (${s.kind}, ${s.date}) ${s.body}`)
        .join("\n")}`,
      2200,
    );
    const [saved] = await rememberAll([
      formatEntry("brief", today(), `Prepared for "${purpose}": ${brief.headline} Open questions: ${(brief.questions || []).map((q) => q.text).join(" / ")}`),
    ]).catch(() => [undefined]);
    return NextResponse.json({ brief, sources, savedJob: saved?.jobId ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

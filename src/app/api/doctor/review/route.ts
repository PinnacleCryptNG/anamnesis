import { NextResponse } from "next/server";
import { z } from "zod";
import { formatEntry, rememberAll, today } from "@/lib/memory";
import { checkReviewTag, openShare } from "@/lib/record";

export const maxDuration = 30;

const Body = z.object({
  t: z.string().max(2000),
  item: z.string().min(3).max(300),
  verdict: z.enum(["addressed", "watch"]),
  tag: z.string().max(64),
  note: z.string().max(240).optional(),
});

/** A doctor's verdict on a flag or question, filed into the patient's record so the next brief accounts for it. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Pick addressed or keep watching for one item." }, { status: 400 });
  const { t, item, verdict, note, tag } = parsed.data;
  const opened = await openShare(t, "doctor");
  if (opened instanceof NextResponse) return opened;
  if (!checkReviewTag(opened.share.id, item, tag))
    return NextResponse.json({ error: "That item isn't on this doctor view any more. Reload the page and try again." }, { status: 403 });
  const who = opened.share.who?.trim() || "The doctor";
  const text = formatEntry(
    "review",
    today(),
    `${who} reviewed "${item.replace(/"/g, "'")}" and marked it ${verdict === "addressed" ? "addressed" : "keep watching"}${note?.trim() ? `: ${note.trim()}` : "."}`,
  );
  try {
    const [saved] = await rememberAll([text], opened.ctx);
    return NextResponse.json({ ok: true, text, jobId: saved?.jobId ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

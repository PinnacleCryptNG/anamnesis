import { NextResponse } from "next/server";
import { z } from "zod";
import { completeJson, type Img } from "@/lib/llm";
import { formatEntry, KINDS, recallMany, rememberAll, today, type Kind } from "@/lib/memory";
import { recordCtx } from "@/lib/record";

export const maxDuration = 60;

const IMG_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const Body = z
  .object({
    note: z.string().max(4000).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    image: z.string().max(4_000_000).regex(IMG_RE).optional(),
  })
  .refine((b) => (b.note?.trim().length ?? 0) >= 3 || b.image, "Write a note or add a photo.");

type Extracted = {
  read?: string;
  facts: { kind: Kind; date: string; text: string }[];
  patterns: { text: string }[];
  ack: string;
};

const FACT_KINDS = KINDS.filter((k) => !["brief", "pattern", "share", "review"].includes(k)).join(", ");

const SYSTEM = `You are the clerk of a patient's personal medical record called Anamnesis.
The patient dictates notes after visits, flare-ups, pharmacy runs, or test results, and sometimes photographs a prescription, pill box, lab report or discharge letter.
If a photo is attached, read it carefully first and put a short plain transcription of what matters in "read" (drug names, strengths, directions, prescriber, test names, values with units and reference ranges, dates). If it is not medical, say so in "ack" and file nothing.
Split everything into atomic, self-contained facts a future clinician could read alone.
Each fact: kind (one of ${FACT_KINDS}), date (YYYY-MM-DD), text (one plain sentence, include names, doses, units, who said it, and "from photo of …" when it came from the photo).
Use "allergy" only for allergies and serious adverse drug reactions.
Keep what happened apart from what the patient wants to ask: a worry or question ("I want to ask about ankle swelling") is filed as a question to raise, not as a symptom that occurred.
Then compare with the prior record you are given and add "patterns": only links that the new note plus older facts genuinely support (e.g. a symptom that began after a dose change, a reading trend, a repeated trigger). Cite the old dates in the text. Never diagnose, and add no outside medical knowledge (such as a drug's known side effects or its drug class): state only the link in time the record shows and leave the question of cause to the doctor. Zero patterns is fine.
"ack": one short sentence back to the patient about what was filed and anything that connected to older history.`;

export async function POST(req: Request) {
  const ctx = recordCtx(req, { write: true });
  if (ctx instanceof NextResponse) return ctx;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Write a note or add a photo first." }, { status: 400 });
  const note = parsed.data.note?.trim() || "";
  const date = parsed.data.date || today();
  const images: Img[] = [];
  if (parsed.data.image) {
    const m = parsed.data.image.match(IMG_RE)!;
    images.push({ mediaType: m[1] as Img["mediaType"], data: m[2] });
  }
  try {
    const prior = await recallMany([note || "medications prescriptions lab results"], { limit: 15, ctx }).catch(() => []);
    const priorText = prior.length
      ? prior.filter((e) => e.kind !== "share").map((e) => `- [${e.kind} ${e.date}] ${e.body}`).join("\n")
      : "(empty record, this is the first entry)";
    const out = await completeJson<Extracted>(
      SYSTEM,
      `Today: ${today()}. Note date: ${date}.\n\nPrior record (most related):\n${priorText}\n\n${images.length ? "A photo is attached.\n" : ""}New note:\n${note || "(no text, photo only)"}`,
      2000,
      images,
    );
    const facts = (out.facts || []).filter((f) => f.text && KINDS.includes(f.kind) && f.kind !== "share" && f.kind !== "review").slice(0, 12);
    const patterns = (out.patterns || []).filter((p) => p.text).slice(0, 3);
    const texts = [
      ...facts.map((f) => formatEntry(f.kind, /^\d{4}-\d{2}-\d{2}$/.test(f.date) ? f.date : date, f.text)),
      ...patterns.map((p) => formatEntry("pattern", date, p.text)),
    ];
    const written = await rememberAll(texts, ctx);
    return NextResponse.json({ ack: out.ack, read: out.read || null, written, related: prior.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

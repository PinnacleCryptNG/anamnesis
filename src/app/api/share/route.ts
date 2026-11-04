import { NextResponse } from "next/server";
import { z } from "zod";
import { generateDelegateKey } from "@mysten-incubation/memwal/account";
import { formatEntry, rememberAll, today } from "@/lib/memory";
import { issuedText, listShares, newShareId, recordCtx, signShare } from "@/lib/record";

export const maxDuration = 60;

const Card = z.object({
  name: z.string().max(80).optional(),
  born: z.string().max(20).optional(),
  blood: z.string().max(8).optional(),
  contact: z.string().max(120).optional(),
  notes: z.string().max(240).optional(),
});
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), scope: z.enum(["doctor", "emergency"]), who: z.string().max(80).default(""), days: z.number().int().min(0).max(365).default(14), card: Card.optional() }),
  z.object({ action: z.literal("revoke"), id: z.string().regex(/^[0-9a-f]{12}$/) }),
  z.object({ action: z.literal("delegate") }),
]);

export async function GET(req: Request) {
  const ctx = recordCtx(req);
  if (ctx instanceof NextResponse) return ctx;
  if (ctx.sample || ctx.own) return NextResponse.json({ shares: [] });
  return NextResponse.json({ shares: await listShares(ctx) });
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const b = parsed.data;
  if (b.action === "delegate") {
    const key = await generateDelegateKey();
    return NextResponse.json({ privateKey: key.privateKey, publicKeyHex: Buffer.from(key.publicKey).toString("hex"), suiAddress: key.suiAddress });
  }
  const ctx = recordCtx(req, { write: true });
  if (ctx instanceof NextResponse) return ctx;
  if (ctx.own) return NextResponse.json({ error: "Records in your own Walrus account share through delegate keys." }, { status: 400 });
  try {
    if (b.action === "revoke") {
      await rememberAll([formatEntry("share", today(), `revoked ${b.id}`)], ctx);
      return NextResponse.json({ ok: true });
    }
    const id = newShareId();
    const exp = b.days ? Date.now() + b.days * 86_400_000 : null;
    const until = exp ? new Date(exp).toISOString().slice(0, 10) : null;
    const token = signShare({ v: 1, ns: ctx.ns, scope: b.scope, id, exp, who: b.who || undefined, card: b.scope === "emergency" ? b.card : undefined });
    await rememberAll([formatEntry("share", today(), issuedText(id, b.scope, b.who, until))], ctx);
    return NextResponse.json({ id, token, until });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { accountOwner, chainNow } from "@/lib/account";
import { ownedBlobs, type BlobProof } from "@/lib/blobs";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Body = z.object({
  blobIds: z.array(z.string().regex(/^[A-Za-z0-9_-]{40,48}$/)).min(1).max(60),
  account: z.string().regex(/^0x[0-9a-f]{64}$/i).optional(),
});

/** Looks up each cited memory's Walrus Blob object on Sui through Tatum. Blob objects are public chain data. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Nothing to check." }, { status: 400 });
  const header = req.headers.get("x-memwal-account")?.trim();
  const accountId = parsed.data.account || (header && /^0x[0-9a-f]{64}$/i.test(header) ? header : "") || process.env.MEMWAL_ACCOUNT_ID || "";
  try {
    const owner = await accountOwner(accountId.trim());
    if (!owner) return NextResponse.json({ error: "The record's Walrus account has no owner on Sui." }, { status: 502 });
    const want = parsed.data.blobIds;
    let scan = await ownedBlobs(owner, { want });
    if (scan.cached && want.some((id) => !scan.blobs.has(id))) scan = await ownedBlobs(owner, { want, fresh: true });
    const now = await chainNow();
    const out: Record<string, BlobProof | null> = {};
    for (const id of parsed.data.blobIds) out[id] = scan.blobs.get(id) ?? null;
    return NextResponse.json({ owner, ...now, checkedAt: new Date().toISOString(), complete: scan.complete, blobs: out });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

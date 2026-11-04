import { NextResponse } from "next/server";
import { readAccount } from "@/lib/account";
import { listBlobs, memwal } from "@/lib/memory";
import { recordCtx } from "@/lib/record";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const ctx = recordCtx(req);
  if (ctx instanceof NextResponse) return ctx;
  const [account, memories, delegatePk] = await Promise.allSettled([
    readAccount(ctx.accountId),
    listBlobs(ctx),
    memwal(ctx.key, ctx.accountId).getPublicKeyHex(),
  ]);
  return NextResponse.json({
    account: account.status === "fulfilled" ? account.value : { error: (account.reason as Error).message },
    memories:
      memories.status === "fulfilled"
        ? memories.value.map((m) => ({
            blobId: m.blob_id,
            createdAt: m.created_at,
            size: m.size,
            status: m.status,
            endEpoch: m.end_epoch,
            expiresAt: m.expires_at,
            packageId: m.package_id,
          }))
        : [],
    memoriesError: memories.status === "rejected" ? (memories.reason as Error).message : null,
    appKey: delegatePk.status === "fulfilled" ? delegatePk.value.replace(/^0x/, "") : null,
    namespace: ctx.ns,
    mode: ctx.sample ? "sample" : ctx.own ? "own" : "private",
    rpc: "Tatum Sui mainnet gRPC (sui-mainnet-grpc.gateway.tatum.io)",
  });
}

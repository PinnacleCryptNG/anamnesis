import { NextResponse } from "next/server";
import { readAccount } from "@/lib/account";
import { memwal, NAMESPACE } from "@/lib/memory";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const [account, memories, delegatePk] = await Promise.allSettled([
    readAccount(),
    memwal().listMemories({ namespace: NAMESPACE, limit: 100 }),
    memwal().getPublicKeyHex(),
  ]);
  return NextResponse.json({
    account: account.status === "fulfilled" ? account.value : { error: (account.reason as Error).message },
    memories:
      memories.status === "fulfilled"
        ? memories.value.memories.map((m) => ({
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
    namespace: NAMESPACE,
    rpc: "Tatum Sui mainnet gRPC (sui-mainnet-grpc.gateway.tatum.io)",
  });
}

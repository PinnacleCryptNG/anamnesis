import { NextResponse } from "next/server";
import { generateDelegateKey } from "@mysten-incubation/memwal/account";

export async function POST() {
  const key = await generateDelegateKey();
  return NextResponse.json({
    privateKey: key.privateKey,
    publicKeyHex: Buffer.from(key.publicKey).toString("hex"),
    suiAddress: key.suiAddress,
  });
}

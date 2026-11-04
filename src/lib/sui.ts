import "server-only";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import { ChannelCredentials } from "@grpc/grpc-js";

const TATUM_HOST = "sui-mainnet-grpc.gateway.tatum.io:443";
export const WALRUS_SYSTEM_OBJECT =
  "0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2";

let client: SuiGrpcClient | null = null;

export function tatumSui(): SuiGrpcClient {
  if (client) return client;
  const apiKey = process.env.TATUM_API_KEY;
  if (!apiKey) throw new Error("TATUM_API_KEY is not set");
  const transport = new GrpcTransport({
    host: TATUM_HOST,
    channelCredentials: ChannelCredentials.createSsl(),
    meta: { "x-api-key": apiKey },
  });
  client = new SuiGrpcClient({ network: "mainnet", transport });
  return client;
}

// Tatum's free plan allows 3 requests per second; space sequential reads.
let last = 0;
export async function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const wait = Math.max(0, last + 380 - Date.now());
  last = Date.now() + wait;
  if (wait) await new Promise((r) => setTimeout(r, wait));
  return fn();
}

export const jsonSafe = <T>(v: T): T =>
  JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x)));

import "server-only";
import { tatumSui, throttled } from "./sui";

export const WALRUS_BLOB_TYPE = "0xfdc88f7d7cf30afab2f82e8380d11ee8f70efb90e863d1de8616fae1bb09ea77::blob::Blob";

export type BlobProof = {
  objectId: string;
  size: number;
  registeredEpoch: number;
  certifiedEpoch: number | null;
  endEpoch: number;
  previousTransaction?: string;
};

/** Walrus stores blob IDs on Sui as a u256; the familiar ID is its 32 little-endian bytes in base64url. */
export function blobIdFromU256(dec: string): string {
  let n = BigInt(dec);
  const b = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    b[i] = Number(n % BigInt(256));
    n /= BigInt(256);
  }
  return b.toString("base64url");
}

type BlobJson = { blob_id: string; size: string | number; registered_epoch: number; certified_epoch: number | null; storage: { end_epoch: number } };

const cache = new Map<string, { at: number; blobs: Map<string, BlobProof>; complete: boolean }>();
const TTL = 60_000;
const MAX_PAGES = 200;

/** Every Walrus Blob object the wallet owns on Sui, keyed by blob ID, read through Tatum's gRPC gateway. */
export async function ownedBlobs(owner: string, fresh = false): Promise<{ blobs: Map<string, BlobProof>; complete: boolean }> {
  const hit = cache.get(owner);
  if (hit && !fresh && Date.now() - hit.at < TTL) return hit;
  const sui = tatumSui();
  const blobs = new Map<string, BlobProof>();
  let cursor: string | null = null;
  let complete = false;
  for (let page = 0; page < MAX_PAGES; page++) {
    const r = await throttled(() =>
      sui.listOwnedObjects({ owner, type: WALRUS_BLOB_TYPE, limit: 1000, cursor, include: { json: true, previousTransaction: true } }),
    );
    for (const o of r.objects) {
      const j = o.json as BlobJson | null;
      if (!j?.blob_id) continue;
      blobs.set(blobIdFromU256(String(j.blob_id)), {
        objectId: o.objectId,
        size: Number(j.size),
        registeredEpoch: Number(j.registered_epoch),
        certifiedEpoch: j.certified_epoch == null ? null : Number(j.certified_epoch),
        endEpoch: Number(j.storage?.end_epoch),
        previousTransaction: (o as { previousTransaction?: string }).previousTransaction,
      });
    }
    if (!r.hasNextPage || !r.cursor) {
      complete = true;
      break;
    }
    cursor = r.cursor;
  }
  const out = { at: Date.now(), blobs, complete };
  cache.set(owner, out);
  return out;
}

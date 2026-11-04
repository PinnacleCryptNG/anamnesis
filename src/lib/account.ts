import "server-only";
import { tatumSui, throttled, jsonSafe, WALRUS_SYSTEM_OBJECT } from "./sui";

export type DelegateKey = { publicKeyHex: string; label: string; suiAddress?: string; createdAt?: string };

export type AccountProof = {
  accountId: string;
  type: string;
  version: string;
  digest: string;
  owner: string | null;
  active: boolean | null;
  delegates: DelegateKey[];
  previousTransaction?: string;
  walrusEpoch: number | null;
  checkpoint: string | null;
  checkedAt: string;
};

const toHex = (v: unknown): string => {
  if (typeof v === "string") {
    if (/^(0x)?[0-9a-f]+$/i.test(v)) return v.replace(/^0x/, "").toLowerCase();
    try {
      return Buffer.from(v, "base64").toString("hex");
    } catch {
      return v;
    }
  }
  if (Array.isArray(v)) return Buffer.from(v as number[]).toString("hex");
  return "";
};

function findDelegates(json: unknown): DelegateKey[] {
  const out: DelegateKey[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    const o = node as Record<string, unknown>;
    if ("public_key" in o) {
      out.push({
        publicKeyHex: toHex(o.public_key),
        label: typeof o.label === "string" ? o.label : "",
        suiAddress: typeof o.sui_address === "string" ? o.sui_address : undefined,
        createdAt: o.created_at ? String(o.created_at) : undefined,
      });
      return;
    }
    Object.values(o).forEach(walk);
  };
  walk(json);
  return out;
}

export async function readAccount(accountId = process.env.MEMWAL_ACCOUNT_ID || ""): Promise<AccountProof> {
  const sui = tatumSui();
  const id = accountId.trim();
  const { object } = await throttled(() =>
    sui.getObject({ objectId: id, include: { json: true, previousTransaction: true } }),
  );
  const json = jsonSafe(object.json) as Record<string, unknown> | null;
  let walrusEpoch: number | null = null;
  let checkpoint: string | null = null;
  try {
    const sys = await throttled(() => sui.getObject({ objectId: WALRUS_SYSTEM_OBJECT, include: { json: true } }));
    const sj = jsonSafe(sys.object.json) as Record<string, unknown> | null;
    const e = sj && (sj.epoch ?? (sj.inner as Record<string, unknown> | undefined)?.epoch);
    walrusEpoch = e != null ? Number(e) : null;
  } catch {}
  try {
    const info = await throttled(() => sui.ledgerService.getServiceInfo({}).response);
    checkpoint = info.checkpointHeight?.toString() ?? null;
  } catch {}
  const owner = json && typeof json.owner === "string" ? json.owner : null;
  return {
    accountId: id,
    type: object.type,
    version: String(object.version),
    digest: object.digest,
    owner,
    active: json && "active" in json ? Boolean(json.active) : null,
    delegates: findDelegates(json),
    previousTransaction: (object as { previousTransaction?: string }).previousTransaction,
    walrusEpoch,
    checkpoint,
    checkedAt: new Date().toISOString(),
  };
}

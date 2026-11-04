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
    const { dynamicFields } = await throttled(() => sui.listDynamicFields({ parentId: WALRUS_SYSTEM_OBJECT }));
    const inner = dynamicFields.find((f) => f.valueType.endsWith("::SystemStateInnerV1"));
    if (inner) {
      const st = await throttled(() => sui.getObject({ objectId: inner.fieldId, include: { json: true } }));
      const v = (st.object.json as { value?: { committee?: { epoch?: unknown } } } | null)?.value;
      walrusEpoch = v?.committee?.epoch != null ? Number(v.committee.epoch) : null;
    }
  } catch {}
  for (let i = 0; i < 3 && !checkpoint; i++) {
    try {
      const { response: info } = await throttled(async () => await sui.ledgerService.getServiceInfo({}));
      checkpoint = info.checkpointHeight?.toString() ?? null;
    } catch {
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
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

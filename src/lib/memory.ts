import "server-only";
import { MemWal } from "@mysten-incubation/memwal";
import type { RecallMemory } from "@mysten-incubation/memwal";

export const NAMESPACE = process.env.MEMWAL_NAMESPACE || "anamnesis";
export const KINDS = [
  "symptom",
  "medication",
  "reaction",
  "diagnosis",
  "clinician",
  "measurement",
  "followup",
  "allergy",
  "pattern",
  "brief",
  "share",
] as const;
export type Kind = (typeof KINDS)[number];

export type Entry = {
  blobId: string;
  kind: Kind | "note";
  date: string;
  body: string;
  writtenAt?: string;
  distance?: number;
};

/** Which record a call touches: a namespace, and optionally the patient's own Walrus account. */
export type Ctx = { ns: string; sample?: boolean; own?: boolean; key?: string; accountId?: string };
export const SAMPLE: Ctx = { ns: NAMESPACE, sample: true };

const cache = new Map<string, MemWal>();

export function memwal(key?: string, account?: string): MemWal {
  const k = (key || process.env.MEMWAL_KEY || "").trim();
  const accountId = (account || process.env.MEMWAL_ACCOUNT_ID || "").trim();
  if (!k || !accountId) throw new Error("MEMWAL_KEY and MEMWAL_ACCOUNT_ID must be set");
  const id = `${accountId}:${k}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const client = MemWal.create({
    key: k,
    accountId,
    serverUrl: process.env.MEMWAL_RELAYER || "https://relayer.memory.walrus.xyz",
    namespace: NAMESPACE,
  });
  cache.set(id, client);
  return client;
}

export function formatEntry(kind: Kind, date: string, body: string): string {
  return `[${kind} · ${date}] ${body.trim()}`;
}

const ENTRY_RE = /^\[([a-z]+) · (\d{4}-\d{2}-\d{2})\]\s*([\s\S]*)$/;

export function parseEntry(m: RecallMemory): Entry {
  const hit = m.text.match(ENTRY_RE);
  const kind = hit && (KINDS as readonly string[]).includes(hit[1]) ? (hit[1] as Kind) : "note";
  return {
    blobId: m.blob_id,
    kind,
    date: hit ? hit[2] : (m.created_at || "").slice(0, 10),
    body: hit ? hit[3] : m.text,
    writtenAt: m.created_at,
    distance: m.distance,
  };
}

export async function recallMany(
  queries: string[],
  opts: { limit?: number; key?: string; accountId?: string; ctx?: Ctx; sort?: "relevance" | "recent" } = {},
): Promise<Entry[]> {
  const ctx = opts.ctx ?? SAMPLE;
  const client = memwal(opts.key ?? ctx.key, opts.accountId ?? ctx.accountId);
  const seen = new Map<string, Entry>();
  const results = await Promise.allSettled(
    queries.map((q) =>
      client.recall({ query: q, limit: opts.limit ?? 12, namespace: ctx.ns, sort: opts.sort }),
    ),
  );
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const m of r.value.results) {
      if (!seen.has(m.blob_id)) seen.set(m.blob_id, parseEntry(m));
    }
  }
  if (!seen.size) {
    const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
    if (failed) throw failed.reason;
  }
  return [...seen.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function rememberAll(texts: string[], ctx: Ctx = SAMPLE): Promise<{ text: string; blobId?: string; jobId: string }[]> {
  if (!texts.length) return [];
  const client = memwal(ctx.key, ctx.accountId);
  const accepted = await client.rememberBulk(texts.map((text) => ({ text, namespace: ctx.ns })));
  const ids = accepted.job_ids;
  const out: { text: string; blobId?: string; jobId: string }[] = texts.map((text, i) => ({ text, jobId: ids[i] }));
  try {
    const done = await client.waitForRememberJobs(ids, [ctx.ns], { timeoutMs: 45000 });
    done.results.forEach((r, i) => {
      if (out[i] && r.status === "done") out[i].blobId = r.blob_id;
    });
  } catch {
    // Writes keep finishing on the relayer; the record view picks them up.
  }
  return out;
}

export async function listBlobs(ctx: Ctx, pages = 3) {
  const client = memwal(ctx.key, ctx.accountId);
  const out: Awaited<ReturnType<MemWal["listMemories"]>>["memories"] = [];
  let cursor: string | undefined;
  for (let i = 0; i < pages; i++) {
    const page = await client.listMemories({ namespace: ctx.ns, limit: 500, cursor });
    out.push(...page.memories);
    if (!page.has_more || !page.next_cursor) break;
    cursor = page.next_cursor;
  }
  return out;
}

export const numbered = (entries: Entry[]) => entries.map((e, i) => ({ n: i + 1, ...e }));
export const asLines = (src: { n: number; kind: string; date: string; body: string }[]) =>
  src.map((s) => `[${s.n}] (${s.kind}, ${s.date}) ${s.body}`).join("\n") || "(empty record)";

export const today = () => new Date().toISOString().slice(0, 10);

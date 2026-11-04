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
  "pattern",
  "brief",
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

const cache = new Map<string, MemWal>();

export function memwal(key?: string): MemWal {
  const k = (key || process.env.MEMWAL_KEY || "").trim();
  const accountId = (process.env.MEMWAL_ACCOUNT_ID || "").trim();
  if (!k || !accountId) throw new Error("MEMWAL_KEY and MEMWAL_ACCOUNT_ID must be set");
  const hit = cache.get(k);
  if (hit) return hit;
  const client = MemWal.create({
    key: k,
    accountId,
    serverUrl: process.env.MEMWAL_RELAYER || "https://relayer.memory.walrus.xyz",
    namespace: NAMESPACE,
  });
  cache.set(k, client);
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
  opts: { limit?: number; key?: string; sort?: "relevance" | "recent" } = {},
): Promise<Entry[]> {
  const client = memwal(opts.key);
  const seen = new Map<string, Entry>();
  const results = await Promise.allSettled(
    queries.map((q) =>
      client.recall({ query: q, limit: opts.limit ?? 12, namespace: NAMESPACE, sort: opts.sort }),
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

export async function rememberAll(texts: string[]): Promise<{ text: string; blobId?: string; jobId: string }[]> {
  if (!texts.length) return [];
  const client = memwal();
  const accepted = await client.rememberBulk(texts.map((text) => ({ text, namespace: NAMESPACE })));
  const ids = accepted.job_ids;
  const out: { text: string; blobId?: string; jobId: string }[] = texts.map((text, i) => ({ text, jobId: ids[i] }));
  try {
    const done = await client.waitForRememberJobs(ids, [NAMESPACE], { timeoutMs: 45000 });
    done.results.forEach((r, i) => {
      if (out[i] && r.status === "done") out[i].blobId = r.blob_id;
    });
  } catch {
    // Writes keep finishing on the relayer; the record view picks them up.
  }
  return out;
}

export const today = () => new Date().toISOString().slice(0, 10);

import type { Cited } from "./cite";

type Src = { n: number; kind: string; date: string; body: string; blobId?: string; writtenAt?: string };

const STOP = new Set(
  "patient patients reports reported report since started starting begin began beginning approximately about after before weeks week days with from that this have been their there were which while also still being raise raising next visit worth asked wants whether doctor".split(" "),
);

const words = (s: string) =>
  new Set((s.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? []).map((w) => w.replace(/s$/, "")).filter((w) => !STOP.has(w)));
const similar = (a: Set<string>, b: Set<string>) => {
  const shared = [...a].filter((x) => b.has(x)).length;
  return shared >= 2 && shared / Math.max(1, Math.min(a.size, b.size)) >= 0.5;
};
const norm = (s: string) => s.toLowerCase().replace(/["']/g, "").replace(/\s+/g, " ").trim();
export const srcKey = (blobId?: string) => (blobId || "").slice(0, 8);

/** Items whose latest doctor review says "addressed", with the source memories the reviewed item cited. */
export function addressedMatters(sources: Src[]) {
  const latest = new Map<string, { n: number; verdict: string; date: string; at: string; src: Set<string>; words: Set<string> }>();
  const order = (s: Src) => `${s.date} ${s.writtenAt ?? ""}`;
  for (const s of sources.filter((x) => x.kind === "review").sort((a, b) => order(a).localeCompare(order(b)))) {
    const m = s.body.match(/reviewed "(.+?)" and marked it (addressed|keep watching)/);
    if (!m) continue;
    const src = new Set((s.body.match(/Sources: ([A-Za-z0-9_\-, ]+)\./)?.[1] ?? "").split(/[,\s]+/).filter(Boolean));
    latest.set(norm(m[1]), { n: s.n, verdict: m[2], date: s.date, at: s.writtenAt ?? "", src, words: words(m[1]) });
  }
  return [...latest].filter(([, v]) => v.verdict === "addressed").map(([key, v]) => ({ key, ...v }));
}

/**
 * Drops open items a doctor marked addressed: the same item, or one resting only on the memories the reviewed
 * item cited and describing the same matter. Anything citing a memory filed after the review stays.
 */
export function dropAddressed<T extends Cited>(items: T[], sources: Src[]): T[] {
  const matters = addressedMatters(sources);
  if (!matters.length) return items;
  const byN = new Map(sources.map((s) => [s.n, s]));
  const after = (s: Src, m: { date: string; at: string }) =>
    s.date > m.date || (s.date === m.date && (!s.writtenAt || !m.at || s.writtenAt > m.at));
  return items.filter((it) => {
    const refs = it.refs.map((n) => byN.get(n)).filter((s): s is Src => !!s);
    const cited = refs.filter((s) => s.kind !== "review");
    const watched = refs
      .filter((s) => s.kind === "review" && /marked it keep watching/.test(s.body))
      .map((s) => ({
        ...s,
        item: s.body.match(/reviewed "(.+?)" and marked it/)?.[1] ?? "",
        src: (s.body.match(/Sources: ([A-Za-z0-9_\-, ]+)\./)?.[1] ?? "").split(/[,\s]+/).filter(Boolean),
      }));
    const sameMatter = (v: (typeof watched)[number], m: { key: string; words: Set<string>; src: Set<string> }) =>
      norm(v.item) === m.key || similar(words(v.item), m.words) || v.src.some((k) => m.src.has(k));
    const w = words(it.text);
    return !matters.some((m) => {
      if (cited.some((s) => after(s, m)) || watched.some((v) => after(v, m) && sameMatter(v, m))) return false;
      if (norm(it.text) === m.key) return true;
      if (cited.length) {
        if (!m.src.size || !cited.every((s) => m.src.has(srcKey(s.blobId)))) return false;
      } else if (!refs.some((s) => s.n === m.n)) return false;
      return similar(w, m.words);
    });
  });
}

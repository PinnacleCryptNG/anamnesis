import type { Cited } from "./cite";

type Src = { n: number; kind: string; date: string; body: string };

const STOP = new Set(
  "patient patients reports reported report since started starting begin began beginning approximately about after before weeks week days with from that this have been their there were which while also still being raise raising next visit worth asked wants whether doctor".split(" "),
);

const words = (s: string) =>
  new Set((s.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? []).map((w) => w.replace(/s$/, "")).filter((w) => !STOP.has(w)));

/** Items whose latest doctor review says "addressed", from the review memories among the sources. */
export function addressedMatters(sources: Src[]) {
  const latest = new Map<string, { verdict: string; date: string }>();
  for (const s of sources.filter((x) => x.kind === "review").sort((a, b) => a.date.localeCompare(b.date))) {
    const m = s.body.match(/reviewed "(.+)" and marked it (addressed|keep watching)/);
    if (m) latest.set(m[1], { verdict: m[2], date: s.date });
  }
  return [...latest].filter(([, v]) => v.verdict === "addressed").map(([item, v]) => ({ words: words(item), date: v.date }));
}

/** Drops open items a doctor marked addressed, unless the item cites something recorded after that review. */
export function dropAddressed<T extends Cited>(items: T[], sources: Src[]): T[] {
  const matters = addressedMatters(sources);
  if (!matters.length) return items;
  const byN = new Map(sources.map((s) => [s.n, s]));
  return items.filter((it) => {
    const w = words(it.text);
    const cited = it.refs.map((n) => byN.get(n)).filter((s): s is Src => !!s && s.kind !== "review");
    return !matters.some((m) => {
      if (cited.some((s) => s.date > m.date)) return false;
      const shared = [...w].filter((x) => m.words.has(x)).length;
      return shared >= 2 && shared / Math.max(1, Math.min(w.size, m.words.size)) >= 0.5;
    });
  });
}

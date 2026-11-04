"use client";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Refs, { type Source } from "@/components/Refs";
import { Tag } from "@/components/Entry";
import { AskIcon } from "@/components/Icons";
import { get, post } from "@/lib/api";
import { useSession } from "@/lib/session";
import u from "@/components/ui.module.css";
import s from "./timeline.module.css";

type E = { blobId: string; kind: string; date: string; body: string };
const KINDS: [string, string][] = [["symptom", "Symptoms"], ["medication", "Medicines"], ["reaction", "Reactions"], ["allergy", "Allergies"], ["diagnosis", "Diagnoses"], ["clinician", "Doctor's notes"], ["measurement", "Readings"], ["followup", "Follow-ups"], ["pattern", "Patterns"]];

export default function TimelinePage() {
  const session = useSession();
  const [entries, setEntries] = useState<E[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [kind, setKind] = useState("all");
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState<{ answer: string; refs: number[]; sources: Source[] } | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!session || session.mode === "none") return;
    get<{ entries: E[] }>("/api/record").then((r) => {
      if (r.error) setErr(r.error);
      setEntries(r.entries ?? []);
    });
  }, [session]);

  const groups = useMemo(() => {
    const q = text.trim().toLowerCase();
    const shown = (entries ?? []).filter((e) => (kind === "all" || e.kind === kind) && (!q || e.body.toLowerCase().includes(q)));
    const byMonth = new Map<string, Map<string, E[]>>();
    for (const e of shown) {
      const m = e.date.slice(0, 7);
      if (!byMonth.has(m)) byMonth.set(m, new Map());
      const days = byMonth.get(m)!;
      days.set(e.date, [...(days.get(e.date) ?? []), e]);
    }
    return [...byMonth.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([m, days]) => ({ m, days: [...days.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)) }));
  }, [entries, kind, text]);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const e of entries ?? []) c.set(e.kind, (c.get(e.kind) ?? 0) + 1);
    return c;
  }, [entries]);
  const tabs: [string, string, number][] = [["all", "All", entries?.length ?? 0], ...KINDS.filter(([k]) => counts.has(k)).map(([k, l]) => [k, l, counts.get(k)!] as [string, string, number])];

  const ask = async () => {
    if (text.trim().length < 2) return;
    setAsking(true); setAnswer(null);
    const r = await post<{ answer: string; refs: number[]; sources: Source[] }>("/api/ask", { q: text });
    setAsking(false);
    setAnswer(r.error ? { answer: r.error, refs: [], sources: [] } : r);
  };

  const month = (m: string) => new Date(m + "-15T12:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const day = (d: string) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric" });

  return (
    <AppShell title="Everything, in order." sub="Every fact on file, newest first. Type to filter, or ask a question.">
      <div className={s.tools}>
        <div className={s.search}>
          <AskIcon size={20} />
          <input value={text} onChange={(e) => { setText(e.target.value); setAnswer(null); }} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="Filter or ask a question" aria-label="Search or ask the record" />
          <button className={u.ghost} onClick={ask} disabled={asking || text.trim().length < 2}>{asking ? <span className={u.loading} /> : "Ask"}</button>
        </div>
        {entries && entries.length > 0 && (
          <div className={s.kinds} role="tablist" aria-label="Filter by kind">
            {tabs.map(([k, l, n]) => (
              <button key={k} data-on={kind === k} onClick={() => setKind(k)} role="tab" aria-selected={kind === k}>{l}<span>{n}</span></button>
            ))}
          </div>
        )}
      </div>

      {answer && (
        <section className={`${u.card} ${s.answer}`}>
          <p>{answer.answer}<Refs refs={answer.refs ?? []} sources={answer.sources ?? []} /></p>
        </section>
      )}

      {entries === null ? <p className={u.empty}><span className={u.loading} />Recalling from Walrus…</p>
        : err ? <p className={u.err}>{err}</p>
        : !groups.length ? <p className={u.empty}>{entries.length ? "Nothing matches that filter." : "Nothing filed yet."}</p>
        : (
          <div className={s.months}>
            {groups.map(({ m, days }) => (
              <section key={m} className={s.month}>
                <h2 className="display">{month(m)}</h2>
                {days.map(([d, list]) => (
                  <div key={d} className={s.day}>
                    <span className={`mono ${s.date}`}>{day(d)}</span>
                    <ul>
                      {list.map((e, i) => (
                        <li key={e.blobId + i} className={e.kind === "pattern" ? s.pattern : undefined}>
                          <Tag kind={e.kind} /><span>{e.body}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
    </AppShell>
  );
}

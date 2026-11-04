"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Folder from "@/components/Folder";
import { EntryList, type EntryT } from "@/components/Entry";
import { post } from "@/lib/api";
import s from "./page.module.css";

const KINDS = ["all", "symptom", "medication", "reaction", "diagnosis", "clinician", "measurement", "followup", "pattern"];

type SpeechRec = { start: () => void; stop: () => void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; continuous: boolean; interimResults: boolean };

export default function RecordPage() {
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [ack, setAck] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [entries, setEntries] = useState<EntryT[] | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState("all");
  const [listening, setListening] = useState(false);
  const rec = useRef<SpeechRec | null>(null);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<{ answer: string; refs: number[] } | null>(null);
  const [asking, setAsking] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/record").then((r) => r.json()).catch(() => ({ entries: [] }));
    setEntries(r.entries ?? []);
    if (r.error) setErr(r.error);
  }, []);
  useEffect(() => { load(); }, [load]);

  const file = async () => {
    if (!note.trim()) return;
    setBusy(true); setErr(null); setAck(null);
    const r = await post<{ ack: string; written: { text: string; blobId?: string; jobId: string }[] }>("/api/intake", { note, date });
    setBusy(false);
    if (r.error) return setErr(r.error);
    setAck(r.ack);
    setNote("");
    const bodies = new Set<string>((r.written ?? []).map((w: { text: string }) => w.text.replace(/^\[[^\]]+\]\s*/, "")));
    setFresh(bodies);
    setEntries((cur) => [
      ...(r.written ?? []).map((w: { text: string; blobId?: string; jobId: string }) => {
        const m = w.text.match(/^\[([a-z]+) · ([\d-]+)\]\s*(.*)$/);
        return { blobId: w.blobId ?? w.jobId, kind: m?.[1] ?? "note", date: m?.[2] ?? date, body: m?.[3] ?? w.text };
      }),
      ...(cur ?? []),
    ]);
  };

  const dictate = () => {
    if (listening) return rec.current?.stop();
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Ctor) return setErr("This browser can't take dictation. Type the note instead.");
    const r = new Ctor();
    r.continuous = true; r.interimResults = false;
    const base = note ? note.trimEnd() + " " : "";
    r.onresult = (e) => setNote(base + Array.from(e.results).map((x) => x[0].transcript).join(" "));
    r.onend = () => setListening(false);
    rec.current = r; r.start(); setListening(true);
  };

  const ask = async () => {
    if (!q.trim()) return;
    setAsking(true); setAnswer(null);
    const r = await post<{ answer: string; refs: number[] }>("/api/ask", { q });
    setAsking(false);
    setAnswer(r.error ? { answer: r.error, refs: [] } : r);
  };

  const shown = useMemo(() => (entries ?? []).filter((e) => kind === "all" || e.kind === kind), [entries, kind]);

  return (
    <Folder title="What happened, in your words." sub="Write or dictate after a visit, a flare-up, a new prescription or a reading. Each fact is filed to your Walrus memory and checked against everything filed before.">
      <section className={s.intake}>
        <textarea
          className={s.pad}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Saw Dr. Okafor today. Metformin up to 1000mg twice daily. Stomach upset since Tuesday…"
        />
        <div className={s.row}>
          <button className={s.file} onClick={file} disabled={busy || !note.trim()}>{busy ? "Filing…" : "File to record"}</button>
          <button className={s.ghost} data-on={listening} onClick={dictate}>{listening ? "Stop dictation" : "Dictate"}</button>
          <input className={`mono ${s.date}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date of note" />
        </div>
        {ack && <p className={s.ack}>{ack}</p>}
        {err && <p className={s.err}>{err}</p>}
      </section>

      <section className={s.section}>
        <h2>Ask the record</h2>
        <div className={s.askRow}>
          <input className={s.ask} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="When did the headaches start?" />
          <button className={s.ghost} onClick={ask} disabled={asking}>{asking ? <span className={s.loading} /> : "Ask"}</button>
        </div>
        {answer && <p className={s.answer}>{answer.answer}{answer.refs?.length ? <sup>{answer.refs.join(",")}</sup> : null}</p>}
      </section>

      <section className={s.section}>
        <h2>The record<span className={`mono ${s.count}`}>{entries ? `${entries.length} filed` : ""}</span></h2>
        <div className={s.filters}>
          {KINDS.map((k) => (
            <button key={k} className={`mono ${s.filter}`} data-on={kind === k} onClick={() => setKind(k)}>{k}</button>
          ))}
        </div>
        {entries === null ? <p className={s.empty}><span className={s.loading} /> Recalling from Walrus…</p>
          : shown.length ? <EntryList entries={shown} fresh={fresh} />
          : <p className={s.empty}>Nothing filed yet. The first note starts your history.</p>}
      </section>
    </Folder>
  );
}

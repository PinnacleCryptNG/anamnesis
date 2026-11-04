"use client";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import BriefView, { type BriefT } from "@/components/BriefView";
import type { EntryT } from "@/components/Entry";
import { post } from "@/lib/api";
import s from "../page.module.css";

const PRESETS = ["GP check-up", "Neurology follow-up", "New specialist, first visit", "Pharmacist medication review"];

export default function BriefPage() {
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<{ brief: BriefT; sources: (EntryT & { n: number })[] } | null>(null);

  const make = async (p = purpose) => {
    if (!p.trim()) return;
    setPurpose(p); setBusy(true); setErr(null); setData(null);
    const r = await post<{ brief: BriefT; sources: (EntryT & { n: number })[] }>("/api/brief", { purpose: p });
    setBusy(false);
    if (r.error) return setErr(r.error);
    setData(r);
  };

  return (
    <AppShell title="Walk in prepared." sub="Anamnesis recalls what matters for this appointment and writes a one-page brief. Every line points back to the memory it came from. Each brief is filed too, so the next one knows what you asked last time.">
      <section className={s.intake}>
        <div className={s.askRow}>
          <input className={s.ask} value={purpose} onChange={(e) => setPurpose(e.target.value)} onKeyDown={(e) => e.key === "Enter" && make()} placeholder="What is the appointment for?" />
          <button className={s.file} onClick={() => make()} disabled={busy}>{busy ? "Recalling…" : "Prepare brief"}</button>
        </div>
        <div className={s.filters} style={{ marginTop: 14 }}>
          {PRESETS.map((p) => <button key={p} className={`mono ${s.filter}`} onClick={() => make(p)}>{p}</button>)}
        </div>
        {err && <p className={s.err}>{err}</p>}
        {busy && <p className={s.empty}><span className={s.loading} /> Reading back through your history…</p>}
      </section>
      {data && <BriefView brief={data.brief} sources={data.sources} />}
    </AppShell>
  );
}

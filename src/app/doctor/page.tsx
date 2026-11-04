"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/AppShell";
import Refs, { type Source } from "@/components/Refs";
import { SealIcon } from "@/components/Icons";
import type { Clinical } from "@/lib/clinical";
import u from "@/components/ui.module.css";
import s from "./doctor.module.css";

type Res = {
  status?: string; error?: string; via?: string; who?: string; exp?: number | null; empty?: boolean;
  clinical?: Clinical; sources?: Source[];
  proof?: { accountId: string; version: string; checkpoint: string | null; walrusEpoch: number | null; checkedAt: string } | null;
};

const DAY = 86_400_000;
const t = (d: string) => new Date(d + "T12:00:00").getTime();

function DoseChart({ meds, sources }: { meds: Clinical["medications"]; sources: Source[] }) {
  const segs = meds.flatMap((m) => m.segments);
  if (!segs.length) return null;
  const now = Date.now();
  const start = Math.min(...segs.map((g) => t(g.start)));
  const end = Math.max(now, ...segs.map((g) => (g.end ? t(g.end) : now)));
  const span = Math.max(end - start, 30 * DAY);
  const x = (ms: number) => ((ms - start) / span) * 100;
  const months: number[] = [];
  const d = new Date(start); d.setDate(1); d.setMonth(d.getMonth() + 1);
  while (d.getTime() < end) { months.push(d.getTime()); d.setMonth(d.getMonth() + 1); }
  return (
    <div className={s.chart}>
      <div className={s.axis}>{months.map((m) => <span key={m} style={{ left: `${x(m)}%` }}>{new Date(m).toLocaleDateString(undefined, { month: "short" })}</span>)}</div>
      {meds.map((m, i) => (
        <div key={i} className={s.lane}>
          <span className={s.drug} data-stopped={m.status === "stopped"}>{m.name}</span>
          <div className={s.track}>
            {months.map((mm) => <i key={mm} style={{ left: `${x(mm)}%` }} />)}
            {m.segments.map((g, j) => {
              const a = x(t(g.start)); const b = x(g.end ? t(g.end) : now);
              return (
                <span key={j} className={s.seg} style={{ left: `${a}%`, width: `${Math.max(b - a, 1.5)}%`, "--j": j } as React.CSSProperties} title={`${g.dose} from ${g.start}${g.end ? ` to ${g.end}` : ""}`}>
                  <em>{g.dose}</em>
                </span>
              );
            })}
          </div>
          <Refs refs={m.segments.flatMap((g) => g.refs)} sources={sources} />
        </div>
      ))}
    </div>
  );
}

const LISTS: [keyof Clinical, string][] = [["changes", "What changed"], ["flags", "Flags"], ["questions", "Open questions"], ["measurements", "Readings"]];

export default function DoctorPage() {
  const [res, setRes] = useState<Res | null>(null);
  const [body, setBody] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const h = window.location.hash.slice(1);
    const p = new URLSearchParams(h);
    const b = h === "sample" ? { sample: true } : p.get("t") ? { t: p.get("t") } : p.get("k") ? { key: p.get("k"), account: p.get("a") || undefined } : null;
    setBody(b);
    if (!b) return setRes({ error: "This link is incomplete. Ask the patient to send it again." });
    fetch("/api/doctor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) })
      .then((r) => r.json()).then(setRes).catch((e) => setRes({ error: String(e) }));
  }, []);

  const c = res?.clinical;
  const src = res?.sources ?? [];
  return (
    <div className={s.page}>
      <header className={s.top}>
        <Brand small />
        <span className={s.whose}>{res?.status === "active" ? <>Shared by <b>{res.who || "the patient"}</b>{res.exp ? ` · until ${new Date(res.exp).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` : ""}</> : "Clinician view"}</span>
      </header>
      <main className={s.main}>
        {!res ? (
          <p className={u.empty}><span className={u.loading} />{body ? "Checking the link, then reading the record…" : ""}</p>
        ) : res.error || res.status !== "active" ? (
          <section className={`${u.card} ${s.stop}`}>
            <h1 className="display">{res.status === "revoked" ? "The patient has taken this link back." : res.status === "expired" ? "This link has run out." : "This link doesn't open a record."}</h1>
            <p>{res.error}</p>
          </section>
        ) : res.empty || !c ? (
          <p className={u.empty}>The record is empty so far.</p>
        ) : (
          <>
            <section className={s.summary}>
              <p className="display">{c.summary}</p>
            </section>
            {c.allergies.length > 0 && (
              <section className={s.allergy}>
                <h2 className={u.label}>Allergies and adverse reactions</h2>
                <ul>{c.allergies.map((a, i) => <li key={i}>{a.text}<Refs refs={a.refs} sources={src} /></li>)}</ul>
              </section>
            )}
            <section className={`${u.card} ${s.meds}`}>
              <h2 className={u.h2}>Medicines over time</h2>
              <DoseChart meds={c.medications} sources={src} />
            </section>
            <div className={s.grid}>
              {LISTS.map(([k, label], i) => {
                const items = c[k] as { text: string; refs: number[] }[];
                if (!items?.length) return null;
                return (
                  <section key={k} className={`${s.block} ${k === "flags" ? s.flags : ""}`} style={{ "--i": i } as React.CSSProperties}>
                    <h2 className={u.label}>{label}</h2>
                    <ul>{items.map((it, j) => <li key={j}>{it.text}<Refs refs={it.refs} sources={src} /></li>)}</ul>
                  </section>
                );
              })}
            </div>
            <footer className={s.proof}>
              <SealIcon size={18} />
              <p>
                {res.via === "delegate" ? "Your key was found on the patient's account on Sui" : res.via === "sample" ? "Sample record" : "Link signed by Anamnesis and checked against the patient's revocations"}
                {res.proof && <> · account read through Tatum at Sui checkpoint <span className="mono">{res.proof.checkpoint ?? "?"}</span>, Walrus epoch <span className="mono">{res.proof.walrusEpoch ?? "?"}</span></>}
                {" · "}{src.length} memories cited. Patient-kept; confirm before acting.
              </p>
            </footer>
          </>
        )}
        <p className={s.about}><Link href="/">What is Anamnesis?</Link></p>
      </main>
    </div>
  );
}

"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Refs, { type Source } from "@/components/Refs";
import { Kind } from "@/components/Entry";
import { Arrow, CameraIcon, NibIcon } from "@/components/Icons";
import { get } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { Snapshot } from "@/lib/clinical";
import u from "@/components/ui.module.css";
import s from "./today.module.css";

type Data = { snapshot: Snapshot | null; sources: Source[]; recent: Source[]; count: number };

const fmt = (d?: string) => {
  if (!d || !/^\d{4}-\d{2}-\d{2}/.test(d)) return d || "";
  return new Date(d + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

export default function TodayPage() {
  const session = useSession();
  const cacheKey = session ? `anamnesis-today:${session.mode}:${session.key ?? session.own?.accountId ?? ""}` : null;
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cacheKey) return;
    setBusy(true);
    const r = await get<Data>("/api/today");
    setBusy(false);
    if (r.error) return setErr(r.error);
    setErr(null);
    setData(r);
    try { localStorage.setItem(cacheKey, JSON.stringify(r)); } catch {}
  }, [cacheKey]);

  useEffect(() => {
    if (!cacheKey || session?.mode === "none") return;
    try {
      const hit = localStorage.getItem(cacheKey);
      if (hit) setData(JSON.parse(hit));
    } catch {}
    load();
  }, [cacheKey, load, session?.mode]);

  const snap = data?.snapshot;
  const src = data?.sources ?? [];
  const day = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  return (
    <AppShell title={day} aside={busy && data ? <p className={s.sync}><span className={u.loading} />Rereading your record…</p> : null}>
      {!data && busy ? (
        <div className={s.skeleton} aria-label="Loading">
          <div /><div /><div />
        </div>
      ) : err && !data ? (
        <p className={u.err}>{err}</p>
      ) : !snap ? (
        <section className={`${u.card} ${u.ruled} ${s.blank}`}>
          <h2 className="display">An empty file, ready for its first page.</h2>
          <p>Start with whatever is on your mind: the medicines you take, an allergy, what the doctor said last time. Anamnesis sorts it into facts and keeps them on Walrus.</p>
          <div className={u.row}>
            <Link className={u.primary} href="/record"><NibIcon size={18} /> Write a note</Link>
            <Link className={u.ghost} href="/record?photo=1"><CameraIcon size={18} /> Photograph a prescription</Link>
          </div>
        </section>
      ) : (
        <div className={s.layout}>
          <section className={`${u.card} ${u.ruled} ${s.headline} ${u.reveal}`}>
            <p className="display">{snap.headline}</p>
            <span className={`mono ${s.count}`}>{data!.count} memories read</span>
          </section>

          <section className={`${s.meds} ${u.reveal}`} style={{ "--i": 1 } as React.CSSProperties}>
            <h2 className={u.h2}>Taking now</h2>
            {snap.medications.length ? (
              <ul>
                {snap.medications.map((m, i) => (
                  <li key={i} className={s.med}>
                    <span className={s.rx}>Rx</span>
                    <div>
                      <b>{m.name}</b>
                      <span className="mono">{m.dose}</span>
                      {(m.note || m.since) && <small>{[m.note, m.since && `since ${fmt(m.since)}`].filter(Boolean).join(" · ")}</small>}
                    </div>
                    <Refs refs={m.refs} sources={src} />
                  </li>
                ))}
              </ul>
            ) : <p className={u.empty}>No current medicines on file.</p>}
          </section>

          <section className={`${s.open} ${u.reveal}`} style={{ "--i": 2 } as React.CSSProperties}>
            <h2 className={u.h2}>Still open</h2>
            {snap.followups.length ? (
              <ul>
                {snap.followups.map((f, i) => (
                  <li key={i}>
                    <span className={s.box} aria-hidden />
                    <span>{f.text}{f.due && <em className="mono"> due {fmt(f.due)}</em>}<Refs refs={f.refs} sources={src} /></span>
                  </li>
                ))}
              </ul>
            ) : <p className={u.empty}>Nothing waiting on you.</p>}
          </section>

          <div className={s.side}>
            {snap.allergies.length > 0 && (
              <section className={`${s.alert} ${u.reveal}`} style={{ "--i": 3 } as React.CSSProperties}>
                <h2 className={u.label}>Allergies and reactions</h2>
                <ul>{snap.allergies.map((a, i) => <li key={i}>{a.text}<Refs refs={a.refs} sources={src} /></li>)}</ul>
              </section>
            )}
            {snap.lastVisit && (
              <section className={`${u.card} ${u.reveal}`} style={{ "--i": 4 } as React.CSSProperties}>
                <h2 className={u.label}>Last visit{snap.lastVisit.date ? ` · ${fmt(snap.lastVisit.date)}` : ""}</h2>
                <p className={s.visit}>{snap.lastVisit.text}<Refs refs={snap.lastVisit.refs} sources={src} /></p>
              </section>
            )}
            {snap.conditions.length > 0 && (
              <section className={u.reveal} style={{ "--i": 5 } as React.CSSProperties}>
                <h2 className={u.label}>Conditions</h2>
                <p className={s.conds}>{snap.conditions.map((c, i) => <span key={i}>{c.text}<Refs refs={c.refs} sources={src} /></span>)}</p>
              </section>
            )}
            {snap.watch.length > 0 && (
              <section className={`${s.watch} ${u.reveal}`} style={{ "--i": 6 } as React.CSSProperties}>
                <h2 className={u.label}>Raise next time</h2>
                <ul>{snap.watch.map((w, i) => <li key={i}>{w.text}<Refs refs={w.refs} sources={src} /></li>)}</ul>
                <Link href="/brief" className={u.link}>Prepare a brief</Link>
              </section>
            )}
          </div>

          <section className={`${s.recent} ${u.reveal}`} style={{ "--i": 7 } as React.CSSProperties}>
            <div className={s.recentHead}>
              <h2 className={u.h2}>Lately</h2>
              <Link href="/timeline" className={s.more}>Whole timeline <Arrow size={16} /></Link>
            </div>
            <ol>
              {[...src].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5).map((e) => (
                <li key={e.blobId}><span className="mono">{fmt(e.date)}</span><Kind kind={e.kind} /><span>{e.body}</span></li>
              ))}
            </ol>
          </section>
        </div>
      )}
      {err && data && <p className={u.err}>{err}</p>}
    </AppShell>
  );
}

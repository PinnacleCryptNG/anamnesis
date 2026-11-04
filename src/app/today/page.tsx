"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Refs, { type Source } from "@/components/Refs";
import { Tag } from "@/components/Entry";
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
          <p className={`display ${s.headline} ${u.reveal}`}>{snap.headline}</p>

          <section className={`${u.card} ${s.sheet} ${u.reveal}`} style={{ "--i": 1 } as React.CSSProperties}>
            <Row label="Taking now">
              {snap.medications.length ? (
                <ul className={s.meds}>
                  {snap.medications.map((m, i) => (
                    <li key={i}>
                      <b>{m.name}</b> <span className="mono">{m.dose}</span><Refs refs={m.refs} sources={src} />
                      {(m.note || m.since) && <small>{[m.since && `Since ${fmt(m.since)}`, m.note].filter(Boolean).join(" · ")}</small>}
                    </li>
                  ))}
                </ul>
              ) : <p className={s.none}>No current medicines on file.</p>}
            </Row>
            <Row label="Still open">
              {snap.followups.length ? (
                <ul className={s.open}>
                  {snap.followups.map((f, i) => (
                    <li key={i}>
                      <span className={s.box} aria-hidden />
                      <span>{f.text}<Refs refs={f.refs} sources={src} />{f.due && <small>Due {fmt(f.due)}</small>}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className={s.none}>Nothing waiting on you.</p>}
            </Row>
            {snap.allergies.length > 0 && (
              <Row label="Allergies" alert>
                <ul className={s.plain}>{snap.allergies.map((a, i) => <li key={i} className={s.allergy}>{a.text}<Refs refs={a.refs} sources={src} /></li>)}</ul>
              </Row>
            )}
            {snap.conditions.length > 0 && (
              <Row label="Conditions">
                <ul className={s.plain}>{snap.conditions.map((c, i) => <li key={i}>{c.text}<Refs refs={c.refs} sources={src} /></li>)}</ul>
              </Row>
            )}
            {snap.lastVisit && (
              <Row label="Last visit">
                <p>{snap.lastVisit.date && <small className={s.when}>{fmt(snap.lastVisit.date)}</small>}{snap.lastVisit.text}<Refs refs={snap.lastVisit.refs} sources={src} /></p>
              </Row>
            )}
            {snap.watch.length > 0 && (
              <Row label="Raise next time">
                <ul className={s.plain}>{snap.watch.map((w, i) => <li key={i}>{w.text}<Refs refs={w.refs} sources={src} /></li>)}</ul>
                <Link href="/brief" className={s.more}>Prepare a brief <Arrow size={14} /></Link>
              </Row>
            )}
          </section>

          <section className={`${s.recent} ${u.reveal}`} style={{ "--i": 2 } as React.CSSProperties}>
            <div className={s.recentHead}>
              <h2 className={u.h2}>Lately</h2>
              <Link href="/timeline" className={s.more}>Whole timeline <Arrow size={14} /></Link>
            </div>
            <ol>
              {[...src].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5).map((e) => (
                <li key={e.blobId}><span className={s.meta}><span className="mono">{fmt(e.date)}</span><Tag kind={e.kind} /></span><span>{e.body}</span></li>
              ))}
            </ol>
            <p className={`mono ${s.count}`}>Summed up from {data!.count} memories</p>
          </section>
        </div>
      )}
      {err && data && <p className={u.err}>{err}</p>}
    </AppShell>
  );
}

function Row({ label, alert, children }: { label: string; alert?: boolean; children: React.ReactNode }) {
  return (
    <div className={s.row} data-alert={alert || undefined}>
      <h2>{label}</h2>
      <div>{children}</div>
    </div>
  );
}

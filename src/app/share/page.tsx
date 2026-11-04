"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import RecordCard, { useQr } from "@/components/RecordCard";
import { StethIcon, CrossCardIcon, QrIcon, SealIcon } from "@/components/Icons";
import { get, post } from "@/lib/api";
import { forgetRecord, useSession } from "@/lib/session";
import u from "@/components/ui.module.css";
import s from "./share.module.css";

type Row = { id: string; scope: "doctor" | "emergency"; who: string; until: string | null; issued: string; revoked: boolean };
const DAYS = [[1, "1 day"], [7, "1 week"], [30, "30 days"], [90, "3 months"]] as const;

export default function SharePage() {
  const session = useSession();
  const hosted = session?.mode === "mine" && !!session.key && !session.own;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [who, setWho] = useState("");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [made, setMade] = useState<{ url: string; who: string; until: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const qr = useQr(made?.url ?? null);

  const load = useCallback(() => { if (hosted) get<{ shares: Row[] }>("/api/share").then((r) => setRows(r.shares ?? [])); }, [hosted]);
  useEffect(load, [load]);

  const create = async () => {
    setBusy(true); setErr(null); setMade(null);
    const r = await post<{ token: string; until: string | null }>("/api/share", { action: "create", scope: "doctor", who: who.trim(), days });
    setBusy(false);
    if (r.error) return setErr(r.error);
    setMade({ url: `${origin}/doctor#t=${r.token}`, who: who.trim(), until: r.until });
    setWho("");
    load();
  };
  const revoke = async (id: string) => {
    setRows((cur) => cur?.map((x) => (x.id === id ? { ...x, revoked: true } : x)) ?? null);
    const r = await post("/api/share", { action: "revoke", id });
    if (r.error) { setErr(r.error); load(); }
  };
  const copy = () => made && navigator.clipboard.writeText(made.url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); });
  const fmt = (d: string | null) => (d ? new Date(d + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "no end date");

  return (
    <AppShell title="Who can read it." sub="Give a doctor a link to this record alone. It ends on the day you choose, and you can take it back sooner. Every open is checked first.">
      {session?.mode === "sample" ? (
        <p className={`${u.card} ${s.notice}`}>The sample patient can&apos;t issue links. <Link href="/start">Start your own record</Link> to share it with a doctor. You can still <Link href="/doctor#sample">open the doctor&apos;s view of the sample</Link>.</p>
      ) : !hosted ? (
        <p className={`${u.card} ${s.notice}`}>Records in your own Walrus account are shared with a delegate key: add one for the doctor in your Walrus Memory dashboard and send them <span className="mono">/doctor#k=KEY&amp;a=ACCOUNT</span>. Revoke it there and access ends at once, checked on Sui through Tatum.</p>
      ) : (
        <div className={s.layout}>
          <section className={`${u.card} ${s.issue}`}>
            <h2 className={u.h2}><StethIcon size={22} /> A link for a doctor</h2>
            <label className={u.label} htmlFor="who">Who it&apos;s for</label>
            <input id="who" className={u.field} value={who} onChange={(e) => setWho(e.target.value)} placeholder="Dr. Bello, neurology" />
            <span className={u.label}>Works for</span>
            <div className={s.days}>
              {DAYS.map(([d, l]) => <button key={d} data-on={days === d} onClick={() => setDays(d)}>{l}</button>)}
            </div>
            <button className={u.primary} onClick={create} disabled={busy}>{busy ? "Issuing…" : "Issue link"}</button>
            {err && <p className={u.err}>{err}</p>}
            {made && (
              <div className={s.made}>
                <div className={s.qr}>{qr && <img src={qr} alt="QR code for the doctor link" />}</div>
                <div>
                  <p>Show this at the clinic, or send it. {made.who ? `For ${made.who}, ` : ""}until {fmt(made.until)}.</p>
                  <button className={u.ghost} onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
                </div>
              </div>
            )}
          </section>

          <section className={s.list}>
            <h2 className={u.h2}>Links you&apos;ve issued</h2>
            {rows === null ? <p className={u.empty}><span className={u.loading} />Reading your record…</p>
              : !rows.length ? <p className={u.empty}>None yet.</p>
              : (
                <ul>
                  {rows.map((r) => (
                    <li key={r.id} data-off={r.revoked || (r.until ? r.until < new Date().toISOString().slice(0, 10) : false)}>
                      {r.scope === "emergency" ? <CrossCardIcon size={20} /> : <StethIcon size={20} />}
                      <div>
                        <b>{r.who || (r.scope === "emergency" ? "Emergency card" : "Doctor link")}</b>
                        <span className="mono">{r.revoked ? "revoked" : `until ${fmt(r.until)}`}{r.issued ? ` · issued ${fmt(r.issued)}` : ""}</span>
                      </div>
                      {!r.revoked && <button className={u.link} onClick={() => revoke(r.id)}>Revoke</button>}
                    </li>
                  ))}
                </ul>
              )}
          </section>
        </div>
      )}

      {hosted && session?.key && (
        <section className={s.card}>
          <h2 className={u.h2}><QrIcon size={22} /> Your record card</h2>
          <p className={u.muted}>Open this record on another phone or computer.</p>
          <RecordCard recordKey={session.key} />
          <button className={u.link} onClick={() => { if (confirm("Forget this record on this device? You'll need the card to open it again.")) { forgetRecord(); location.href = "/start"; } }}>Forget on this device</button>
        </section>
      )}
      <p className={s.foot}><SealIcon size={16} /> <Link href="/ledger">See the proof on Sui</Link></p>
    </AppShell>
  );
}

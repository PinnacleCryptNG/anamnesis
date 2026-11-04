"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import RecordCard, { useQr } from "@/components/RecordCard";
import { StethIcon, CrossCardIcon, SealIcon } from "@/components/Icons";
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
  const fmt = (d: string | null) => (d ? new Date(d + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "no end date");

  return (
    <AppShell title="Who can read it." sub="Give a doctor read access to this record. Links end on the date you pick, and you can revoke them sooner.">
      {session?.mode === "sample" ? (
        <p className={`${u.card} ${s.notice}`}>The sample patient can&apos;t issue links. <Link href="/start">Start your own record</Link> to share it with a doctor, or <Link href="/doctor#sample">open the doctor&apos;s view of the sample</Link>.</p>
      ) : !hosted ? (
        <p className={`${u.card} ${s.notice}`}>Records in your own Walrus account are shared with a delegate key: add one for the doctor in your Walrus Memory dashboard and send them <span className="mono">/doctor#k=KEY&amp;a=ACCOUNT</span>. Revoke it there and access ends at once, checked on Sui through Tatum.</p>
      ) : (
        <div className={s.page}>
          <section className={`${u.card} ${s.issue}`}>
            <h2 className={s.h}>New doctor link</h2>
            <label className={s.field}>
              <span className={u.label}>For</span>
              <input className={u.field} value={who} onChange={(e) => setWho(e.target.value)} placeholder="Dr. Bello, neurology" />
            </label>
            <div className={s.field}>
              <span className={u.label}>Ends after</span>
              <div className={s.days} role="radiogroup" aria-label="Ends after">
                {DAYS.map(([d, l]) => <button key={d} role="radio" aria-checked={days === d} data-on={days === d} onClick={() => setDays(d)}>{l}</button>)}
              </div>
            </div>
            <button className={u.primary} onClick={create} disabled={busy}>{busy ? "Creating…" : "Create link"}</button>
            {err && <p className={u.err}>{err}</p>}
            {made && (
              <div className={s.made}>
                <div className={s.qr}>{qr && <img src={qr} alt="QR code for the doctor link" />}</div>
                <div>
                  <b>Link ready</b>
                  <p>{made.who ? `For ${made.who}. ` : ""}Works until {fmt(made.until)}. Show the code at the clinic or send the link.</p>
                  <button className={s.small} onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
                </div>
              </div>
            )}
          </section>

          <section className={s.block}>
            <h2 className={s.h}>Links you&apos;ve issued</h2>
            {rows === null ? <p className={u.empty}><span className={u.loading} />Reading your record…</p>
              : !rows.length ? <p className={s.none}>None yet.</p>
              : (
                <ul className={s.list}>
                  {rows.map((r) => {
                    const ended = r.revoked || (r.until ? r.until < new Date().toISOString().slice(0, 10) : false);
                    return (
                      <li key={r.id} data-off={ended}>
                        {r.scope === "emergency" ? <CrossCardIcon size={18} /> : <StethIcon size={18} />}
                        <div>
                          <b>{r.who || (r.scope === "emergency" ? "Emergency card" : "Doctor link")}</b>
                          <span>{r.revoked ? "Revoked" : ended ? `Ended ${fmt(r.until)}` : r.until ? `Until ${fmt(r.until)}` : "No end date"}</span>
                        </div>
                        {!ended && <button className={s.small} onClick={() => revoke(r.id)}>Revoke</button>}
                      </li>
                    );
                  })}
                </ul>
              )}
          </section>

          {session?.key && (
            <section className={s.block}>
              <h2 className={s.h}>Open it on another device</h2>
              <RecordCard recordKey={session.key} />
              <button className={s.forget} onClick={() => { if (confirm("Forget this record on this device? You'll need the card to open it again.")) { forgetRecord(); location.href = "/start"; } }}>Forget this record on this device</button>
            </section>
          )}
        </div>
      )}
      <p className={s.foot}><SealIcon size={16} /> <Link href="/ledger">See the proof on Sui</Link></p>
    </AppShell>
  );
}

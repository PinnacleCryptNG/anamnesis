"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import EmergencyCard from "@/components/EmergencyCard";
import { useQr } from "@/components/RecordCard";
import { get, post } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { Snapshot } from "@/lib/clinical";
import type { Card } from "@/lib/record";
import u from "@/components/ui.module.css";
import s from "./emergency.module.css";

const STORE = "anamnesis-emergency";

export default function EmergencyPage() {
  const session = useSession();
  const hosted = session?.mode === "mine" && !!session.key && !session.own;
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState<Card>({});
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const qr = useQr(url, "#1f2428");

  useEffect(() => {
    if (!session || session.mode === "none") return;
    try { const c = JSON.parse(localStorage.getItem(STORE) || "{}"); setCard(c.card || {}); setUrl(c.url || null); } catch {}
    get<{ snapshot: Snapshot | null }>("/api/today").then((r) => { setSnap(r.snapshot ?? null); setLoading(false); });
  }, [session]);

  const set = (k: keyof Card) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setCard((c) => ({ ...c, [k]: e.target.value }));
  const publish = async () => {
    setBusy(true); setErr(null);
    const r = await post<{ token: string }>("/api/share", { action: "create", scope: "emergency", who: "Emergency card", days: 0, card });
    setBusy(false);
    if (r.error) return setErr(r.error);
    const link = `${window.location.origin}/e#t=${r.token}`;
    setUrl(link);
    localStorage.setItem(STORE, JSON.stringify({ card, url: link }));
  };

  return (
    <AppShell title="If you can't speak for yourself." sub="One card with what a stranger treating you must know: allergies, what you take, your conditions, who to call. Its QR always shows the current record, and you can revoke it from Share.">
      <div className={s.layout}>
        <div>
          {loading ? <p className={u.empty}><span className={u.loading} />Reading your record…</p> : <EmergencyCard card={card} snap={snap} qr={qr} />}
          {url && <p className={s.hint}>Save the card as your phone&apos;s lock-screen image, or print it for your wallet. <a href={url} target="_blank" rel="noreferrer">Open what a responder sees</a>.</p>}
        </div>
        <section className={`${u.card} ${s.form}`}>
          <h2 className={u.h2}>On the card</h2>
          <p className={u.muted}>Allergies, medicines and conditions come from your record. Add what it can&apos;t know.</p>
          <label className={s.f}><span className={u.label}>Full name</span><input className={u.field} value={card.name || ""} onChange={set("name")} /></label>
          <div className={s.two}>
            <label className={s.f}><span className={u.label}>Date of birth</span><input className={u.field} type="date" max={new Date().toISOString().slice(0, 10)} value={/^\d{4}-\d{2}-\d{2}$/.test(card.born || "") ? card.born : ""} onChange={set("born")} /></label>
            <label className={s.f}><span className={u.label}>Blood type</span>
              <select className={u.field} value={card.blood || ""} onChange={set("blood")}>
                <option value="">Not known</option>
                {["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"].map((b) => <option key={b}>{b}</option>)}
              </select>
            </label>
          </div>
          <label className={s.f}><span className={u.label}>Emergency contact</span><input className={u.field} placeholder="Name and phone" value={card.contact || ""} onChange={set("contact")} /></label>
          <label className={s.f}><span className={u.label}>Anything else</span><input className={u.field} placeholder="e.g. pacemaker, organ donor" value={card.notes || ""} onChange={set("notes")} /></label>
          {hosted ? (
            <button className={u.primary} onClick={publish} disabled={busy}>{busy ? "Issuing…" : url ? "Reissue the QR" : "Make the QR"}</button>
          ) : (
            <p className={s.hint}>{session?.mode === "sample" ? <>The sample patient can&apos;t issue a card. <Link href="/start">Start your own record</Link>.</> : "QR cards work with hosted records."}</p>
          )}
          {err && <p className={u.err}>{err}</p>}
        </section>
      </div>
    </AppShell>
  );
}

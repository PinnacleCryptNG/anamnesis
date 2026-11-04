"use client";
import { useEffect, useState } from "react";
import BriefView, { type BriefT } from "@/components/BriefView";
import type { EntryT } from "@/components/Entry";
import f from "@/components/Folder.module.css";
import s from "../page.module.css";

type Res = { status?: string; error?: string; brief?: BriefT; sources?: (EntryT & { n: number })[]; checkedAt?: string; accountVersion?: string; publicKeyHex?: string };

export default function DoctorPage() {
  const [key, setKey] = useState<string | null>(null);
  const [purpose, setPurpose] = useState("");
  const [res, setRes] = useState<Res | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const k = new URLSearchParams(window.location.hash.slice(1)).get("k");
    setKey(k);
  }, []);

  const open = async () => {
    if (!key) return;
    setBusy(true); setRes(null);
    const r = await fetch("/api/doctor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key, purpose: purpose || undefined }) })
      .then((r) => r.json()).catch((e) => ({ error: String(e) }));
    setBusy(false); setRes(r);
  };

  return (
    <div className={f.desk}>
      <header className={f.label}><span className={`display ${f.brand}`}><span>Anamnesis</span></span></header>
      <main className={f.sheet} style={{ "--tone": "var(--tab-share)" } as React.CSSProperties}>
        <div className={f.head}>
          <h1 className="display">A patient shared their history with you.</h1>
          <p>Access works only while the patient keeps your key registered on Sui. It is checked live every time you open this page.</p>
        </div>
        {!key ? <p className={s.err}>This link has no key. Ask the patient to send it again.</p> : (
          <div className={s.askRow}>
            <input className={s.ask} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Reason for visit (optional)" />
            <button className={s.file} onClick={open} disabled={busy}>{busy ? "Checking Sui…" : "Open record"}</button>
          </div>
        )}
        {res?.status === "not-active" && <p className={s.ack}>This key is not registered on the patient&apos;s account (read at Sui object version {res.accountVersion}). Either it was never switched on or the patient has revoked it.</p>}
        {res?.error && <p className={s.err}>{res.error}</p>}
        {res?.brief && res.sources && (
          <div style={{ marginTop: 28 }}>
            <p className="mono" style={{ color: "var(--ink-soft)", marginBottom: 10 }}>Key confirmed on Sui at object version {res.accountVersion}, {res.checkedAt?.slice(0, 19).replace("T", " ")} UTC</p>
            <BriefView brief={res.brief} sources={res.sources} />
          </div>
        )}
      </main>
    </div>
  );
}

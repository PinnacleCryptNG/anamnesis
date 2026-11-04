"use client";
import { useEffect, useState } from "react";
import EmergencyCard from "@/components/EmergencyCard";
import type { Snapshot } from "@/lib/clinical";
import type { Card } from "@/lib/record";
import u from "@/components/ui.module.css";

export default function ResponderPage() {
  const [d, setD] = useState<{ card?: Card; snapshot?: Snapshot | null; error?: string } | null>(null);
  useEffect(() => {
    const t = new URLSearchParams(window.location.hash.slice(1)).get("t");
    if (!t) return setD({ error: "This card link is incomplete." });
    fetch("/api/emergency", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ t }) })
      .then((r) => r.json()).then(setD).catch((e) => setD({ error: String(e) }));
  }, []);
  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: "28px 16px 60px" }}>
      <p className="mono" style={{ color: "var(--ink-soft)", marginBottom: 14 }}>Kept by the patient in Anamnesis. Not a clinical record; confirm where you can.</p>
      {!d ? <p className={u.empty}><span className={u.loading} />Reading the card…</p>
        : d.error ? <p className={u.err} style={{ fontSize: 20 }}>{d.error}</p>
        : <EmergencyCard card={d.card ?? {}} snap={d.snapshot ?? null} />}
    </main>
  );
}

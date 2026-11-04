"use client";
import { useEffect, useState } from "react";
import s from "./landing.module.css";

type L = { account?: { walrusEpoch?: number | null; checkpoint?: string | null; delegates?: unknown[] }; memories?: unknown[] };

export default function LiveProof() {
  const [d, setD] = useState<L | null>(null);
  useEffect(() => { fetch("/api/ledger").then((r) => r.json()).then(setD).catch(() => setD({})); }, []);
  const stats = [
    { v: d?.memories?.length, l: "memories on Walrus mainnet" },
    { v: d?.account?.delegates?.length, l: "keys allowed to read" },
    { v: d?.account?.walrusEpoch, l: "current Walrus epoch" },
    { v: d?.account?.checkpoint ? Number(d.account.checkpoint).toLocaleString("en-US") : undefined, l: "Sui checkpoint, read just now" },
  ];
  return (
    <dl className={s.stats}>
      {stats.map((x) => (
        <div key={x.l}>
          <dd className="display" data-ready={d !== null}>{d === null ? "·····" : x.v ?? "—"}</dd>
          <dt>{x.l}</dt>
        </div>
      ))}
    </dl>
  );
}

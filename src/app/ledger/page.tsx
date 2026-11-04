"use client";
import { useEffect, useState } from "react";
import Folder from "@/components/Folder";
import s from "../page.module.css";
import l from "./ledger.module.css";

type Ledger = {
  account: { accountId?: string; type?: string; version?: string; digest?: string; owner?: string | null; delegates?: { publicKeyHex: string }[]; walrusEpoch?: number | null; checkpoint?: string | null; checkedAt?: string; previousTransaction?: string; error?: string };
  memories: { blobId: string; createdAt: string; size: number; status: string; endEpoch: number | null; expiresAt: string | null }[];
  memoriesError: string | null;
  namespace: string;
  rpc: string;
};

const short = (v?: string | null, a = 8, b = 6) => (v ? `${v.slice(0, a)}…${v.slice(-b)}` : "—");

export default function LedgerPage() {
  const [d, setD] = useState<Ledger | null>(null);
  useEffect(() => { fetch("/api/ledger").then((r) => r.json()).then(setD); }, []);
  const a = d?.account;
  return (
    <Folder title="Proof the file is yours." sub="Your record lives as Walrus blobs, paid for and indexed on Sui mainnet. This page reads the chain through Tatum's Sui gRPC gateway on every load, not from a cache.">
      {!d ? <p className={s.empty}><span className={s.loading} /> Reading Sui mainnet through Tatum…</p> : (
        <>
          {a?.error ? <p className={s.err}>Account read failed: {a.error}</p> : (
            <dl className={l.facts}>
              <div className={l.fact}><dt>Memory account</dt><dd className={l.small}>{short(a?.accountId, 12, 8)}<span className={l.seal}>✓</span></dd></div>
              <div className={l.fact}><dt>Owner</dt><dd className={l.small}>{short(a?.owner, 12, 8)}</dd></div>
              <div className={l.fact}><dt>Object version</dt><dd>{a?.version}</dd></div>
              <div className={l.fact}><dt>Keys allowed to read</dt><dd>{a?.delegates?.length ?? 0}</dd></div>
              <div className={l.fact}><dt>Walrus epoch</dt><dd>{a?.walrusEpoch ?? "—"}</dd></div>
              <div className={l.fact}><dt>Sui checkpoint</dt><dd>{a?.checkpoint ?? "—"}</dd></div>
            </dl>
          )}
          <section className={s.section}>
            <h2>Stored blobs<span className={`mono ${s.count}`}>{d.memories.length} in “{d.namespace}”</span></h2>
            {d.memoriesError && <p className={s.err}>{d.memoriesError}</p>}
            <table className={l.table}>
              <thead><tr><th>Walrus blob</th><th>Filed</th><th>Bytes</th><th>Paid through</th></tr></thead>
              <tbody>
                {d.memories.map((m, i) => (
                  <tr key={m.blobId + i} style={{ animationDelay: `${Math.min(i, 20) * 30}ms` }}>
                    <td className="mono"><a href={`https://walruscan.com/mainnet/blob/${m.blobId}`} target="_blank" rel="noreferrer">{short(m.blobId, 10, 4)}</a></td>
                    <td className="mono">{m.createdAt?.slice(0, 16).replace("T", " ")}</td>
                    <td className="mono">{m.size}</td>
                    <td className="mono">{m.endEpoch != null ? `epoch ${m.endEpoch}` : m.expiresAt?.slice(0, 10) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <p className={`mono ${s.empty}`} style={{ fontStyle: "normal" }}>
            Read via {d.rpc} at {a?.checkedAt?.slice(11, 19)} UTC.{a?.previousTransaction ? <> Last account change: <a href={`https://suiscan.xyz/mainnet/tx/${a.previousTransaction}`} target="_blank" rel="noreferrer">{short(a.previousTransaction)}</a></> : null}
          </p>
        </>
      )}
    </Folder>
  );
}

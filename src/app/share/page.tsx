"use client";
import { useEffect, useState } from "react";
import Folder from "@/components/Folder";
import s from "../page.module.css";
import l from "../ledger/ledger.module.css";

type Key = { privateKey: string; publicKeyHex: string; suiAddress: string };
type Delegate = { publicKeyHex: string; label: string };

export default function SharePage() {
  const [key, setKey] = useState<Key | null>(null);
  const [delegates, setDelegates] = useState<Delegate[] | null>(null);
  const [appKey, setAppKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = () =>
    fetch("/api/ledger").then((r) => r.json()).then((r) => {
      setDelegates(r.account?.delegates ?? []);
      setAppKey(r.appKey);
    });
  useEffect(() => { refresh(); }, []);

  const make = async () => setKey(await fetch("/api/share", { method: "POST" }).then((r) => r.json()));
  const link = key ? `${typeof window !== "undefined" ? window.location.origin : ""}/doctor#k=${key.privateKey}` : "";
  const copy = (v: string, what: string) => navigator.clipboard.writeText(v).then(() => { setCopied(what); setTimeout(() => setCopied(null), 1500); });
  const active = key && delegates?.some((d) => d.publicKeyHex === key.publicKeyHex);

  return (
    <Folder title="Let one doctor read it." sub="Each doctor gets their own key. Only you can switch it on, from your Walrus Memory dashboard, and you can switch it off there at any time. Their link checks Sui through Tatum on every open, so a revoked key stops working at once.">
      {!key ? (
        <button className={s.file} onClick={make}>Cut a key for a doctor</button>
      ) : (
        <ol className={l.steps}>
          <li>
            <h3>Register this public key</h3>
            <p>Open memory.walrus.xyz/dashboard, go to Delegate keys, add a key, and paste:</p>
            <code className={l.code} onClick={() => copy(key.publicKeyHex, "pk")}>{key.publicKeyHex}</code>
            <span className="mono">{copied === "pk" ? "copied" : "tap to copy"}</span>
          </li>
          <li>
            <h3>Send the doctor this link</h3>
            <p>The key rides after the #, so it never reaches any server log. Treat it like a house key.</p>
            <code className={l.code} onClick={() => copy(link, "link")}>{link.slice(0, 64)}…</code>
            <span className="mono">{copied === "link" ? "copied" : "tap to copy"}</span>
          </li>
          <li>
            <h3>Check it went live</h3>
            <p>{active ? "Live on Sui. The doctor's link works now." : "Not on Sui yet. Register it, then check again."}</p>
            <button className={s.ghost} onClick={refresh}>Check Sui again</button>
          </li>
        </ol>
      )}

      <section className={s.section}>
        <h2>Keys on your account now</h2>
        {delegates === null ? <p className={s.empty}><span className={s.loading} /> Reading your account through Tatum…</p> : (
          <table className={l.table}>
            <thead><tr><th>Public key</th><th>Label</th><th>Holder</th></tr></thead>
            <tbody>
              {delegates.map((d) => (
                <tr key={d.publicKeyHex}>
                  <td className="mono">{d.publicKeyHex.slice(0, 10)}…{d.publicKeyHex.slice(-6)}</td>
                  <td>{d.label || "—"}</td>
                  <td>{d.publicKeyHex === appKey ? "This app" : d.publicKeyHex === key?.publicKeyHex ? "New doctor key" : "Doctor or other app"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </Folder>
  );
}

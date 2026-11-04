"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RecordCard from "@/components/RecordCard";
import { Brand } from "@/components/AppShell";
import { Arrow } from "@/components/Icons";
import { chooseMine, chooseSample, forgetRecord, newKey, openRecord, setOwn, useSession, validKey, normKey } from "@/lib/session";
import u from "@/components/ui.module.css";
import s from "./start.module.css";

export default function StartPage() {
  const router = useRouter();
  const session = useSession();
  const [fresh, setFresh] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [acct, setAcct] = useState("");
  const [dkey, setDkey] = useState("");

  const begin = () => { setFresh(newKey()); setSaved(false); };
  const enter = () => {
    if (!fresh) return;
    openRecord(fresh);
    router.push("/record");
  };
  const restore = () => {
    if (!validKey(typed)) return setErr("That key should be 20 letters and numbers, like 7Q2M-9X4K-T8VR-3NBH-6DPW.");
    openRecord(normKey(typed));
    router.push("/today");
  };
  const sample = () => { chooseSample(); router.push("/today"); };
  const linkOwn = () => {
    if (!/^0x[0-9a-f]{64}$/i.test(acct.trim())) return setErr("The account ID starts with 0x and has 64 characters after it.");
    if (dkey.trim().length < 32) return setErr("Paste the delegate private key from your Walrus Memory dashboard.");
    forgetRecord();
    setOwn({ accountId: acct.trim(), key: dkey.trim() });
    chooseMine();
    router.push("/today");
  };
  const existing = session?.key && session.mode !== "none" && !fresh;

  return (
    <div className={s.page}>
      <header className={s.top}>
        <Brand />
        <Link href="/" className={s.back}>About Anamnesis</Link>
      </header>
      <main className={s.main}>
        <section className={s.lead}>
          <h1 className="display">Open a file in your own name.</h1>
          <p>
            Your record is private to a key that lives on this device. Come back tomorrow or in five years and it opens where you left
            it. Nobody else sees it unless you hand them a link, and you can take a link back.
          </p>
        </section>

        <div className={s.cols}>
          <section className={`${u.card} ${s.panel}`}>
            {existing ? (
              <>
                <h2 className={u.h2}>This device already holds a record.</h2>
                <RecordCard recordKey={session!.key!} />
                <div className={u.row} style={{ marginTop: 18 }}>
                  <button className={u.primary} onClick={() => { chooseMine(); router.push("/today"); }}>Open my record <Arrow /></button>
                  <button className={u.link} onClick={begin}>Start a different one</button>
                </div>
              </>
            ) : !fresh ? (
              <>
                <h2 className={u.h2}>Start a new record</h2>
                <p className={u.muted} style={{ margin: "8px 0 18px" }}>Takes a second. You&apos;ll get a record card to keep, then your first note.</p>
                <button className={u.primary} onClick={begin}>Start my record <Arrow /></button>
              </>
            ) : (
              <>
                <h2 className={u.h2}>Keep this card somewhere safe.</h2>
                <p className={u.muted} style={{ margin: "8px 0 16px" }}>Screenshot it, print it, or save the QR. It is the only way into this record from a new phone.</p>
                <RecordCard recordKey={fresh} />
                <label className={s.check}>
                  <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> I&apos;ve saved my record card
                </label>
                <button className={u.primary} onClick={enter} disabled={!saved}>Write my first note <Arrow /></button>
              </>
            )}
          </section>

          <aside className={s.side}>
            <section className={s.block}>
              <h3 className={u.h2}>Have a card already?</h3>
              <div className={s.inline}>
                <input className={`${u.field} mono`} value={typed} onChange={(e) => { setTyped(e.target.value); setErr(null); }} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" aria-label="Record key" onKeyDown={(e) => e.key === "Enter" && restore()} />
                <button className={u.ghost} onClick={restore}>Open</button>
              </div>
            </section>
            <section className={s.block}>
              <h3 className={u.h2}>Just looking?</h3>
              <p className={u.muted}>Read five months of a sample patient&apos;s migraine history, with briefs, patterns and a doctor&apos;s view.</p>
              <button className={u.ghost} onClick={sample} style={{ marginTop: 12 }}>See the sample patient</button>
            </section>
            <details className={s.block}>
              <summary className={u.h2}>Use my own Walrus account</summary>
              <p className={u.muted} style={{ margin: "8px 0 10px" }}>
                Write into a Walrus Memory account only you control. Create a delegate key at memory.walrus.xyz and paste it here. It stays on this device and is sent only with your own requests.
              </p>
              <input className={`${u.field} mono`} value={acct} onChange={(e) => setAcct(e.target.value)} placeholder="Account ID (0x…)" aria-label="Walrus account ID" />
              <input className={`${u.field} mono`} value={dkey} onChange={(e) => setDkey(e.target.value)} placeholder="Delegate private key" type="password" aria-label="Delegate private key" />
              <button className={u.ghost} onClick={linkOwn} style={{ marginTop: 12 }}>Link account</button>
            </details>
            {err && <p className={u.err}>{err}</p>}
          </aside>
        </div>
      </main>
    </div>
  );
}

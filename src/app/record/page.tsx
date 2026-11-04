"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Tag } from "@/components/Entry";
import { CameraIcon, MicIcon, Arrow } from "@/components/Icons";
import { post } from "@/lib/api";
import { useSession } from "@/lib/session";
import u from "@/components/ui.module.css";
import s from "./record.module.css";

type SpeechRec = { start: () => void; stop: () => void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; continuous: boolean; interimResults: boolean };
type Written = { text: string; blobId?: string; jobId: string };

async function shrink(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.82);
}

export default function NotePage() {
  const session = useSession();
  const sample = session?.mode === "sample";
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ ack: string; read: string | null; written: Written[] } | null>(null);
  const [listening, setListening] = useState(false);
  const rec = useRef<SpeechRec | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("photo")) fileInput.current?.click();
  }, []);

  const pick = async (f?: File | null) => {
    if (!f) return;
    setErr(null);
    try { setPhoto(await shrink(f)); } catch { setErr("That image couldn't be read. Try a JPEG or PNG."); }
  };

  const file = async () => {
    if (!note.trim() && !photo) return;
    setBusy(true); setErr(null); setDone(null);
    const r = await post<{ ack: string; read: string | null; written: Written[] }>("/api/intake", { note: note || undefined, date, image: photo || undefined });
    setBusy(false);
    if (r.error) return setErr(r.error);
    setDone(r);
    setNote(""); setPhoto(null);
    Object.keys(localStorage).filter((k) => k.startsWith("anamnesis-today:")).forEach((k) => localStorage.removeItem(k));
  };

  const dictate = () => {
    if (listening) return rec.current?.stop();
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Ctor) return setErr("This browser can't take dictation. Type the note instead.");
    const r = new Ctor();
    r.continuous = true; r.interimResults = false;
    const base = note ? note.trimEnd() + " " : "";
    r.onresult = (e) => setNote(base + Array.from(e.results).map((x) => x[0].transcript).join(" "));
    r.onend = () => setListening(false);
    rec.current = r; r.start(); setListening(true);
  };

  return (
    <AppShell title="What happened?" sub="Write it the way you'd tell a friend, or photograph a prescription or lab sheet. Anamnesis sorts it into facts.">
      <div className={s.layout}>
        <section className={s.pad}>
          <label className={s.padHead}>
            <span>Date</span>
            <input className={`mono ${s.date}`} type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={sample ? "The sample patient is read-only." : "Saw Dr. Okafor today. Metformin up to 1000mg twice daily. Stomach upset since Tuesday…"}
            disabled={sample}
            aria-label="Note"
          />
          {photo && (
            <figure className={s.photo}>
              <img src={photo} alt="Attached photo" />
              <button className={u.link} onClick={() => setPhoto(null)}>Remove photo</button>
            </figure>
          )}
          <div className={s.tools}>
            <button className={s.tool} onClick={() => fileInput.current?.click()} disabled={sample} aria-label="Add a photo"><CameraIcon size={19} /><span>Photo</span></button>
            <button className={s.tool} data-on={listening} onClick={dictate} disabled={sample} aria-label={listening ? "Stop dictation" : "Dictate"}><MicIcon size={19} /><span>{listening ? "Stop" : "Dictate"}</span></button>
            <button className={`${u.primary} ${s.file}`} onClick={file} disabled={sample || busy || (!note.trim() && !photo)}>{busy ? "Filing…" : "File to record"}</button>
            <input ref={fileInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0])} />
          </div>
          {busy && <p className={u.empty}><span className={u.loading} />{photo ? "Reading the photo, then filing…" : "Comparing with your history, then filing to Walrus…"}</p>}
          {err && <p className={u.err}>{err}</p>}
          {sample && <p className={s.note}>You&apos;re reading the sample patient. <Link href="/start">Start your own record</Link> to write notes.</p>}
        </section>

        <aside className={s.result} aria-live="polite">
          {done ? (
            <>
              <p className={s.ack}>{done.ack}</p>
              {done.read && <p className={s.read}><span className={u.label}>Read from the photo</span>{done.read}</p>}
              <ul className={s.filed}>
                {done.written.map((w, i) => {
                  const m = w.text.match(/^\[([a-z]+) · ([\d-]+)\]\s*([\s\S]*)$/);
                  return (
                    <li key={i} style={{ "--i": i } as React.CSSProperties}>
                      <Tag kind={m?.[1] ?? "note"} />
                      <span>{m?.[3] ?? w.text}</span>
                      <span className="mono">{w.blobId ? `walrus ${w.blobId.slice(0, 8)}` : "sealing…"}</span>
                    </li>
                  );
                })}
              </ul>
              <Link className={u.link} href="/today">See how it changes Today <Arrow size={14} /></Link>
            </>
          ) : (
            <div className={s.how}>
              <h2 className={u.label}>What happens next</h2>
              <p>Each fact (a symptom, a medicine and dose, a reading, what the doctor said) is filed on its own, linked to older history where it fits, and saved to Walrus under your key.</p>
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

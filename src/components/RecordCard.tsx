"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { formatKey } from "@/lib/session";
import s from "./RecordCard.module.css";

export function useQr(text: string | null, dark = "#1f2428") {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!text) return;
    QRCode.toDataURL(text, { margin: 1, width: 360, color: { dark, light: "#00000000" }, errorCorrectionLevel: "M" }).then(setSrc).catch(() => setSrc(null));
  }, [text, dark]);
  return src;
}

export default function RecordCard({ recordKey }: { recordKey: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const url = origin ? `${origin}/open#k=${recordKey}` : null;
  const qr = useQr(url);
  const copy = () => navigator.clipboard.writeText(formatKey(recordKey)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); });
  return (
    <figure className={s.card}>
      <div className={s.qr}>{qr ? <img src={qr} alt="QR code that opens this record on another device" /> : null}</div>
      <div className={s.info}>
        <span className={s.cap}>Record key</span>
        <p className={`mono ${s.key}`}>{formatKey(recordKey)}</p>
        <p className={s.hint}>Scan the code or type the key to open this record on another device. Anyone with it can read the record.</p>
        <div className={s.actions}>
          <button onClick={copy}>{copied ? "Copied" : "Copy key"}</button>
          {qr && <a href={qr} download="anamnesis-record-card.png">Save QR</a>}
        </div>
      </div>
    </figure>
  );
}

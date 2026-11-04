"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Mark } from "./Icons";
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
      <div className={s.top}>
        <Mark size={26} />
        <span className="display">Record card</span>
      </div>
      <div className={s.body}>
        <div className={s.qr}>{qr ? <img src={qr} alt="QR code that opens this record on another device" /> : null}</div>
        <div>
          <p className={s.cap}>Record key</p>
          <button className={`mono ${s.key}`} onClick={copy} title="Copy key">{formatKey(recordKey)}</button>
          <p className={s.hint}>{copied ? "Copied." : "Scan or type this on any device to open your record. Anyone holding it can read the record, and it can't be reissued."}</p>
        </div>
      </div>
      {qr && <a className={s.save} href={qr} download="anamnesis-record-card.png">Save the QR image</a>}
    </figure>
  );
}

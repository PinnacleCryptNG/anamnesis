"use client";
import { useState } from "react";
import { Kind } from "./Entry";
import u from "./ui.module.css";
import s from "./Refs.module.css";

export type Source = { n: number; blobId: string; kind: string; date: string; body: string };

export default function Refs({ refs, sources }: { refs: number[]; sources: Source[] }) {
  const [open, setOpen] = useState(false);
  const hits = refs.map((r) => sources.find((x) => x.n === r)).filter(Boolean) as Source[];
  if (!hits.length) return null;
  return (
    <span className={s.wrap}>
      <button className={u.refs + " " + s.btn} onClick={() => setOpen((v) => !v)} aria-expanded={open} title="Show the memories this rests on">
        [{hits.map((h) => h.n).join(",")}]
      </button>
      {open && (
        <span className={s.pop} role="note">
          {hits.map((h) => (
            <span key={h.n} className={s.src}>
              <span className="mono">{h.date}</span> <Kind kind={h.kind} /> {h.body}
              <a className="mono" href={`https://walruscan.com/mainnet/blob/${h.blobId}`} target="_blank" rel="noreferrer">walrus {h.blobId.slice(0, 6)}</a>
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

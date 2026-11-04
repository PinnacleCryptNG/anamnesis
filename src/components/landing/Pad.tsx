"use client";
import { useEffect, useState } from "react";
import s from "./landing.module.css";

const NOTE = "Two weeks on topiramate 50mg. Tingling in my fingers, struggling to find words at work. Headaches down to twice a week.";
const CARDS = [
  { kind: "medication", date: "08-07", text: "Topiramate raised to 50 mg at night." },
  { kind: "reaction", date: "08-29", text: "Word-finding trouble since the 50 mg dose." },
  { kind: "symptom", date: "08-29", text: "Headaches down to 1–2 days a week." },
];

export default function Pad() {
  const [n, setN] = useState(0);
  const [cycle, setCycle] = useState(0);
  const typed = n >= NOTE.length;
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(NOTE.length); return; }
    if (!typed) { const t = setTimeout(() => setN((v) => v + 1), 34); return () => clearTimeout(t); }
    const t = setTimeout(() => { setN(0); setCycle((c) => c + 1); }, 9000);
    return () => clearTimeout(t);
  }, [n, typed]);

  return (
    <div className={s.padScene} aria-label="A note being filed into separate dated memories">
      <div className={s.pad}>
        <div className={s.padTop}><span className="mono">Aug 29</span><span className="mono">Note 6 of 6</span></div>
        <p className={s.padText}>
          {NOTE.slice(0, n)}
          <span className={s.caret} data-on={!typed} />
        </p>
      </div>
      <div className={s.cards} key={cycle} data-in={typed}>
        {CARDS.map((c, i) => (
          <div key={c.text} className={s.card} style={{ "--i": i, "--k": `var(--k-${c.kind})` } as React.CSSProperties}>
            <span className={`mono ${s.cardDate}`}>2026-{c.date}</span>
            <span className={s.cardKind}>{c.kind}</span>
            <p>{c.text}</p>
          </div>
        ))}
        <svg className={s.pencil} viewBox="0 0 120 210" aria-hidden>
          <path d="M14 30 C 96 34, 104 92, 22 104" />
          <text x="62" y="70">pattern</text>
        </svg>
      </div>
    </div>
  );
}

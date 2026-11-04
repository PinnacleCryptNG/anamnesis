import type { Snapshot } from "@/lib/clinical";
import type { Card } from "@/lib/record";
import s from "./EmergencyCard.module.css";

export default function EmergencyCard({ card, snap, qr }: { card: Card; snap: Snapshot | null; qr?: string | null }) {
  return (
    <article className={s.card}>
      <header className={s.head}>
        <span className={s.cross} aria-hidden />
        <div>
          <span className={s.cap}>Medical information</span>
          <h2 className="display">{card.name || "Name not given"}</h2>
          <span className="mono">{[card.born && `born ${/^\d{4}-\d{2}-\d{2}$/.test(card.born) ? new Date(card.born + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : card.born}`, card.blood && `blood ${card.blood}`].filter(Boolean).join(" · ")}</span>
        </div>
        {qr && <img className={s.qr} src={qr} alt="QR code that opens this card" />}
      </header>
      <section className={s.allergy}>
        <h3>Allergies</h3>
        {snap?.allergies.length ? <ul>{snap.allergies.map((a, i) => <li key={i}>{a.text}</li>)}</ul> : <p>None recorded</p>}
      </section>
      <div className={s.cols}>
        <section>
          <h3>Takes</h3>
          {snap?.medications.length ? <ul>{snap.medications.map((m, i) => <li key={i}><b>{m.name}</b> {m.dose}</li>)}</ul> : <p>Nothing recorded</p>}
        </section>
        <section>
          <h3>Conditions</h3>
          {snap?.conditions.length ? <ul>{snap.conditions.map((c, i) => <li key={i}>{c.text}</li>)}</ul> : <p>Nothing recorded</p>}
        </section>
      </div>
      {(card.contact || card.notes) && (
        <footer className={s.foot}>
          {card.contact && <p><span className={s.cap}>In an emergency call</span>{card.contact}</p>}
          {card.notes && <p><span className={s.cap}>Notes</span>{card.notes}</p>}
        </footer>
      )}
    </article>
  );
}

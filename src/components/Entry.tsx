import s from "./Entry.module.css";

export type EntryT = { blobId: string; kind: string; date: string; body: string; n?: number };

export function Kind({ kind }: { kind: string }) {
  return (
    <span className={s.kind} style={{ "--k": `var(--k-${kind}, var(--k-note))` } as React.CSSProperties}>
      {kind}
    </span>
  );
}

export function EntryList({ entries, fresh, numbered }: { entries: EntryT[]; fresh?: Set<string>; numbered?: boolean }) {
  return (
    <ol className={s.list}>
      {entries.map((e, i) => (
        <li key={e.blobId + i} className={s.item} style={{ "--i": i } as React.CSSProperties}>
          <span className={`mono ${s.date}`}>{numbered ? `[${e.n}] ` : ""}{e.date}</span>
          <span className={fresh?.has(e.body) ? s.fresh : undefined}>
            <Kind kind={e.kind} />
            <span className={e.kind === "pattern" ? s.pattern : undefined}>{e.body}</span>
            <span className={`mono ${s.ref}`} title={`Walrus blob ${e.blobId}`}>{e.blobId.slice(0, 8)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

const TAG: Record<string, string> = { clinician: "doctor", measurement: "reading", followup: "follow-up" };

export function Tag({ kind }: { kind: string }) {
  return (
    <span className={s.tag} style={{ "--k": `var(--k-${kind}, var(--k-note))` } as React.CSSProperties}>
      {TAG[kind] ?? kind}
    </span>
  );
}

import { EntryList, type EntryT } from "./Entry";
import s from "./BriefView.module.css";

type Cited = { text: string; refs: number[] };
export type BriefT = { headline: string; sinceLast: Cited[]; medications: Cited[]; patterns: Cited[]; questions: Cited[]; watch: Cited[]; gaps: string[] };

const SECTIONS: [keyof BriefT, string][] = [
  ["sinceLast", "Since last time"],
  ["medications", "Medications now"],
  ["patterns", "Patterns across visits"],
  ["questions", "Questions to ask"],
  ["watch", "Raise with the clinician"],
];

export default function BriefView({ brief, sources }: { brief: BriefT; sources: (EntryT & { n: number })[] }) {
  const byN = new Map(sources.map((x) => [x.n, x]));
  return (
    <article>
      <p className={s.headline}>{brief.headline}</p>
      {SECTIONS.map(([k, label], i) => {
        const items = (brief[k] as Cited[]) || [];
        if (!items.length) return null;
        return (
          <section key={k} className={`${s.block} ${k === "watch" ? s.watch : ""}`} style={{ "--i": i } as React.CSSProperties}>
            <h3>{label}</h3>
            <ul>
              {items.map((it, j) => (
                <li key={j}>
                  {it.text}
                  {it.refs?.length ? (
                    <span className={s.refs} title={it.refs.map((r) => byN.get(r)?.body).filter(Boolean).join("\n")}>[{it.refs.join(",")}]</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {brief.gaps?.length ? (
        <section className={s.block} style={{ "--i": 6 } as React.CSSProperties}>
          <h3>Not in the record yet</h3>
          <ul>{brief.gaps.map((g, j) => <li key={j}>{g}</li>)}</ul>
        </section>
      ) : null}
      <details className={s.sources}>
        <summary>{sources.length} memories recalled</summary>
        <EntryList entries={sources} numbered />
      </details>
    </article>
  );
}

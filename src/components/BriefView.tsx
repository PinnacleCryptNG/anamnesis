import { EntryList, type EntryT } from "./Entry";
import Refs from "./Refs";
import { asCited, plain, type Cited } from "@/lib/cite";
import s from "./BriefView.module.css";

export type BriefT = { headline: string; sinceLast: Cited[]; medications: Cited[]; patterns: Cited[]; questions: Cited[]; watch: Cited[]; gaps: string[] };

const SECTIONS: [keyof BriefT, string][] = [
  ["sinceLast", "Since last time"],
  ["medications", "Medications now"],
  ["patterns", "Patterns across visits"],
  ["questions", "Questions to ask"],
  ["watch", "Raise with the clinician"],
];

export default function BriefView({ brief, sources }: { brief: BriefT; sources: (EntryT & { n: number })[] }) {
  return (
    <article>
      <p className={s.headline}>{plain(brief.headline)}</p>
      {SECTIONS.map(([k, label], i) => {
        const items = asCited(brief[k]);
        if (!items.length) return null;
        return (
          <section key={k} className={`${s.block} ${k === "watch" ? s.watch : ""}`} style={{ "--i": i } as React.CSSProperties}>
            <h3>{label}</h3>
            <ul>
              {items.map((it, j) => (
                <li key={j}>
                  {it.text}
                  <Refs refs={it.refs} sources={sources} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {asCited(brief.gaps).length ? (
        <section className={s.block} style={{ "--i": 6 } as React.CSSProperties}>
          <h3>Not in the record yet</h3>
          <ul>{asCited(brief.gaps).map((g, j) => <li key={j}>{g.text}</li>)}</ul>
        </section>
      ) : null}
      <details className={s.sources}>
        <summary>{sources.length} memories recalled</summary>
        <EntryList entries={sources} numbered />
      </details>
    </article>
  );
}

import { asCited, asList, asRefs, asText, type Cited } from "./cite";

export type Med = { name: string; dose: string; since?: string; note?: string; refs: number[] };
export type Snapshot = {
  headline: string;
  medications: Med[];
  followups: { text: string; due?: string; refs: number[] }[];
  allergies: Cited[];
  conditions: Cited[];
  lastVisit: { text: string; date?: string; refs: number[] } | null;
  watch: Cited[];
};

export const SNAPSHOT_SYSTEM = `You keep the front page of a patient's own medical record. From the numbered record lines, state where things stand today.
Every item cites the line numbers it rests on in "refs". Never invent, diagnose or advise. Prefer the latest line when lines disagree (a stopped drug is not current).
Fields:
- headline: one calm sentence on where things stand, under 22 words, written to the patient ("you").
- medications: what the patient takes now: name, dose (with units and frequency), since (YYYY-MM-DD if known), note (short, e.g. "raised from 25mg"). Exclude stopped drugs.
- followups: things still open: tests due, referrals, return visits, things to monitor. due = YYYY-MM-DD or short phrase if known.
- allergies: drug or other allergies and serious reactions that a stranger treating the patient must know.
- conditions: diagnoses and long-running conditions, plain words.
- lastVisit: the most recent clinician contact: text (who and what they said, one sentence), date.
- watch: at most 2 things worth raising at the next visit.
Keep each text under 24 words. Empty arrays and null are fine.
Exact shape:
{"headline":"…","medications":[{"name":"…","dose":"…","since":"YYYY-MM-DD","note":"…","refs":[1]}],"followups":[{"text":"…","due":"…","refs":[2]}],"allergies":[{"text":"Penicillin: hives","refs":[3]}],"conditions":[{"text":"…","refs":[4]}],"lastVisit":{"text":"…","date":"YYYY-MM-DD","refs":[5]},"watch":[{"text":"…","refs":[6]}]}`;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export function normalizeSnapshot(raw: unknown): Snapshot {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const lv = o.lastVisit as Record<string, unknown> | null | undefined;
  return {
    headline: asText(o.headline),
    medications: asList<Record<string, unknown>>(o.medications)
      .map((m) => ({ name: asText(m.name ?? m.drug ?? m), dose: asText(m.dose), since: str(m.since), note: str(m.note), refs: asRefs(m) }))
      .filter((m) => m.name),
    followups: asList<Record<string, unknown>>(o.followups)
      .map((f) => ({ text: asText(f), due: str((f as Record<string, unknown>)?.due), refs: asRefs(f) }))
      .filter((f) => f.text),
    allergies: asCited(o.allergies),
    conditions: asCited(o.conditions),
    lastVisit: lv && asText(lv) ? { text: asText(lv.text ?? lv), date: str(lv.date), refs: asRefs(lv) } : null,
    watch: asCited(o.watch),
  };
}

export type Segment = { dose: string; start: string; end?: string | null; refs: number[] };
export type Clinical = {
  summary: string;
  medications: { name: string; status: "current" | "stopped"; segments: Segment[] }[];
  changes: Cited[];
  flags: Cited[];
  questions: Cited[];
  allergies: Cited[];
  measurements: Cited[];
};

export const CLINICAL_SYSTEM = `You prepare the clinician's view of a patient-kept record they were given access to.
The reader is a doctor with five minutes. Every item cites the numbered record lines in "refs". Do not invent or diagnose; say what the patient recorded.
Fields:
- summary: two sentences: who this is clinically and what is active now.
- medications: one entry per drug ever recorded. status current|stopped. segments in date order, each a period at one dose: dose (units and frequency), start (YYYY-MM-DD), end (YYYY-MM-DD or null if ongoing), refs.
- changes: what changed most recently (dose changes, new symptoms, new results), newest first.
- flags: reactions, side effects, red-flag symptoms, possible interactions or limits exceeded, phrased neutrally.
- questions: what the patient wants answered or the record leaves open.
- allergies: allergies and adverse drug reactions.
- measurements: readings and lab values with dates, newest first.
Max 6 items per list, each under 26 words.
Exact shape:
{"summary":"…","medications":[{"name":"…","status":"current","segments":[{"dose":"…","start":"YYYY-MM-DD","end":null,"refs":[1]}]}],"changes":[{"text":"…","refs":[2]}],"flags":[{"text":"…","refs":[3]}],"questions":[{"text":"…","refs":[4]}],"allergies":[{"text":"…","refs":[5]}],"measurements":[{"text":"…","refs":[6]}]}`;

export function normalizeClinical(raw: unknown): Clinical {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    summary: asText(o.summary),
    medications: asList<Record<string, unknown>>(o.medications)
      .map((m) => ({
        name: asText(m.name ?? m.drug),
        status: (m.status === "stopped" ? "stopped" : "current") as "current" | "stopped",
        segments: asList<Record<string, unknown>>(m.segments)
          .map((g) => ({ dose: asText(g.dose), start: str(g.start) ?? "", end: str(g.end) ?? null, refs: asRefs(g) }))
          .filter((g) => /^\d{4}-\d{2}-\d{2}/.test(g.start)),
      }))
      .filter((m) => m.name),
    changes: asCited(o.changes),
    flags: asCited(o.flags),
    questions: asCited(o.questions),
    allergies: asCited(o.allergies),
    measurements: asCited(o.measurements),
  };
}

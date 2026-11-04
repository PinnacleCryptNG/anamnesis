export type Cited = { text: string; refs: number[] };

type Loose = string | { text?: unknown; item?: unknown; refs?: unknown };

const PRIMARY = ["text", "item", "name", "substance", "title", "summary"];

export const asText = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (v == null) return "";
  if (typeof v !== "object") return String(v);
  const o = v as Record<string, unknown>;
  const key = PRIMARY.find((k) => typeof o[k] === "string" && o[k]);
  const rest = Object.entries(o)
    .filter(([k, x]) => k !== key && k !== "refs" && k !== "due" && k !== "date" && typeof x === "string" && x)
    .map(([, x]) => x as string);
  return [key ? (o[key] as string) : "", ...rest].filter(Boolean).join(" — ");
};

export const asRefs = (v: unknown): number[] =>
  v && typeof v === "object" && Array.isArray((v as { refs?: unknown }).refs)
    ? ((v as { refs: unknown[] }).refs.map(Number).filter(Number.isFinite) as number[])
    : [];

export const asCited = (v: unknown): Cited[] =>
  Array.isArray(v) ? v.map((x: Loose) => ({ text: asText(x), refs: asRefs(x) })).filter((c) => c.text) : [];

export const asList = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

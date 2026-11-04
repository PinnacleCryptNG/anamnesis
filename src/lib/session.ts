"use client";
import { useSyncExternalStore } from "react";

const RECORD = "anamnesis-record";
const MODE = "anamnesis-mode";
const OWN = "anamnesis-own";
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export type Mode = "mine" | "sample" | "none";
export type Session = { mode: Mode; key: string | null; own: { accountId: string; key: string } | null };

export const formatKey = (k: string) => k.match(/.{1,4}/g)?.join("-") ?? k;
export const normKey = (k: string) => k.toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/[IL]/g, "1").replace(/O/g, "0").replace(/U/g, "V");
export const validKey = (k: string) => /^[0-9A-HJKMNP-TV-Z]{20}$/.test(normKey(k));

export function newKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (b) => ALPHABET[b & 31]).join("");
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let cached: Session | null = null;
let cachedRaw = "";

function read(): Session {
  const raw = [localStorage.getItem(RECORD), localStorage.getItem(MODE), localStorage.getItem(OWN)].join("|");
  if (cached && raw === cachedRaw) return cached;
  const key = localStorage.getItem(RECORD);
  let own: Session["own"] = null;
  try {
    own = JSON.parse(localStorage.getItem(OWN) || "null");
  } catch {}
  const mode = (localStorage.getItem(MODE) as Mode) || (key ? "mine" : "none");
  cachedRaw = raw;
  cached = { mode: mode === "mine" && !key && !own ? "none" : mode, key, own };
  return cached;
}
const SERVER: Session = { mode: "none", key: null, own: null };

export function useSession(): Session | null {
  const s = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      window.addEventListener("storage", cb);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", cb);
      };
    },
    read,
    () => SERVER,
  );
  return useHydrated() ? s : null;
}

const noop = () => () => {};
function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

export function openRecord(key: string) {
  localStorage.setItem(RECORD, normKey(key));
  localStorage.setItem(MODE, "mine");
  emit();
}
export function chooseSample() {
  localStorage.setItem(MODE, "sample");
  emit();
}
export function chooseMine() {
  localStorage.setItem(MODE, "mine");
  emit();
}
export function setOwn(own: Session["own"]) {
  if (own) localStorage.setItem(OWN, JSON.stringify(own));
  else localStorage.removeItem(OWN);
  emit();
}
export function forgetRecord() {
  localStorage.removeItem(RECORD);
  localStorage.removeItem(MODE);
  localStorage.removeItem(OWN);
  emit();
}

export function recordHeaders(): Record<string, string> {
  const s = read();
  const h: Record<string, string> = {};
  if (s.mode !== "mine") return h;
  if (s.key) h["x-record"] = s.key;
  if (s.own) {
    h["x-memwal-account"] = s.own.accountId;
    h["x-memwal-key"] = s.own.key;
  }
  return h;
}

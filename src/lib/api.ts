"use client";
import { recordHeaders } from "./session";

type Res<T> = T & { error?: string; reason?: string };

async function send<T>(url: string, init: RequestInit): Promise<Res<T>> {
  try {
    const r = await fetch(url, {
      ...init,
      headers: { ...(init.body ? { "content-type": "application/json" } : {}), ...recordHeaders(), ...(init.headers || {}) },
    });
    const data = await r.json().catch(() => ({ error: `The server answered ${r.status}.` }));
    return data as Res<T>;
  } catch (e) {
    return { error: String(e) } as Res<T>;
  }
}

export const post = <T = Record<string, unknown>>(url: string, body?: unknown) =>
  send<T>(url, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const get = <T = Record<string, unknown>>(url: string) => send<T>(url, { method: "GET", cache: "no-store" });

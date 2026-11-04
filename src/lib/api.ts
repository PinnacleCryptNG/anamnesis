"use client";

const KEY = "anamnesis-passcode";

export async function post<T = Record<string, unknown>>(url: string, body?: unknown): Promise<T & { error?: string }> {
  const send = () =>
    fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-passcode": localStorage.getItem(KEY) || "" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  try {
    let r = await send();
    if (r.status === 401 && (await r.clone().json().catch(() => ({}))).error === "passcode") {
      const code = window.prompt("This record is private. Passcode:");
      if (!code) return { error: "Passcode needed to write to this record." } as T & { error: string };
      localStorage.setItem(KEY, code);
      r = await send();
    }
    return (await r.json()) as T & { error?: string };
  } catch (e) {
    return { error: String(e) } as T & { error: string };
  }
}

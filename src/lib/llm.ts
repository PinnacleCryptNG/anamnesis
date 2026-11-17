import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const KEY = process.env.LLM_API_KEY;
const GEMINI = process.env.LLM_PROVIDER === "google" || /^(AIza|AQ\.)/.test(KEY ?? "");
const MODEL = process.env.LLM_MODEL || "claude-sonnet-4-6";
const GEMINI_MODELS = process.env.LLM_MODEL ? [process.env.LLM_MODEL] : ["gemini-3-flash-preview", "gemini-3.1-flash-lite"];
let anthropic: Anthropic | null = null;

function ai() {
  if (!anthropic) {
    if (!KEY) throw new Error("LLM_API_KEY is not set");
    anthropic = new Anthropic({ apiKey: KEY });
  }
  return anthropic;
}

export type Img = { mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string };

async function gemini(system: string, user: string, maxTokens: number, images: Img[], json = false): Promise<string> {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [
      {
        role: "user",
        parts: [...images.map((im) => ({ inlineData: { mimeType: im.mediaType, data: im.data } })), { text: user }],
      },
    ],
    generationConfig: { maxOutputTokens: Math.max(maxTokens * 4, 16384), thinkingConfig: { thinkingLevel: "low" }, ...(json ? { responseMimeType: "application/json" } : {}) },
  });
  let last = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const model of GEMINI_MODELS) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": KEY! },
        body,
      });
      if (res.ok) {
        const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
        const parts = json.candidates?.[0]?.content?.parts ?? [];
        return parts.filter((p) => !p.thought).map((p) => p.text ?? "").join("").trim();
      }
      last = `${res.status} ${await res.text()}`;
      if (res.status !== 429 && res.status < 500) throw new Error(last);
    }
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  throw new Error(last);
}

export async function complete(system: string, user: string, maxTokens = 1800, images: Img[] = []): Promise<string> {
  if (GEMINI) return gemini(system, user, maxTokens, images);
  const res = await ai().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [
      {
        role: "user",
        content: [
          ...images.map((im) => ({ type: "image" as const, source: { type: "base64" as const, media_type: im.mediaType, data: im.data } })),
          { type: "text" as const, text: user },
        ],
      },
    ],
  });
  return res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
}

export async function completeJson<T>(system: string, user: string, maxTokens = 1800, images: Img[] = []): Promise<T> {
  const sys = system + "\n\nRespond with a single JSON object only. No prose, no code fences.";
  const text = GEMINI ? await gemini(sys, user, maxTokens, images, true) : await complete(sys, user, maxTokens, images);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Model did not return JSON");
  return JSON.parse(text.slice(start, end + 1)) as T;
}

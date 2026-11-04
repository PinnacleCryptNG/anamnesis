import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.LLM_MODEL || "claude-sonnet-4-6";
let anthropic: Anthropic | null = null;

function ai() {
  if (!anthropic) {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) throw new Error("LLM_API_KEY is not set");
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

export type Img = { mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string };

export async function complete(system: string, user: string, maxTokens = 1800, images: Img[] = []): Promise<string> {
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
  const text = await complete(
    system + "\n\nRespond with a single JSON object only. No prose, no code fences.",
    user,
    maxTokens,
    images,
  );
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Model did not return JSON");
  return JSON.parse(text.slice(start, end + 1)) as T;
}

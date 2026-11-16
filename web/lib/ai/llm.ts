import { ApiError, GoogleGenAI, ThinkingLevel, type Content, type FunctionCall, type FunctionDeclaration } from "@google/genai";

export const MODEL_MAIN = () => process.env.LLM_MODEL_MAIN || "";
export const MODEL_LITE = () => process.env.LLM_MODEL_LITE || "";

let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI | null {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return null;
  // SDK 3.x defaults to API v1, where the preview and "-latest" models don't exist (404); they live on v1beta
  client ??= new GoogleGenAI({ apiKey, apiVersion: process.env.LLM_API_VERSION || "v1beta" });
  return client;
}

export type LLMOk = { ok: true; text: string; functionCalls: FunctionCall[]; modelContent: Content | null };
export type LLMFail = { ok: false; reason: "not_configured" | "rate_limited" | "error"; detail?: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One model call. On 429 it waits and retries once; any other failure (or a second 429)
 * comes back as { ok: false } so the caller can hand the chat to a human.
 */
export async function askLLM(opts: {
  model: string;
  system: string;
  contents: Content[];
  tools?: FunctionDeclaration[];
  temperature?: number;
  json?: { schema: unknown };
}): Promise<LLMOk | LLMFail> {
  const genai = ai();
  if (!genai) return { ok: false, reason: "not_configured", detail: "LLM_API_KEY is not set" };

  const TRIES = 3;
  for (let attempt = 0; attempt < TRIES; attempt++) {
    try {
      const res = await genai.models.generateContent({
        model: opts.model,
        contents: opts.contents,
        config: {
          systemInstruction: opts.system,
          temperature: opts.temperature ?? 0.2,
          abortSignal: AbortSignal.timeout(30_000),
          // Newer models think at "high" by default; support replies need speed more than depth
          ...(/-3-|latest/.test(opts.model) ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
          ...(opts.tools?.length ? { tools: [{ functionDeclarations: opts.tools }] } : {}),
          ...(opts.json ? { responseMimeType: "application/json", responseJsonSchema: opts.json.schema } : {}),
        },
      });
      return {
        ok: true,
        text: (res.text ?? "").trim(),
        functionCalls: res.functionCalls ?? [],
        modelContent: res.candidates?.[0]?.content ?? null,
      };
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      // rate limits and "high demand" overloads are usually gone a few seconds later
      if ((status === 429 || status === 500 || status === 503) && attempt < TRIES - 1) {
        await sleep((attempt + 1) * 2000 + Math.random() * 1000);
        continue;
      }
      console.error("[llm] call failed", status, err instanceof Error ? err.message : err);
      return { ok: false, reason: status === 429 ? "rate_limited" : "error", detail: err instanceof Error ? err.message : String(err) };
    }
  }
  return { ok: false, reason: "rate_limited" };
}

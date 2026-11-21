import { ApiError, GoogleGenAI, ThinkingLevel, type Content, type FunctionCall, type FunctionDeclaration } from "@google/genai";

export const MODEL_MAIN = () => process.env.LLM_MODEL_MAIN || "";
export const MODEL_LITE = () => process.env.LLM_MODEL_LITE || "";

// LLM_API_KEY takes one key or several, comma separated. When a key hits its rate limit or quota
// (or is rejected), the call moves on to the next key; when every key fails the caller hands the chat to a person.
const keys = () => (process.env.LLM_API_KEY ?? "").split(",").map((k) => k.trim()).filter(Boolean);
const clients = new Map<string, GoogleGenAI>();
function clientFor(apiKey: string): GoogleGenAI {
  let c = clients.get(apiKey);
  if (!c) {
    // SDK 3.x defaults to API v1, where the preview and "-latest" models don't exist (404); they live on v1beta
    c = new GoogleGenAI({ apiKey, apiVersion: process.env.LLM_API_VERSION || "v1beta" });
    clients.set(apiKey, c);
  }
  return c;
}

const COOLDOWN_MS = 60_000; // per-minute limits reset within a minute; a spent daily quota just fails fast again
const coolUntil = new Map<string, number>();
let current = 0; // index of the key that last worked, so calls stick to one key until it runs out

// 429 = rate limit or quota; 401/403 or an "API key" error = key revoked or invalid. Another key can help with these.
const keyProblem = (status: number, message: string) =>
  status === 429 || status === 401 || status === 403 || /api[ _]?key/i.test(message);

export type LLMOk = { ok: true; text: string; functionCalls: FunctionCall[]; modelContent: Content | null };
export type LLMFail = { ok: false; reason: "not_configured" | "rate_limited" | "error"; detail?: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Opts = {
  model: string;
  system: string;
  contents: Content[];
  tools?: FunctionDeclaration[];
  temperature?: number;
  json?: { schema: unknown };
};

/**
 * One model call. Tries the keys in turn, starting with the one that last worked and leaving keys that
 * recently hit a limit for last. Any failure that another key can't fix, or every key failing, comes back
 * as { ok: false } so the caller can hand the chat to a human.
 */
export async function askLLM(opts: Opts): Promise<LLMOk | LLMFail> {
  const all = keys();
  if (!all.length) return { ok: false, reason: "not_configured", detail: "LLM_API_KEY is not set" };

  const now = Date.now();
  const cooling = (k: string) => (coolUntil.get(k) ?? 0) > now;
  const order = all.map((_, i) => all[(current + i) % all.length]!);
  order.sort((a, b) => Number(cooling(a)) - Number(cooling(b))); // stable: keeps rotation order within each group

  let last: LLMFail = { ok: false, reason: "rate_limited" };
  for (const key of order) {
    const res = await callOnce(clientFor(key), opts, all.length === 1);
    if (res.ok) {
      current = all.indexOf(key);
      coolUntil.delete(key);
      return res;
    }
    if (!res.keyProblem) return res.fail;
    coolUntil.set(key, Date.now() + COOLDOWN_MS);
    console.warn(`[llm] key ${all.indexOf(key) + 1} of ${all.length} failed (${res.fail.detail?.slice(0, 120)}), trying the next`);
    last = res.fail;
  }
  return last;
}

/** One key: retries brief overloads (500/503); a 429 is retried only when there is no other key to move to. */
async function callOnce(genai: GoogleGenAI, opts: Opts, onlyKey: boolean): Promise<LLMOk | { ok: false; keyProblem: boolean; fail: LLMFail }> {
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
      const message = err instanceof Error ? err.message : String(err);
      const retry = status === 500 || status === 503 || (status === 429 && onlyKey);
      // overloads ("high demand") are usually gone a few seconds later
      if (retry && attempt < TRIES - 1) {
        await sleep((attempt + 1) * 2000 + Math.random() * 1000);
        continue;
      }
      console.error("[llm] call failed", status, message);
      return {
        ok: false,
        keyProblem: keyProblem(status, message),
        fail: { ok: false, reason: status === 429 ? "rate_limited" : "error", detail: message },
      };
    }
  }
  return { ok: false, keyProblem: true, fail: { ok: false, reason: "rate_limited" } };
}

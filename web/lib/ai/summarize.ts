import { sql } from "../db";
import { askLLM, MODEL_LITE } from "./llm";

export type Summary = { issue: string; bot_tried: string; buyer_details: string };

const SCHEMA = {
  type: "object",
  properties: {
    issue: { type: "string", description: "What the customer needs, one sentence, in English." },
    bot_tried: { type: "string", description: "What the assistant already answered or tried, one sentence. 'Nothing yet' if nothing." },
    buyer_details: { type: "string", description: "Order IDs, product names, emails or phone numbers the customer gave. 'None given' if none." },
  },
  required: ["issue", "bot_tried", "buyer_details"],
};

/** Handoff summary for the agent, made with the Lite model. Falls back to the last buyer message. */
export async function summarizeConversation(conversationId: string, reason: string): Promise<Summary> {
  const turns = (
    await sql<{ role: string; text: string }[]>`
      select sender_role as role, text from messages where conversation_id = ${conversationId}
      order by created_at desc limit 30
    `
  ).reverse();
  const lastBuyer = [...turns].reverse().find((t) => t.role === "buyer")?.text ?? "";
  const fallback: Summary = { issue: lastBuyer.slice(0, 200) || "Customer asked for help.", bot_tried: "See the chat.", buyer_details: "See the chat." };
  if (!turns.length) return fallback;

  const transcript = turns.map((t) => `${t.role === "buyer" ? "Customer" : t.role === "bot" ? "Assistant" : "Agent"}: ${t.text}`).join("\n");
  const res = await askLLM({
    model: MODEL_LITE(),
    system: "You write handoff notes for a human support agent. Be factual and short. Never invent details.",
    contents: [{ role: "user", parts: [{ text: `Escalation reason: ${reason}\n\nTranscript:\n${transcript.slice(-12_000)}` }] }],
    json: { schema: SCHEMA },
    temperature: 0,
  });
  if (!res.ok) return fallback;
  try {
    const s = JSON.parse(res.text) as Partial<Summary>;
    return {
      issue: String(s.issue || fallback.issue).slice(0, 300),
      bot_tried: String(s.bot_tried || fallback.bot_tried).slice(0, 300),
      buyer_details: String(s.buyer_details || fallback.buyer_details).slice(0, 300),
    };
  } catch {
    return fallback;
  }
}

import { sql } from "../db";
import { askLLM, MODEL_LITE } from "./llm";

export type Learned = { question: string; answer: string; is_policy: boolean; confidence: number; duplicate_of: number | null };

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string", description: "A general customer question, phrased so it applies to other customers. No names, order IDs, emails or phone numbers." },
          answer: { type: "string", description: "The human agent's answer, rewritten as a general reusable answer. No personal data." },
          is_policy: { type: "boolean", description: "true only for reusable business facts or policy (shipping, returns, hours, pricing rules). false for one-off order status or personal situations." },
          confidence: { type: "number", description: "0 to 1: how sure you are this is a correct, reusable answer stated by the agent." },
          duplicate_of: { anyOf: [{ type: "integer" }, { type: "null" }], description: "Number of an existing entry that already answers this question, or null." },
        },
        required: ["question", "answer", "is_policy", "confidence", "duplicate_of"],
      },
    },
  },
  required: ["items"],
};

export const MIN_CONFIDENCE = 0.6;

/** Keeps only reusable policy answers above the confidence bar (PLAN.md: policy && confidence > 0.6). */
export function keepLearned(items: Learned[]): Learned[] {
  return items.filter(
    (i) => i.is_policy === true && typeof i.confidence === "number" && i.confidence > MIN_CONFIDENCE && i.question?.trim() && i.answer?.trim(),
  );
}

/**
 * After an agent resolves a chat: turn what the agent taught into suggested Q&A entries for the owner to approve.
 * Only the agent's statements count as knowledge; the bot's own replies are never re-learned.
 */
export async function learnFromConversation(conversationId: string): Promise<number> {
  const [conv] = await sql<{ id: string; business_id: string }[]>`select id, business_id from conversations where id = ${conversationId}`;
  if (!conv) return 0;
  const turns = (
    await sql<{ role: string; text: string }[]>`
      select sender_role as role, text from messages where conversation_id = ${conv.id} order by created_at limit 200
    `
  );
  if (!turns.some((t) => t.role === "agent")) return 0;

  const existing = await sql<{ id: string; title: string }[]>`
    select id, title from knowledge_items
    where business_id = ${conv.business_id} and source in ('qa', 'learned') and title <> ''
    order by updated_at desc limit 300
  `;
  const transcript = turns.map((t) => `${t.role === "buyer" ? "Customer" : t.role === "bot" ? "Assistant" : "Human agent"}: ${t.text}`).join("\n");
  const known = existing.map((e, i) => `${i + 1}. ${e.title}`).join("\n") || "(none)";

  const res = await askLLM({
    model: MODEL_LITE(),
    system:
      "You extract reusable support knowledge from a resolved chat. Only use facts the HUMAN AGENT stated. " +
      "Skip greetings, one-off order details and anything personal. Write questions and answers in English. Return an empty list when nothing is reusable.",
    contents: [{ role: "user", parts: [{ text: `Existing Q&A questions:\n${known}\n\nTranscript:\n${transcript.slice(-16_000)}` }] }],
    json: { schema: SCHEMA },
    temperature: 0,
  });
  if (!res.ok) return 0;

  let items: Learned[] = [];
  try {
    items = (JSON.parse(res.text) as { items?: Learned[] }).items ?? [];
  } catch {
    return 0;
  }

  let n = 0;
  for (const i of keepLearned(items).slice(0, 5)) {
    const dup = typeof i.duplicate_of === "number" ? (existing[i.duplicate_of - 1]?.id ?? null) : null;
    await sql`
      insert into learned_suggestions (business_id, conversation_id, question, answer, duplicate_of)
      values (${conv.business_id}, ${conv.id}, ${i.question.trim().slice(0, 500)}, ${i.answer.trim().slice(0, 5000)}, ${dup})
    `;
    n++;
  }
  return n;
}

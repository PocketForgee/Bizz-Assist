// Q&A entries live in knowledge_items: title = question, content = answer.
export type QaRow = { id: string; question: string; answer: string; source: "qa" | "learned"; updated_at: Date };

// Q&A entries live in knowledge_items: title = question, content = answer, alternatives = other phrasings.
export type QaRow = { id: string; question: string; answer: string; alternatives: string[]; source: "qa" | "learned"; updated_at: Date };

export type KnowledgeRow = {
  id: string;
  source: "web" | "doc";
  title: string;
  url: string | null;
  status: "pending" | "syncing" | "ready" | "error";
  error: string | null;
  chars: number;
  updated_at: string;
};

export type LearnedRow = {
  id: string;
  conversation_id: string | null;
  question: string;
  answer: string;
  status: "pending" | "approved" | "rejected";
  duplicate_of: string | null;
  duplicate_title: string | null;
  created_at: string;
};

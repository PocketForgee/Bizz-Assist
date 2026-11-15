"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/client";
import type { QaRow } from "@/lib/qa";
import { Button, Card, Chip, EmptyState, Field, Input, Textarea } from "@/components/ui";
import { Sheet } from "@/components/sheet";

export type QaDraft = { id?: string; question: string; answer: string; alternatives: string[] };

/** Add / edit a Q&A entry. Also opened pre-filled from the Playground's "Fix this answer". */
export function QaSheet({ value, onClose, onSaved }: { value: QaDraft; onClose: () => void; onSaved: (row: QaRow) => void }) {
  const [q, setQ] = useState(value.question);
  const [a, setA] = useState(value.answer);
  const [alts, setAlts] = useState(value.alternatives.join("\n"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await api<{ item: QaRow }>(value.id ? `/api/qa/${value.id}` : "/api/qa", {
      method: value.id ? "PATCH" : "POST",
      body: { question: q, answer: a, alternatives: alts },
    });
    setBusy(false);
    if (!res.ok) return setError({ field: res.field, message: res.error });
    onSaved(res.data.item);
  }

  const err = (f: string) => (error?.field === f ? error.message : undefined);
  return (
    <Sheet
      title={value.id ? "Edit answer" : "Add Q&A"}
      onClose={onClose}
      onSubmit={submit}
      submitLabel="Save answer"
      busy={busy}
      error={error && !["question", "answer", "alternatives"].includes(error.field ?? "") ? error.message : null}
    >
      <Field label="Question" hint="Write it the way a customer would ask." error={err("question")}>
        {(p) => <Input {...p} value={q} maxLength={500} onChange={(e) => setQ(e.target.value)} />}
      </Field>
      <Field label="Other ways customers ask it" hint="Optional. One per line, e.g. “when will my parcel come”." error={err("alternatives")}>
        {(p) => <Textarea {...p} value={alts} onChange={(e) => setAlts(e.target.value)} className="min-h-20" />}
      </Field>
      <Field label="Answer" error={err("answer")}>
        {(p) => <Textarea {...p} value={a} maxLength={5000} onChange={(e) => setA(e.target.value)} className="min-h-48" />}
      </Field>
    </Sheet>
  );
}

export function QaTab({ initial, limit }: { initial: QaRow[]; limit: number }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<QaDraft | null>(null);
  const [query, setQuery] = useState("");
  const blank: QaDraft = { question: "", answer: "", alternatives: [] };

  const q = query.trim().toLowerCase();
  const shown = q ? items.filter((i) => `${i.question} ${i.answer} ${i.alternatives.join(" ")}`.toLowerCase().includes(q)) : items;

  async function remove(id: string) {
    if (!confirm("Delete this answer? The bot stops using it right away.")) return;
    const res = await api(`/api/qa/${id}`, { method: "DELETE" });
    if (res.ok) setItems((xs) => xs.filter((x) => x.id !== id));
    else alert(res.error);
  }

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-6 py-4">
        <div>
          <h2 className="t-body-strong">Q&amp;A</h2>
          <p className="t-caption text-ink-48">
            Exact answers the bot uses first. {items.length} of {limit} used.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {items.length > 5 && <Input type="search" aria-label="Search Q&A" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-56" />}
          <Button className="min-h-9 px-4" onClick={() => setEditing(blank)} disabled={items.length >= limit}>
            <Plus size={16} aria-hidden /> Add Q&amp;A
          </Button>
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState line="Add the questions customers ask most, like delivery times or returns." action={<Button onClick={() => setEditing(blank)}>Add Q&amp;A</Button>} />
      ) : (
        <ul className="divide-y divide-divider">
          {shown.map((i) => (
            <li key={i.id} className="row-in flex items-start gap-4 px-6 py-4">
              <div className="min-w-0 flex-1">
                <p className="t-body-strong">{i.question}</p>
                {i.alternatives.length > 0 && <p className="t-fine mt-0.5 truncate text-ink-48">Also: {i.alternatives.join(" · ")}</p>}
                <p className="t-caption mt-1 line-clamp-2 text-ink-80">{i.answer}</p>
              </div>
              {i.source === "learned" && <Chip tone="info">Learned</Chip>}
              <div className="flex shrink-0 gap-3">
                <button type="button" className="t-caption min-h-11 text-primary hover:underline" onClick={() => setEditing({ id: i.id, question: i.question, answer: i.answer, alternatives: i.alternatives })}>
                  Edit
                </button>
                <button type="button" className="t-caption min-h-11 text-danger hover:underline" onClick={() => remove(i.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
          {shown.length === 0 && <li className="t-caption px-6 py-8 text-center text-ink-48">No answers match “{query}”.</li>}
        </ul>
      )}
      {editing && (
        <QaSheet
          value={editing}
          onClose={() => setEditing(null)}
          onSaved={(row) => {
            setItems((xs) => (xs.some((x) => x.id === row.id) ? xs.map((x) => (x.id === row.id ? row : x)) : [row, ...xs]));
            setEditing(null);
          }}
        />
      )}
    </Card>
  );
}

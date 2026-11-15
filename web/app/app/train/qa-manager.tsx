"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { api } from "@/lib/client";
import type { QaRow } from "@/lib/qa";
import { Button, Card, Chip, EmptyState, Field, Input, SubNav, Textarea } from "@/components/ui";

type Editing = { id?: string; question: string; answer: string } | null;

export function QaManager({ initial, limit }: { initial: QaRow[]; limit: number }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Editing>(null);
  const [query, setQuery] = useState("");

  const shown = query.trim()
    ? items.filter((i) => `${i.question} ${i.answer}`.toLowerCase().includes(query.trim().toLowerCase()))
    : items;

  async function remove(id: string) {
    if (!confirm("Delete this answer? The bot stops using it right away.")) return;
    const res = await api(`/api/qa/${id}`, { method: "DELETE" });
    if (res.ok) setItems((xs) => xs.filter((x) => x.id !== id));
    else alert(res.error);
  }

  return (
    <>
      <SubNav
        title="Train"
        action={
          <Button className="min-h-9 px-4" onClick={() => setEditing({ question: "", answer: "" })} disabled={items.length >= limit}>
            <Plus size={16} aria-hidden /> Add Q&amp;A
          </Button>
        }
      />
      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-6 py-4">
          <div>
            <h2 className="t-body-strong">Q&amp;A</h2>
            <p className="t-caption text-ink-48">
              The bot answers only from what you teach it. {items.length} of {limit} used.
            </p>
          </div>
          {items.length > 5 && (
            <Input type="search" aria-label="Search Q&A" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-64" />
          )}
        </div>
        {items.length === 0 ? (
          <EmptyState line="Add the questions customers ask most, like delivery times or returns." action={<Button onClick={() => setEditing({ question: "", answer: "" })}>Add Q&amp;A</Button>} />
        ) : (
          <ul className="divide-y divide-divider">
            {shown.map((i) => (
              <li key={i.id} className="row-in flex items-start gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="t-body-strong">{i.question}</p>
                  <p className="t-caption mt-1 line-clamp-2 text-ink-80">{i.answer}</p>
                </div>
                {i.source === "learned" && <Chip tone="info">Learned</Chip>}
                <div className="flex shrink-0 gap-3">
                  <button type="button" className="t-caption min-h-11 text-primary hover:underline" onClick={() => setEditing({ id: i.id, question: i.question, answer: i.answer })}>
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
      </Card>

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
    </>
  );
}

function QaSheet({ value, onClose, onSaved }: { value: NonNullable<Editing>; onClose: () => void; onSaved: (row: QaRow) => void }) {
  const [q, setQ] = useState(value.question);
  const [a, setA] = useState(value.answer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api<{ item: QaRow }>(value.id ? `/api/qa/${value.id}` : "/api/qa", {
      method: value.id ? "PATCH" : "POST",
      body: { question: q, answer: a },
    });
    setBusy(false);
    if (!res.ok) return setError({ field: res.field, message: res.error });
    onSaved(res.data.item);
  }

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-labelledby="qa-sheet-title">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <form onSubmit={submit} noValidate className="route-in absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col gap-4 bg-canvas p-6 shadow-[var(--shadow-pop)]">
        <div className="flex items-center justify-between">
          <h2 id="qa-sheet-title" className="t-tagline">
            {value.id ? "Edit answer" : "Add Q&A"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="press flex size-11 items-center justify-center rounded-full hover:bg-parchment">
            <X size={18} aria-hidden />
          </button>
        </div>
        <Field label="Question" hint="Write it the way a customer would ask." error={error?.field === "question" ? error.message : undefined}>
          {(p) => <Input {...p} ref={first} value={q} maxLength={500} onChange={(e) => setQ(e.target.value)} />}
        </Field>
        <Field label="Answer" error={error?.field === "answer" ? error.message : undefined}>
          {(p) => <Textarea {...p} value={a} maxLength={5000} onChange={(e) => setA(e.target.value)} className="min-h-48" />}
        </Field>
        {error && !error.field && (
          <p className="t-caption text-danger" role="alert">
            {error.message}
          </p>
        )}
        <div className="mt-auto flex gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy} className="flex-1">
            {busy ? "Saving…" : "Save answer"}
          </Button>
        </div>
      </form>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";
import type { LearnedRow } from "@/lib/qa";
import { Button, Card, EmptyState, Field, Input, Textarea } from "@/components/ui";

/** Agent answers turned into suggested Q&A. Approving makes them live on the very next bot reply. */
export function LearnedTab({ initial, onCountChange }: { initial: LearnedRow[]; onCountChange?: (n: number) => void }) {
  const [items, setItems] = useState(initial);

  const drop = (id: string) => {
    const next = items.filter((x) => x.id !== id);
    setItems(next);
    onCountChange?.(next.length);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="t-body-strong">Learned from your agents</h2>
        <p className="t-caption text-ink-48">When an agent solves a chat, the reusable answer shows up here. Approve it and the bot uses it from the next message.</p>
      </Card>
      {items.length === 0 ? (
        <Card>
          <EmptyState line="Nothing to review. Suggestions appear after agents resolve chats." />
        </Card>
      ) : (
        items.map((s) => <Suggestion key={s.id} s={s} onDone={() => drop(s.id)} />)
      )}
    </div>
  );
}

function Suggestion({ s, onDone }: { s: LearnedRow; onDone: () => void }) {
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState(s.question);
  const [a, setA] = useState(s.answer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "reject") {
    setBusy(true);
    setError(null);
    const res = await api(`/api/learned/${s.id}`, { body: action === "approve" && editing ? { action, question: q, answer: a } : { action } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onDone();
  }

  return (
    <Card className="row-in flex flex-col gap-3">
      {editing ? (
        <>
          <Field label="Question">{(p) => <Input {...p} value={q} maxLength={500} onChange={(e) => setQ(e.target.value)} />}</Field>
          <Field label="Answer">{(p) => <Textarea {...p} value={a} maxLength={5000} onChange={(e) => setA(e.target.value)} className="min-h-32" />}</Field>
        </>
      ) : (
        <>
          <p className="t-body-strong">{s.question}</p>
          <p className="t-caption whitespace-pre-wrap text-ink-80">{s.answer}</p>
        </>
      )}
      <div className="t-fine flex flex-wrap gap-x-4 gap-y-1 text-ink-48">
        {s.duplicate_title && <span className="text-warning">Similar to “{s.duplicate_title}”</span>}
        {s.conversation_id && (
          <Link href={`/app/inbox?c=${s.conversation_id}`} className="text-primary hover:underline">
            View the conversation
          </Link>
        )}
      </div>
      {error && (
        <p className="t-caption text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => act("approve")} disabled={busy} className="min-h-9 px-4">
          {editing ? "Save & approve" : "Approve"}
        </Button>
        {!editing && (
          <Button variant="secondary" onClick={() => setEditing(true)} className="min-h-9 px-4">
            Edit &amp; approve
          </Button>
        )}
        <button type="button" onClick={() => act("reject")} disabled={busy} className="t-caption min-h-11 text-ink-48 hover:text-danger hover:underline">
          Reject
        </button>
      </div>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { FileText, Globe, MessageSquareText, RotateCcw, Sparkles, Zap } from "lucide-react";
import { api } from "@/lib/client";
import type { AssistantOutcome, SourceRef } from "@/lib/ai/answer";
import { ChatView, type ChatMessage } from "@/components/chat-view";
import { QaSheet, type QaDraft } from "@/components/qa";
import { Button, Card, Chip, SubNav, cn } from "@/components/ui";

type Widget = { id: string; name: string; color: string; title: string; greeting: string };
type Turn = ChatMessage & { sources?: SourceRef[]; actions?: { name: string; ok: boolean }[]; escalated?: string; question?: string };

const REASON: Record<string, string> = {
  keyword: "matched a hand-over keyword",
  tool: "the bot chose to hand over",
  no_info: "the knowledge doesn't cover this",
  llm_error: "the AI call failed",
  plan_limit: "the monthly AI reply limit is reached",
};

const ICON = { web: Globe, doc: FileText, qa: MessageSquareText, learned: Sparkles } as const;

export function Playground({ widgets }: { widgets: Widget[] }) {
  const [widgetId, setWidgetId] = useState(widgets[0].id);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [fixing, setFixing] = useState<QaDraft | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const widget = widgets.find((w) => w.id === widgetId)!;

  async function send(text: string) {
    const buyer: Turn = { id: crypto.randomUUID(), role: "buyer", text };
    const next = [...turns.filter((t) => !t.escalated), buyer];
    setTurns([...turns, buyer]);
    setThinking(true);
    const res = await api<AssistantOutcome>("/api/playground", {
      body: { widgetId, messages: next.map((t) => ({ role: t.role, text: t.text })) },
    });
    setThinking(false);
    const id = crypto.randomUUID();
    if (!res.ok) {
      setTurns((ts) => [...ts, { id, role: "bot", text: `(${res.error})`, escalated: "error", question: text }]);
      return;
    }
    const out = res.data;
    const turn: Turn =
      out.type === "reply"
        ? { id, role: "bot", text: out.text, sources: out.sources, actions: out.actions, question: text }
        : { id, role: "bot", text: out.message || "I'm connecting you with a member of our team.", escalated: out.reason, question: text };
    setTurns((ts) => [...ts, turn]);
    setSelected(id);
  }

  const current = turns.find((t) => t.id === selected);

  return (
    <>
      <SubNav
        title="Playground"
        action={
          <Button variant="secondary" className="min-h-9 px-4" onClick={() => (setTurns([]), setSelected(null))} disabled={!turns.length}>
            <RotateCcw size={14} aria-hidden /> New chat
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="mx-auto flex w-full max-w-[680px] flex-col gap-3">
          {widgets.length > 1 && (
            <label className="t-caption flex items-center gap-2 text-ink-48">
              Widget
              <select value={widgetId} onChange={(e) => (setWidgetId(e.target.value), setTurns([]))} className="min-h-9 rounded-md border border-hairline bg-canvas px-2 text-ink">
                {widgets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="h-[min(640px,calc(100dvh-220px))] overflow-hidden rounded-lg border border-hairline">
            <ChatView
              title={widget.title}
              accent={widget.color}
              status="Test chat · nothing is sent to customers"
              greeting={widget.greeting}
              messages={turns}
              typing={thinking}
              onSend={send}
              disabled={thinking}
            />
          </div>
          {turns.some((t) => t.role === "bot") && (
            <ul className="flex flex-col gap-1">
              {turns
                .filter((t) => t.role === "bot")
                .map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(t.id)}
                      className={cn("t-caption w-full truncate rounded-md px-3 py-2 text-left hover:bg-canvas", selected === t.id ? "bg-canvas font-semibold" : "text-ink-80")}
                    >
                      {t.escalated ? "Handed over: " : "Answer: "}
                      {t.text}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <Card>
            <h2 className="t-body-strong">Why this answer</h2>
            {!current ? (
              <p className="t-caption mt-2 text-ink-48">Ask something. The sources the bot used show here.</p>
            ) : current.escalated ? (
              <p className="t-caption mt-2 text-ink-80">Handed to a person: {REASON[current.escalated] ?? current.escalated}.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {current.actions?.map((a, i) => (
                  <div key={i} className="t-caption flex items-center gap-2">
                    <Zap size={16} className="text-ink-48" aria-hidden /> Called <strong>{a.name}</strong>
                    <Chip tone={a.ok ? "success" : "danger"}>{a.ok ? "OK" : "Failed"}</Chip>
                  </div>
                ))}
                {current.sources?.length ? (
                  <ul className="flex flex-col gap-2">
                    {current.sources.map((s) => {
                      const Icon = ICON[s.source as keyof typeof ICON] ?? FileText;
                      return (
                        <li key={s.id} className="t-caption flex items-start gap-2">
                          <Icon size={16} className="mt-0.5 shrink-0 text-ink-48" aria-hidden />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{s.title || s.url}</span>
                            {s.url && (
                              <a href={s.url} target="_blank" rel="noreferrer" className="t-fine block truncate text-primary hover:underline">
                                {s.url}
                              </a>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  !current.actions?.length && <p className="t-caption text-warning">No source cited. Check this answer before customers see it.</p>
                )}
              </div>
            )}
            {current && current.question && (
              <button
                type="button"
                className="t-caption mt-4 text-primary hover:underline"
                onClick={() => setFixing({ question: current.question!, answer: current.escalated ? "" : current.text, alternatives: [] })}
              >
                Fix this answer
              </button>
            )}
          </Card>
          {flash && (
            <p className="t-caption text-success" role="status">
              {flash}
            </p>
          )}
        </aside>
      </div>
      {fixing && (
        <QaSheet
          value={fixing}
          onClose={() => setFixing(null)}
          onSaved={() => {
            setFixing(null);
            setFlash("Saved to Q&A. Ask again to see the new answer.");
            setTimeout(() => setFlash(null), 4000);
          }}
        />
      )}
    </>
  );
}

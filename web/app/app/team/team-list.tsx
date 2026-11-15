"use client";

import { useState } from "react";
import { Check, Copy, Plus } from "lucide-react";
import { api } from "@/lib/client";
import { Button, Card, Chip, Field, Input, SubNav } from "@/components/ui";
import { Sheet } from "@/components/sheet";

export type Member = { id: string; name: string; email: string; role: "owner" | "agent"; lang: string };

const LANGS = [
  ["en", "English"],
  ["hi", "Hindi"],
  ["es", "Spanish"],
  ["ar", "Arabic"],
  ["fr", "French"],
  ["de", "German"],
  ["pt", "Portuguese"],
  ["id", "Indonesian"],
] as const;

export function TeamList({ initial, meId, seats }: { initial: Member[]; meId: string; seats: number }) {
  const [members, setMembers] = useState(initial);
  const [adding, setAdding] = useState(false);
  const agents = members.filter((m) => m.role === "agent").length;

  async function remove(m: Member) {
    if (!confirm(`Remove ${m.name}? Their open chats go back to the waiting queue.`)) return;
    const res = await api(`/api/team/${m.id}`, { method: "DELETE" });
    if (res.ok) setMembers((xs) => xs.filter((x) => x.id !== m.id));
    else alert(res.error);
  }

  return (
    <>
      <SubNav
        title="Team"
        action={
          <Button className="min-h-9 px-4" onClick={() => setAdding(true)} disabled={agents >= seats}>
            <Plus size={16} aria-hidden /> Add agent
          </Button>
        }
      />
      <Card className="p-0">
        <div className="border-b border-divider px-6 py-4">
          <h2 className="t-body-strong">Members</h2>
          <p className="t-caption text-ink-48">
            {agents} of {seats} agent seats used. Agents sign in on the web or the Android app.
          </p>
        </div>
        <ul className="divide-y divide-divider">
          {members.map((m) => (
            <li key={m.id} className="row-in flex min-h-14 items-center gap-4 px-6 py-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-parchment t-caption-strong" aria-hidden>
                {m.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="t-caption-strong truncate">
                  {m.name}
                  {m.id === meId && <span className="font-normal text-ink-48"> (you)</span>}
                </p>
                <p className="t-fine truncate text-ink-48">{m.email}</p>
              </div>
              <Chip className="uppercase">{m.lang}</Chip>
              <Chip tone={m.role === "owner" ? "info" : "neutral"}>{m.role === "owner" ? "Owner" : "Agent"}</Chip>
              {m.role === "agent" ? (
                <button type="button" onClick={() => remove(m)} className="t-caption min-h-11 w-16 text-right text-danger hover:underline">
                  Remove
                </button>
              ) : (
                <span className="w-16" />
              )}
            </li>
          ))}
        </ul>
      </Card>
      {adding && (
        <AddAgentSheet
          onClose={() => setAdding(false)}
          onAdded={(m) => setMembers((xs) => [...xs, m])}
        />
      )}
    </>
  );
}

function AddAgentSheet({ onClose, onAdded }: { onClose: () => void; onAdded: (m: Member) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lang, setLang] = useState("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await api<{ member: Member; password: string }>("/api/team", { body: { name, email, lang } });
    setBusy(false);
    if (!res.ok) return setError({ field: res.field, message: res.error });
    onAdded(res.data.member);
    setCreated({ email: res.data.member.email, password: res.data.password });
  }

  if (created) {
    const text = `Sign in at ${window.location.origin}/login\nEmail: ${created.email}\nTemporary password: ${created.password}`;
    return (
      <Sheet title="Agent added" onClose={onClose}>
        <p className="t-caption text-ink-80">Share these details with your agent. The password is shown only once.</p>
        <div className="relative rounded-md bg-tile-1 p-4 pr-12">
          <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-white/90">{text}</pre>
          <button
            type="button"
            aria-label={copied ? "Copied" : "Copy sign-in details"}
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            }}
            className="press absolute right-1 top-1 flex size-11 items-center justify-center rounded-md text-white/70 hover:text-white"
          >
            {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          </button>
        </div>
        <Button onClick={onClose} className="self-start">
          Done
        </Button>
      </Sheet>
    );
  }

  return (
    <Sheet title="Add agent" onClose={onClose} onSubmit={submit} submitLabel="Create agent" busy={busy} error={error && !["name", "email"].includes(error.field ?? "") ? error.message : null}>
      <Field label="Name" error={error?.field === "name" ? error.message : undefined}>
        {(p) => <Input {...p} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <Field label="Email" error={error?.field === "email" ? error.message : undefined}>
        {(p) => <Input {...p} type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />}
      </Field>
      <Field label="Language they reply in">
        {(p) => (
          <select {...p} value={lang} onChange={(e) => setLang(e.target.value)} className="min-h-11 w-full rounded-md border border-hairline bg-canvas px-3 text-[15px]">
            {LANGS.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <p className="t-fine text-ink-48">We create a temporary password for you to share. No email is sent.</p>
    </Sheet>
  );
}

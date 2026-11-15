"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Globe, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { api } from "@/lib/client";
import type { KnowledgeRow } from "@/lib/qa";
import { Button, Card, Chip, EmptyState, Field, Input, Segmented, Textarea } from "@/components/ui";
import { Sheet } from "@/components/sheet";

const STATUS: Record<KnowledgeRow["status"], { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  ready: { label: "Ready", tone: "success" },
  syncing: { label: "Syncing", tone: "warning" },
  pending: { label: "Queued", tone: "neutral" },
  error: { label: "Error", tone: "danger" },
};

function useSourceList(source: "web" | "doc", initial: KnowledgeRow[]) {
  const [items, setItems] = useState(initial);
  const reload = useCallback(async () => {
    const res = await api<{ items: KnowledgeRow[] }>(`/api/knowledge?source=${source}`);
    if (res.ok) setItems(res.data.items);
  }, [source]);
  const busy = items.some((i) => i.status === "pending" || i.status === "syncing");
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(reload, 3000);
    return () => clearInterval(t);
  }, [busy, reload]);
  return { items, setItems, reload };
}

function Row({ item, onResync, onDelete }: { item: KnowledgeRow; onResync?: () => void; onDelete: () => void }) {
  const s = STATUS[item.status];
  return (
    <li className="row-in flex min-h-14 items-center gap-4 px-6 py-3">
      {item.source === "web" ? <Globe size={18} className="shrink-0 text-ink-48" aria-hidden /> : <FileText size={18} className="shrink-0 text-ink-48" aria-hidden />}
      <div className="min-w-0 flex-1">
        <p className="t-caption-strong truncate">{item.title || item.url}</p>
        <p className="t-fine truncate text-ink-48">
          {item.status === "error" ? <span className="text-danger">{item.error}</span> : item.url ?? `${item.chars.toLocaleString("en-US")} characters`}
        </p>
      </div>
      <Chip tone={s.tone}>{s.label}</Chip>
      <div className="flex shrink-0">
        {onResync && (
          <button type="button" onClick={onResync} aria-label={`Re-sync ${item.title || item.url}`} className="press flex size-11 items-center justify-center rounded-full text-ink-48 hover:bg-parchment hover:text-ink">
            <RefreshCw size={16} aria-hidden />
          </button>
        )}
        <button type="button" onClick={onDelete} aria-label={`Delete ${item.title || item.url}`} className="press flex size-11 items-center justify-center rounded-full text-ink-48 hover:bg-parchment hover:text-danger">
          <Trash2 size={16} aria-hidden />
        </button>
      </div>
    </li>
  );
}

async function del(id: string, setItems: (f: (x: KnowledgeRow[]) => KnowledgeRow[]) => void) {
  if (!confirm("Remove this source? The bot stops using it right away.")) return;
  const res = await api(`/api/knowledge/${id}`, { method: "DELETE" });
  if (res.ok) setItems((xs) => xs.filter((x) => x.id !== id));
  else alert(res.error);
}

export function WebsiteTab({ initial, limit }: { initial: KnowledgeRow[]; limit: number }) {
  const { items, setItems, reload } = useSourceList("web", initial);
  const [adding, setAdding] = useState(false);

  async function resync(id: string) {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status: "pending" } : x)));
    const res = await api(`/api/knowledge/${id}`, { body: {} });
    if (!res.ok) alert(res.error);
  }

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-6 py-4">
        <div>
          <h2 className="t-body-strong">Website</h2>
          <p className="t-caption text-ink-48">
            Pages the bot reads. {items.length} of {limit} pages used.
          </p>
        </div>
        <Button className="min-h-9 px-4" onClick={() => setAdding(true)} disabled={items.length >= limit}>
          <Plus size={16} aria-hidden /> Add pages
        </Button>
      </div>
      {items.length === 0 ? (
        <EmptyState line="Add your FAQ, shipping and returns pages so the bot can answer from them." action={<Button onClick={() => setAdding(true)}>Add pages</Button>} />
      ) : (
        <ul className="divide-y divide-divider">
          {items.map((i) => (
            <Row key={i.id} item={i} onResync={() => resync(i.id)} onDelete={() => del(i.id, setItems)} />
          ))}
        </ul>
      )}
      {adding && (
        <AddPagesSheet
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            void reload();
          }}
        />
      )}
    </Card>
  );
}

function AddPagesSheet({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [mode, setMode] = useState<"urls" | "sitemap">("urls");
  const [urls, setUrls] = useState("");
  const [sitemap, setSitemap] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await api<{ added: number; skipped: number }>("/api/knowledge/web", { body: mode === "urls" ? { urls } : { sitemap } });
    setBusy(false);
    if (!res.ok) return setError({ field: res.field, message: res.error });
    if (res.data.skipped) alert(`${res.data.added} pages added. ${res.data.skipped} were over your plan's page limit.`);
    onAdded();
  }

  return (
    <Sheet title="Add website pages" onClose={onClose} onSubmit={submit} submitLabel="Add and sync" busy={busy} error={error && !error.field ? error.message : null}>
      <Segmented
        label="How to add pages"
        value={mode}
        onChange={setMode}
        options={[
          { value: "urls", label: "Page URLs" },
          { value: "sitemap", label: "Sitemap" },
        ]}
      />
      {mode === "urls" ? (
        <Field label="Page URLs" hint="One per line. Only public https pages." error={error?.field === "urls" ? error.message : undefined}>
          {(p) => <Textarea {...p} value={urls} onChange={(e) => setUrls(e.target.value)} placeholder={"https://yourshop.com/faq\nhttps://yourshop.com/shipping"} className="min-h-40 font-mono text-[15px]" />}
        </Field>
      ) : (
        <Field label="Sitemap URL" hint="We add the pages it lists, up to your plan's limit." error={error?.field === "sitemap" ? error.message : undefined}>
          {(p) => <Input {...p} type="url" value={sitemap} onChange={(e) => setSitemap(e.target.value)} placeholder="https://yourshop.com/sitemap.xml" />}
        </Field>
      )}
    </Sheet>
  );
}

export function DocumentsTab({ initial }: { initial: KnowledgeRow[] }) {
  const { items, setItems } = useSourceList("doc", initial);
  const [pasting, setPasting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    setUploadError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/knowledge/doc", { method: "POST", body: form, credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { item?: KnowledgeRow; error?: string };
      if (!res.ok || !data.item) setUploadError(data.error ?? "Upload failed. Try again.");
      else setItems((xs) => [data.item!, ...xs]);
    } catch {
      setUploadError("No connection. Try again.");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-6 py-4">
        <div>
          <h2 className="t-body-strong">Documents</h2>
          <p className="t-caption text-ink-48">PDF or text files, or pasted text. We keep the text only, not the file.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="min-h-9 px-4" onClick={() => setPasting(true)}>
            Paste text
          </Button>
          <Button className="min-h-9 px-4" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload size={16} aria-hidden /> {uploading ? "Reading…" : "Upload file"}
          </Button>
          <input ref={fileRef} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" className="sr-only" aria-label="Upload a document" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
      </div>
      {uploadError && (
        <p className="t-caption mx-6 mt-4 text-danger" role="alert">
          {uploadError}
        </p>
      )}
      {items.length === 0 ? (
        <EmptyState line="Upload a price list, product manual or policy document." />
      ) : (
        <ul className="divide-y divide-divider">
          {items.map((i) => (
            <Row key={i.id} item={i} onDelete={() => del(i.id, setItems)} />
          ))}
        </ul>
      )}
      {pasting && (
        <PasteSheet
          onClose={() => setPasting(false)}
          onSaved={(row) => {
            setItems((xs) => [row, ...xs]);
            setPasting(false);
          }}
        />
      )}
    </Card>
  );
}

function PasteSheet({ onClose, onSaved }: { onClose: () => void; onSaved: (row: KnowledgeRow) => void }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await api<{ item: KnowledgeRow }>("/api/knowledge/doc", { body: { title, text } });
    setBusy(false);
    if (!res.ok) return setError({ field: res.field, message: res.error });
    onSaved(res.data.item);
  }

  return (
    <Sheet title="Paste text" onClose={onClose} onSubmit={submit} submitLabel="Save" busy={busy} error={error && !["title", "text"].includes(error.field ?? "") ? error.message : null} wide>
      <Field label="Title" error={error?.field === "title" ? error.message : undefined}>
        {(p) => <Input {...p} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Warranty terms" />}
      </Field>
      <Field label="Text" error={error?.field === "text" ? error.message : undefined}>
        {(p) => <Textarea {...p} value={text} onChange={(e) => setText(e.target.value)} className="min-h-80" />}
      </Field>
    </Sheet>
  );
}

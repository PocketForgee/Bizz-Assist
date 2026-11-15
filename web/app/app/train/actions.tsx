"use client";

import { useState } from "react";
import { Play, Plus, Trash2, Zap } from "lucide-react";
import { api } from "@/lib/client";
import type { PublicAction } from "@/lib/action-public";
import type { ActionParam } from "@/lib/actions";
import { Button, Card, Chip, EmptyState, Field, Input, Segmented, Textarea, cn } from "@/components/ui";
import { Sheet } from "@/components/sheet";

type Draft = {
  id?: string;
  kind: "rest" | "sheet";
  name: string;
  description: string;
  method: "GET" | "POST";
  url_template: string;
  params: ActionParam[];
  headers: { name: string; value: string }[] | null; // null = keep stored headers
  header_names: string[];
  order_column: string;
  contact_column: string;
};

const blank: Draft = {
  kind: "rest",
  name: "",
  description: "",
  method: "GET",
  url_template: "https://",
  params: [{ name: "order_id", description: "Order ID from the customer", required: true }],
  headers: [],
  header_names: [],
  order_column: "Order ID",
  contact_column: "Email",
};

const toDraft = (a: PublicAction): Draft => ({
  id: a.id,
  kind: a.kind,
  name: a.name,
  description: a.description,
  method: a.method,
  url_template: a.url_template,
  params: a.params,
  headers: null,
  header_names: a.header_names,
  order_column: a.sheet_match?.order_column ?? "Order ID",
  contact_column: a.sheet_match?.contact_column ?? "Email",
});

export function ActionsTab({ initial, limit }: { initial: PublicAction[]; limit: number }) {
  const [actions, setActions] = useState(initial);
  const [editing, setEditing] = useState<Draft | null>(null);

  async function remove(a: PublicAction) {
    if (!confirm(`Delete "${a.name}"? Widgets stop using it.`)) return;
    const res = await api(`/api/actions/${a.id}`, { method: "DELETE" });
    if (res.ok) setActions((xs) => xs.filter((x) => x.id !== a.id));
    else alert(res.error);
  }

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-6 py-4">
        <div>
          <h2 className="t-body-strong">API Actions</h2>
          <p className="t-caption text-ink-48">
            Live lookups like order status. Turn them on per widget under Behaviour. {actions.length} of {limit} used.
          </p>
        </div>
        <Button className="min-h-9 px-4" onClick={() => setEditing(blank)} disabled={actions.length >= limit}>
          <Plus size={16} aria-hidden /> Add action
        </Button>
      </div>
      {actions.length === 0 ? (
        <EmptyState line="Connect your order API or a Google Sheet so the bot can answer “where is my order?”." action={<Button onClick={() => setEditing(blank)}>Add action</Button>} />
      ) : (
        <ul className="divide-y divide-divider">
          {actions.map((a) => (
            <li key={a.id} className="row-in flex min-h-14 items-center gap-4 px-6 py-3">
              <Zap size={18} className="shrink-0 text-ink-48" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="t-caption-strong truncate">{a.name}</p>
                <p className="t-fine truncate text-ink-48">{a.description}</p>
              </div>
              <Chip>{a.kind === "sheet" ? "Google Sheet" : `${a.method} API`}</Chip>
              <button type="button" className="t-caption min-h-11 text-primary hover:underline" onClick={() => setEditing(toDraft(a))}>
                Edit
              </button>
              <button type="button" onClick={() => remove(a)} aria-label={`Delete ${a.name}`} className="press flex size-11 items-center justify-center rounded-full text-ink-48 hover:bg-parchment hover:text-danger">
                <Trash2 size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <ActionSheet
          value={editing}
          onClose={() => setEditing(null)}
          onSaved={(a) => {
            setActions((xs) => (xs.some((x) => x.id === a.id) ? xs.map((x) => (x.id === a.id ? a : x)) : [...xs, a]));
            setEditing(toDraft(a)); // stay open so the owner can press Test
          }}
        />
      )}
    </Card>
  );
}

function ActionSheet({ value, onClose, onSaved }: { value: Draft; onClose: () => void; onSaved: (a: PublicAction) => void }) {
  const [d, setD] = useState<Draft>(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const err = (f: string) => (error?.field === f ? error.message : undefined);

  async function save() {
    setBusy(true);
    setError(null);
    const body = {
      kind: d.kind,
      name: d.name,
      description: d.description,
      method: d.method,
      url_template: d.url_template,
      params: d.params,
      sheet_match: { order_column: d.order_column, contact_column: d.contact_column },
      ...(d.headers ? { headers: d.headers } : {}),
    };
    const res = await api<{ action: PublicAction }>(d.id ? `/api/actions/${d.id}` : "/api/actions", { method: d.id ? "PATCH" : "POST", body });
    setBusy(false);
    if (!res.ok) return setError({ field: res.field, message: res.error });
    setD(toDraft(res.data.action));
    setFlash("Saved. Run a test below.");
    onSaved(res.data.action);
  }

  const paramsUi = d.params.map((p, i) => (
    <div key={i} className="flex items-start gap-2">
      <Input aria-label="Parameter name" value={p.name} onChange={(e) => set("params", d.params.map((x, j) => (j === i ? { ...x, name: e.target.value.toLowerCase() } : x)))} className="w-36 font-mono text-[15px]" placeholder="order_id" />
      <Input aria-label="What it is" value={p.description} onChange={(e) => set("params", d.params.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} placeholder="What the bot should ask for" />
      <button type="button" aria-label="Remove parameter" onClick={() => set("params", d.params.filter((_, j) => j !== i))} className="press flex size-11 shrink-0 items-center justify-center rounded-full text-ink-48 hover:bg-parchment">
        <Trash2 size={16} aria-hidden />
      </button>
    </div>
  ));

  return (
    <Sheet
      title={d.id ? "Edit action" : "Add action"}
      onClose={onClose}
      onSubmit={save}
      submitLabel={d.id ? "Save changes" : "Save action"}
      busy={busy}
      error={error && !error.field ? error.message : null}
      wide
    >
      <Segmented
        label="Action type"
        value={d.kind}
        onChange={(v) => set("kind", v)}
        options={[
          { value: "rest", label: "REST API" },
          { value: "sheet", label: "Google Sheet" },
        ]}
      />
      <Field label="Name" error={err("name")}>
        {(p) => <Input {...p} value={d.name} maxLength={60} onChange={(e) => set("name", e.target.value)} placeholder="Order status" />}
      </Field>
      <Field label="When should the bot use it?" hint="The bot reads this to decide. Be specific." error={err("description")}>
        {(p) => <Textarea {...p} value={d.description} maxLength={500} onChange={(e) => set("description", e.target.value)} placeholder="Look up the delivery status of an order." className="min-h-20" />}
      </Field>

      {d.kind === "sheet" ? (
        <>
          <Field label="Published CSV link" hint="Google Sheets › File › Share › Publish to web › CSV. The bot returns a row only when BOTH the order ID and the email or phone match." error={err("url_template")}>
            {(p) => <Input {...p} type="url" value={d.url_template} onChange={(e) => set("url_template", e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/e/…/pub?output=csv" />}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Order ID column" error={err("order_column")}>
              {(p) => <Input {...p} value={d.order_column} onChange={(e) => set("order_column", e.target.value)} />}
            </Field>
            <Field label="Email or phone column" error={err("contact_column")}>
              {(p) => <Input {...p} value={d.contact_column} onChange={(e) => set("contact_column", e.target.value)} />}
            </Field>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-end gap-3">
            <Field label="Method" className="w-28">
              {(p) => (
                <select {...p} value={d.method} onChange={(e) => set("method", e.target.value as "GET" | "POST")} className="min-h-11 w-full rounded-md border border-hairline bg-canvas px-3 text-[15px]">
                  <option>GET</option>
                  <option>POST</option>
                </select>
              )}
            </Field>
            <Field label="URL" className="flex-1" error={err("url_template")}>
              {(p) => <Input {...p} value={d.url_template} onChange={(e) => set("url_template", e.target.value)} className="font-mono text-[15px]" placeholder="https://api.shop.com/orders/{order_id}" />}
            </Field>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="t-caption-strong mb-1">Parameters</legend>
            <p className="t-fine text-ink-48">Use them in the URL as {"{name}"}. Values are URL-encoded. POST sends the others as JSON.</p>
            {paramsUi}
            {err("params") && <p className="t-caption text-danger">{err("params")}</p>}
            <button type="button" className="t-caption self-start text-primary hover:underline" onClick={() => set("params", [...d.params, { name: "", description: "", required: true }])} disabled={d.params.length >= 10}>
              Add parameter
            </button>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="t-caption-strong mb-1">Headers</legend>
            {d.headers === null ? (
              <div className="flex items-center justify-between gap-3">
                <p className="t-caption text-ink-80">{d.header_names.length ? `Saved, encrypted: ${d.header_names.join(", ")}` : "None"}</p>
                <button type="button" className="t-caption text-primary hover:underline" onClick={() => set("headers", [{ name: "Authorization", value: "" }])}>
                  Replace headers
                </button>
              </div>
            ) : (
              <>
                <p className="t-fine text-ink-48">Stored encrypted. You can't view them again after saving.</p>
                {d.headers.map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <Input aria-label="Header name" value={h.name} onChange={(e) => set("headers", d.headers!.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="w-40 font-mono text-[15px]" placeholder="Authorization" />
                    <Input aria-label="Header value" type="password" autoComplete="off" value={h.value} onChange={(e) => set("headers", d.headers!.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} placeholder="Bearer …" />
                    <button type="button" aria-label="Remove header" onClick={() => set("headers", d.headers!.filter((_, j) => j !== i))} className="press flex size-11 shrink-0 items-center justify-center rounded-full text-ink-48 hover:bg-parchment">
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </div>
                ))}
                <button type="button" className="t-caption self-start text-primary hover:underline" onClick={() => set("headers", [...(d.headers ?? []), { name: "", value: "" }])}>
                  Add header
                </button>
              </>
            )}
            {err("headers") && <p className="t-caption text-danger">{err("headers")}</p>}
          </fieldset>
        </>
      )}

      {flash && (
        <p className="t-caption text-success" role="status">
          {flash}
        </p>
      )}
      {d.id && <TestPanel id={d.id} fields={d.kind === "sheet" ? ["order_id", "contact"] : d.params.map((p) => p.name).filter(Boolean)} />}
    </Sheet>
  );
}

function TestPanel({ id, fields }: { id: string; fields: string[] }) {
  const [args, setArgs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; status?: number; body: string; ms?: number } | null>(null);

  async function run() {
    setBusy(true);
    const res = await api<{ ok: boolean; status?: number; body: string; ms: number }>(`/api/actions/${id}/test`, { body: { args } });
    setBusy(false);
    setResult(res.ok ? res.data : { ok: false, body: res.error });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-hairline p-4">
      <p className="t-caption-strong">Test with sample values</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map((f) => (
          <Input key={f} aria-label={f} placeholder={f} value={args[f] ?? ""} onChange={(e) => setArgs((a) => ({ ...a, [f]: e.target.value }))} />
        ))}
      </div>
      <Button variant="dark" onClick={run} disabled={busy} className="self-start">
        <Play size={14} aria-hidden /> {busy ? "Running…" : "Test"}
      </Button>
      {result && (
        <div className="rounded-md bg-tile-1 p-3">
          <p className={cn("t-fine mb-1 font-semibold", result.ok ? "text-success-on-dark" : "text-danger-on-dark")}>
            {result.ok ? "OK" : "Failed"}
            {result.status ? ` · HTTP ${result.status}` : ""}
            {result.ms !== undefined ? ` · ${result.ms} ms` : ""}
          </p>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all font-mono text-[12px] leading-relaxed text-white/85">{result.body}</pre>
        </div>
      )}
    </div>
  );
}

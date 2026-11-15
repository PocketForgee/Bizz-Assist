"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, ExternalLink } from "lucide-react";
import { api } from "@/lib/client";
import type { Widget } from "@/lib/widgets";
import { Button, Card, Field, Input, Segmented, SubNav, Textarea, cn } from "@/components/ui";
import { ChatView } from "@/components/chat-view";

type Tab = "appearance" | "behaviour" | "install";
type Draft = {
  name: string;
  type: "widget" | "link";
  color: string;
  title: string;
  greeting: string;
  avatar: string;
  persona: string;
  allowed_domains: string;
  escalation_keywords: string;
  enabled_action_ids: string[];
};

const toDraft = (w: Widget): Draft => ({
  name: w.name,
  type: w.type,
  color: w.color,
  title: w.title,
  greeting: w.greeting,
  avatar: w.avatar ?? "",
  persona: w.persona,
  allowed_domains: w.allowed_domains.join("\n"),
  escalation_keywords: w.escalation_keywords.join(", "),
  enabled_action_ids: w.enabled_action_ids,
});

export function WidgetEditor({
  initial,
  businessName,
  appUrl,
  initialTab,
  actions,
}: {
  initial: Widget;
  businessName: string;
  appUrl: string;
  initialTab: Tab;
  actions: { id: string; name: string; description: string }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [saved, setSaved] = useState<Draft>(() => toDraft(initial));
  const [draft, setDraft] = useState<Draft>(saved);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [origin, setOrigin] = useState(appUrl);

  useEffect(() => {
    if (!appUrl) setOrigin(window.location.origin);
  }, [appUrl]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = (k: keyof Draft) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const err = (f: string) => (error?.field === f ? error.message : undefined);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await api<{ widget: Widget }>(`/api/widgets/${initial.id}`, {
      method: "PATCH",
      body: { ...draft, allowed_domains: draft.allowed_domains, escalation_keywords: draft.escalation_keywords },
    });
    setBusy(false);
    if (!res.ok) {
      setError({ field: res.field, message: res.error });
      if (res.field === "allowed_domains" || res.field === "escalation_keywords" || res.field === "persona" || res.field === "enabled_action_ids") setTab("behaviour");
      else if (res.field) setTab("appearance");
      return;
    }
    const next = toDraft(res.data.widget);
    setSaved(next);
    setDraft(next);
    setFlash("Saved");
    setTimeout(() => setFlash(null), 1800);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete "${saved.name}"? Its conversations are deleted too.`)) return;
    const res = await api(`/api/widgets/${initial.id}`, { method: "DELETE" });
    if (!res.ok) return setError({ message: res.error });
    router.replace("/app/widgets");
    router.refresh();
  }

  return (
    <>
      <SubNav
        title={saved.name}
        action={
          <div className="flex items-center gap-3">
            {flash && (
              <span className="t-caption flex items-center gap-1 text-success" role="status">
                <Check size={14} aria-hidden /> {flash}
              </span>
            )}
            <Button onClick={save} disabled={!dirty || busy} className="min-h-9 px-4">
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="flex flex-col gap-4">
          <Segmented<Tab>
            label="Widget settings"
            value={tab}
            onChange={setTab}
            options={[
              { value: "appearance", label: "Appearance" },
              { value: "behaviour", label: "Behaviour" },
              { value: "install", label: "Install" },
            ]}
          />
          {error && !error.field && (
            <p className="t-caption text-danger" role="alert">
              {error.message}
            </p>
          )}

          {tab === "appearance" && (
            <Card className="flex flex-col gap-4">
              <Field label="Widget name" hint="Only you see this." error={err("name")}>
                {(a) => <Input {...a} value={draft.name} maxLength={60} onChange={(e) => set("name")(e.target.value)} />}
              </Field>
              <Field label="Chat title" error={err("title")}>
                {(a) => <Input {...a} value={draft.title} maxLength={60} onChange={(e) => set("title")(e.target.value)} />}
              </Field>
              <Field label="Greeting" error={err("greeting")}>
                {(a) => <Textarea {...a} value={draft.greeting} maxLength={300} onChange={(e) => set("greeting")(e.target.value)} />}
              </Field>
              <Field label="Accent colour" error={err("color")}>
                {(a) => (
                  <div className="flex items-center gap-3">
                    <input type="color" aria-label="Pick accent colour" value={draft.color} onChange={(e) => set("color")(e.target.value)} className="size-11 cursor-pointer rounded-md border border-hairline bg-canvas p-1" />
                    <Input {...a} value={draft.color} maxLength={7} onChange={(e) => set("color")(e.target.value)} className="font-mono" />
                  </div>
                )}
              </Field>
              <Field label="Logo URL" hint="Optional. An https:// image, square works best." error={err("avatar")}>
                {(a) => <Input {...a} type="url" value={draft.avatar} onChange={(e) => set("avatar")(e.target.value)} placeholder="https://" />}
              </Field>
              <fieldset className="flex flex-col gap-1.5">
                <legend className="t-caption-strong mb-1.5">Shown as</legend>
                <Segmented<"widget" | "link">
                  label="Widget type"
                  value={draft.type}
                  onChange={set("type")}
                  options={[
                    { value: "widget", label: "Website widget" },
                    { value: "link", label: "Chat link" },
                  ]}
                />
              </fieldset>
            </Card>
          )}

          {tab === "behaviour" && (
            <Card className="flex flex-col gap-4">
              <Field label="Persona and tone" hint="How the bot should sound. Example: friendly, short answers, call customers by first name." error={err("persona")}>
                {(a) => <Textarea {...a} value={draft.persona} maxLength={1000} onChange={(e) => set("persona")(e.target.value)} />}
              </Field>
              <Field label="Hand over to a person when the customer says" hint="Comma separated. Matched as whole words." error={err("escalation_keywords")}>
                {(a) => <Input {...a} value={draft.escalation_keywords} onChange={(e) => set("escalation_keywords")(e.target.value)} />}
              </Field>
              <fieldset className="flex flex-col gap-2">
                <legend className="t-caption-strong mb-1">Live lookups this bot may use</legend>
                {actions.length === 0 ? (
                  <p className="t-caption text-ink-48">
                    No API actions yet.{" "}
                    <a href="/app/train?tab=actions" className="text-primary hover:underline">
                      Add one under Train
                    </a>
                    .
                  </p>
                ) : (
                  actions.map((a) => {
                    const on = draft.enabled_action_ids.includes(a.id);
                    return (
                      <label key={a.id} className="flex min-h-11 cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            setDraft((d) => ({ ...d, enabled_action_ids: on ? d.enabled_action_ids.filter((x) => x !== a.id) : [...d.enabled_action_ids, a.id] }))
                          }
                          className="mt-1 size-4 accent-[var(--primary)]"
                        />
                        <span>
                          <span className="t-caption-strong block">{a.name}</span>
                          <span className="t-fine block text-ink-48">{a.description}</span>
                        </span>
                      </label>
                    );
                  })
                )}
                {err("enabled_action_ids") && <p className="t-caption text-danger">{err("enabled_action_ids")}</p>}
              </fieldset>
              <Field label="Allowed websites" hint="One domain per line, e.g. shop.example.com or *.example.com. Leave empty to allow any site." error={err("allowed_domains")}>
                {(a) => <Textarea {...a} value={draft.allowed_domains} onChange={(e) => set("allowed_domains")(e.target.value)} className="font-mono text-[15px]" />}
              </Field>
            </Card>
          )}

          {tab === "install" && <InstallPanel widgetId={initial.id} origin={origin} type={saved.type} color={saved.color} />}

          <button type="button" onClick={remove} className="t-caption self-start text-danger hover:underline">
            Delete widget
          </button>
        </div>

        <div className="flex items-start justify-center rounded-lg bg-parchment px-4 py-6 lg:sticky lg:top-[68px]">
          <div className="h-[min(620px,80dvh)] w-full max-w-[320px] overflow-hidden rounded-[40px] border-[10px] border-ink bg-canvas shadow-[var(--shadow-product)]" aria-label="Live preview">
            <ChatView
              title={draft.title || businessName}
              avatar={/^https:\/\//.test(draft.avatar) ? draft.avatar : null}
              accent={/^#[0-9a-f]{6}$/i.test(draft.color) ? draft.color : "#217a70"}
              status="Usually replies instantly"
              greeting={draft.greeting}
              messages={[
                { id: "p1", role: "buyer", text: "Do you ship to Pune?" },
                { id: "p2", role: "bot", text: "Yes, we deliver across India in 3–5 working days." },
              ]}
              disabled
            />
          </div>
        </div>
      </div>
    </>
  );
}

function InstallPanel({ widgetId, origin, type, color }: { widgetId: string; origin: string; type: "widget" | "link"; color: string }) {
  const link = `${origin}/w/${widgetId}`;
  const snippet = `<script src="${origin}/widget.js" data-widget="${widgetId}" data-color="${color}" async></script>`;
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!origin) return;
    QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: "#264653", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [link, origin]);

  const blocks = useMemo(
    () =>
      type === "widget"
        ? [
            { label: "Paste before </body> on every page", code: snippet },
            { label: "Or share the chat link", code: link },
          ]
        : [
            { label: "Share this chat link", code: link },
            { label: "Or embed it on a website", code: snippet },
          ],
    [type, snippet, link],
  );

  return (
    <Card className="flex flex-col gap-5">
      {blocks.map((b) => (
        <CodeBlock key={b.label} label={b.label} code={b.code} />
      ))}
      <a href={link} target="_blank" rel="noreferrer" className="t-caption flex items-center gap-1 text-primary hover:underline">
        Open the chat <ExternalLink size={14} aria-hidden />
      </a>
      {qr && (
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code for the chat link" className="size-32 rounded-md border border-hairline" />
          <div className="flex flex-col gap-2">
            <p className="t-caption text-ink-48">Print it on packaging or a shop counter card.</p>
            <a href={qr} download="bizzassist-chat-qr.png" className="t-caption flex items-center gap-1 text-primary hover:underline">
              <Download size={14} aria-hidden /> Download QR
            </a>
          </div>
        </div>
      )}
    </Card>
  );
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <p className="t-caption-strong">{label}</p>
      <div className="relative rounded-md bg-tile-1 p-3 pr-12">
        <code className="block break-all font-mono text-[13px] leading-relaxed text-white/90">{code}</code>
        <button
          type="button"
          aria-label={copied ? "Copied" : "Copy"}
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className={cn("press absolute right-1 top-1 flex size-11 items-center justify-center rounded-md text-white/70 hover:text-white")}
        >
          {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
        </button>
      </div>
    </div>
  );
}

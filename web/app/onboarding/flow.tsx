"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Check, Globe, Loader2 } from "lucide-react";
import { api } from "@/lib/client";
import { Button, Field, Input, cn } from "@/components/ui";
import { Wordmark } from "@/components/auth-shell";
import { LANGS } from "@/lib/langs";

const STEPS = ["Business", "Website", "Done"] as const;

const SWATCHES = ["#0066cc", "#1d1d1f", "#248a3d", "#b25000", "#8e44ad", "#d70015"];

export function OnboardingFlow({ businessName }: { businessName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [crawling, setCrawling] = useState(false);
  const [form, setForm] = useState({
    category: "",
    defaultLang: "en",
    supportHours: "",
    website: "",
    color: "#0066cc",
    greeting: "Hi! How can we help you today?",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const err = (field: string) => (error?.field === field ? error.message : undefined);

  async function finish(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api<{ widgetId: string; crawling: boolean }>("/api/onboarding", {
      body: {
        category: form.category,
        defaultLang: form.defaultLang,
        supportHours: form.supportHours,
        website: form.website,
        widget: { name: "Website chat", color: form.color, greeting: form.greeting, title: businessName.slice(0, 60) },
      },
    });
    setBusy(false);
    if (!res.ok) {
      setError({ field: res.field, message: res.error });
      if (res.field && ["category", "defaultLang", "supportHours"].includes(res.field)) setStep(0);
      return;
    }
    setWidgetId(res.data.widgetId);
    setCrawling(res.data.crawling);
    setStep(2);
  }

  return (
    <main className="min-h-dvh bg-pearl">
      <div className="mx-auto flex max-w-[520px] flex-col px-6 py-8">
        <div className="flex items-center justify-between">
          <Wordmark />
          <span className="t-mono text-ink-48">
            {step + 1} / {STEPS.length}
          </span>
        </div>
        <ol className="mt-14 mb-8 grid gap-2" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }} aria-label="Setup steps">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step ? "step" : undefined}>
              <span className="block h-1 overflow-hidden rounded-full bg-parchment">
                <span className="block h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: i <= step ? "100%" : "0%" }} />
              </span>
              <span className={cn("t-fine mt-2 block", i <= step ? "text-ink" : "text-ink-48")}>{s}</span>
            </li>
          ))}
        </ol>

        <div key={step} className="route-in w-full rounded-lg border border-hairline bg-canvas p-8 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
          {step === 0 && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                setStep(1);
              }}
            >
              <h1 className="t-section">Tell us about {businessName}</h1>
              <Field label="What do you sell?" hint="For example: handmade jewellery, phone repairs." error={err("category")}>
                {(a) => <Input {...a} value={form.category} onChange={(e) => set("category")(e.target.value)} maxLength={60} />}
              </Field>
              <Field label="Main customer language" error={err("defaultLang")}>
                {(a) => (
                  <select {...a} value={form.defaultLang} onChange={(e) => set("defaultLang")(e.target.value)} className="min-h-10 w-full rounded-md border border-hairline bg-canvas px-3 text-[15px] focus:border-primary focus:outline-none">
                    {LANGS.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="When can a person reply?" hint="Shown to the bot, e.g. Mon–Sat 10:00–19:00 IST." error={err("supportHours")}>
                {(a) => <Input {...a} value={form.supportHours} onChange={(e) => set("supportHours")(e.target.value)} maxLength={120} />}
              </Field>
              <Button type="submit" className="mt-2 w-full">
                Continue
              </Button>
            </form>
          )}

          {step === 1 && (
            <form className="flex flex-col gap-4" onSubmit={finish} noValidate>
              <h1 className="t-section">Your website and chat</h1>
              <Field label="Website" hint="Optional. You can add pages to train on later." error={err("website")}>
                {(a) => <Input {...a} type="url" inputMode="url" placeholder="yourshop.com" value={form.website} onChange={(e) => set("website")(e.target.value)} />}
              </Field>
              <fieldset className="flex flex-col gap-1.5">
                <legend className="t-caption-strong mb-1.5 text-ink-80">Chat colour</legend>
                <div className="flex gap-2">
                  {SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Colour ${c}`}
                      aria-pressed={form.color === c}
                      onClick={() => set("color")(c)}
                      className={cn("press size-10 rounded-[10px] ring-offset-2 ring-offset-canvas", form.color === c ? "ring-2 ring-ink" : "ring-1 ring-hairline")}
                      style={{ background: c }}
                    />
                  ))}
                </div>
                {err("color") && <p className="t-caption text-danger">{err("color")}</p>}
              </fieldset>
              <Field label="Greeting" error={err("greeting")}>
                {(a) => <Input {...a} value={form.greeting} onChange={(e) => set("greeting")(e.target.value)} maxLength={300} />}
              </Field>
              {error && !["website", "color", "greeting"].includes(error.field ?? "") && (
                <p className="t-caption text-danger" role="alert">
                  {error.message}
                </p>
              )}
              <div className="mt-2 flex gap-3">
                <Button variant="secondary" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button type="submit" disabled={busy} className="flex-1">
                  {busy ? "Saving…" : "Create my chat"}
                </Button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
                <Check aria-hidden size={24} />
              </span>
              <h1 className="t-tagline">Your chat is ready</h1>
              <p className="t-caption text-ink-48">
                {crawling ? "We're reading your website so the bot can answer from it. Add Q&A for anything it's missing." : "Add a few Q&A answers so the bot has something to say, then put the chat on your site."}
              </p>
              {crawling && <CrawlList />}
              <Button className="w-full" onClick={() => router.replace(widgetId ? `/app/widgets/${widgetId}?tab=install` : "/app")}>
                Get the install code
              </Button>
              <Button variant="ghost" onClick={() => router.replace("/app/train")}>
                Add Q&amp;A first
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

type Page = { id: string; title: string; url: string | null; status: string };

/** Live list of auto-crawled pages: polls for ~90 s while the background crawl runs. */
function CrawlList() {
  const [pages, setPages] = useState<Page[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let stop = false;
    const started = Date.now();
    async function tick() {
      const res = await api<{ items: Page[] }>("/api/knowledge?source=web");
      if (stop) return;
      if (res.ok) setPages(res.data.items);
      if (Date.now() - started > 90_000) setDone(true);
      else setTimeout(tick, 2000);
    }
    void tick();
    return () => {
      stop = true;
    };
  }, []);

  return (
    <ul className="w-full divide-y divide-divider rounded-md border border-hairline text-left" aria-live="polite">
      {pages.map((p) => (
        <li key={p.id} className="row-in flex items-center gap-3 px-3 py-2">
          <Globe size={16} className="shrink-0 text-ink-48" aria-hidden />
          <span className="t-caption min-w-0 flex-1 truncate">{p.title || p.url}</span>
          <Check size={16} className="shrink-0 text-success" aria-label="Read" />
        </li>
      ))}
      <li className="t-caption flex items-center gap-3 px-3 py-2 text-ink-48">
        {done ? (
          <span>{pages.length ? `${pages.length} pages ready.` : "We couldn't read pages from that site. Add them under Train › Website."}</span>
        ) : (
          <>
            <Loader2 size={16} className="shrink-0 animate-spin" aria-hidden />
            <span>{pages.length ? `${pages.length} pages read, looking for more…` : "Reading your homepage and policy pages…"}</span>
          </>
        )}
      </li>
    </ul>
  );
}

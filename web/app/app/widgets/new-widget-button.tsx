"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui";

export function NewWidgetButton({ disabledReason }: { disabledReason?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(disabledReason ?? null);

  async function create() {
    setBusy(true);
    const res = await api<{ widget: { id: string } }>("/api/widgets", { body: { name: "New widget" } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push(`/app/widgets/${res.data.widget.id}`);
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span className="hidden t-fine text-ink-48 md:inline">{error}</span>}
      <Button onClick={create} disabled={busy || Boolean(disabledReason)} className="min-h-9 px-4" title={disabledReason}>
        <Plus size={16} aria-hidden /> New widget
      </Button>
    </div>
  );
}

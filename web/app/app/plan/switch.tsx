"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import type { Plan } from "@/lib/plans";
import { Button } from "@/components/ui";

/** Demo upgrade/downgrade: switches the plan at once, no payment. */
export function PlanSwitch({ plan, label, up }: { plan: Plan; label: string; up: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    const res = await api("/api/plan", { body: { plan } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  return (
    <div className="mt-auto flex flex-col gap-2">
      <Button variant={up ? "primary" : "secondary"} onClick={go} disabled={busy} className="w-full">
        {busy ? "Switching…" : `${up ? "Upgrade" : "Switch"} to ${label}`}
      </Button>
      {error && (
        <p className="t-caption text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

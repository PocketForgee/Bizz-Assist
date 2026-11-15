"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { Button, Field, Input } from "@/components/ui";

type Mode = "login" | "signup";

const FIELDS: Record<Mode, { name: string; label: string; type: string; autoComplete: string }[]> = {
  signup: [
    { name: "name", label: "Your name", type: "text", autoComplete: "name" },
    { name: "businessName", label: "Business name", type: "text", autoComplete: "organization" },
    { name: "email", label: "Work email", type: "email", autoComplete: "email" },
    { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
  ],
  login: [
    { name: "email", label: "Email", type: "email", autoComplete: "email" },
    { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
  ],
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const res = await api<{ next: string }>(`/api/auth/${mode}`, { body });
    if (!res.ok) {
      setError({ field: res.field, message: res.error });
      setBusy(false);
      return;
    }
    router.replace(res.data.next);
    router.refresh();
  }

  const fields = FIELDS[mode];
  const fieldNames = fields.map((f) => f.name);
  const generalError = error && (!error.field || !fieldNames.includes(error.field)) ? error.message : null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {fields.map((f) => (
        <Field
          key={f.name}
          label={f.label}
          error={error?.field === f.name ? error.message : undefined}
          hint={mode === "signup" && f.name === "password" ? "At least 8 characters." : undefined}
        >
          {(a) => <Input {...a} name={f.name} type={f.type} autoComplete={f.autoComplete} required minLength={f.name === "password" && mode === "signup" ? 8 : undefined} />}
        </Field>
      ))}
      {generalError && (
        <p className="t-caption text-danger" role="alert">
          {generalError}
        </p>
      )}
      <Button type="submit" disabled={busy} className="mt-2 w-full">
        {busy ? (mode === "signup" ? "Creating account…" : "Signing in…") : mode === "signup" ? "Create account" : "Sign in"}
      </Button>
      <p className="t-caption text-center text-ink-48">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to BizzAssist?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

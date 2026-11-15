"use client";

import { useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui";

/** Right-side sheet (DESIGN_SPEC: "Adding a source opens a right sheet"). Escape and backdrop close it; focus moves inside. */
export function Sheet({
  title,
  onClose,
  onSubmit,
  submitLabel,
  busy,
  error,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  onSubmit?: (e: FormEvent) => void;
  submitLabel?: string;
  busy?: boolean;
  error?: string | null;
  children: ReactNode;
  wide?: boolean;
}) {
  const panel = useRef<HTMLFormElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const first = panel.current?.querySelector<HTMLElement>("input, textarea, select");
    first?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <form
        ref={panel}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.(e);
        }}
        className={`route-in absolute inset-y-0 right-0 flex w-full flex-col bg-canvas shadow-[var(--shadow-pop)] ${wide ? "max-w-[560px]" : "max-w-[440px]"}`}
      >
        <div className="flex items-center justify-between border-b border-divider px-6 py-3">
          <h2 className="t-tagline">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="press -mr-2 flex size-11 items-center justify-center rounded-full hover:bg-parchment">
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">{children}</div>
        {(onSubmit || error) && (
          <div className="flex flex-col gap-3 border-t border-divider px-6 py-4">
            {error && (
              <p className="t-caption text-danger" role="alert">
                {error}
              </p>
            )}
            {onSubmit && (
              <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy} className="flex-1">
                  {busy ? "Saving…" : (submitLabel ?? "Save")}
                </Button>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Link from "next/link";
import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";

export const cn = (...v: ClassValue[]) => twMerge(clsx(v));

type Variant = "primary" | "secondary" | "dark" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-focus",
  secondary: "bg-transparent text-primary border border-primary hover:bg-primary/5",
  dark: "bg-ink text-white hover:bg-ink-80",
  ghost: "bg-transparent text-primary hover:underline",
  danger: "bg-transparent text-danger border border-danger/40 hover:bg-danger/5",
};

const base =
  "press inline-flex items-center justify-center gap-2 rounded-pill px-[22px] min-h-11 t-body-strong whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={cn(base, VARIANTS[variant], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(base, VARIANTS[variant], className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-lg border border-hairline bg-canvas p-6", className)} {...props} />;
}

export function Chip({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  const tones = {
    neutral: "bg-parchment text-ink-80",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    info: "bg-primary/10 text-primary",
  };
  return <span className={cn("inline-flex items-center rounded-pill px-2.5 py-0.5 t-fine font-semibold", tones[tone], className)} {...props} />;
}

const inputCls =
  "w-full rounded-md border border-hairline bg-canvas px-3.5 min-h-11 text-[17px] text-ink placeholder:text-ink-48 transition-colors focus:border-primary-focus focus:outline-none aria-[invalid=true]:border-danger";

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputCls, className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(inputCls, "py-2.5 min-h-24 resize-y", className)} {...props} />;
});

/** Label + control + hint/error. The control gets id / aria-describedby wired automatically through render props. */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: (a: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="t-caption-strong text-ink">
        {label}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": error || hint ? msgId : undefined })}
      {error ? (
        <p id={msgId} className="t-caption text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="t-caption text-ink-48">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Frosted sticky page header: title left, one primary action right. */
export function SubNav({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="frosted sticky top-0 z-10 -mx-6 mb-6 flex h-[52px] items-center justify-between border-b border-hairline/60 px-6 lg:-mx-8 lg:px-8">
      <h1 className="t-tagline text-ink">{title}</h1>
      {action}
    </div>
  );
}

export function EmptyState({ line, action }: { line: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
      <p className="t-body-strong text-ink-80">{line}</p>
      {action}
    </div>
  );
}

/** Segmented control (Apple grammar): parchment track, white selected pill. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-pill bg-parchment p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "press min-h-9 rounded-pill px-4 t-caption-strong",
            value === o.value ? "bg-canvas text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-ink-48 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

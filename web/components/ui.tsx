import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Link from "next/link";
import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";

export const cn = (...v: ClassValue[]) => twMerge(clsx(v));

type Variant = "primary" | "secondary" | "dark" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_1px_2px_rgb(38_70_83/0.08)] hover:bg-primary-focus",
  secondary: "bg-canvas text-ink border border-hairline shadow-[0_1px_2px_rgb(38_70_83/0.04)] hover:bg-parchment",
  dark: "bg-ink text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-tile-2",
  ghost: "bg-transparent text-ink-80 hover:bg-parchment hover:text-ink",
  danger: "bg-canvas text-danger border border-hairline hover:border-danger/40 hover:bg-danger/5",
};

const base =
  "press inline-flex items-center justify-center gap-2 rounded-md px-4 min-h-10 text-[14px] font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={cn(base, VARIANTS[variant], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(base, VARIANTS[variant], className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-lg border border-hairline bg-canvas p-6 shadow-[0_1px_2px_rgb(38_70_83/0.04)]", className)} {...props} />;
}

export function Chip({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  const tones = {
    neutral: "bg-parchment text-ink-80",
    success: "bg-success/8 text-success",
    warning: "bg-warning/8 text-warning",
    danger: "bg-danger/8 text-danger",
    info: "bg-primary-soft text-primary",
  };
  return <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-sm px-2 text-[12px] font-medium", tones[tone], className)} {...props} />;
}

const inputCls =
  "w-full rounded-md border border-hairline bg-canvas px-3 min-h-10 text-[15px] text-ink shadow-[0_1px_2px_rgb(38_70_83/0.03)] placeholder:text-ink-48 transition-[border-color,box-shadow] focus:border-ink/30 focus:shadow-[var(--ring)] focus:outline-none aria-[invalid=true]:border-danger";

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
      <label htmlFor={id} className="t-caption-strong text-ink-80">
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

/** Sticky page header: title (and an optional line under it) left, one primary action right. */
export function SubNav({ title, lead, action }: { title: string; lead?: ReactNode; action?: ReactNode }) {
  return (
    <div className="frosted sticky top-14 z-10 -mx-4 mb-6 flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline px-4 py-3 sm:-mx-6 sm:mb-8 sm:px-6 min-[900px]:top-0 lg:-mx-10 lg:px-10">
      <div className="min-w-0">
        <h1 className="text-[20px] font-medium leading-tight tracking-[-0.01em] text-ink">{title}</h1>
        {lead && <p className="t-caption mt-0.5 text-ink-48 sm:truncate">{lead}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ line, action }: { line: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-hairline px-6 py-14 text-center">
      <p className="t-body-strong max-w-sm text-ink-80">{line}</p>
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
    <div role="tablist" aria-label={label} className="inline-flex rounded-md bg-parchment p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "press min-h-8 rounded-[8px] px-3 t-caption-strong tabular-nums",
            value === o.value ? "bg-canvas text-ink shadow-[0_1px_2px_rgb(38_70_83/0.08),0_0_0_1px_rgb(38_70_83/0.04)]" : "text-ink-48 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

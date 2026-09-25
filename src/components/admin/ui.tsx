// Peças visuais pequenas reutilizadas no painel administrativo.
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2, X } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import type { DonationStatus } from "@/lib/campaign/types";
import { STATUS_LABEL } from "@/lib/campaign/types";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn("rounded-3xl bg-white p-5 shadow-[0_8px_24px_-16px_rgb(0_0_0/0.3)]", className)}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-kid-display text-xl font-extrabold uppercase">{children}</h2>
      {action}
    </div>
  );
}

type Tone = "blue" | "green" | "red" | "yellow" | "ghost" | "dark";

const TONES: Record<Tone, string> = {
  blue: "bg-kid-blue text-white",
  green: "bg-kid-green text-white",
  red: "bg-kid-red text-white",
  yellow: "bg-kid-yellow text-kid-ink",
  dark: "bg-kid-ink text-white",
  ghost: "bg-kid-blue-soft text-kid-ink",
};

export function Btn({
  tone = "blue",
  loading,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; loading?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3.5 text-sm font-extrabold transition active:scale-[.97] disabled:opacity-50",
        TONES[tone],
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

const STATUS_STYLE: Record<DonationStatus, string> = {
  RESERVED: "bg-kid-yellow-soft text-kid-ink ring-kid-yellow",
  PRODUCT_RECEIVED: "bg-kid-blue-soft text-kid-blue-deep ring-kid-blue/40",
  PIX_PENDING: "bg-orange-50 text-orange-800 ring-orange-300",
  PIX_CONFIRMED: "bg-kid-green-soft text-green-800 ring-kid-green/50",
  CANCELLED: "bg-gray-100 text-gray-500 ring-gray-300",
};

export function StatusBadge({ status }: { status: DonationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold ring-1",
        STATUS_STYLE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-kid-ink/60" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="kids fixed inset-x-0 bottom-0 z-50 max-h-[94dvh] overflow-y-auto rounded-t-3xl bg-kid-cream p-5 shadow-2xl outline-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <DialogPrimitive.Title className="font-kid-display text-xl font-extrabold uppercase">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white shadow"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-sm font-extrabold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-kid-muted">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "h-11 w-full rounded-xl border-2 border-kid-line bg-white px-3 font-semibold outline-none focus:border-kid-blue";

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 border-kid-line bg-white px-3 py-2.5">
      <span className="text-sm font-bold">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition",
          checked ? "bg-kid-green" : "bg-gray-300",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "left-6" : "left-1",
          )}
        />
      </button>
    </label>
  );
}

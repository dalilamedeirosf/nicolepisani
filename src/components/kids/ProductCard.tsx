import { CheckCircle2, Heart as HeartIcon } from "lucide-react";

import type { PublicProduct } from "@/lib/campaign/public.functions";
import { cotas, formatAmount, formatBRL } from "@/lib/campaign/types";
import { cn } from "@/lib/utils";

import { ProgressBar, Star } from "./decor";

export function ProductCard({
  product,
  open,
  onContribute,
}: {
  product: PublicProduct;
  open: boolean;
  onContribute: (product: PublicProduct) => void;
}) {
  const p = product;
  const tone = p.complete ? "green" : p.percent >= 60 ? "blue" : p.percent >= 25 ? "yellow" : "red";

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-3xl border-2 bg-white p-5 shadow-[0_8px_24px_-14px_rgb(0_0_0/0.25)] transition",
        p.complete ? "border-kid-green/40" : "border-transparent",
      )}
    >
      {p.complete && (
        <>
          <Star className="kid-pop absolute right-4 top-4 h-6 w-6 text-kid-yellow" />
          <Star className="kid-pop absolute right-11 top-9 h-3.5 w-3.5 text-kid-green [animation-delay:.15s]" />
        </>
      )}
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-4xl",
            p.complete ? "bg-kid-green-soft" : "bg-kid-yellow-soft",
          )}
          aria-hidden
        >
          {p.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase tracking-wider text-kid-muted">{p.name}</p>
          <h3 className="font-kid-display text-xl font-bold uppercase leading-tight text-kid-ink">
            {p.unitDescription}
          </h3>
          <p className="mt-1 text-sm text-kid-muted">
            Valor estimado: <strong className="text-kid-ink">{formatBRL(p.estimatedPrice)}</strong>{" "}
            por cota
          </p>
        </div>
      </div>

      {p.description && <p className="mt-3 text-sm text-kid-muted">{p.description}</p>}

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-2xl bg-kid-blue-soft px-2 py-2">
          <dt className="font-bold text-kid-muted">Precisamos</dt>
          <dd className="font-kid-display text-base font-bold leading-tight text-kid-ink">
            {formatAmount(p, p.totalUnits)}
          </dd>
        </div>
        <div className="rounded-2xl bg-kid-green-soft px-2 py-2">
          <dt className="font-bold text-kid-muted">Preenchidas</dt>
          <dd className="font-kid-display text-base font-bold leading-tight text-kid-ink">
            {p.committedUnits}/{p.totalUnits}
          </dd>
        </div>
        <div className="rounded-2xl bg-kid-red-soft px-2 py-2">
          <dt className="font-bold text-kid-muted">Faltam</dt>
          <dd className="font-kid-display text-base font-bold leading-tight text-kid-ink">
            {cotas(p.remainingUnits)}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-xs font-semibold text-kid-muted">
        {cotas(p.totalUnits)} de {p.unitDescription}
      </p>
      <div className="mt-1.5 flex items-center gap-3">
        <ProgressBar value={p.percent} tone={tone} label={`Progresso de ${p.name}`} />
        <span className="w-12 shrink-0 text-right font-kid-display text-sm font-bold">
          {p.committedUnits}/{p.totalUnits}
        </span>
      </div>

      <div className="mt-auto pt-4">
        {p.complete ? (
          <div className="kid-pop flex h-14 items-center justify-center gap-2 rounded-2xl bg-kid-green text-lg font-extrabold uppercase text-white">
            <CheckCircle2 className="h-5 w-5" /> Meta atingida!
          </div>
        ) : (
          <>
            <p className="mb-2 text-center text-sm font-extrabold uppercase text-kid-red">
              Faltam {cotas(p.remainingUnits)}
            </p>
            <button
              type="button"
              disabled={!open}
              onClick={() => onContribute(p)}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-kid-blue text-lg font-extrabold uppercase tracking-wide text-white shadow-[0_6px_0_0_var(--kid-blue-deep)] transition active:translate-y-1 active:shadow-[0_2px_0_0_var(--kid-blue-deep)] disabled:cursor-not-allowed disabled:bg-kid-muted/40 disabled:shadow-none"
            >
              <HeartIcon className="h-5 w-5" /> {open ? "Quero contribuir" : "Campanha encerrada"}
            </button>
          </>
        )}
      </div>
    </article>
  );
}

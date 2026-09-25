import { useEffect, useState } from "react";

import { Heart } from "./decor";

function split(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function Countdown({
  deadline,
  open,
  now,
}: {
  deadline: string;
  open: boolean;
  now: number | null;
}) {
  const remaining = new Date(deadline).getTime() - (now ?? Date.now());

  if (!open) {
    return (
      <div className="rounded-3xl border-2 border-kid-red/20 bg-white p-5 text-center shadow-[0_10px_30px_-12px_rgb(0_0_0/0.18)]">
        <Heart className="mx-auto h-8 w-8 text-kid-red" />
        <p className="mt-2 font-kid-display text-xl font-bold leading-tight text-kid-ink">
          Campanha de doações encerrada.
        </p>
        <p className="mt-1 text-kid-muted">Obrigado a todos que participaram!</p>
      </div>
    );
  }

  const t = split(remaining);
  const cells = [
    { value: t.days, label: t.days === 1 ? "dia" : "dias", color: "bg-kid-blue" },
    { value: t.hours, label: t.hours === 1 ? "hora" : "horas", color: "bg-kid-green" },
    { value: t.minutes, label: t.minutes === 1 ? "minuto" : "minutos", color: "bg-kid-red" },
    { value: t.seconds, label: "seg", color: "bg-kid-yellow text-kid-ink" },
  ];

  return (
    <div className="rounded-3xl bg-white p-5 text-center shadow-[0_10px_30px_-12px_rgb(0_0_0/0.18)]">
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-kid-muted">Faltam</p>
      <div className="mt-3 grid grid-cols-4 gap-2" aria-live="off">
        {cells.map((c) => (
          <div key={c.label} className={`rounded-2xl ${c.color} px-1 py-3 text-white`}>
            <div className="font-kid-display text-3xl font-extrabold leading-none tabular-nums sm:text-4xl">
              {now === null ? "–" : String(c.value).padStart(2, "0")}
            </div>
            <div className="mt-1 text-[11px] font-bold uppercase tracking-wide opacity-90">
              {c.label}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm font-semibold text-kid-muted">para encerrarmos as doações.</p>
    </div>
  );
}

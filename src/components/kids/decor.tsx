import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12 2.5c.4 0 .8.2 1 .6l2.4 4.9 5.4.8c.9.1 1.2 1.2.6 1.8l-3.9 3.8.9 5.4c.2.9-.8 1.6-1.6 1.1L12 18.4l-4.8 2.5c-.8.5-1.8-.2-1.6-1.1l.9-5.4-3.9-3.8c-.6-.6-.3-1.7.6-1.8l5.4-.8 2.4-4.9c.2-.4.6-.6 1-.6Z"
      />
    </svg>
  );
}

export function Heart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4.2.3.8.3 1 0 .7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21Z"
      />
    </svg>
  );
}

/** Formas decorativas espalhadas no fundo do cabeçalho. */
export function HeroDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="kid-dots absolute inset-0" />
      <Star className="kid-float absolute left-[6%] top-[14%] h-7 w-7 text-kid-yellow" />
      <Star className="kid-float absolute right-[8%] top-[26%] h-5 w-5 text-white/70 [animation-delay:1.2s]" />
      <Star className="kid-float absolute bottom-[4%] left-[28%] h-4 w-4 text-white/60 [animation-delay:2s]" />
      <Heart className="kid-float absolute bottom-[6%] right-[8%] h-6 w-6 text-kid-red [animation-delay:.6s]" />
      <span className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-kid-yellow/25" />
      <span className="absolute -right-16 top-1/3 h-52 w-52 rounded-full bg-kid-green/25" />
      <span className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-kid-red/20" />
      <span className="absolute left-[30%] top-[8%] h-3 w-3 rotate-12 rounded-sm bg-kid-yellow" />
      <span className="absolute right-[28%] top-[12%] h-2.5 w-2.5 rounded-full bg-kid-red" />
      <span className="absolute bottom-[14%] right-[34%] h-3 w-3 -rotate-12 rounded-sm bg-kid-green" />
      <span className="absolute bottom-[10%] left-[8%] h-2.5 w-2.5 rounded-full bg-white/80" />
    </div>
  );
}

const CONFETTI_COLORS = [
  "var(--kid-blue)",
  "var(--kid-yellow)",
  "var(--kid-red)",
  "var(--kid-green)",
];

/** Chuva curta de confetes (comemorações). */
export function ConfettiBurst({ pieces = 28, className }: { pieces?: number; className?: string }) {
  const [items, setItems] = useState<
    { left: number; delay: number; color: string; round: boolean; size: number }[]
  >([]);
  useEffect(() => {
    setItems(
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: Math.random() > 0.5,
        size: 6 + Math.random() * 6,
      })),
    );
  }, [pieces]);
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden", className)}
    >
      {items.map((p, i) => (
        <span
          key={i}
          className="kid-confetti-piece absolute top-0"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.5,
            borderRadius: p.round ? 999 : 2,
            background: p.color,
            animation: `kid-confetti 1.8s ease-out ${p.delay}s both`,
          }}
        />
      ))}
    </div>
  );
}

export function ProgressBar({
  value,
  className,
  tone = "rainbow",
  animated = false,
  label,
}: {
  value: number;
  className?: string;
  tone?: "rainbow" | "blue" | "green" | "yellow" | "red";
  animated?: boolean;
  label?: string;
}) {
  const fill = {
    rainbow: "kid-rainbow",
    blue: "bg-kid-blue",
    green: "bg-kid-green",
    yellow: "bg-kid-yellow",
    red: "bg-kid-red",
  }[tone];
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={label}
      className={cn("h-3 w-full overflow-hidden rounded-full bg-kid-blue-soft", className)}
    >
      <div
        className={cn(
          "relative h-full rounded-full transition-[width] duration-700 ease-out",
          fill,
        )}
        style={{ width: `${v}%`, minWidth: v > 0 ? "0.75rem" : 0 }}
      >
        <div
          className={cn("kid-stripes absolute inset-0 rounded-full", animated && "kid-bar-anim")}
        />
      </div>
    </div>
  );
}

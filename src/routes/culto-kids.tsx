import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarHeart, ChevronDown, Gift, Target } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Countdown, useNow } from "@/components/kids/Countdown";
import { ContributeDialog, WhatsAppIcon } from "@/components/kids/ContributeDialog";
import { Heart, HeroDecor, ProgressBar, Star } from "@/components/kids/decor";
import { ProductCard } from "@/components/kids/ProductCard";
import { campaignShareText, whatsappShareUrl } from "@/components/kids/share";
import {
  getPublicCampaign,
  type PublicCampaign,
  type PublicProduct,
} from "@/lib/campaign/public.functions";
import {
  categoryIcon,
  cotas,
  formatBRL,
  formatDateBR,
  groupByCategory,
  mostNeeded,
} from "@/lib/campaign/types";

// Para o preview do WhatsApp o ideal é URL absoluta: defina VITE_SITE_URL (ex.: https://seusite.com).
const OG_IMAGE = `${(import.meta.env.VITE_SITE_URL ?? "").replace(/\/$/, "")}/culto-kids-og.jpg`;

const TITLE = "Culto Kids 🎉 | CBVIDA RIO — Lista de doações";
const DESCRIPTION =
  "Vamos juntos preparar um dia inesquecível para nossas crianças! Escolha um item para doar ou contribua via PIX.";

export const Route = createFileRoute("/culto-kids")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "theme-color", content: "#2f5fd8" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800&display=swap",
      },
    ],
  }),
  loader: () => getPublicCampaign(),
  component: CultoKidsPage,
});

const campaignQueryKey = ["culto-kids", "public"] as const;

function CultoKidsPage() {
  const initial = Route.useLoaderData();
  const query = useQuery({
    queryKey: campaignQueryKey,
    queryFn: () => getPublicCampaign(),
    initialData: initial,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });
  const data = query.data;
  const now = useNow(1000);
  const open =
    data.isOpen && (now === null || now <= new Date(data.settings.campaignDeadline).getTime());
  const [selected, setSelected] = useState<PublicProduct | null>(null);

  const refresh = useCallback(() => void query.refetch(), [query]);
  const choose = useCallback(
    (p: PublicProduct) => {
      if (!open || p.complete) return;
      setSelected(p);
    },
    [open],
  );

  const deadline = formatDateBR(data.settings.campaignDeadline);

  return (
    <div className="kids min-h-screen overflow-x-hidden">
      <Hero data={data} deadline={deadline} open={open} />
      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="relative z-10 mx-auto -mt-20 max-w-md">
          <Countdown deadline={data.settings.campaignDeadline} open={open} now={now} />
        </div>
        <OverallProgress data={data} />
        {open && <MostNeeded products={data.products} onContribute={choose} />}
        {!open && <ClosedNotice />}
        <HowItWorks deadline={deadline} />
        <ProductList products={data.products} open={open} onContribute={choose} />
        {data.settings.showSupporters && data.supporters.length > 0 && (
          <Supporters names={data.supporters} />
        )}
        <ShareBlock data={data} deadline={deadline} />
      </main>
      <Footer data={data} deadline={deadline} />
      <ContributeDialog
        product={selected ? (data.products.find((p) => p.id === selected.id) ?? selected) : null}
        campaign={data}
        onClose={() => setSelected(null)}
        onChanged={refresh}
      />
    </div>
  );
}

function Hero({ data, deadline, open }: { data: PublicCampaign; deadline: string; open: boolean }) {
  const s = data.settings;
  return (
    <header className="relative overflow-hidden bg-kid-blue pb-28 pt-8 text-white sm:pb-32 sm:pt-12">
      <HeroDecor />
      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-extrabold uppercase tracking-[0.25em] ring-1 ring-white/30">
          {s.institutionName}
        </span>
        <h1 className="mt-4 font-kid-display text-6xl font-extrabold uppercase leading-[0.9] drop-shadow-[0_4px_0_var(--kid-blue-deep)] sm:text-8xl">
          {s.campaignName} <span className="inline-block kid-float">🎉</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-kid-display text-2xl font-bold leading-tight text-kid-yellow sm:text-3xl">
          Vamos juntos preparar um dia inesquecível para nossas crianças!
        </p>
        <p className="mx-auto mt-4 max-w-xl text-lg font-semibold text-white/90">
          “{s.campaignMessage}”
        </p>
        <p className="mx-auto mt-2 max-w-xl text-white/85">
          “Escolha abaixo um item para doar ou, se preferir, contribua com o valor correspondente
          via PIX.”
        </p>

        <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-kid-ink shadow-lg">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-kid-red text-white">
              <Target className="h-6 w-6" />
            </span>
            <p className="font-extrabold leading-tight">
              🎯 Nossa missão: preparar tudo para {s.childrenGoal} crianças
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-kid-yellow px-4 py-3 text-kid-ink shadow-lg">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-kid-ink text-kid-yellow">
              <CalendarHeart className="h-6 w-6" />
            </span>
            <p className="font-extrabold uppercase leading-tight">
              📅 Receberemos as doações somente até {deadline}
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-left text-sm font-semibold sm:grid-cols-2">
          <p className="rounded-2xl bg-white/12 px-4 py-2.5 ring-1 ring-white/20">
            🎁 <strong>Produtos:</strong> deverão ser entregues presencialmente na igreja.
          </p>
          <p className="rounded-2xl bg-white/12 px-4 py-2.5 ring-1 ring-white/20">
            💠 <strong>PIX:</strong> você também pode contribuir com o valor estimado de qualquer
            item.
          </p>
        </div>

        {open && (
          <a
            href="#lista"
            className="mt-7 inline-flex h-14 items-center gap-2 whitespace-nowrap rounded-2xl bg-kid-yellow px-6 text-base font-extrabold uppercase text-kid-ink shadow-[0_6px_0_0_oklch(0.7_0.14_80)] active:translate-y-1 active:shadow-none"
          >
            <Gift className="h-5 w-5" /> Ver a lista <ChevronDown className="h-5 w-5" />
          </a>
        )}
      </div>
    </header>
  );
}

function OverallProgress({ data }: { data: PublicCampaign }) {
  const s = data.stats;
  const items = [
    {
      icon: "🎁",
      label: "Produtos reservados",
      value: cotas(s.reservedUnits),
      bg: "bg-kid-yellow-soft",
    },
    {
      icon: "📦",
      label: "Produtos recebidos",
      value: cotas(s.receivedUnits),
      bg: "bg-kid-blue-soft",
    },
    {
      icon: "💠",
      label: "Contribuições via PIX",
      value: formatBRL(s.pixConfirmedValue),
      bg: "bg-kid-green-soft",
    },
    {
      icon: "❤️",
      label: "Total de contribuições",
      value: String(s.contributionsCount),
      bg: "bg-kid-red-soft",
    },
    {
      icon: "🎯",
      label: "Cotas restantes",
      value: String(s.remainingUnits),
      bg: "bg-white ring-2 ring-kid-line",
    },
  ];
  return (
    <section aria-labelledby="progresso" className="mt-8">
      <div className="rounded-[2rem] bg-white p-6 shadow-[0_14px_40px_-20px_rgb(0_0_0/0.3)] sm:p-8">
        <h2
          id="progresso"
          className="text-center font-kid-display text-2xl font-extrabold uppercase leading-tight sm:text-3xl"
        >
          <span className="text-5xl text-kid-blue sm:text-6xl">{s.percent}%</span>
          <br />
          da nossa meta já foi alcançada! 🎉
        </h2>
        <ProgressBar
          value={s.percent}
          className="mt-5 h-6"
          animated
          label="Progresso geral da campanha"
        />
        <p className="mt-2 text-center text-sm font-semibold text-kid-muted">
          {s.committedUnits} de {s.totalUnits} cotas preenchidas
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {items.map((i, idx) => (
            <div
              key={i.label}
              className={`rounded-2xl p-4 text-center ${i.bg} ${idx === 4 ? "col-span-2 sm:col-span-1" : ""}`}
            >
              <div className="text-2xl" aria-hidden>
                {i.icon}
              </div>
              <dd className="font-kid-display text-2xl font-extrabold leading-tight">{i.value}</dd>
              <dt className="text-xs font-bold uppercase text-kid-muted">{i.label}</dt>
            </div>
          ))}
        </dl>
        {s.pixPendingUnits > 0 && (
          <p className="mt-3 text-center text-xs font-semibold text-kid-muted">
            ⏳ Contribuições via PIX aparecem no valor acima depois que a equipe confirma o
            recebimento.
          </p>
        )}
      </div>
    </section>
  );
}

function MostNeeded({
  products,
  onContribute,
}: {
  products: PublicProduct[];
  onContribute: (p: PublicProduct) => void;
}) {
  const items = mostNeeded(products, 5);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="precisamos" className="mt-10">
      <h2
        id="precisamos"
        className="font-kid-display text-2xl font-extrabold uppercase sm:text-3xl"
      >
        ❤️ Ainda precisamos principalmente de:
      </h2>
      <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
        {items.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onContribute(p)}
            className="w-44 shrink-0 snap-start rounded-3xl border-2 border-kid-red/20 bg-white p-4 text-left shadow-sm transition active:scale-[.98] sm:w-auto"
          >
            <div className="text-4xl" aria-hidden>
              {p.icon}
            </div>
            <p className="mt-2 font-kid-display text-lg font-bold leading-tight">{p.name}</p>
            <p className="text-sm font-bold text-kid-red">Faltam {cotas(p.remainingUnits)}</p>
            <ProgressBar
              value={p.percent}
              tone="red"
              className="mt-2 h-2"
              label={`Progresso de ${p.name}`}
            />
            <span className="mt-3 block rounded-xl bg-kid-blue py-2 text-center text-sm font-extrabold uppercase text-white">
              Quero ajudar
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ClosedNotice() {
  return (
    <section className="mt-10 rounded-[2rem] bg-kid-red p-8 text-center text-white">
      <Heart className="mx-auto h-10 w-10" />
      <h2 className="mt-2 font-kid-display text-3xl font-extrabold uppercase">
        Campanha encerrada ❤️
      </h2>
      <p className="mx-auto mt-2 max-w-md text-lg font-semibold">
        “Obrigado a cada pessoa que contribuiu para tornar esse Culto Kids possível.”
      </p>
    </section>
  );
}

function HowItWorks({ deadline }: { deadline: string }) {
  const product = [
    "Escolha um item da lista.",
    "Clique em “Quero contribuir”.",
    "Selecione “Vou doar o produto”.",
    "Informe seu nome e WhatsApp.",
    "Reserve sua cota.",
    `Entregue o produto presencialmente na igreja até ${deadline}.`,
  ];
  const pix = [
    "Escolha um item.",
    "Clique em “Quero contribuir”.",
    "Selecione “Quero contribuir via PIX”.",
    "O sistema mostrará o valor estimado da cota.",
    "Faça o PIX.",
    "Informe seu nome e WhatsApp e confirme o envio.",
  ];
  return (
    <section aria-labelledby="como" className="mt-12">
      <h2 id="como" className="text-center font-kid-display text-3xl font-extrabold uppercase">
        Como posso ajudar?
      </h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Steps color="blue" title="🎁 Opção 1 — Doar um produto" steps={product} />
        <Steps color="green" title="💠 Opção 2 — Contribuir via PIX" steps={pix} />
      </div>
      <p className="mt-4 text-center text-sm font-semibold text-kid-muted">
        Os valores apresentados são estimativas utilizadas apenas como referência para facilitar as
        contribuições.
      </p>
    </section>
  );
}

function Steps({
  color,
  title,
  steps,
}: {
  color: "blue" | "green";
  title: string;
  steps: string[];
}) {
  const bg = color === "blue" ? "bg-kid-blue" : "bg-kid-green";
  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm">
      <h3 className="font-kid-display text-xl font-extrabold uppercase">{title}</h3>
      <ol className="mt-4 space-y-3">
        {steps.map((s, i) => (
          <li key={s} className="flex items-start gap-3 font-semibold">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${bg} font-kid-display font-extrabold text-white`}
            >
              {i + 1}
            </span>
            <span className="pt-1">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ProductList({
  products,
  open,
  onContribute,
}: {
  products: PublicProduct[];
  open: boolean;
  onContribute: (p: PublicProduct) => void;
}) {
  const groups = useMemo(() => groupByCategory(products), [products]);
  const slug = (c: string) =>
    `cat-${c
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section id="lista" aria-labelledby="lista-titulo" className="mt-14 scroll-mt-4">
      <h2
        id="lista-titulo"
        className="text-center font-kid-display text-3xl font-extrabold uppercase"
      >
        Lista de doações
      </h2>
      <nav
        aria-label="Categorias"
        className="sticky top-0 z-20 -mx-4 mt-4 flex gap-2 overflow-x-auto bg-kid-cream/95 px-4 py-3 backdrop-blur sm:mx-0 sm:justify-center sm:px-0"
      >
        {groups.map((g) => (
          <a
            key={g.category}
            href={`#${slug(g.category)}`}
            className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-extrabold shadow-sm ring-1 ring-kid-line"
          >
            {categoryIcon(g.category)} {g.category}
          </a>
        ))}
      </nav>
      {groups.map((g, gi) => (
        <div key={g.category} id={slug(g.category)} className="mt-8 scroll-mt-20">
          <div className="mb-4 flex items-center gap-3">
            <span
              className={`grid h-12 w-12 place-items-center rounded-2xl text-2xl ${
                ["bg-kid-red-soft", "bg-kid-yellow-soft", "bg-kid-blue-soft", "bg-kid-green-soft"][
                  gi % 4
                ]
              }`}
              aria-hidden
            >
              {categoryIcon(g.category)}
            </span>
            <h3 className="font-kid-display text-2xl font-extrabold uppercase">{g.category}</h3>
            <span className="ml-auto text-sm font-bold text-kid-muted">
              faltam {cotas(g.items.reduce((s, p) => s + p.remainingUnits, 0))}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((p) => (
              <ProductCard key={p.id} product={p} open={open} onContribute={onContribute} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function Supporters({ names }: { names: string[] }) {
  return (
    <section aria-labelledby="apoiadores" className="mt-14 text-center">
      <h2 id="apoiadores" className="font-kid-display text-2xl font-extrabold uppercase">
        💛 Quem já está ajudando
      </h2>
      <ul className="mt-4 flex flex-wrap justify-center gap-2">
        {names.map((n, i) => (
          <li
            key={`${n}-${i}`}
            className={`rounded-full px-4 py-1.5 font-bold text-white ${
              ["bg-kid-blue", "bg-kid-green", "bg-kid-red", "bg-kid-yellow !text-kid-ink"][i % 4]
            }`}
          >
            {n}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ShareBlock({ data, deadline }: { data: PublicCampaign; deadline: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(`${window.location.origin}${window.location.pathname}`), []);
  const text = campaignShareText({
    institution: data.settings.institutionName,
    children: data.settings.childrenGoal,
    deadline,
    url,
  });
  return (
    <section className="relative mt-14 overflow-hidden rounded-[2rem] bg-kid-green p-8 text-center text-white">
      <Star className="absolute left-5 top-5 h-6 w-6 text-kid-yellow" />
      <Heart className="absolute bottom-5 right-6 h-6 w-6 text-white/60" />
      <h2 className="font-kid-display text-2xl font-extrabold uppercase leading-tight sm:text-3xl">
        Ajude a gente a alcançar mais pessoas ❤️
      </h2>
      <a
        href={whatsappShareUrl(text)}
        target="_blank"
        rel="noreferrer"
        className="mx-auto mt-5 flex h-14 max-w-sm items-center justify-center gap-2 rounded-2xl bg-white text-lg font-extrabold uppercase text-[#128C7E] shadow-[0_5px_0_0_rgb(0_0_0/0.15)] active:translate-y-1 active:shadow-none"
      >
        <WhatsAppIcon className="h-6 w-6" /> Compartilhar no WhatsApp
      </a>
    </section>
  );
}

function Footer({ data, deadline }: { data: PublicCampaign; deadline: string }) {
  return (
    <footer className="relative overflow-hidden bg-kid-ink px-5 pb-10 pt-12 text-center text-white">
      <div className="kid-rainbow absolute inset-x-0 top-0 h-2" />
      <p className="font-kid-display text-3xl font-extrabold uppercase tracking-wide">
        {data.settings.institutionName}
      </p>
      <p className="mt-1 text-lg font-bold text-kid-yellow">O lugar do seu recomeço. ❤️</p>
      <p className="mx-auto mt-4 max-w-md text-lg">“Obrigado por semear na próxima geração.”</p>
      <ul className="mx-auto mt-6 grid max-w-2xl gap-2 text-sm font-semibold sm:grid-cols-3">
        <li className="rounded-2xl bg-white/10 px-4 py-3">📅 Doações até {deadline}</li>
        <li className="rounded-2xl bg-white/10 px-4 py-3">
          🎁 Produtos deverão ser entregues presencialmente na igreja.
        </li>
        <li className="rounded-2xl bg-white/10 px-4 py-3">
          💠 Também aceitamos contribuições via PIX.
        </li>
      </ul>
      {data.settings.deliveryLocation && (
        <p className="mt-4 text-sm text-white/70">
          Local de entrega: {data.settings.deliveryLocation}
        </p>
      )}
    </footer>
  );
}

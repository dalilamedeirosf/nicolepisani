import { AlertTriangle } from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ProgressBar } from "@/components/kids/decor";
import type { AdminData } from "@/lib/campaign/admin.functions";
import {
  categoryIcon,
  cotas,
  formatBRL,
  formatDateBR,
  groupByCategory,
  mostNeeded,
} from "@/lib/campaign/types";

import { Card, SectionTitle } from "./ui";

// Paleta validada (validate_palette.js): verde / amarelo / azul; "faltando" em cinza neutro.
const C = {
  confirmed: "#1f9d57",
  pending: "#e0a81a",
  missing: "#dfe5ef",
  line: "#2f6fe0",
  grid: "#eef1f6",
  axis: "#6b7591",
};

export function Overview({ data }: { data: AdminData }) {
  const s = data.stats;
  const pixPending = data.donations.filter((d) => d.status === "PIX_PENDING");
  const pixConfirmed = data.donations.filter((d) => d.status === "PIX_CONFIRMED");

  const tiles = [
    { label: "Total de cotas", value: String(s.totalUnits), icon: "🧮" },
    { label: "Cotas disponíveis", value: String(s.remainingUnits), icon: "🟢" },
    { label: "Cotas reservadas", value: String(s.reservedUnits), icon: "🟡" },
    { label: "Produtos recebidos", value: cotas(s.receivedUnits), icon: "📦" },
    {
      label: "PIX aguardando",
      value: formatBRL(s.pixPendingValue),
      icon: "⏳",
      sub: `${pixPending.length} ${pixPending.length === 1 ? "contribuição" : "contribuições"} a conferir`,
    },
    {
      label: "PIX confirmados",
      value: String(pixConfirmed.length),
      icon: "💠",
      sub: undefined as string | undefined,
    },
    { label: "Valor recebido via PIX", value: formatBRL(s.pixConfirmedValue), icon: "💰" },
    {
      label: "Meta alcançada",
      value: `${s.percent}%`,
      icon: "🎯",
      sub: `${s.confirmedPercent}% já recebido/confirmado`,
    },
  ];

  return (
    <div className="space-y-6">
      <Alerts data={data} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <p className="text-xs font-extrabold uppercase text-kid-muted">
              <span aria-hidden>{t.icon}</span> {t.label}
            </p>
            <p className="mt-1 font-kid-display text-2xl font-extrabold leading-tight">{t.value}</p>
            {t.sub && <p className="text-xs font-semibold text-kid-muted">{t.sub}</p>}
          </Card>
        ))}
      </div>

      <Card>
        <SectionTitle>Progresso geral</SectionTitle>
        <ProgressBar value={s.percent} className="h-5" label="Progresso geral" />
        <p className="mt-2 text-sm font-semibold text-kid-muted">
          {s.committedUnits} de {s.totalUnits} cotas comprometidas ·{" "}
          {s.receivedUnits + s.pixConfirmedUnits} já recebidas ou confirmadas
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryChart data={data} />
        <EvolutionChart data={data} />
      </div>

      <NeedList data={data} />
    </div>
  );
}

function Alerts({ data }: { data: AdminData }) {
  const alerts: string[] = [];
  if (!data.settings.pixKey.trim())
    alerts.push("A chave PIX ainda não foi cadastrada (Configurações).");
  if (!data.isOpen)
    alerts.push(
      data.settings.campaignActive
        ? `O prazo terminou em ${formatDateBR(data.settings.campaignDeadline, { day: "2-digit", month: "2-digit", year: "numeric" })}. Novas doações estão bloqueadas.`
        : "A campanha está encerrada manualmente. Novas doações estão bloqueadas.",
    );
  const over = data.products.filter((p) => p.committedUnits > p.totalUnits);
  if (over.length)
    alerts.push(
      `Itens com mais cotas comprometidas do que a meta: ${over.map((p) => p.name).join(", ")}.`,
    );
  if (!alerts.length) return null;
  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <p
          key={a}
          className="flex items-start gap-2 rounded-2xl bg-kid-red-soft p-3 text-sm font-bold text-kid-ink"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-kid-red" /> {a}
        </p>
      ))}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-kid-line">
      <p className="mb-1 font-extrabold">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 font-semibold text-kid-ink">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

function CategoryChart({ data }: { data: AdminData }) {
  const rows = useMemo(
    () =>
      groupByCategory(data.products.filter((p) => p.active)).map(({ category, items }) => ({
        category: `${categoryIcon(category)} ${category}`,
        "Recebido / confirmado": items.reduce(
          (s, p) => s + p.receivedUnits + p.pixConfirmedUnits,
          0,
        ),
        "Reservado / PIX pendente": items.reduce(
          (s, p) => s + p.reservedUnits + p.pixPendingUnits,
          0,
        ),
        Faltando: items.reduce((s, p) => s + p.remainingUnits, 0),
      })),
    [data.products],
  );
  return (
    <Card>
      <SectionTitle>Doações por categoria (cotas)</SectionTitle>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ left: 8, right: 8 }}
            barCategoryGap={10}
          >
            <CartesianGrid horizontal={false} stroke={C.grid} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fill: C.axis, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="category"
              width={128}
              tick={{ fill: C.axis, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgb(0 0 0 / 0.04)" }} />
            <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="Recebido / confirmado"
              stackId="a"
              fill={C.confirmed}
              stroke="#fff"
              strokeWidth={2}
            />
            <Bar
              dataKey="Reservado / PIX pendente"
              stackId="a"
              fill={C.pending}
              stroke="#fff"
              strokeWidth={2}
            />
            <Bar
              dataKey="Faltando"
              stackId="a"
              fill={C.missing}
              stroke="#fff"
              strokeWidth={2}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function EvolutionChart({ data }: { data: AdminData }) {
  const rows = useMemo(() => {
    const byDay = new Map<string, { cotas: number }>();
    const active = data.donations
      .filter((d) => d.status !== "CANCELLED")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const d of active) {
      const day = formatDateBR(d.createdAt);
      const cur = byDay.get(day) ?? { cotas: 0 };
      cur.cotas += d.quantity;
      byDay.set(day, cur);
    }
    let total = 0;
    const points = [...byDay.entries()].map(([day, v]) => {
      total += v.cotas;
      return { day, "Cotas acumuladas": total };
    });
    // com um único dia, começa do zero para a linha ficar visível
    return points.length === 1 ? [{ day: "Início", "Cotas acumuladas": 0 }, ...points] : points;
  }, [data.donations]);

  return (
    <Card>
      <SectionTitle>Evolução das doações</SectionTitle>
      {rows.length === 0 ? (
        <p className="grid h-72 place-items-center text-sm font-semibold text-kid-muted">
          Nenhuma contribuição registrada ainda.
        </p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ left: -16, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis
                dataKey="day"
                tick={{ fill: C.axis, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: C.axis, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: C.axis, strokeDasharray: "3 3" }}
              />
              <Area
                type="monotone"
                dataKey="Cotas acumuladas"
                stroke={C.line}
                strokeWidth={2}
                fill={C.line}
                fillOpacity={0.12}
                dot={{ r: 4, fill: C.line, stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 text-center">
        <div className="rounded-2xl bg-kid-green-soft p-3">
          <p className="text-xs font-extrabold uppercase text-kid-muted">💠 PIX recebido</p>
          <p className="font-kid-display text-xl font-extrabold">
            {formatBRL(data.stats.pixConfirmedValue)}
          </p>
        </div>
        <div className="rounded-2xl bg-kid-yellow-soft p-3">
          <p className="text-xs font-extrabold uppercase text-kid-muted">⏳ PIX a conferir</p>
          <p className="font-kid-display text-xl font-extrabold">
            {formatBRL(data.stats.pixPendingValue)}
          </p>
        </div>
      </div>
    </Card>
  );
}

function NeedList({ data }: { data: AdminData }) {
  const items = mostNeeded(data.products, 100);
  return (
    <Card>
      <SectionTitle>🚨 Itens que mais precisamos</SectionTitle>
      {items.length === 0 ? (
        <p className="font-bold text-kid-green">✅ Todas as metas foram atingidas!</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-kid-muted">
                <th className="py-2 pr-2">Item</th>
                <th className="py-2 pr-2">Progresso</th>
                <th className="py-2 pr-2 text-right">Preenchidas</th>
                <th className="py-2 pr-2 text-right">Recebidas</th>
                <th className="py-2 text-right">Faltam</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-kid-line">
                  <td className="py-2 pr-2 font-bold">
                    {p.icon} {p.name}
                  </td>
                  <td className="w-40 py-2 pr-2">
                    <div className="flex items-center gap-2">
                      <ProgressBar
                        value={p.percent}
                        tone={p.percent < 25 ? "red" : p.percent < 60 ? "yellow" : "blue"}
                        className="h-2"
                        label={p.name}
                      />
                      <span className="w-9 text-right text-xs font-bold">{p.percent}%</span>
                    </div>
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">
                    {p.committedUnits}/{p.totalUnits}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">
                    {p.receivedUnits + p.pixConfirmedUnits}
                  </td>
                  <td className="py-2 text-right font-extrabold text-kid-red tabular-nums">
                    {p.remainingUnits}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

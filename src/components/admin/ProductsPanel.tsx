import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ProgressBar } from "@/components/kids/decor";
import { saveProduct, type AdminData } from "@/lib/campaign/admin.functions";
import {
  categoryIcon,
  cotas,
  formatAmount,
  formatBRL,
  groupByCategory,
  type ProductProgress,
} from "@/lib/campaign/types";
import { cn } from "@/lib/utils";

import { Btn, Card, Field, Modal, SectionTitle, Toggle, inputCls } from "./ui";

type Draft = {
  id?: string;
  name: string;
  category: string;
  description: string;
  unitDescription: string;
  unitAmount: string;
  unitSingular: string;
  unitPlural: string;
  totalUnits: string;
  estimatedPrice: string;
  icon: string;
  sortOrder: string;
  active: boolean;
};

const EMOJIS = [
  "🎁",
  "🎂",
  "🍫",
  "🍬",
  "🧁",
  "🍪",
  "🥪",
  "🍕",
  "🍟",
  "🥤",
  "🧃",
  "🎈",
  "🎉",
  "🧸",
  "🎨",
  "🖍️",
  "🎀",
  "🪅",
  "🍽️",
  "🧻",
];

const money = (n: number) => n.toFixed(2).replace(".", ",");
const parseNum = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));

function toDraft(p?: ProductProgress, nextOrder = 0): Draft {
  return p
    ? {
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        unitDescription: p.unitDescription,
        unitAmount: String(p.unitAmount).replace(".", ","),
        unitSingular: p.unitSingular,
        unitPlural: p.unitPlural,
        totalUnits: String(p.totalUnits),
        estimatedPrice: money(p.estimatedPrice),
        icon: p.icon,
        sortOrder: String(p.sortOrder),
        active: p.active,
      }
    : {
        name: "",
        category: "",
        description: "",
        unitDescription: "",
        unitAmount: "1",
        unitSingular: "unidade",
        unitPlural: "unidades",
        totalUnits: "1",
        estimatedPrice: "",
        icon: "🎁",
        sortOrder: String(nextOrder),
        active: true,
      };
}

export function ProductsPanel({ data, onChanged }: { data: AdminData; onChanged: () => void }) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const groups = useMemo(() => groupByCategory(data.products), [data.products]);
  const categories = useMemo(
    () => [...new Set(data.products.map((p) => p.category))],
    [data.products],
  );
  const nextOrder = Math.max(0, ...data.products.map((p) => p.sortOrder)) + 10;

  async function toggleActive(p: ProductProgress) {
    try {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = p;
      await saveProduct({ data: { id: p.id, ...pickProduct(rest), active: !p.active } });
      toast.success(p.active ? "Item desativado (some da página pública)." : "Item ativado.");
      onChanged();
    } catch {
      toast.error("Não foi possível alterar o item.");
    }
  }

  return (
    <div className="space-y-5">
      <Btn
        tone="green"
        className="h-12 w-full text-base sm:w-auto"
        onClick={() => setEditing(toDraft(undefined, nextOrder))}
      >
        <Plus className="h-5 w-5" /> Adicionar novo item
      </Btn>

      {groups.map((g) => (
        <div key={g.category}>
          <SectionTitle>
            {categoryIcon(g.category)} {g.category}
          </SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {g.items.map((p) => (
              <Card key={p.id} className={cn("p-4", !p.active && "opacity-60")}>
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-kid-yellow-soft text-2xl">
                    {p.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">
                      {p.name}{" "}
                      {!p.active && (
                        <span className="text-xs font-bold text-kid-red">(desativado)</span>
                      )}
                    </p>
                    <p className="text-sm text-kid-muted">
                      1 cota = {p.unitDescription} · {formatBRL(p.estimatedPrice)}
                    </p>
                    <p className="text-sm text-kid-muted">
                      Meta: {cotas(p.totalUnits)} ({formatAmount(p, p.totalUnits)})
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <ProgressBar
                    value={p.percent}
                    tone={p.complete ? "green" : "blue"}
                    className="h-2.5"
                    label={p.name}
                  />
                  <span className="shrink-0 text-xs font-bold tabular-nums">
                    {p.committedUnits}/{p.totalUnits}
                  </span>
                </div>
                <p className="mt-1 text-xs text-kid-muted">
                  🟡 {p.reservedUnits} reservadas · 📦 {p.receivedUnits} recebidas · ⏳{" "}
                  {p.pixPendingUnits} PIX pend. · 💠 {p.pixConfirmedUnits} PIX conf.
                </p>
                <div className="mt-3 flex gap-2">
                  <Btn tone="ghost" onClick={() => setEditing(toDraft(p))}>
                    Editar
                  </Btn>
                  <Btn tone={p.active ? "red" : "green"} onClick={() => toggleActive(p)}>
                    {p.active ? "Desativar" : "Ativar"}
                  </Btn>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Editar item" : "Novo item"}
      >
        {editing && (
          <ProductForm
            key={editing.id ?? "new"}
            initial={editing}
            categories={categories}
            committed={data.products.find((p) => p.id === editing.id)?.committedUnits ?? 0}
            onSaved={() => {
              setEditing(null);
              onChanged();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function pickProduct(p: Omit<ProductProgress, "id" | "createdAt" | "updatedAt">) {
  return {
    name: p.name,
    category: p.category,
    description: p.description,
    unitDescription: p.unitDescription,
    unitAmount: p.unitAmount,
    unitSingular: p.unitSingular,
    unitPlural: p.unitPlural,
    totalUnits: p.totalUnits,
    estimatedPrice: p.estimatedPrice,
    icon: p.icon,
    sortOrder: p.sortOrder,
    active: p.active,
  };
}

function ProductForm({
  initial,
  categories,
  committed,
  onSaved,
}: {
  initial: Draft;
  categories: string[];
  committed: number;
  onSaved: () => void;
}) {
  const [d, setD] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((cur) => ({ ...cur, [k]: v }));

  async function save() {
    const unitAmount = parseNum(d.unitAmount);
    const totalUnits = Number(d.totalUnits);
    const estimatedPrice = parseNum(d.estimatedPrice);
    const sortOrder = Number(d.sortOrder) || 0;
    if (!d.name.trim() || !d.category.trim() || !d.unitDescription.trim())
      return toast.error("Preencha nome, categoria e o que é 1 cota.");
    if (!(unitAmount > 0)) return toast.error("Quantidade por cota inválida.");
    if (!Number.isInteger(totalUnits) || totalUnits < 0)
      return toast.error("Número de cotas inválido.");
    if (!(estimatedPrice >= 0) || d.estimatedPrice.trim() === "")
      return toast.error("Informe o valor estimado por cota.");
    if (
      totalUnits < committed &&
      !window.confirm(
        `Já existem ${committed} cotas comprometidas neste item. Reduzir a meta para ${totalUnits} mesmo assim?`,
      )
    )
      return;
    setSaving(true);
    try {
      await saveProduct({
        data: {
          id: d.id,
          name: d.name.trim(),
          category: d.category.trim(),
          description: d.description.trim(),
          unitDescription: d.unitDescription.trim(),
          unitAmount,
          unitSingular: d.unitSingular.trim() || "unidade",
          unitPlural: d.unitPlural.trim() || "unidades",
          totalUnits,
          estimatedPrice,
          icon: d.icon.trim() || "🎁",
          sortOrder,
          active: d.active,
        },
      });
      toast.success(
        d.id ? "Item atualizado. Novas contribuições usam o novo valor." : "Item adicionado!",
      );
      onSaved();
    } catch {
      toast.error("Não foi possível salvar o item.");
    } finally {
      setSaving(false);
    }
  }

  const preview = parseNum(d.unitAmount) > 0 && Number(d.totalUnits) > 0;

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[5rem_1fr] gap-3">
        <Field label="Ícone">
          <input
            value={d.icon}
            onChange={(e) => set("icon", e.target.value)}
            className={cn(inputCls, "text-center text-2xl")}
            maxLength={8}
          />
        </Field>
        <Field label="Nome do item">
          <input
            value={d.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ex.: Brigadeiro"
            className={inputCls}
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => set("icon", e)}
            className="grid h-9 w-9 place-items-center rounded-lg bg-white text-xl shadow-sm"
          >
            {e}
          </button>
        ))}
      </div>
      <Field
        label="Categoria"
        hint="Escolha uma existente ou digite uma nova (ex.: Brinquedos, Decoração)."
      >
        <input
          value={d.category}
          onChange={(e) => set("category", e.target.value)}
          list="categorias"
          className={inputCls}
        />
        <datalist id="categorias">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field label="O que é 1 cota" hint='Texto exibido no card. Ex.: "50 brigadeiros"'>
        <input
          value={d.unitDescription}
          onChange={(e) => set("unitDescription", e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label="Descrição (opcional)">
        <textarea
          value={d.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          className={cn(inputCls, "h-auto py-2")}
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Qtd. por cota">
          <input
            value={d.unitAmount}
            onChange={(e) => set("unitAmount", e.target.value)}
            inputMode="decimal"
            className={inputCls}
          />
        </Field>
        <Field label="Unidade (1)">
          <input
            value={d.unitSingular}
            onChange={(e) => set("unitSingular", e.target.value)}
            placeholder="brigadeiro"
            className={inputCls}
          />
        </Field>
        <Field label="Unidade (2+)">
          <input
            value={d.unitPlural}
            onChange={(e) => set("unitPlural", e.target.value)}
            placeholder="brigadeiros"
            className={inputCls}
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Nº de cotas">
          <input
            value={d.totalUnits}
            onChange={(e) => set("totalUnits", e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className={inputCls}
          />
        </Field>
        <Field label="Valor/cota (R$)">
          <input
            value={d.estimatedPrice}
            onChange={(e) => set("estimatedPrice", e.target.value.replace(/[^\d,.]/g, ""))}
            inputMode="decimal"
            className={inputCls}
          />
        </Field>
        <Field label="Ordem">
          <input
            value={d.sortOrder}
            onChange={(e) => set("sortOrder", e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className={inputCls}
          />
        </Field>
      </div>
      {preview && (
        <p className="rounded-xl bg-kid-blue-soft p-3 text-sm font-semibold">
          Meta total:{" "}
          {formatAmount(
            {
              unitAmount: parseNum(d.unitAmount),
              unitSingular: d.unitSingular,
              unitPlural: d.unitPlural,
            },
            Number(d.totalUnits),
          )}{" "}
          · {cotas(Number(d.totalUnits))} de {formatBRL(parseNum(d.estimatedPrice) || 0)}
        </p>
      )}
      <Toggle
        checked={d.active}
        onChange={(v) => set("active", v)}
        label="Item ativo (aparece na página pública)"
      />
      {d.id && (
        <p className="text-xs text-kid-muted">
          Alterar o valor não muda contribuições já registradas.
        </p>
      )}
      <Btn tone="blue" className="h-12" loading={saving} onClick={save}>
        {d.id ? "Salvar item" : "Adicionar item"}
      </Btn>
    </div>
  );
}

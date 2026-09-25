import { ExternalLink, FileText, MessageCircle, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { whatsappChatUrl } from "@/components/kids/share";
import { getReceipt, updateDonation, type AdminData } from "@/lib/campaign/admin.functions";
import {
  ERROR_MESSAGE,
  STATUSES_FOR_TYPE,
  STATUS_LABEL,
  cotas,
  formatAmount,
  formatBRL,
  formatDateTimeBR,
  formatPhone,
  isValidPhone,
  type Donation,
  type DonationStatus,
  type ProductProgress,
} from "@/lib/campaign/types";
import { cn } from "@/lib/utils";

import { Btn, Card, Field, Modal, StatusBadge, inputCls } from "./ui";

type Patch = Parameters<typeof updateDonation>[0]["data"];

function useDonationActions(onDone: () => void) {
  const [busy, setBusy] = useState<string | null>(null);
  async function run(patch: Patch, success: string) {
    setBusy(`${patch.id}:${patch.status ?? "edit"}`);
    try {
      const result = await updateDonation({ data: patch });
      if (result.ok) toast.success(success);
      else
        toast.error(
          result.code === "SOLD_OUT"
            ? `Não há cotas suficientes para este item (disponíveis: ${result.available ?? 0}).`
            : ERROR_MESSAGE[result.code],
        );
      onDone();
      return result.ok;
    } catch (e) {
      toast.error(
        e instanceof Error && e.message.includes("UNAUTHORIZED")
          ? "Sessão expirada. Entre novamente."
          : "Erro ao salvar.",
      );
      onDone();
      return false;
    } finally {
      setBusy(null);
    }
  }
  return { busy, run };
}

export function DonationsPanel({
  data,
  onChanged,
  pixOnly = false,
}: {
  data: AdminData;
  onChanged: () => void;
  pixOnly?: boolean;
}) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"ALL" | "PRODUCT" | "PIX">(pixOnly ? "PIX" : "ALL");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | DonationStatus>(
    pixOnly ? "PIX_PENDING" : "ACTIVE",
  );
  const [productId, setProductId] = useState("ALL");
  const [editing, setEditing] = useState<Donation | null>(null);
  const actions = useDonationActions(onChanged);

  const products = useMemo(() => new Map(data.products.map((p) => [p.id, p])), [data.products]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    return data.donations.filter((d) => {
      if (type !== "ALL" && d.donationType !== type) return false;
      if (status === "ACTIVE" ? d.status === "CANCELLED" : status !== "ALL" && d.status !== status)
        return false;
      if (productId !== "ALL" && d.productId !== productId) return false;
      if (!term) return true;
      const p = products.get(d.productId);
      return (
        d.donorName.toLowerCase().includes(term) ||
        (digits.length >= 3 && d.phone.includes(digits)) ||
        (p?.name.toLowerCase().includes(term) ?? false)
      );
    });
  }, [data.donations, q, type, status, productId, products]);

  const statusOptions: { value: typeof status; label: string }[] = [
    { value: "ACTIVE", label: "Ativas (sem canceladas)" },
    { value: "ALL", label: "Todas" },
    ...(pixOnly
      ? STATUSES_FOR_TYPE.PIX
      : ([
          "RESERVED",
          "PRODUCT_RECEIVED",
          "PIX_PENDING",
          "PIX_CONFIRMED",
          "CANCELLED",
        ] as DonationStatus[])
    ).map((s) => ({ value: s, label: STATUS_LABEL[s] })),
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kid-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar nome, telefone ou item"
              className={cn(inputCls, "pl-9")}
            />
          </label>
          {!pixOnly && (
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className={inputCls}
              aria-label="Forma"
            >
              <option value="ALL">Todas as formas</option>
              <option value="PRODUCT">🎁 Produto</option>
              <option value="PIX">💠 PIX</option>
            </select>
          )}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className={inputCls}
            aria-label="Status"
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={inputCls}
            aria-label="Item"
          >
            <option value="ALL">Todos os itens</option>
            {data.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.icon} {p.name}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-xs font-bold text-kid-muted">
          {list.length} {list.length === 1 ? "registro" : "registros"}
        </p>
      </Card>

      {list.length === 0 ? (
        <Card className="text-center font-semibold text-kid-muted">
          Nenhuma contribuição encontrada com esses filtros.
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((d) => (
            <DonationRow
              key={d.id}
              donation={d}
              product={products.get(d.productId)}
              actions={actions}
              onEdit={() => setEditing(d)}
            />
          ))}
        </div>
      )}

      <EditDonation
        donation={editing}
        product={editing ? products.get(editing.productId) : undefined}
        onClose={() => setEditing(null)}
        actions={actions}
      />
    </div>
  );
}

function DonationRow({
  donation: d,
  product,
  actions,
  onEdit,
}: {
  donation: Donation;
  product: ProductProgress | undefined;
  actions: ReturnType<typeof useDonationActions>;
  onEdit: () => void;
}) {
  const isBusy = (s: string) => actions.busy === `${d.id}:${s}`;
  const mismatch =
    d.donationType === "PIX" &&
    d.reportedPixValue !== null &&
    Math.abs(d.reportedPixValue - d.estimatedValue) >= 0.01;
  const contactText = `Olá, ${d.donorName.split(" ")[0]}! Aqui é da equipe do Culto Kids da CBVIDA RIO. Obrigado pela sua contribuição com ${product?.name ?? "a campanha"} ❤️`;

  const run = (patch: Omit<Patch, "id">, msg: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    void actions.run({ id: d.id, ...patch }, msg);
  };

  return (
    <Card className={cn("p-4", d.status === "CANCELLED" && "opacity-60")}>
      <div className="grid gap-3 lg:grid-cols-[1.3fr_1.4fr_1fr_1fr] lg:items-center">
        <div className="min-w-0">
          <p className="truncate font-extrabold">{d.donorName}</p>
          <a
            href={whatsappChatUrl(d.phone)}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-kid-blue underline-offset-2 hover:underline"
          >
            {formatPhone(d.phone)}
          </a>
          <p className="text-xs text-kid-muted">{formatDateTimeBR(d.createdAt)}</p>
        </div>
        <div className="min-w-0">
          <p className="font-bold">
            {product?.icon} {product?.name ?? "Item removido"}
          </p>
          <p className="text-sm text-kid-muted">
            {cotas(d.quantity)}
            {product && ` · ${formatAmount(product, d.quantity)}`}
          </p>
        </div>
        <div>
          <p className="text-sm font-bold">{d.donationType === "PIX" ? "💠 PIX" : "🎁 Produto"}</p>
          <p className="text-sm text-kid-muted">
            {d.donationType === "PIX" ? "Esperado" : "Estimado"}: {formatBRL(d.estimatedValue)}
          </p>
          {d.donationType === "PIX" && (
            <p
              className={cn("text-sm", mismatch ? "font-extrabold text-kid-red" : "text-kid-muted")}
            >
              Informado: {d.reportedPixValue === null ? "—" : formatBRL(d.reportedPixValue)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <StatusBadge status={d.status} />
        </div>
      </div>
      {d.adminNotes && (
        <p className="mt-2 rounded-xl bg-kid-cream px-3 py-2 text-xs font-semibold text-kid-muted">
          📝 {d.adminNotes}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-kid-line pt-3">
        {d.status === "RESERVED" && (
          <>
            <Btn
              tone="green"
              loading={isBusy("PRODUCT_RECEIVED")}
              onClick={() => run({ status: "PRODUCT_RECEIVED" }, "📦 Recebimento confirmado!")}
            >
              📦 Confirmar recebimento
            </Btn>
            <Btn tone="ghost" onClick={onEdit}>
              Editar
            </Btn>
            <Btn
              tone="red"
              loading={isBusy("CANCELLED")}
              onClick={() =>
                run(
                  { status: "CANCELLED" },
                  "Reserva cancelada. As cotas voltaram a ficar disponíveis.",
                  `Cancelar a reserva de ${d.donorName}? As cotas voltam a ficar disponíveis.`,
                )
              }
            >
              Cancelar reserva
            </Btn>
          </>
        )}
        {d.status === "PRODUCT_RECEIVED" && (
          <>
            <Btn
              tone="ghost"
              loading={isBusy("RESERVED")}
              onClick={() =>
                run(
                  { status: "RESERVED" },
                  "Voltou para reservado.",
                  "Desfazer a confirmação de recebimento?",
                )
              }
            >
              Desfazer recebimento
            </Btn>
            <Btn tone="ghost" onClick={onEdit}>
              Editar
            </Btn>
          </>
        )}
        {d.status === "PIX_PENDING" && (
          <>
            <Btn
              tone="green"
              loading={isBusy("PIX_CONFIRMED")}
              onClick={() =>
                run(
                  { status: "PIX_CONFIRMED" },
                  "💠 PIX confirmado!",
                  `Confirmar que o PIX de ${d.donorName} foi recebido na conta?`,
                )
              }
            >
              💠 Confirmar PIX
            </Btn>
            <Btn
              tone="red"
              loading={isBusy("CANCELLED")}
              onClick={() => {
                const reason = window.prompt(
                  "Recusar este PIX? As cotas voltam a ficar disponíveis.\nMotivo (opcional):",
                  "PIX não localizado",
                );
                if (reason === null) return;
                void actions.run(
                  {
                    id: d.id,
                    status: "CANCELLED",
                    adminNotes: `PIX recusado${reason ? `: ${reason}` : ""}`,
                  },
                  "PIX recusado.",
                );
              }}
            >
              Recusar
            </Btn>
            <Btn tone="ghost" onClick={onEdit}>
              Editar
            </Btn>
          </>
        )}
        {d.status === "PIX_CONFIRMED" && (
          <Btn
            tone="ghost"
            loading={isBusy("PIX_PENDING")}
            onClick={() =>
              run(
                { status: "PIX_PENDING" },
                "Voltou para aguardando confirmação.",
                "Voltar este PIX para 'aguardando confirmação'?",
              )
            }
          >
            Desfazer confirmação
          </Btn>
        )}
        {d.status === "CANCELLED" && (
          <Btn
            tone="ghost"
            loading={isBusy(d.donationType === "PIX" ? "PIX_PENDING" : "RESERVED")}
            onClick={() =>
              run(
                { status: d.donationType === "PIX" ? "PIX_PENDING" : "RESERVED" },
                "Contribuição reativada.",
                "Reativar esta contribuição? (só funciona se ainda houver cotas disponíveis)",
              )
            }
          >
            Reativar
          </Btn>
        )}
        {d.hasReceipt && <ReceiptButton donationId={d.id} />}
        <a
          href={whatsappChatUrl(d.phone, contactText)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 text-sm font-extrabold text-white"
        >
          <MessageCircle className="h-4 w-4" /> Entrar em contato
        </a>
      </div>
    </Card>
  );
}

function ReceiptButton({ donationId }: { donationId: string }) {
  const [loading, setLoading] = useState(false);
  async function open() {
    const win = window.open("", "_blank");
    setLoading(true);
    try {
      const r = await getReceipt({ data: { donationId } });
      if (!r) {
        win?.close();
        toast.error("Comprovante não encontrado.");
        return;
      }
      const bytes = Uint8Array.from(atob(r.data), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: r.mime }));
      if (win) win.location.href = url;
      else window.location.href = url;
    } catch {
      win?.close();
      toast.error("Não foi possível abrir o comprovante.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Btn tone="dark" loading={loading} onClick={open}>
      <FileText className="h-4 w-4" /> Comprovante <ExternalLink className="h-3.5 w-3.5" />
    </Btn>
  );
}

function EditDonation({
  donation,
  product,
  onClose,
  actions,
}: {
  donation: Donation | null;
  product: ProductProgress | undefined;
  onClose: () => void;
  actions: ReturnType<typeof useDonationActions>;
}) {
  return (
    <Modal open={donation !== null} onClose={onClose} title="Editar contribuição">
      {donation && (
        <EditForm
          key={donation.id}
          donation={donation}
          product={product}
          onClose={onClose}
          actions={actions}
        />
      )}
    </Modal>
  );
}

function EditForm({
  donation: d,
  product,
  onClose,
  actions,
}: {
  donation: Donation;
  product: ProductProgress | undefined;
  onClose: () => void;
  actions: ReturnType<typeof useDonationActions>;
}) {
  const [name, setName] = useState(d.donorName);
  const [phone, setPhone] = useState(formatPhone(d.phone));
  const [quantity, setQuantity] = useState(d.quantity);
  const [status, setStatus] = useState<DonationStatus>(d.status);
  const [reported, setReported] = useState(d.reportedPixValue?.toFixed(2).replace(".", ",") ?? "");
  const [notes, setNotes] = useState(d.adminNotes);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (name.trim().length < 2) return toast.error("Informe o nome.");
    if (!isValidPhone(phone)) return toast.error("WhatsApp inválido.");
    const value = Number(reported.replace(/\./g, "").replace(",", "."));
    setSaving(true);
    const ok = await actions.run(
      {
        id: d.id,
        donorName: name.trim(),
        phone,
        quantity,
        status,
        adminNotes: notes,
        reportedPixValue:
          d.donationType === "PIX" && reported && Number.isFinite(value) ? value : undefined,
      },
      "Contribuição atualizada.",
    );
    setSaving(false);
    if (ok) onClose();
  }

  const max = product ? product.remainingUnits + (d.status === "CANCELLED" ? 0 : d.quantity) : 1000;

  return (
    <div className="grid gap-3">
      <p className="rounded-xl bg-white p-3 text-sm font-semibold">
        {product?.icon} {product?.name} · {d.donationType === "PIX" ? "💠 PIX" : "🎁 Produto"} ·
        valor da cota registrado: {formatBRL(d.unitPrice)}
      </p>
      <Field label="Nome">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </Field>
      <Field label="WhatsApp">
        <input
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          inputMode="tel"
          className={inputCls}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cotas" hint={`Máximo disponível: ${max}`}>
          <input
            type="number"
            min={1}
            max={Math.max(1, max)}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            className={inputCls}
          />
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as DonationStatus)}
            className={inputCls}
          >
            {STATUSES_FOR_TYPE[d.donationType].map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {d.donationType === "PIX" && (
        <Field label="Valor informado (R$)">
          <input
            value={reported}
            onChange={(e) => setReported(e.target.value.replace(/[^\d,.]/g, ""))}
            inputMode="decimal"
            className={inputCls}
          />
        </Field>
      )}
      <Field label="Observações internas">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={cn(inputCls, "h-auto py-2")}
        />
      </Field>
      <p className="text-xs text-kid-muted">
        Novo valor estimado: {formatBRL(d.unitPrice * quantity)} (sempre calculado com o preço
        registrado na contribuição).
      </p>
      <Btn tone="blue" className="h-12" loading={saving} onClick={save}>
        Salvar alterações
      </Btn>
    </div>
  );
}

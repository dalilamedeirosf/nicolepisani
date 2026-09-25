import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft, Check, Copy, Loader2, Minus, Paperclip, Plus, QrCode, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { buildPixPayload } from "@/lib/campaign/pix";
import {
  createDonation,
  type PublicCampaign,
  type PublicProduct,
} from "@/lib/campaign/public.functions";
import {
  ERROR_MESSAGE,
  cotas,
  formatAmount,
  formatBRL,
  formatDateBR,
  formatPhone,
  isValidPhone,
  type MutationErrorCode,
} from "@/lib/campaign/types";
import { cn } from "@/lib/utils";

import { ConfettiBurst } from "./decor";
import { campaignShareText, copyText, whatsappShareUrl } from "./share";

type Step = "choose" | "product" | "pix" | "pix-confirm" | "success" | "error";

type Receipt = {
  mime: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  data: string;
  filename: string;
};

export function ContributeDialog({
  product,
  campaign,
  onClose,
  onChanged,
}: {
  product: PublicProduct | null;
  campaign: PublicCampaign;
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <DialogPrimitive.Root open={product !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-kid-ink/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="kids fixed inset-x-0 bottom-0 z-50 max-h-[94dvh] overflow-y-auto overscroll-contain rounded-t-[2rem] bg-kid-cream shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-10 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2rem]"
        >
          {product && (
            <Flow
              key={product.id}
              product={product}
              campaign={campaign}
              onClose={onClose}
              onChanged={onChanged}
            />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Flow({
  product,
  campaign,
  onClose,
  onChanged,
}: {
  product: PublicProduct;
  campaign: PublicCampaign;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { settings } = campaign;
  const deadline = formatDateBR(settings.campaignDeadline);
  const [step, setStep] = useState<Step>("choose");
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [ack, setAck] = useState(false);
  const [reported, setReported] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<{ code: MutationErrorCode; available?: number } | null>(
    null,
  );
  const [done, setDone] = useState<{
    type: "PRODUCT" | "PIX";
    quantity: number;
    value: number;
  } | null>(null);

  const max = Math.max(1, product.remainingUnits);
  const total = Math.round(product.estimatedPrice * quantity * 100) / 100;

  function validate(kind: "PRODUCT" | "PIX") {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "Informe seu nome.";
    if (!isValidPhone(phone)) e.phone = "Informe um WhatsApp válido com DDD.";
    if (kind === "PRODUCT" && !ack) e.ack = "Marque a caixinha para confirmar.";
    if (kind === "PIX" && !(parseMoney(reported) > 0)) e.reported = "Informe o valor enviado.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(kind: "PRODUCT" | "PIX") {
    if (!validate(kind) || submitting) return;
    setSubmitting(true);
    try {
      const result = await createDonation({
        data: {
          productId: product.id,
          donationType: kind,
          quantity,
          donorName: name.trim(),
          phone,
          acknowledged: kind === "PRODUCT" ? ack : undefined,
          reportedPixValue: kind === "PIX" ? parseMoney(reported) : null,
          receipt: kind === "PIX" ? receipt : null,
          website,
        },
      });
      if (result.ok) {
        setDone({ type: kind, quantity, value: kind === "PIX" ? parseMoney(reported) : total });
        setStep("success");
      } else {
        setFailure({ code: result.code, available: result.available });
        setStep("error");
      }
      onChanged();
    } catch (err) {
      console.error(err);
      setErrors({
        form: "Não foi possível enviar agora. Verifique sua conexão e tente novamente.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const back = (to: Step) => () => {
    setErrors({});
    setStep(to);
  };

  return (
    <div className="relative px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4 sm:px-7">
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-kid-line sm:hidden" />
      <DialogPrimitive.Close
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-kid-muted shadow"
        aria-label="Fechar"
      >
        <X className="h-5 w-5" />
      </DialogPrimitive.Close>

      {step === "choose" && (
        <>
          <DialogPrimitive.Title className="pr-10 font-kid-display text-2xl font-extrabold uppercase leading-tight">
            Como você deseja contribuir?
          </DialogPrimitive.Title>
          <ItemSummary product={product} />
          <div className="mt-5 grid gap-3">
            <ChoiceCard
              color="blue"
              icon="🎁"
              title="Vou doar o produto"
              text="Vou comprar o item e entregar na igreja."
              onClick={() => setStep("product")}
            />
            <ChoiceCard
              color="green"
              icon="💠"
              title="Quero contribuir via PIX"
              text="Prefiro contribuir com o valor correspondente."
              onClick={() => setStep("pix")}
            />
          </div>
        </>
      )}

      {step === "product" && (
        <>
          <BackButton onClick={back("choose")} />
          <DialogPrimitive.Title className="font-kid-display text-2xl font-extrabold uppercase">
            🎁 Doação do produto
          </DialogPrimitive.Title>
          <ItemSummary product={product} label="Você está contribuindo com:" />
          <QuantityPicker
            product={product}
            quantity={quantity}
            setQuantity={setQuantity}
            max={max}
          />
          <DonorFields
            name={name}
            setName={setName}
            phone={phone}
            setPhone={setPhone}
            errors={errors}
          />
          <Honeypot value={website} onChange={setWebsite} />
          <label
            className={cn(
              "mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border-2 bg-white p-4 text-sm font-semibold",
              errors.ack ? "border-kid-red" : "border-kid-line",
            )}
          >
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--kid-blue)]"
            />
            <span>
              Estou ciente de que a doação deverá ser entregue presencialmente na igreja até{" "}
              {deadline}.
            </span>
          </label>
          {errors.ack && <FieldError>{errors.ack}</FieldError>}
          {errors.form && <FieldError>{errors.form}</FieldError>}
          <PrimaryButton onClick={() => submit("PRODUCT")} loading={submitting}>
            Confirmar minha doação ❤️
          </PrimaryButton>
        </>
      )}

      {step === "pix" && (
        <>
          <BackButton onClick={back("choose")} />
          <DialogPrimitive.Title className="font-kid-display text-2xl font-extrabold uppercase">
            💠 Contribuição via PIX
          </DialogPrimitive.Title>
          <ItemSummary product={product} label="Você escolheu contribuir com:" />
          <QuantityPicker
            product={product}
            quantity={quantity}
            setQuantity={setQuantity}
            max={max}
          />
          <div className="mt-4 rounded-3xl bg-kid-green p-5 text-center text-white">
            <p className="text-sm font-bold uppercase tracking-wider opacity-90">Valor estimado</p>
            <p className="font-kid-display text-4xl font-extrabold">{formatBRL(total)}</p>
            <p className="text-sm opacity-90">
              {cotas(quantity)} × {formatBRL(product.estimatedPrice)}
            </p>
          </div>
          <PixBox settings={settings} amount={total} productName={product.name} />
          <PrimaryButton
            onClick={() => {
              setReported(total.toFixed(2).replace(".", ","));
              setStep("pix-confirm");
            }}
          >
            ✅ Já fiz o PIX
          </PrimaryButton>
        </>
      )}

      {step === "pix-confirm" && (
        <>
          <BackButton onClick={back("pix")} />
          <DialogPrimitive.Title className="font-kid-display text-2xl font-extrabold uppercase">
            Confirmar envio do PIX
          </DialogPrimitive.Title>
          <p className="mt-1 text-sm text-kid-muted">
            {product.icon} {formatAmount(product, quantity)} · {cotas(quantity)} · estimado{" "}
            {formatBRL(total)}
          </p>
          <DonorFields
            name={name}
            setName={setName}
            phone={phone}
            setPhone={setPhone}
            errors={errors}
          />
          <Honeypot value={website} onChange={setWebsite} />
          <Field label="Valor enviado (R$)" error={errors.reported}>
            <input
              inputMode="decimal"
              value={reported}
              onChange={(e) => setReported(e.target.value.replace(/[^\d,.]/g, ""))}
              placeholder="0,00"
              className={inputClass(!!errors.reported)}
            />
          </Field>
          <ReceiptInput
            receipt={receipt}
            setReceipt={setReceipt}
            busy={receiptBusy}
            setBusy={setReceiptBusy}
          />
          <p className="mt-4 rounded-2xl bg-kid-yellow-soft p-3 text-sm font-semibold">
            ⏳ Sua contribuição ficará como <strong>PIX aguardando confirmação</strong> até a equipe
            conferir o recebimento.
          </p>
          {errors.form && <FieldError>{errors.form}</FieldError>}
          <PrimaryButton
            onClick={() => submit("PIX")}
            loading={submitting || receiptBusy}
            color="green"
          >
            Enviar confirmação
          </PrimaryButton>
        </>
      )}

      {step === "success" && done && (
        <Success
          product={product}
          campaign={campaign}
          done={done}
          deadline={deadline}
          onClose={onClose}
        />
      )}

      {step === "error" && failure && (
        <div className="py-6 text-center">
          <div className="text-6xl">{failure.code === "SOLD_OUT" ? "💛" : "😕"}</div>
          <DialogPrimitive.Title className="mt-3 font-kid-display text-2xl font-extrabold">
            {failure.code === "SOLD_OUT"
              ? "Ops, alguém chegou primeiro!"
              : "Não foi possível concluir"}
          </DialogPrimitive.Title>
          <p className="mt-2 text-kid-muted">{ERROR_MESSAGE[failure.code]}</p>
          {failure.code === "SOLD_OUT" && (failure.available ?? 0) > 0 && (
            <>
              <p className="mt-2 font-bold">
                Ainda restam {cotas(failure.available ?? 0)} deste item.
              </p>
              <PrimaryButton
                onClick={() => {
                  setQuantity(Math.min(quantity, failure.available ?? 1));
                  setStep("choose");
                }}
              >
                Tentar com menos cotas
              </PrimaryButton>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="mt-4 h-12 w-full rounded-2xl bg-white font-bold shadow"
          >
            Escolher outro item
          </button>
        </div>
      )}
    </div>
  );
}

function Success({
  product,
  campaign,
  done,
  deadline,
  onClose,
}: {
  product: PublicProduct;
  campaign: PublicCampaign;
  done: { type: "PRODUCT" | "PIX"; quantity: number; value: number };
  deadline: string;
  onClose: () => void;
}) {
  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";
  const text = campaignShareText({
    institution: campaign.settings.institutionName,
    children: campaign.settings.childrenGoal,
    deadline,
    url: shareUrl,
  });

  return (
    <div className="relative text-center">
      <ConfettiBurst className="-top-4" />
      <div className="kid-pop pt-4 text-7xl">🎉</div>
      <DialogPrimitive.Title className="mt-2 font-kid-display text-4xl font-extrabold uppercase text-kid-blue">
        Obrigado!
      </DialogPrimitive.Title>
      <p className="mt-1 font-bold">
        {done.type === "PRODUCT"
          ? "Sua doação foi reservada com sucesso."
          : "Recebemos a confirmação do seu PIX. A equipe vai conferir o recebimento."}
      </p>
      <p className="mt-2 text-kid-muted">
        “Obrigado por fazer parte desse momento tão especial para nossas crianças!”
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-2 text-left text-sm">
        <Detail
          label="Produto"
          value={`${product.icon} ${formatAmount(product, done.quantity)}`}
          wide
        />
        <Detail label="Quantidade" value={cotas(done.quantity)} />
        {done.type === "PRODUCT" ? (
          <>
            <Detail label="Prazo" value={`Até ${deadline}`} />
            <Detail label="Entrega" value={campaign.settings.deliveryLocation} wide />
          </>
        ) : (
          <>
            <Detail label="Valor informado" value={formatBRL(done.value)} />
            <Detail label="Status" value="⏳ PIX aguardando confirmação" wide />
          </>
        )}
      </dl>

      <div className="mt-6 rounded-3xl bg-kid-yellow-soft p-5">
        <p className="font-kid-display text-lg font-extrabold uppercase leading-tight">
          Ajude a gente a alcançar mais pessoas ❤️
        </p>
        <a
          href={whatsappShareUrl(text)}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex h-14 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#25D366] text-base font-extrabold uppercase text-white shadow-[0_5px_0_0_#1a9e4b] active:translate-y-1 active:shadow-none"
        >
          <WhatsAppIcon className="h-6 w-6" /> Compartilhar no WhatsApp
        </a>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-4 h-12 w-full rounded-2xl bg-white font-bold shadow"
      >
        Voltar para a lista
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------

function PixBox({
  settings,
  amount,
  productName,
}: {
  settings: PublicCampaign["settings"];
  amount: number;
  productName: string;
}) {
  const [copied, setCopied] = useState<"key" | "code" | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const hasKey = settings.pixKey.trim().length > 0;
  const payload = useMemo(
    () =>
      hasKey
        ? buildPixPayload({
            key: settings.pixKey,
            recipient: settings.pixRecipient || settings.institutionName,
            city: settings.pixCity,
            amount,
            txid: `KIDS${productName}`,
          })
        : "",
    [hasKey, settings, amount, productName],
  );

  useEffect(() => {
    if (!showQr || !payload) return;
    let active = true;
    import("qrcode")
      .then((m) => m.toDataURL(payload, { margin: 1, width: 480, color: { dark: "#1e2a4a" } }))
      .then((url) => active && setQr(url))
      .catch(() => active && setQr(null));
    return () => {
      active = false;
    };
  }, [showQr, payload]);

  async function copy(kind: "key" | "code", text: string) {
    if (await copyText(text)) {
      setCopied(kind);
      setTimeout(() => setCopied(null), 2200);
    }
  }

  return (
    <div className="mt-4 rounded-3xl border-2 border-dashed border-kid-green/50 bg-white p-5 text-center">
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-kid-muted">Chave PIX</p>
      <p className="mt-1 break-all font-kid-display text-2xl font-extrabold text-kid-ink">
        {hasKey ? settings.pixKey : "[INSERIR CHAVE PIX AQUI]"}
      </p>
      {settings.pixRecipient && (
        <p className="text-sm text-kid-muted">Favorecido: {settings.pixRecipient}</p>
      )}
      <button
        type="button"
        disabled={!hasKey}
        onClick={() => copy("key", settings.pixKey.trim())}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-kid-ink font-extrabold uppercase text-white disabled:opacity-40"
      >
        {copied === "key" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
        {copied === "key" ? "Chave copiada!" : "Copiar chave PIX"}
      </button>

      {hasKey && settings.pixQrEnabled && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => copy("code", payload)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-kid-ink/10 bg-kid-blue-soft font-bold text-kid-ink"
          >
            {copied === "code" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            {copied === "code" ? "Código copiado!" : `PIX copia e cola (${formatBRL(amount)})`}
          </button>
          <button
            type="button"
            onClick={() => setShowQr((s) => !s)}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-kid-blue underline underline-offset-4"
          >
            <QrCode className="h-4 w-4" /> {showQr ? "Esconder QR Code" : "Mostrar QR Code PIX"}
          </button>
          {showQr && (
            <div className="mx-auto mt-3 grid aspect-square w-56 place-items-center rounded-2xl bg-white p-2 ring-1 ring-kid-line">
              {qr ? (
                <img
                  src={qr}
                  alt={`QR Code PIX de ${formatBRL(amount)}`}
                  className="h-full w-full"
                />
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-kid-muted" />
              )}
            </div>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-kid-muted">
        Os valores são estimativas usadas como referência.
      </p>
    </div>
  );
}

function ReceiptInput({
  receipt,
  setReceipt,
  busy,
  setBusy,
}: {
  receipt: Receipt | null;
  setReceipt: (r: Receipt | null) => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    setBusy(true);
    try {
      setReceipt(await prepareReceipt(file));
    } catch (e) {
      setReceipt(null);
      setError(e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <p className="mb-1.5 text-sm font-extrabold">
        Comprovante <span className="font-semibold text-kid-muted">(opcional)</span>
      </p>
      {receipt ? (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-kid-green/40 bg-kid-green-soft p-3 text-sm font-semibold">
          <Paperclip className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{receipt.filename}</span>
          <button type="button" onClick={() => setReceipt(null)} className="font-bold text-kid-red">
            Remover
          </button>
        </div>
      ) : (
        <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-kid-line bg-white font-bold text-kid-muted">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
          Anexar imagem ou PDF
          <input
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
      )}
      {error && <FieldError>{error}</FieldError>}
      <p className="mt-1 text-xs text-kid-muted">
        O comprovante é visto apenas pela equipe administrativa.
      </p>
    </div>
  );
}

async function prepareReceipt(file: File): Promise<Receipt> {
  if (file.type === "application/pdf") {
    if (file.size > 2 * 1024 * 1024)
      throw new Error("PDF muito grande (máx. 2 MB). Envie um print.");
    return {
      mime: "application/pdf",
      data: await toBase64(file),
      filename: file.name.slice(0, 120),
    };
  }
  if (!file.type.startsWith("image/")) throw new Error("Envie uma imagem ou PDF.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
  if (!blob) throw new Error("Não foi possível processar a imagem.");
  if (blob.size > 2 * 1024 * 1024) throw new Error("Imagem muito grande. Envie um print menor.");
  return {
    mime: "image/jpeg",
    data: await toBase64(blob),
    filename: file.name.replace(/\.[^.]+$/, "").slice(0, 100) + ".jpg",
  };
}

function toBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(blob);
  });
}

function parseMoney(value: string) {
  const v = value.trim();
  if (!v) return 0;
  const normalized = v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

// ---------------------------------------------------------------------

function ItemSummary({ product, label }: { product: PublicProduct; label?: string }) {
  return (
    <div className="mt-4 flex items-center gap-4 rounded-3xl bg-white p-4 shadow-sm">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-kid-yellow-soft text-3xl">
        {product.icon}
      </div>
      <div className="min-w-0">
        {label && <p className="text-xs font-bold text-kid-muted">{label}</p>}
        <p className="font-kid-display text-lg font-bold leading-tight">
          {product.unitDescription}
        </p>
        <p className="text-sm text-kid-muted">
          Valor estimado:{" "}
          <strong className="text-kid-ink">{formatBRL(product.estimatedPrice)}</strong> · faltam{" "}
          {cotas(product.remainingUnits)}
        </p>
      </div>
    </div>
  );
}

function QuantityPicker({
  product,
  quantity,
  setQuantity,
  max,
}: {
  product: PublicProduct;
  quantity: number;
  setQuantity: (n: number) => void;
  max: number;
}) {
  return (
    <div className="mt-4 rounded-3xl bg-white p-4 text-center shadow-sm">
      <p className="font-extrabold">Quantas cotas deseja doar?</p>
      <div className="mt-3 flex items-center justify-center gap-5">
        <StepButton
          label="Diminuir"
          disabled={quantity <= 1}
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
        >
          <Minus className="h-6 w-6" />
        </StepButton>
        <span
          className="w-14 font-kid-display text-5xl font-extrabold tabular-nums"
          aria-live="polite"
        >
          {quantity}
        </span>
        <StepButton
          label="Aumentar"
          disabled={quantity >= max}
          onClick={() => setQuantity(Math.min(max, quantity + 1))}
        >
          <Plus className="h-6 w-6" />
        </StepButton>
      </div>
      <p className="mt-3 font-bold text-kid-blue">
        {cotas(quantity)} = {formatAmount(product, quantity)}
      </p>
      {quantity >= max && (
        <p className="mt-1 text-xs font-semibold text-kid-muted">Máximo disponível: {cotas(max)}</p>
      )}
    </div>
  );
}

function StepButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-14 w-14 place-items-center rounded-2xl bg-kid-blue-soft text-kid-blue transition active:scale-95 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function DonorFields({
  name,
  setName,
  phone,
  setPhone,
  errors,
}: {
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="mt-4 grid gap-3">
      <Field label="Seu nome" error={errors.name}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="Nome e sobrenome"
          maxLength={120}
          className={inputClass(!!errors.name)}
        />
      </Field>
      <Field label="WhatsApp" error={errors.phone}>
        <input
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(21) 99999-9999"
          className={inputClass(!!errors.phone)}
        />
      </Field>
    </div>
  );
}

function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      tabIndex={-1}
      aria-hidden
      autoComplete="off"
      name="website"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="absolute -left-[9999px] h-0 w-0 opacity-0"
    />
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="mt-1 block">
      <span className="mb-1.5 block text-sm font-extrabold">{label}</span>
      {children}
      {error && <FieldError>{error}</FieldError>}
    </label>
  );
}

const inputClass = (invalid: boolean) =>
  cn(
    "h-14 w-full rounded-2xl border-2 bg-white px-4 text-lg font-semibold outline-none transition placeholder:text-kid-muted/50 focus:border-kid-blue",
    invalid ? "border-kid-red" : "border-kid-line",
  );

function FieldError({ children }: { children: ReactNode }) {
  return <span className="mt-1 block text-sm font-bold text-kid-red">{children}</span>;
}

function ChoiceCard({
  color,
  icon,
  title,
  text,
  onClick,
}: {
  color: "blue" | "green";
  icon: string;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 rounded-3xl border-2 bg-white p-5 text-left transition active:scale-[.98]",
        color === "blue"
          ? "border-kid-blue/30 hover:border-kid-blue"
          : "border-kid-green/30 hover:border-kid-green",
      )}
    >
      <span
        className={cn(
          "grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-4xl",
          color === "blue" ? "bg-kid-blue-soft" : "bg-kid-green-soft",
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block font-kid-display text-xl font-extrabold uppercase leading-tight">
          {title}
        </span>
        <span className="mt-0.5 block text-kid-muted">“{text}”</span>
      </span>
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
  loading,
  color = "blue",
}: {
  children: ReactNode;
  onClick: () => void;
  loading?: boolean;
  color?: "blue" | "green";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "mt-5 flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-lg font-extrabold uppercase tracking-wide text-white transition active:translate-y-1 disabled:opacity-70",
        color === "blue"
          ? "bg-kid-blue shadow-[0_6px_0_0_var(--kid-blue-deep)] active:shadow-[0_2px_0_0_var(--kid-blue-deep)]"
          : "bg-kid-green shadow-[0_6px_0_0_oklch(0.48_0.13_150)] active:shadow-none",
      )}
    >
      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : children}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-2 inline-flex items-center gap-1 text-sm font-bold text-kid-muted"
    >
      <ArrowLeft className="h-4 w-4" /> Voltar
    </button>
  );
}

function Detail({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn("rounded-2xl bg-white p-3 shadow-sm", wide && "col-span-2")}>
      <dt className="text-xs font-bold uppercase text-kid-muted">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.13c-.24.68-1.42 1.3-1.95 1.34-.5.05-.97.23-3.27-.68-2.77-1.09-4.52-3.93-4.66-4.11-.13-.18-1.1-1.47-1.1-2.8 0-1.33.7-1.99.95-2.26.25-.27.54-.34.72-.34h.52c.17 0 .39-.06.61.46.23.54.77 1.87.84 2 .07.14.11.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.28-.12.55.16.27.7 1.16 1.51 1.88 1.04.93 1.92 1.21 2.19 1.35.27.14.43.11.59-.07.16-.18.68-.79.86-1.07.18-.27.36-.23.61-.14.25.09 1.58.75 1.85.88.27.14.45.2.52.32.07.11.07.66-.17 1.34Z" />
    </svg>
  );
}

import { useState } from "react";
import { toast } from "sonner";

import { buildPixPayload } from "@/lib/campaign/pix";
import { updateSettings, type AdminData } from "@/lib/campaign/admin.functions";
import type { Settings } from "@/lib/campaign/types";
import { cn } from "@/lib/utils";

import { Btn, Card, Field, SectionTitle, Toggle, inputCls } from "./ui";

// O Brasil não tem mais horário de verão: Rio de Janeiro = UTC-03:00 o ano todo.
const OFFSET = "-03:00";

function toLocalInput(iso: string) {
  const d = new Date(new Date(iso).getTime() - 3 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  return new Date(`${value}:00${OFFSET}`).toISOString();
}

export function SettingsPanel({ data, onChanged }: { data: AdminData; onChanged: () => void }) {
  const [s, setS] = useState<Settings>(data.settings);
  const [deadline, setDeadline] = useState(toLocalInput(data.settings.campaignDeadline));
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setS((cur) => ({ ...cur, [k]: v }));

  async function persist(patch: Partial<Settings>, message: string) {
    setSaving(true);
    try {
      const saved = await updateSettings({ data: patch });
      setS(saved);
      setDeadline(toLocalInput(saved.campaignDeadline));
      toast.success(message);
      onChanged();
    } catch {
      toast.error("Não foi possível salvar. Confira os campos.");
    } finally {
      setSaving(false);
    }
  }

  function save() {
    if (!deadline) return toast.error("Informe a data final.");
    void persist({ ...s, campaignDeadline: fromLocalInput(deadline) }, "Configurações salvas!");
  }

  const deadlinePassed = new Date(fromLocalInput(deadline)).getTime() < Date.now();
  const pixPreview = s.pixKey.trim()
    ? buildPixPayload({
        key: s.pixKey,
        recipient: s.pixRecipient || s.institutionName,
        city: s.pixCity,
        amount: 10,
      })
    : "";

  return (
    <div className="space-y-5">
      <Card className={cn(data.isOpen ? "bg-kid-green-soft" : "bg-kid-red-soft")}>
        <SectionTitle>{data.isOpen ? "🟢 Campanha aberta" : "🔴 Campanha encerrada"}</SectionTitle>
        <p className="text-sm font-semibold">
          {data.isOpen
            ? "Novas reservas e contribuições estão liberadas."
            : data.settings.campaignActive
              ? "O prazo final já passou. Para reabrir, escolha uma nova data final abaixo."
              : "A campanha foi encerrada manualmente."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.isOpen ? (
            <Btn
              tone="red"
              loading={saving}
              onClick={() =>
                window.confirm("Encerrar a campanha agora? Novas doações serão bloqueadas.") &&
                persist({ campaignActive: false }, "Campanha encerrada.")
              }
            >
              Encerrar agora
            </Btn>
          ) : (
            <Btn
              tone="green"
              loading={saving}
              onClick={() => {
                if (deadlinePassed) {
                  toast.error("Escolha uma nova data final (no futuro) e clique em Salvar.");
                  document.getElementById("deadline")?.focus();
                  set("campaignActive", true);
                  return;
                }
                void persist(
                  { campaignActive: true, campaignDeadline: fromLocalInput(deadline) },
                  "Campanha reaberta!",
                );
              }}
            >
              Reabrir campanha
            </Btn>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle>Configurações da campanha</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nome da campanha">
            <input
              value={s.campaignName}
              onChange={(e) => set("campaignName", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Nome da instituição">
            <input
              value={s.institutionName}
              onChange={(e) => set("institutionName", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field
            label="Data final das doações"
            hint="Horário de Brasília. Depois disso, novas doações são bloqueadas automaticamente."
          >
            <input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={cn(inputCls, deadlinePassed && "border-kid-red")}
            />
          </Field>
          <Field label="Meta de crianças">
            <input
              value={String(s.childrenGoal)}
              onChange={(e) => set("childrenGoal", Number(e.target.value.replace(/\D/g, "")) || 1)}
              inputMode="numeric"
              className={inputCls}
            />
          </Field>
          <Field label="Endereço / local de entrega" className="md:col-span-2">
            <input
              value={s.deliveryLocation}
              onChange={(e) => set("deliveryLocation", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Mensagem da campanha" className="md:col-span-2">
            <textarea
              value={s.campaignMessage}
              onChange={(e) => set("campaignMessage", e.target.value)}
              rows={3}
              className={cn(inputCls, "h-auto py-2")}
            />
          </Field>
          <Toggle
            checked={s.campaignActive}
            onChange={(v) => set("campaignActive", v)}
            label="Campanha ativa"
          />
          <Toggle
            checked={s.showSupporters}
            onChange={(v) => set("showSupporters", v)}
            label="Mostrar primeiro nome dos apoiadores"
          />
        </div>
      </Card>

      <Card>
        <SectionTitle>PIX</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label="Chave PIX"
            hint="Telefone no formato +55DDDNÚMERO, e-mail, CPF/CNPJ ou chave aleatória."
          >
            <input
              value={s.pixKey}
              onChange={(e) => set("pixKey", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Nome do favorecido" hint="Aparece para quem vai pagar e no QR Code.">
            <input
              value={s.pixRecipient}
              onChange={(e) => set("pixRecipient", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Cidade do favorecido (QR Code)">
            <input
              value={s.pixCity}
              onChange={(e) => set("pixCity", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Toggle
            checked={s.pixQrEnabled}
            onChange={(v) => set("pixQrEnabled", v)}
            label="Mostrar QR Code e PIX copia e cola"
          />
        </div>
        {pixPreview && s.pixQrEnabled && (
          <p className="mt-3 break-all rounded-xl bg-kid-cream p-3 font-mono text-xs text-kid-muted">
            Exemplo de copia e cola (R$ 10,00): {pixPreview}
          </p>
        )}
        <p className="mt-2 text-xs text-kid-muted">
          Teste o QR Code/copia e cola com um valor pequeno antes de divulgar.
        </p>
      </Card>

      <Btn tone="blue" className="h-14 w-full text-base" loading={saving} onClick={save}>
        Salvar configurações
      </Btn>
    </div>
  );
}

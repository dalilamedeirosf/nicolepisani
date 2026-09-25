// Gera o "PIX copia e cola" (BR Code estático, padrão EMV do Banco Central)
// com o valor já preenchido. O mesmo texto vira o QR Code.

function field(id: string, value: string) {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

function sanitize(value: string, max: number) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .-]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, max);
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Normaliza a chave: telefone vira +55DDDNUMERO, e-mail minúsculo, CPF/CNPJ só dígitos. */
export function normalizePixKey(key: string) {
  const k = key.trim();
  if (k.includes("@")) return k.toLowerCase();
  if (k.startsWith("+")) return `+${k.replace(/\D/g, "")}`;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k))
    return k.toLowerCase();
  if (/^[\d.\-/ ]+$/.test(k)) return k.replace(/\D/g, "");
  return k;
}

export function buildPixPayload(opts: {
  key: string;
  recipient: string;
  city: string;
  amount?: number;
  txid?: string;
}) {
  const key = normalizePixKey(opts.key);
  if (!key) return "";
  const account = field("00", "br.gov.bcb.pix") + field("01", key);
  const txid = sanitize(opts.txid ?? "", 25).replace(/[^A-Z0-9]/g, "") || "***";
  let payload =
    field("00", "01") +
    field("26", account) +
    field("52", "0000") +
    field("53", "986") +
    (opts.amount && opts.amount > 0 ? field("54", opts.amount.toFixed(2)) : "") +
    field("58", "BR") +
    field("59", sanitize(opts.recipient, 25) || "RECEBEDOR") +
    field("60", sanitize(opts.city, 15) || "RIO DE JANEIRO") +
    field("62", field("05", txid)) +
    "6304";
  payload += crc16(payload);
  return payload;
}

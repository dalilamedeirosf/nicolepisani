// Tipos e regras de negócio compartilhados entre servidor e navegador.
// Nada aqui pode depender de APIs de servidor.

export const DONATION_TYPES = ["PRODUCT", "PIX"] as const;
export type DonationType = (typeof DONATION_TYPES)[number];

export const DONATION_STATUSES = [
  "RESERVED",
  "PRODUCT_RECEIVED",
  "PIX_PENDING",
  "PIX_CONFIRMED",
  "CANCELLED",
] as const;
export type DonationStatus = (typeof DONATION_STATUSES)[number];

export const STATUS_LABEL: Record<DonationStatus | "AVAILABLE" | "COMPLETE", string> = {
  AVAILABLE: "🟢 Disponível",
  RESERVED: "🟡 Produto reservado",
  PRODUCT_RECEIVED: "📦 Produto recebido",
  PIX_PENDING: "⏳ PIX aguardando confirmação",
  PIX_CONFIRMED: "💠 PIX confirmado",
  CANCELLED: "✖️ Cancelado",
  COMPLETE: "✅ Meta atingida",
};

export const STATUSES_FOR_TYPE: Record<DonationType, DonationStatus[]> = {
  PRODUCT: ["RESERVED", "PRODUCT_RECEIVED", "CANCELLED"],
  PIX: ["PIX_PENDING", "PIX_CONFIRMED", "CANCELLED"],
};

export type Settings = {
  campaignName: string;
  institutionName: string;
  campaignDeadline: string; // ISO
  campaignActive: boolean;
  pixKey: string;
  pixRecipient: string;
  pixCity: string;
  pixQrEnabled: boolean;
  deliveryLocation: string;
  campaignMessage: string;
  childrenGoal: number;
  showSupporters: boolean;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  unitDescription: string;
  unitAmount: number;
  unitSingular: string;
  unitPlural: string;
  totalUnits: number;
  estimatedPrice: number;
  icon: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Donation = {
  id: string;
  productId: string;
  donorName: string;
  phone: string;
  donationType: DonationType;
  quantity: number;
  unitPrice: number;
  estimatedValue: number;
  reportedPixValue: number | null;
  status: DonationStatus;
  adminNotes: string;
  hasReceipt: boolean;
  statusChangedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductProgress = Product & {
  committedUnits: number; // reservado + recebido + PIX pendente + PIX confirmado
  reservedUnits: number;
  receivedUnits: number;
  pixPendingUnits: number;
  pixConfirmedUnits: number;
  remainingUnits: number;
  percent: number; // 0-100, sobre as cotas comprometidas
  confirmedPercent: number; // 0-100, só recebido + PIX confirmado
  complete: boolean;
};

export type CampaignStats = {
  totalUnits: number;
  committedUnits: number;
  remainingUnits: number;
  reservedUnits: number;
  receivedUnits: number;
  pixPendingUnits: number;
  pixConfirmedUnits: number;
  pixPendingValue: number;
  pixConfirmedValue: number;
  contributionsCount: number;
  percent: number;
  confirmedPercent: number;
};

/** Um PIX só está "recebido" depois que o administrador confirma. */
export const OCCUPYING_STATUSES: DonationStatus[] = [
  "RESERVED",
  "PRODUCT_RECEIVED",
  "PIX_PENDING",
  "PIX_CONFIRMED",
];

export function computeProgress(
  products: Product[],
  donations: Pick<
    Donation,
    "productId" | "quantity" | "status" | "estimatedValue" | "reportedPixValue"
  >[],
) {
  const byProduct = new Map<string, ProductProgress>();
  for (const p of products) {
    byProduct.set(p.id, {
      ...p,
      committedUnits: 0,
      reservedUnits: 0,
      receivedUnits: 0,
      pixPendingUnits: 0,
      pixConfirmedUnits: 0,
      remainingUnits: p.totalUnits,
      percent: 0,
      confirmedPercent: 0,
      complete: false,
    });
  }

  const stats: CampaignStats = {
    totalUnits: 0,
    committedUnits: 0,
    remainingUnits: 0,
    reservedUnits: 0,
    receivedUnits: 0,
    pixPendingUnits: 0,
    pixConfirmedUnits: 0,
    pixPendingValue: 0,
    pixConfirmedValue: 0,
    contributionsCount: 0,
    percent: 0,
    confirmedPercent: 0,
  };

  for (const d of donations) {
    if (d.status === "CANCELLED") continue;
    const p = byProduct.get(d.productId);
    stats.contributionsCount += 1;
    if (d.status === "PIX_CONFIRMED") {
      stats.pixConfirmedValue += d.reportedPixValue ?? d.estimatedValue;
    } else if (d.status === "PIX_PENDING") {
      stats.pixPendingValue += d.reportedPixValue ?? d.estimatedValue;
    }
    if (!p) continue;
    p.committedUnits += d.quantity;
    if (d.status === "RESERVED") p.reservedUnits += d.quantity;
    if (d.status === "PRODUCT_RECEIVED") p.receivedUnits += d.quantity;
    if (d.status === "PIX_PENDING") p.pixPendingUnits += d.quantity;
    if (d.status === "PIX_CONFIRMED") p.pixConfirmedUnits += d.quantity;
  }

  const list = [...byProduct.values()];
  for (const p of list) {
    p.remainingUnits = Math.max(p.totalUnits - p.committedUnits, 0);
    p.percent = pct(p.committedUnits, p.totalUnits);
    p.confirmedPercent = pct(p.receivedUnits + p.pixConfirmedUnits, p.totalUnits);
    p.complete = p.totalUnits > 0 && p.remainingUnits === 0;
    if (!p.active) continue;
    stats.totalUnits += p.totalUnits;
    stats.committedUnits += Math.min(p.committedUnits, p.totalUnits);
    stats.remainingUnits += p.remainingUnits;
    stats.reservedUnits += p.reservedUnits;
    stats.receivedUnits += p.receivedUnits;
    stats.pixPendingUnits += p.pixPendingUnits;
    stats.pixConfirmedUnits += p.pixConfirmedUnits;
  }
  stats.percent = pct(stats.committedUnits, stats.totalUnits);
  stats.confirmedPercent = pct(stats.receivedUnits + stats.pixConfirmedUnits, stats.totalUnits);

  return { products: list, stats };
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

/** Itens ativos com menor percentual, para "ainda precisamos principalmente de". */
export function mostNeeded<
  T extends Pick<
    ProductProgress,
    "active" | "complete" | "percent" | "remainingUnits" | "sortOrder"
  >,
>(products: T[], limit: number) {
  return products
    .filter((p) => p.active && !p.complete)
    .sort(
      (a, b) =>
        a.percent - b.percent || b.remainingUnits - a.remainingUnits || a.sortOrder - b.sortOrder,
    )
    .slice(0, limit);
}

export function isCampaignOpen(
  settings: Pick<Settings, "campaignActive" | "campaignDeadline">,
  now = Date.now(),
) {
  return settings.campaignActive && now <= new Date(settings.campaignDeadline).getTime();
}

// ---------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatBRL = (value: number) => brl.format(value);

export function formatAmount(
  product: Pick<Product, "unitAmount" | "unitSingular" | "unitPlural">,
  quantity: number,
) {
  const total = Math.round(product.unitAmount * quantity * 100) / 100;
  const n = total.toLocaleString("pt-BR");
  return `${n} ${total === 1 ? product.unitSingular : product.unitPlural}`;
}

export const cotas = (n: number) => `${n} ${n === 1 ? "cota" : "cotas"}`;

export function formatDateBR(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit" },
) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", ...opts }).format(
    new Date(iso),
  );
}

export function formatDateTimeBR(iso: string) {
  return formatDateBR(iso, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

/** Aceita (21) 98888-7777, 21988887777, +55 21 98888-7777. Retorna DDD + número. */
export function normalizePhone(value: string) {
  let digits = onlyDigits(value);
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  return digits;
}

export const isValidPhone = (value: string) => /^[1-9]{2}9?\d{8}$/.test(normalizePhone(value));

export function formatPhone(value: string) {
  const d = normalizePhone(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

export const CATEGORY_ICON: Record<string, string> = {
  "Cachorro-quente": "🌭",
  Pipoca: "🍿",
  Doces: "🍭",
  Bebidas: "🥤",
  Descartáveis: "🍽️",
};

export const categoryIcon = (category: string) => CATEGORY_ICON[category] ?? "🎁";

export function groupByCategory<T extends Pick<Product, "category" | "sortOrder">>(products: T[]) {
  const groups = new Map<string, T[]>();
  for (const p of [...products].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const list = groups.get(p.category) ?? [];
    list.push(p);
    groups.set(p.category, list);
  }
  return [...groups.entries()].map(([category, items]) => ({ category, items }));
}

// ---------------------------------------------------------------------
// Resultados de operações
// ---------------------------------------------------------------------

export type MutationErrorCode =
  | "CAMPAIGN_CLOSED"
  | "PRODUCT_UNAVAILABLE"
  | "SOLD_OUT"
  | "INVALID_QUANTITY"
  | "INVALID_STATUS"
  | "INVALID_TYPE"
  | "NOT_FOUND";

export type DonationResult =
  | { ok: true; donation: Donation }
  | { ok: false; code: MutationErrorCode; available?: number };

export const ERROR_MESSAGE: Record<MutationErrorCode, string> = {
  CAMPAIGN_CLOSED: "A campanha de doações está encerrada. Obrigado pelo carinho! ❤️",
  PRODUCT_UNAVAILABLE:
    "Este item não está mais disponível. Escolha outro item que ainda precisamos.",
  SOLD_OUT: "Essa cota acabou de ser preenchida ❤️ Escolha outro item que ainda precisamos.",
  INVALID_QUANTITY: "Quantidade de cotas inválida.",
  INVALID_STATUS: "Status inválido para este tipo de contribuição.",
  INVALID_TYPE: "Tipo de contribuição inválido.",
  NOT_FOUND: "Registro não encontrado.",
};

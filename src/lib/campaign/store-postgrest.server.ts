// Armazenamento de produção: Supabase (Postgres) acessado pela API REST
// (PostgREST) com a service role key. Funciona em Node e Cloudflare Workers.
import type { CampaignStore, DonationPatch, NewDonation, ProductInput } from "./store.server";
import type { Donation, DonationResult, Product, Settings } from "./types";

type Row = Record<string, unknown>;

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

function toSettings(r: Row): Settings {
  return {
    campaignName: String(r.campaign_name),
    institutionName: String(r.institution_name),
    campaignDeadline: new Date(String(r.campaign_deadline)).toISOString(),
    campaignActive: Boolean(r.campaign_active),
    pixKey: String(r.pix_key ?? ""),
    pixRecipient: String(r.pix_recipient ?? ""),
    pixCity: String(r.pix_city ?? ""),
    pixQrEnabled: Boolean(r.pix_qr_enabled),
    deliveryLocation: String(r.delivery_location ?? ""),
    campaignMessage: String(r.campaign_message ?? ""),
    childrenGoal: num(r.children_goal),
    showSupporters: Boolean(r.show_supporters),
  };
}

const SETTINGS_COLUMNS: Record<keyof Settings, string> = {
  campaignName: "campaign_name",
  institutionName: "institution_name",
  campaignDeadline: "campaign_deadline",
  campaignActive: "campaign_active",
  pixKey: "pix_key",
  pixRecipient: "pix_recipient",
  pixCity: "pix_city",
  pixQrEnabled: "pix_qr_enabled",
  deliveryLocation: "delivery_location",
  campaignMessage: "campaign_message",
  childrenGoal: "children_goal",
  showSupporters: "show_supporters",
};

function toProduct(r: Row): Product {
  return {
    id: String(r.id),
    name: String(r.name),
    category: String(r.category),
    description: String(r.description ?? ""),
    unitDescription: String(r.unit_description),
    unitAmount: num(r.unit_amount),
    unitSingular: String(r.unit_singular),
    unitPlural: String(r.unit_plural),
    totalUnits: num(r.total_units),
    estimatedPrice: num(r.estimated_price),
    icon: String(r.icon),
    sortOrder: num(r.sort_order),
    active: Boolean(r.active),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function fromProduct(p: ProductInput): Row {
  return {
    name: p.name,
    category: p.category,
    description: p.description,
    unit_description: p.unitDescription,
    unit_amount: p.unitAmount,
    unit_singular: p.unitSingular,
    unit_plural: p.unitPlural,
    total_units: p.totalUnits,
    estimated_price: p.estimatedPrice,
    icon: p.icon,
    sort_order: p.sortOrder,
    active: p.active,
  };
}

function toDonation(r: Row, hasReceipt = false): Donation {
  return {
    id: String(r.id),
    productId: String(r.product_id),
    donorName: String(r.donor_name),
    phone: String(r.phone),
    donationType: r.donation_type as Donation["donationType"],
    quantity: num(r.quantity),
    unitPrice: num(r.unit_price),
    estimatedValue: num(r.estimated_value),
    reportedPixValue:
      r.reported_pix_value === null || r.reported_pix_value === undefined
        ? null
        : num(r.reported_pix_value),
    status: r.status as Donation["status"],
    adminNotes: String(r.admin_notes ?? ""),
    hasReceipt,
    statusChangedAt: r.status_changed_at ? String(r.status_changed_at) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function toResult(raw: unknown): DonationResult {
  const r = raw as { ok: boolean; code?: string; available?: number; donation?: Row };
  if (r.ok && r.donation) return { ok: true, donation: toDonation(r.donation) };
  return { ok: false, code: (r.code ?? "NOT_FOUND") as never, available: r.available };
}

export function createPostgrestStore(baseUrl: string, serviceKey: string): CampaignStore {
  const root = `${baseUrl.replace(/\/$/, "")}/rest/v1`;

  async function request<T>(
    path: string,
    init: RequestInit & { prefer?: string } = {},
  ): Promise<T> {
    const res = await fetch(`${root}/${path}`, {
      ...init,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.prefer ? { Prefer: init.prefer } : {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Supabase ${init.method ?? "GET"} ${path} falhou (${res.status}): ${body}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    async getSettings() {
      const rows = await request<Row[]>("settings?id=eq.1&select=*");
      if (!rows[0]) throw new Error("Tabela settings vazia — rode a migração do Supabase.");
      return toSettings(rows[0]);
    },

    async updateSettings(patch) {
      const body: Row = {};
      for (const [k, v] of Object.entries(patch)) {
        const col = SETTINGS_COLUMNS[k as keyof Settings];
        if (col) body[col] = v;
      }
      const rows = await request<Row[]>("settings?id=eq.1", {
        method: "PATCH",
        body: JSON.stringify(body),
        prefer: "return=representation",
      });
      return toSettings(rows[0]);
    },

    async listProducts() {
      const rows = await request<Row[]>("products?select=*&order=sort_order.asc,created_at.asc");
      return rows.map(toProduct);
    },

    async saveProduct(input) {
      const rows = input.id
        ? await request<Row[]>(`products?id=eq.${encodeURIComponent(input.id)}`, {
            method: "PATCH",
            body: JSON.stringify(fromProduct(input)),
            prefer: "return=representation",
          })
        : await request<Row[]>("products", {
            method: "POST",
            body: JSON.stringify(fromProduct(input)),
            prefer: "return=representation",
          });
      if (!rows[0]) throw new Error("Produto não encontrado.");
      return toProduct(rows[0]);
    },

    async listDonations() {
      const [rows, receipts] = await Promise.all([
        request<Row[]>("donations?select=*&order=created_at.desc&limit=5000"),
        request<Row[]>("donation_receipts?select=donation_id&limit=5000"),
      ]);
      const withReceipt = new Set(receipts.map((r) => String(r.donation_id)));
      return rows.map((r) => toDonation(r, withReceipt.has(String(r.id))));
    },

    async createDonation(input: NewDonation) {
      const raw = await request<unknown>("rpc/create_donation", {
        method: "POST",
        body: JSON.stringify({
          p_product_id: input.productId,
          p_donation_type: input.donationType,
          p_quantity: input.quantity,
          p_donor_name: input.donorName,
          p_phone: input.phone,
          p_reported_value: input.reportedPixValue,
          p_receipt_mime: input.receipt?.mime ?? null,
          p_receipt_data: input.receipt?.data ?? null,
          p_receipt_name: input.receipt?.filename ?? null,
        }),
      });
      const result = toResult(raw);
      if (result.ok) result.donation.hasReceipt = Boolean(input.receipt);
      return result;
    },

    async updateDonation(id: string, patch: DonationPatch) {
      const raw = await request<unknown>("rpc/admin_update_donation", {
        method: "POST",
        body: JSON.stringify({
          p_id: id,
          p_status: patch.status ?? null,
          p_quantity: patch.quantity ?? null,
          p_donor_name: patch.donorName ?? null,
          p_phone: patch.phone ?? null,
          p_reported_value: patch.reportedPixValue ?? null,
          p_admin_notes: patch.adminNotes ?? null,
        }),
      });
      return toResult(raw);
    },

    async getReceipt(donationId) {
      const rows = await request<Row[]>(
        `donation_receipts?donation_id=eq.${encodeURIComponent(donationId)}&select=mime,data_base64,filename`,
      );
      const r = rows[0];
      return r
        ? { mime: String(r.mime), data: String(r.data_base64), filename: String(r.filename) }
        : null;
    },
  };
}

import process from "node:process";

import type {
  Donation,
  DonationResult,
  DonationStatus,
  DonationType,
  Product,
  Settings,
} from "./types";

export type NewDonation = {
  productId: string;
  donationType: DonationType;
  quantity: number;
  donorName: string;
  phone: string;
  reportedPixValue: number | null;
  receipt: { mime: string; data: string; filename: string } | null;
};

export type DonationPatch = {
  status?: DonationStatus;
  quantity?: number;
  donorName?: string;
  phone?: string;
  reportedPixValue?: number;
  adminNotes?: string;
};

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt"> & { id?: string };

export type Receipt = { mime: string; data: string; filename: string };

export interface CampaignStore {
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
  listProducts(): Promise<Product[]>;
  saveProduct(input: ProductInput): Promise<Product>;
  listDonations(): Promise<Donation[]>;
  /** Deve validar a disponibilidade de forma atômica (sem corrida entre duas reservas). */
  createDonation(input: NewDonation): Promise<DonationResult>;
  updateDonation(id: string, patch: DonationPatch): Promise<DonationResult>;
  getReceipt(donationId: string): Promise<Receipt | null>;
}

let cached: { key: string; store: Promise<CampaignStore> } | undefined;

/**
 * Produção: Supabase/Postgres (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
 * Sem essas variáveis, usa um arquivo JSON local — apenas para desenvolvimento
 * ou servidores Node com disco persistente.
 */
export function getStore(): Promise<CampaignStore> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = url && serviceKey ? `pg:${url}` : "local";
  if (cached?.key === key) return cached.store;

  const store =
    url && serviceKey
      ? import("./store-postgrest.server").then((m) => m.createPostgrestStore(url, serviceKey))
      : import("./store-local.server").then((m) =>
          m.createLocalStore(process.env.CAMPAIGN_DATA_FILE),
        );
  cached = { key, store };
  return store;
}

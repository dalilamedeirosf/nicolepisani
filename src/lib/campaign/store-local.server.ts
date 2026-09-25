// Armazenamento em arquivo JSON para desenvolvimento local (ou um servidor Node
// com disco persistente). As operações são serializadas por uma fila em memória,
// então a checagem de disponibilidade + gravação acontece sem corrida.
import { DEFAULT_SETTINGS, seedProducts } from "./seed";
import type { CampaignStore, DonationPatch, NewDonation, Receipt } from "./store.server";
import {
  STATUSES_FOR_TYPE,
  isCampaignOpen,
  type Donation,
  type DonationResult,
  type Product,
  type Settings,
} from "./types";

type Db = {
  settings: Settings;
  products: Product[];
  donations: Omit<Donation, "hasReceipt">[];
  receipts: Record<string, Receipt>;
};

export async function createLocalStore(file = ".data/culto-kids.json"): Promise<CampaignStore> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const target = path.resolve(file);

  let db: Db;
  try {
    db = JSON.parse(await fs.readFile(target, "utf8")) as Db;
    db.settings = { ...DEFAULT_SETTINGS, ...db.settings };
  } catch {
    db = { settings: DEFAULT_SETTINGS, products: seedProducts(), donations: [], receipts: {} };
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, JSON.stringify(db, null, 2));
  }

  let queue: Promise<unknown> = Promise.resolve();
  function exclusive<T>(fn: () => T | Promise<T>): Promise<T> {
    const run = queue.then(fn, fn);
    queue = run.catch(() => undefined);
    return run;
  }

  async function persist() {
    const tmp = `${target}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2));
    await fs.rename(tmp, target);
  }

  const used = (productId: string, exceptId?: string) =>
    db.donations
      .filter((d) => d.productId === productId && d.status !== "CANCELLED" && d.id !== exceptId)
      .reduce((sum, d) => sum + d.quantity, 0);

  const withReceipt = (d: Omit<Donation, "hasReceipt">): Donation => ({
    ...d,
    hasReceipt: Boolean(db.receipts[d.id]),
  });
  const clone = <T>(v: T): T => structuredClone(v);

  return {
    getSettings: () => exclusive(() => clone(db.settings)),

    updateSettings: (patch) =>
      exclusive(async () => {
        db.settings = { ...db.settings, ...patch };
        await persist();
        return clone(db.settings);
      }),

    listProducts: () =>
      exclusive(() => clone([...db.products].sort((a, b) => a.sortOrder - b.sortOrder))),

    saveProduct: (input) =>
      exclusive(async () => {
        const now = new Date().toISOString();
        if (input.id) {
          const current = db.products.find((p) => p.id === input.id);
          if (!current) throw new Error("Produto não encontrado.");
          Object.assign(current, { ...input, id: current.id, updatedAt: now });
          await persist();
          return clone(current);
        }
        const product: Product = {
          ...input,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        db.products.push(product);
        await persist();
        return clone(product);
      }),

    listDonations: () =>
      exclusive(() =>
        clone(
          [...db.donations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(withReceipt),
        ),
      ),

    createDonation: (input: NewDonation) =>
      exclusive(async (): Promise<DonationResult> => {
        if (input.quantity < 1) return { ok: false, code: "INVALID_QUANTITY" };
        if (!isCampaignOpen(db.settings)) return { ok: false, code: "CAMPAIGN_CLOSED" };
        const product = db.products.find((p) => p.id === input.productId);
        if (!product || !product.active) return { ok: false, code: "PRODUCT_UNAVAILABLE" };
        const taken = used(product.id);
        if (taken + input.quantity > product.totalUnits) {
          return {
            ok: false,
            code: "SOLD_OUT",
            available: Math.max(product.totalUnits - taken, 0),
          };
        }
        const now = new Date().toISOString();
        const donation: Omit<Donation, "hasReceipt"> = {
          id: crypto.randomUUID(),
          productId: product.id,
          donorName: input.donorName.trim(),
          phone: input.phone,
          donationType: input.donationType,
          quantity: input.quantity,
          unitPrice: product.estimatedPrice,
          estimatedValue: Math.round(product.estimatedPrice * input.quantity * 100) / 100,
          reportedPixValue: input.donationType === "PIX" ? input.reportedPixValue : null,
          status: input.donationType === "PIX" ? "PIX_PENDING" : "RESERVED",
          adminNotes: "",
          statusChangedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        db.donations.push(donation);
        if (input.donationType === "PIX" && input.receipt) db.receipts[donation.id] = input.receipt;
        await persist();
        return { ok: true, donation: withReceipt(clone(donation)) };
      }),

    updateDonation: (id: string, patch: DonationPatch) =>
      exclusive(async (): Promise<DonationResult> => {
        const current = db.donations.find((d) => d.id === id);
        if (!current) return { ok: false, code: "NOT_FOUND" };
        const product = db.products.find((p) => p.id === current.productId);
        const status = patch.status ?? current.status;
        const quantity = patch.quantity ?? current.quantity;
        if (quantity < 1) return { ok: false, code: "INVALID_QUANTITY" };
        if (!STATUSES_FOR_TYPE[current.donationType].includes(status))
          return { ok: false, code: "INVALID_STATUS" };
        if (status !== "CANCELLED" && product) {
          const taken = used(product.id, id);
          if (taken + quantity > product.totalUnits) {
            return {
              ok: false,
              code: "SOLD_OUT",
              available: Math.max(product.totalUnits - taken, 0),
            };
          }
        }
        const now = new Date().toISOString();
        if (status !== current.status) current.statusChangedAt = now;
        current.status = status;
        current.quantity = quantity;
        current.estimatedValue = Math.round(current.unitPrice * quantity * 100) / 100;
        if (patch.donorName?.trim()) current.donorName = patch.donorName.trim();
        if (patch.phone) current.phone = patch.phone;
        if (patch.reportedPixValue !== undefined) current.reportedPixValue = patch.reportedPixValue;
        if (patch.adminNotes !== undefined) current.adminNotes = patch.adminNotes;
        current.updatedAt = now;
        await persist();
        return { ok: true, donation: withReceipt(clone(current)) };
      }),

    getReceipt: (donationId) => exclusive(() => clone(db.receipts[donationId] ?? null)),
  };
}

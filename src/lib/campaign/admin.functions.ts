import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  DONATION_STATUSES,
  computeProgress,
  isCampaignOpen,
  isValidPhone,
  normalizePhone,
} from "./types";

async function deps() {
  const [{ getStore }, auth] = await Promise.all([
    import("./store.server"),
    import("./auth.server"),
  ]);
  return { getStore, auth };
}

async function adminStore() {
  const { getStore, auth } = await deps();
  await auth.requireAdmin();
  return getStore();
}

export const getAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  const { auth } = await deps();
  return { configured: auth.isAdminConfigured(), authenticated: await auth.isAdmin() };
});

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator(z.object({ password: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    const { auth } = await deps();
    if (!auth.isAdminConfigured())
      return {
        ok: false as const,
        message: "Senha do painel ainda não configurada (ADMIN_PASSWORD).",
      };
    if (!(await auth.checkPassword(data.password))) {
      await new Promise((r) => setTimeout(r, 800)); // desacelera tentativas
      return { ok: false as const, message: "Senha incorreta." };
    }
    await auth.startSession();
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { auth } = await deps();
  auth.endSession();
  return { ok: true };
});

export const getAdminData = createServerFn({ method: "GET" }).handler(async () => {
  const store = await adminStore();
  const [settings, products, donations] = await Promise.all([
    store.getSettings(),
    store.listProducts(),
    store.listDonations(),
  ]);
  const progress = computeProgress(products, donations);
  return {
    settings,
    isOpen: isCampaignOpen(settings),
    products: progress.products,
    stats: progress.stats,
    donations,
    serverTime: new Date().toISOString(),
  };
});

export type AdminData = Awaited<ReturnType<typeof getAdminData>>;

export const updateDonation = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(DONATION_STATUSES).optional(),
      quantity: z.number().int().min(1).max(1000).optional(),
      donorName: z.string().trim().min(2).max(120).optional(),
      phone: z.string().refine(isValidPhone, "WhatsApp inválido").optional(),
      reportedPixValue: z.number().min(0).max(100000).optional(),
      adminNotes: z.string().max(1000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const store = await adminStore();
    const { id, phone, ...patch } = data;
    return store.updateDonation(id, { ...patch, phone: phone ? normalizePhone(phone) : undefined });
  });

export const getReceipt = createServerFn({ method: "GET" })
  .inputValidator(z.object({ donationId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const store = await adminStore();
    return store.getReceipt(data.donationId);
  });

export const saveProduct = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().trim().min(1).max(120),
      category: z.string().trim().min(1).max(60),
      description: z.string().max(500),
      unitDescription: z.string().trim().min(1).max(120),
      unitAmount: z.number().positive().max(100000),
      unitSingular: z.string().trim().min(1).max(60),
      unitPlural: z.string().trim().min(1).max(60),
      totalUnits: z.number().int().min(0).max(10000),
      estimatedPrice: z.number().min(0).max(100000),
      icon: z.string().trim().min(1).max(16),
      sortOrder: z.number().int().min(0).max(100000),
      active: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const store = await adminStore();
    return store.saveProduct(data);
  });

export const updateSettings = createServerFn({ method: "POST" })
  .inputValidator(
    z
      .object({
        campaignName: z.string().trim().min(1).max(120),
        institutionName: z.string().trim().min(1).max(120),
        campaignDeadline: z.string().datetime({ offset: true }),
        campaignActive: z.boolean(),
        pixKey: z.string().trim().max(120),
        pixRecipient: z.string().trim().max(120),
        pixCity: z.string().trim().max(60),
        pixQrEnabled: z.boolean(),
        deliveryLocation: z.string().trim().max(300),
        campaignMessage: z.string().trim().max(1000),
        childrenGoal: z.number().int().min(1).max(100000),
        showSupporters: z.boolean(),
      })
      .partial(),
  )
  .handler(async ({ data }) => {
    const store = await adminStore();
    return store.updateSettings(data);
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  computeProgress,
  firstName,
  isCampaignOpen,
  isValidPhone,
  normalizePhone,
  type DonationResult,
  type ProductProgress,
} from "./types";

export type PublicProduct = Omit<ProductProgress, "createdAt" | "updatedAt">;

// Somente dados públicos: nenhum telefone, comprovante ou dado administrativo.
export const getPublicCampaign = createServerFn({ method: "GET" }).handler(async () => {
  const { getStore } = await import("./store.server");
  const store = await getStore();
  const [settings, products, donations] = await Promise.all([
    store.getSettings(),
    store.listProducts(),
    store.listDonations(),
  ]);
  const progress = computeProgress(products, donations);

  const supporters = settings.showSupporters
    ? [
        ...new Set(
          donations
            .filter((d) => d.status !== "CANCELLED")
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .map((d) => firstName(d.donorName))
            .filter(Boolean),
        ),
      ].slice(-60)
    : [];

  return {
    settings: {
      campaignName: settings.campaignName,
      institutionName: settings.institutionName,
      campaignDeadline: settings.campaignDeadline,
      campaignActive: settings.campaignActive,
      pixKey: settings.pixKey,
      pixRecipient: settings.pixRecipient,
      pixCity: settings.pixCity,
      pixQrEnabled: settings.pixQrEnabled,
      deliveryLocation: settings.deliveryLocation,
      campaignMessage: settings.campaignMessage,
      childrenGoal: settings.childrenGoal,
      showSupporters: settings.showSupporters,
    },
    isOpen: isCampaignOpen(settings),
    products: progress.products
      .filter((p) => p.active)
      .map(({ createdAt: _c, updatedAt: _u, ...p }) => p satisfies PublicProduct),
    stats: progress.stats,
    supporters,
    serverTime: new Date().toISOString(),
  };
});

export type PublicCampaign = Awaited<ReturnType<typeof getPublicCampaign>>;

const MAX_RECEIPT_BASE64 = 3_000_000; // ~2,2 MB de arquivo

const donationInput = z
  .object({
    productId: z.string().uuid(),
    donationType: z.enum(["PRODUCT", "PIX"]),
    quantity: z.number().int().min(1).max(100),
    donorName: z.string().trim().min(2, "Informe seu nome").max(120),
    phone: z.string().refine(isValidPhone, "WhatsApp inválido"),
    acknowledged: z.boolean().optional(),
    reportedPixValue: z.number().positive().max(100000).nullable().optional(),
    receipt: z
      .object({
        mime: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
        data: z
          .string()
          .max(MAX_RECEIPT_BASE64)
          .regex(/^[A-Za-z0-9+/=]+$/),
        filename: z.string().max(120),
      })
      .nullable()
      .optional(),
    website: z.string().max(0).optional(), // honeypot contra robôs
  })
  .superRefine((v, ctx) => {
    if (v.donationType === "PRODUCT" && !v.acknowledged) {
      ctx.addIssue({
        code: "custom",
        path: ["acknowledged"],
        message: "Confirme que está ciente da entrega.",
      });
    }
    if (v.donationType === "PIX" && !v.reportedPixValue) {
      ctx.addIssue({
        code: "custom",
        path: ["reportedPixValue"],
        message: "Informe o valor enviado.",
      });
    }
  });

export const createDonation = createServerFn({ method: "POST" })
  .inputValidator(donationInput)
  .handler(async ({ data }): Promise<DonationResult> => {
    const { getStore } = await import("./store.server");
    const store = await getStore();
    const result = await store.createDonation({
      productId: data.productId,
      donationType: data.donationType,
      quantity: data.quantity,
      donorName: data.donorName,
      phone: normalizePhone(data.phone),
      reportedPixValue: data.donationType === "PIX" ? (data.reportedPixValue ?? null) : null,
      receipt: data.donationType === "PIX" ? (data.receipt ?? null) : null,
    });
    if (!result.ok) return result;
    // não devolve telefone ao navegador
    return { ok: true, donation: { ...result.donation, phone: "" } };
  });

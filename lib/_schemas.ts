import { z } from "zod";

export const IdentifiedCardSchema = z.object({
  playerName: z.string(),
  team: z.string(),
  cardSpecifics: z.string(),
  set: z.string(),
  setNumber: z.string().optional(),
  condition: z.string().optional(),
  estimatedValue: z.number(),
  description: z.string().optional().default(""),
  serialNumber: z.string().optional(),
  certNumber: z.string().optional(),
  reasoning: z.string().optional(),
  rarityTier: z.enum(["Base", "Parallel", "Chase", "1/1"]).optional(),
  checklistVerified: z.boolean().optional(),
  setYearStart:   z.number().optional(),
  setYearEnd:     z.number().nullable().optional(),
  manufacturer:   z.string().optional(),
  productLine:    z.string().optional(),
  setConfidence:  z.number().min(0).max(1).optional(),
  yearConfidence: z.number().min(0).max(1).optional(),
});

export const BoundingBoxSchema = z.object({
  ymin: z.number(),
  xmin: z.number(),
  ymax: z.number(),
  xmax: z.number(),
});

export const MarketIntelSchema = z.object({
  sold: z.array(z.object({
    title: z.string(),
    uri: z.string(),
    soldDate: z.string().optional(),
    price: z.number(),
    currency: z.string(),
    shipping: z.number().optional(),
    grade: z.string().optional(),
    matchConfidence: z.number(),
    source: z.string(),
    flags: z.array(z.string()).optional(),
  })).default([]),
  active: z.array(z.object({
    title: z.string(),
    uri: z.string(),
    price: z.number(),
    currency: z.string(),
    shipping: z.number().optional(),
    source: z.string(),
    flags: z.array(z.string()).optional(),
  })).default([]),
  notes: z.string().optional(),
  fxRateUsed: z.string().optional(),
});

export function parseGeminiJson<T>(text: string, schema: z.ZodType<T>): T {
  const parsed = JSON.parse(text || "{}");
  return schema.parse(parsed);
}

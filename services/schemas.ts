import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().optional(),
  bio: z.string().optional(),
  favClub: z.string().optional(),
  favPlayer: z.string().optional(),
  bannerUrl: z.string().optional(),
});

export const BinderPageSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

export const CardSchema = z.object({
  id: z.string(),
  playerName: z.string(),
  team: z.string().optional(),
  cardSpecifics: z.string(),
  set: z.string(),
  setNumber: z.string().optional(),
  condition: z.string(),
  pricePaid: z.number(),
  marketValue: z.number(),
  purchaseDate: z.string(),
  serialNumber: z.string().optional(),
  certNumber: z.string().optional(),
  images: z.array(z.string()),
  notes: z.string().optional(),
  createdAt: z.number(),
  rarityTier: z.enum(["Base", "Parallel", "Chase", "1/1"]).optional(),
  isWishlist: z.boolean().optional(),
  pageId: z.string().optional(),
  isPublic: z.boolean(),
  ownerUsername: z.string().optional(),
  ownerAvatar: z.string().optional(),
  ownerId: z.string().optional(),
  marketMeta: z.any().optional(),
  marketValueLocked: z.boolean().optional(),
  setCanonicalKey: z.string().optional(),
  setYearStart: z.number().optional(),
  setYearEnd: z.number().optional(),
  manufacturer: z.string().optional(),
  productLine: z.string().optional(),
});

/** Safely parse JSON and validate with a Zod schema. Returns null on any failure. */
export function safeParseJson<T>(raw: string, schema: z.ZodType<T>): T | null {
  try {
    const parsed = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      console.warn("Schema validation failed:", result.error.flatten());
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

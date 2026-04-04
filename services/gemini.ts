// Gemini service - frontend HTTP client only.
// All Gemini SDK calls happen server-side in /api/*.
// No API keys are exposed to the browser.

import { supabase, isSupabaseConfigured } from "./storage";

export interface IdentifiedCard {
  playerName: string;
  team: string;
  cardSpecifics: string;
  set: string;
  setNumber?: string;
  condition?: string;
  estimatedValue: number;
  description: string;
  serialNumber?: string;
  certNumber?: string;
  reasoning?: string;
  rarityTier?: 'Base' | 'Parallel' | 'Chase' | '1/1';
  checklistVerified?: boolean;
  setYearStart?: number;
  setYearEnd?: number | null;
  manufacturer?: string;
  productLine?: string;
  setConfidence?: number;
  yearConfidence?: number;
  parallelConfidence?: number;
  copyrightYear?: number;
  sport?: string;
  category?: 'Sports' | 'TCG' | 'Non-Sports';
}

export interface MarketPriceResult {
  price: number;
  sources: { title: string; uri: string }[];
  summary: string;
}

export interface MarketIntel {
  sold: Array<{
    title: string;
    uri: string;
    soldDate?: string;
    price: number;
    currency: string;
    shipping?: number;
    grade?: string;
    matchConfidence: number;
    source: string;
    flags?: string[];
  }>;
  active: Array<{
    title: string;
    uri: string;
    price: number;
    currency: string;
    shipping?: number;
    source: string;
    flags?: string[];
  }>;
  notes?: string;
  fxRateUsed?: string;
  sources?: { title: string; uri: string }[];
}

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export class RateLimitError extends Error {
  constructor(message = "Rate limit reached. Please wait a moment before trying again.") {
    super(message);
    this.name = "RateLimitError";
  }
}

/** Retrieves the current user's JWT access token for authenticated API calls. */
async function getAuthToken(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function post<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const token = await getAuthToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(path, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      console.error(`${path} error:`, err);
      if (res.status === 429) {
        throw new RateLimitError(err.error);
      }
      return null;
    }
    return res.json() as Promise<T>;
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    console.error(`${path} fetch error:`, error);
    return null;
  }
}

export const identifyCard = (images: string[]): Promise<IdentifiedCard | null> =>
  post<IdentifiedCard>("/api/identify-card", { images });

export const getCardBoundingBox = (imageData: string): Promise<BoundingBox | null> =>
  post<BoundingBox>("/api/bounding-box", { imageData });

export const getMarketIntel = (
  playerName: string,
  cardSpecifics: string,
  set: string,
  condition?: string,
  certNumber?: string
): Promise<MarketIntel | null> =>
  post<MarketIntel>("/api/market-intel", { playerName, cardSpecifics, set, condition, certNumber });


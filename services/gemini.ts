
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

async function post<T>(endpoint: string, body: object): Promise<T | null> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      console.error(`${endpoint} error:`, err);
      return null;
    }
    return res.json();
  } catch (error) {
    console.error(`${endpoint} error:`, error);
    return null;
  }
}

export const identifyCard = (images: string[]): Promise<IdentifiedCard | null> =>
  post<IdentifiedCard>('/api/identify-card', { images });

export const getCardBoundingBox = (imageData: string): Promise<BoundingBox | null> =>
  post<BoundingBox>('/api/bounding-box', { imageData });

export const getMarketPrice = (
  playerName: string,
  cardSpecifics: string,
  set: string,
  condition?: string,
  certNumber?: string
): Promise<MarketPriceResult | null> =>
  post<MarketPriceResult>('/api/market-price', { playerName, cardSpecifics, set, condition, certNumber });

export const getMarketIntel = (
  playerName: string,
  cardSpecifics: string,
  set: string,
  condition?: string,
  certNumber?: string
): Promise<MarketIntel | null> =>
  post<MarketIntel>('/api/market-intel', { playerName, cardSpecifics, set, condition, certNumber });

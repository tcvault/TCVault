
export interface User {
  id: string;
  username: string;
  avatar?: string;
}

// Renamed from Binder to BinderPage to fix import errors in storage and forms
export interface BinderPage {
  id: string;
  name: string;
  description?: string;
}

export interface PriceSnapshot {
  date: string;
  value: number;
}

export interface Card {
  id: string;
  playerName: string;
  team?: string;
  cardSpecifics: string;
  set: string;
  setNumber?: string;
  condition: string;
  pricePaid: number;
  marketValue: number;
  purchaseDate: string;
  serialNumber?: string;
  images: string[];
  notes?: string;
  createdAt: number;
  rarityTier?: 'Base' | 'Parallel' | 'Chase' | '1/1';
  isWishlist?: boolean;
  pageId?: string; // Reference to a Binder ID
  priceHistory?: PriceSnapshot[];
}

export interface CollectionStats {
  totalCards: number;
  totalSpent: number;
  totalMarketValue: number;
  valueGrowth: number;
  topSet: string;
  dailyChange?: number;
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  ADD_CARD = 'ADD_CARD',
  SETTINGS = 'SETTINGS'
}

export type SortField = 'playerName' | 'purchaseDate' | 'marketValue' | 'pricePaid';
export type SortOrder = 'asc' | 'desc';

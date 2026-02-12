
export interface Card {
  id: string;
  playerName: string;
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
}

export interface CollectionStats {
  totalCards: number;
  totalInvestment: number;
  totalMarketValue: number;
  netProfit: number;
  topSet: string;
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  ADD_CARD = 'ADD_CARD',
  SETTINGS = 'SETTINGS'
}

export type SortField = 'playerName' | 'purchaseDate' | 'marketValue' | 'pricePaid';
export type SortOrder = 'asc' | 'desc';

export interface User {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  favClub?: string;
  favPlayer?: string;
  bannerUrl?: string; // New: Custom profile banner
}

export interface BinderPage {
  id: string;
  name: string;
  description?: string;
}

export type PostTag = 'Pickup' | 'PC Update' | 'Show Coverage' | 'General';

export interface SocialComment {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  content: string;
  createdAt: number;
}

export interface SocialPost {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  content: string;
  tag: PostTag;
  imageUrl?: string;
  likes: string[]; // array of user IDs
  createdAt: number;
  commentCount: number;
  comments: SocialComment[];
}

export interface MarketComp {
  title: string;
  uri: string;
  soldDate?: string;         // ISO
  priceGbp: number;          // normalized GBP
  shippingGbp?: number;
  source: 'eBay' | 'PWCC' | 'Goldin' | 'MySlabs' | 'COMC' | 'Other';
  matchConfidence: number;   // 0..1
  grade?: string;            // "PSA 10", "BGS 9.5", "RAW NM"
  flags?: string[];          // ["lot", "damaged", "unknownParallel"]
}

export interface MarketMeta {
  valuationVersion: string;  // "v1"
  updatedAt: number;         // epoch ms
  compsUsed: number;
  liquidity30d?: number;     // sold count in last 30d
  confidence: 'low' | 'medium' | 'high';
  low: number;               // quick-sale
  mid: number;               // fair
  high: number;              // premium
  spreadPct?: number;        // active-vs-sold signal
  summary?: string;
  sources?: { title: string; uri: string }[];
  comps?: MarketComp[];      // keep last N (e.g. 12)
  fxNote?: string;
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
  certNumber?: string;
  images: string[];
  notes?: string;
  createdAt: number;
  rarityTier?: 'Base' | 'Parallel' | 'Chase' | '1/1';
  isWishlist?: boolean;
  pageId?: string;
  isPublic: boolean; // New: Social visibility
  ownerUsername?: string; // New: Display name of the collector
  ownerAvatar?: string; // New: Avatar of the collector
  ownerId?: string; // New: ID to filter by collector
  marketMeta?: MarketMeta;
  marketValueLocked?: boolean; // manual override protection
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
  FEED = 'FEED',
  EXPLORE = 'EXPLORE',
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  ADD_CARD = 'ADD_CARD',
  PROFILE = 'PROFILE',
  SETTINGS = 'SETTINGS'
}

export type SortField = 'playerName' | 'purchaseDate' | 'marketValue' | 'pricePaid';
export type SortOrder = 'asc' | 'desc';
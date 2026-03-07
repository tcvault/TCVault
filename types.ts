export interface User {
  id: string;
  username: string;
  avatar?: string | undefined;
  bio?: string | undefined;
  favClub?: string | undefined;
  favPlayer?: string | undefined;
  bannerUrl?: string | undefined;
}

export interface BinderPage {
  id: string;
  name: string;
  description?: string | undefined;
}

export type PostTag = 'Pickup' | 'PC Update' | 'Show Coverage' | 'General';

export interface SocialComment {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string | undefined;
  content: string;
  createdAt: number;
}

export interface SocialPost {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string | undefined;
  content: string;
  tag: PostTag;
  imageUrl?: string | undefined;
  likes: string[];
  createdAt: number;
  commentCount: number;
  comments: SocialComment[];
}


export interface WantItem {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string | undefined;
  title: string;
  details?: string | undefined;
  setCanonicalKey?: string | undefined;
  setDisplay?: string | undefined;
  targetPriceGbp?: number | undefined;
  status: 'open' | 'fulfilled' | 'archived';
  createdAt: number;
}

export interface ReleaseThreadComment {
  id: string;
  threadId: string;
  userId: string;
  username: string;
  userAvatar?: string | undefined;
  body: string;
  createdAt: number;
}

export interface ReleaseThread {
  id: string;
  creatorUserId: string;
  username: string;
  userAvatar?: string | undefined;
  title: string;
  body?: string | undefined;
  setCanonicalKey?: string | undefined;
  setDisplay?: string | undefined;
  category: 'release' | 'discussion' | 'event';
  createdAt: number;
  commentCount: number;
  comments: ReleaseThreadComment[];
}

export interface AppAlert {
  id: string;
  userId: string;
  alertType: 'want_match' | 'price_change' | 'thread_reply' | 'system';
  payload: Record<string, unknown>;
  isRead: boolean;
  createdAt: number;
  readAt?: number | undefined;
}
export interface MarketComp {
  title: string;
  uri: string;
  soldDate?: string | undefined;
  priceGbp: number;
  shippingGbp?: number | undefined;
  source: 'eBay' | 'PWCC' | 'Goldin' | 'MySlabs' | 'COMC' | 'Other';
  matchConfidence: number;
  grade?: string | undefined;
  flags?: string[] | undefined;
}

export interface MarketMeta {
  valuationVersion: string;
  updatedAt: number;
  compsUsed: number;
  liquidity30d?: number | undefined;
  confidence: 'low' | 'medium' | 'high';
  low: number;
  mid: number;
  high: number;
  spreadPct?: number | undefined;
  summary?: string | undefined;
  sources?: { title: string; uri: string }[] | undefined;
  comps?: MarketComp[] | undefined;
  fxNote?: string | undefined;
}

export interface Card {
  id: string;
  playerName: string;
  team?: string | undefined;
  cardSpecifics: string;
  set: string;
  setNumber?: string | undefined;
  condition: string;
  pricePaid: number;
  marketValue: number;
  purchaseDate: string;
  serialNumber?: string | undefined;
  certNumber?: string | undefined;
  images: string[];
  notes?: string | undefined;
  createdAt: number;
  rarityTier?: 'Base' | 'Parallel' | 'Chase' | '1/1' | undefined;
  isWishlist?: boolean | undefined;
  pageId?: string | undefined;
  isPublic: boolean;
  ownerUsername?: string | undefined;
  ownerAvatar?: string | undefined;
  ownerId?: string | undefined;
  marketMeta?: MarketMeta | undefined;
  marketValueLocked?: boolean | undefined;
  setCanonicalKey?: string | undefined;
  setYearStart?: number | undefined;
  setYearEnd?: number | undefined;
  manufacturer?: string | undefined;
  productLine?: string | undefined;
  sport?: string | undefined;
  category?: 'Sports' | 'TCG' | 'Non-Sports' | undefined;
}

export interface CollectionStats {
  totalCards: number;
  totalSpent: number;
  totalMarketValue: number;
  valueGrowth: number;
  topSet: string;
  dailyChange?: number | undefined;
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

export type SortField = 'playerName' | 'purchaseDate' | 'marketValue' | 'pricePaid' | 'setNumber';
export type SortOrder = 'asc' | 'desc';


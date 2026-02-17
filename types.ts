
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
  pageId?: string;
  isPublic: boolean; // New: Social visibility
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

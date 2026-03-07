import { createClient } from '@supabase/supabase-js';
import { Card, BinderPage, SocialPost, SocialComment, User } from '../types';
import { UserSchema, CardSchema, BinderPageSchema, safeParseJson } from './schemas';

const processEnv = typeof process !== 'undefined' ? process.env : undefined;
const envUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || processEnv?.SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || processEnv?.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(envUrl && envUrl.startsWith('http') && envKey);
export const supabase = isSupabaseConfigured ? createClient(envUrl!, envKey!) : null as any;

const LOCAL_CARDS_KEY = 'tcvault_local_cards';
const LOCAL_PAGES_KEY = 'tcvault_local_pages';
const LOCAL_PROFILE_PREFIX = 'tcvault_profile_';

class CloudStorageService {
  private async getUserId(): Promise<string | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  }

  async uploadImage(userId: string, base64Data: string): Promise<string> {
    if (userId === 'local-guest' || !supabase || !base64Data.startsWith('data:')) return base64Data;
    try {
      const mimeType = base64Data.split(';')[0]?.split(':')[1] ?? 'image/jpeg';
      const extension = mimeType.split('/')[1] ?? 'jpg';
      const base64Content = base64Data.split(',')[1] ?? '';
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const fileName = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { data, error } = await supabase.storage.from('card-images').upload(fileName, blob, { contentType: mimeType });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('card-images').getPublicUrl(data.path);
      return publicUrl;
    } catch (e) { 
      console.error("Storage upload failed, falling back to local base64:", e);
      return base64Data; 
    }
  }

  async saveUserProfile(user: User): Promise<void> {
    if (supabase) {
      const payload = {
        id: user.id,
        username: user.username,
        avatar_url: user.avatar,
        bio: user.bio,
        fav_club: user.favClub,
        fav_player: user.favPlayer,
        banner_url: user.bannerUrl
      };
      const { error } = await supabase.from('profiles').upsert(payload);
      if (error) console.error("Profile sync error:", error);
    }
    localStorage.setItem(`${LOCAL_PROFILE_PREFIX}${user.id}`, JSON.stringify(user));
  }

  async getUserProfile(userId: string): Promise<User | null> {
    if (supabase) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (!error && data) {
        return {
          id: data.id,
          username: data.username,
          avatar: data.avatar_url,
          bio: data.bio,
          favClub: data.fav_club,
          favPlayer: data.fav_player,
          bannerUrl: data.banner_url
        };
      }
    }
    const local = localStorage.getItem(`${LOCAL_PROFILE_PREFIX}${userId}`);
    return local ? safeParseJson(local, UserSchema) : null;
  }

  async getPosts(): Promise<SocialPost[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('social_posts')
        .select('*, profiles(username, avatar_url)')
        .order('created_at', { ascending: false });
      if (error) {
        console.error("Error fetching posts:", error);
        throw error;
      }
      if (data) {
        return data.map((p: any) => ({
          ...p,
          userId: p.user_id,
          username: p.profiles?.username || 'Collector',
          userAvatar: p.profiles?.avatar_url || undefined,
          imageUrl: p.image_url,
          createdAt: new Date(p.created_at).getTime(),
          likes: p.likes || [],
          comments: p.comments || [],
          commentCount: (p.comments || []).length
        }));
      }
    }
    return [];
  }

  async savePost(post: SocialPost): Promise<void> {
    if (supabase) {
      const payload = {
        id: post.id,
        user_id: post.userId,
        content: post.content,
        tag: post.tag,
        image_url: post.imageUrl,
        likes: post.likes,
        comments: post.comments,
        created_at: new Date(post.createdAt).toISOString()
      };
      const { error } = await supabase.from('social_posts').upsert(payload);
      if (error) throw error;
    }
  }

  async toggleLike(postId: string, userId: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.rpc('toggle_post_like', {
      p_post_id: postId,
      p_user_id: userId,
    });
    if (error) throw error;
  }

  async addComment(postId: string, comment: SocialComment): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.rpc('add_post_comment', {
      p_post_id: postId,
      p_comment: comment,
    });
    if (error) throw error;
  }

  async deletePost(postId: string): Promise<void> {
    if (supabase) {
      const userId = await this.getUserId();
      if (!userId) throw new Error("Not authenticated");
      // .eq('user_id', userId) prevents deleting another user's post
      const { error } = await supabase.from('social_posts').delete().eq('id', postId).eq('user_id', userId);
      if (error) {
        console.error("Error deleting post:", error);
        throw error;
      }
    }
  }

  async getCards(userId?: string): Promise<Card[]> {
    const effectiveUserId = userId || await this.getUserId();
    if (effectiveUserId && supabase) {
      const { data, error } = await supabase.from('cards').select('*').eq('user_id', effectiveUserId).order('created_at', { ascending: false });
      if (!error && data) {
        return data.map((item: any) => ({
          id: item.id,
          playerName: item.player_name,
          team: item.team,
          cardSpecifics: item.card_specifics,
          set: item.set,
          setNumber: item.set_number,
          condition: item.condition,
          pricePaid: Number(item.price_paid),
          marketValue: Number(item.market_value),
          purchaseDate: item.purchase_date,
          serialNumber: item.serial_number,
          certNumber: item.cert_number,
          images: item.images,
          notes: item.notes,
          createdAt: new Date(item.created_at).getTime(),
          pageId: item.page_id || '',
          rarityTier: item.rarity_tier as any,
          isPublic: item.is_public ?? true,
          marketMeta: item.market_meta || undefined,
          marketValueLocked: item.market_value_locked ?? false,
          setCanonicalKey: item.set_canonical_key || undefined,
          setYearStart: item.set_year_start ?? undefined,
          setYearEnd: item.set_year_end ?? undefined,
          manufacturer: item.manufacturer || undefined,
          productLine: item.product_line || undefined,
          sport: item.sport || undefined,
          category: item.category || undefined,
        }));
      }
    }
    const local = localStorage.getItem(LOCAL_CARDS_KEY);
    return local ? (safeParseJson(local, CardSchema.array()) ?? []) : [];
  }

  async getPublicCards(): Promise<Card[]> {
    if (supabase) {
      // Fetch cards with profile data joined
      const { data, error } = await supabase
        .from('cards')
        .select('*, profiles(username, avatar_url)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        return data.map((item: any) => ({
          id: item.id,
          playerName: item.player_name,
          team: item.team,
          cardSpecifics: item.card_specifics,
          set: item.set,
          setNumber: item.set_number,
          condition: item.condition,
          pricePaid: Number(item.price_paid),
          marketValue: Number(item.market_value),
          purchaseDate: item.purchase_date,
          serialNumber: item.serial_number,
          images: item.images,
          notes: item.notes,
          createdAt: new Date(item.created_at).getTime(),
          pageId: item.page_id || '',
          rarityTier: item.rarity_tier as any,
          isPublic: item.is_public,
          ownerUsername: item.profiles?.username || 'Collector',
          ownerAvatar: item.profiles?.avatar_url,
          ownerId: item.user_id,
          certNumber: item.cert_number,
          marketMeta: item.market_meta || undefined,
          marketValueLocked: item.market_value_locked ?? false,
          setCanonicalKey: item.set_canonical_key || undefined,
          setYearStart: item.set_year_start ?? undefined,
          setYearEnd: item.set_year_end ?? undefined,
          manufacturer: item.manufacturer || undefined,
          productLine: item.product_line || undefined,
          sport: item.sport || undefined,
          category: item.category || undefined,
        }));
      }
    }
    const local = localStorage.getItem(LOCAL_CARDS_KEY);
    return local ? (safeParseJson(local, CardSchema.array()) ?? []).filter((c: Card) => c.isPublic) : [];
  }

  async saveCard(card: Partial<Card>): Promise<Card> {
    const userId = await this.getUserId();
    const cardId = card.id || crypto.randomUUID();
    const createdAt = card.createdAt || Date.now();

    if (userId && supabase) {
      const payload: any = {
        id: cardId,
        user_id: userId,
        player_name: card.playerName,
        team: card.team,
        card_specifics: card.cardSpecifics,
        set: card.set,
        set_number: card.setNumber,
        condition: card.condition,
        price_paid: card.pricePaid,
        market_value: card.marketValue,
        purchase_date: card.purchaseDate,
        serial_number: card.serialNumber,
        cert_number: card.certNumber,
        images: card.images,
        notes: card.notes,
        page_id: card.pageId || null,
        rarity_tier: card.rarityTier,
        is_public: card.isPublic ?? true,
        created_at: new Date(createdAt).toISOString(),
        market_meta: (card as any).marketMeta ?? null,
        market_value_locked: (card as any).marketValueLocked ?? false,
        set_canonical_key: card.setCanonicalKey ?? null,
        set_year_start: card.setYearStart ?? null,
        set_year_end: card.setYearEnd ?? null,
        manufacturer: card.manufacturer ?? null,
        product_line: card.productLine ?? null,
        sport: card.sport ?? null,
        category: card.category ?? null,
      };

      let { data, error } = await supabase.from('cards').upsert(payload).select().single();
      
      // Handle missing column errors (e.g. if columns were recently added but DB not updated)
      if (error && (error.code === '42703' || error.message?.includes('column'))) {
        console.warn("Detected missing column, retrying with minimal payload...", error.message);
        const minimalPayload = { ...payload };
        delete minimalPayload.cert_number;
        delete minimalPayload.rarity_tier;
        delete minimalPayload.is_public;
        delete minimalPayload.page_id;
        delete minimalPayload.market_meta;
        delete minimalPayload.market_value_locked;
        delete minimalPayload.set_canonical_key;
        delete minimalPayload.set_year_start;
        delete minimalPayload.set_year_end;
        delete minimalPayload.manufacturer;
        delete minimalPayload.product_line;
        delete minimalPayload.sport;
        delete minimalPayload.category;
        
        const retry = await supabase.from('cards').upsert(minimalPayload).select().single();
        data = retry.data;
        error = retry.error;
      }
      
      if (error) {
        console.error("Card save sync error:", error);
        throw error; // Propagate error to UI
      }

      if (data) {
        const savedCard: Card = {
          id: data.id,
          playerName: data.player_name,
          team: data.team,
          cardSpecifics: data.card_specifics,
          set: data.set,
          setNumber: data.set_number,
          condition: data.condition,
          pricePaid: Number(data.price_paid),
          marketValue: Number(data.market_value),
          purchaseDate: data.purchase_date,
          serialNumber: data.serial_number,
          certNumber: data.cert_number,
          images: data.images,
          notes: data.notes,
          createdAt: new Date(data.created_at).getTime(),
          pageId: data.page_id || '',
          rarityTier: data.rarity_tier as any,
          isPublic: data.is_public ?? true,
          marketMeta: data.market_meta || undefined,
          marketValueLocked: data.market_value_locked ?? false,
          setCanonicalKey: data.set_canonical_key || undefined,
          setYearStart: data.set_year_start ?? undefined,
          setYearEnd: data.set_year_end ?? undefined,
          manufacturer: data.manufacturer || undefined,
          productLine: data.product_line || undefined,
          sport: data.sport || undefined,
          category: data.category || undefined,
        };

        // Update local storage only on success
        const current = await this.getCards();
        const existingIdx = current.findIndex(c => c.id === savedCard.id);
        if (existingIdx > -1) current[existingIdx] = savedCard; else current.unshift(savedCard);
        localStorage.setItem(LOCAL_CARDS_KEY, JSON.stringify(current));
        
        return savedCard;
      }
    }

    // Guest mode or fallback
    const current = await this.getCards();
    const newCard = { ...card, id: cardId, createdAt } as Card;
    const existingIdx = current.findIndex(c => c.id === newCard.id);
    if (existingIdx > -1) current[existingIdx] = newCard; else current.unshift(newCard);
    localStorage.setItem(LOCAL_CARDS_KEY, JSON.stringify(current));
    return newCard;
  }

  async deleteCard(id: string): Promise<void> {
    const userId = await this.getUserId();
    if (userId && supabase) {
      // .eq('user_id', userId) prevents deleting another user's card
      const { error } = await supabase.from('cards').delete().eq('id', id).eq('user_id', userId);
      if (error) {
        console.error("Error deleting card:", error);
        throw error;
      }
    }
    const current = await this.getCards();
    localStorage.setItem(LOCAL_CARDS_KEY, JSON.stringify(current.filter(c => c.id !== id)));
  }

  async getPages(userId?: string): Promise<BinderPage[]> {
    const effectiveUserId = userId || await this.getUserId();
    if (effectiveUserId && supabase) {
      const { data, error } = await supabase.from('pages').select('*').eq('user_id', effectiveUserId).order('name');
      if (error) {
        console.error("Error fetching pages:", error);
        throw error;
      }
      if (data) return data;
    }
    const local = localStorage.getItem(LOCAL_PAGES_KEY);
    return local ? (safeParseJson(local, BinderPageSchema.array()) ?? []) : [];
  }

  async createPage(name: string): Promise<BinderPage> {
    const userId = await this.getUserId();
    if (userId && supabase) {
      const { data, error } = await supabase.from('pages').insert({ user_id: userId, name }).select().single();
      
      if (error) {
        console.error("Page creation sync error:", error);
        throw error;
      }
      
      if (data) {
        const current = await this.getPages();
        current.push(data);
        localStorage.setItem(LOCAL_PAGES_KEY, JSON.stringify(current));
        return data;
      }
    }
    const current = await this.getPages();
    const newPage = { id: crypto.randomUUID(), name };
    current.push(newPage);
    localStorage.setItem(LOCAL_PAGES_KEY, JSON.stringify(current));
    return newPage;
  }

  async deletePage(id: string): Promise<void> {
    const userId = await this.getUserId();
    if (userId && supabase) {
      // .eq('user_id', userId) prevents deleting another user's page
      const { error } = await supabase.from('pages').delete().eq('id', id).eq('user_id', userId);
      if (error) {
        console.error("Error deleting page:", error);
        throw error;
      }
    }
    const current = await this.getPages();
    localStorage.setItem(LOCAL_PAGES_KEY, JSON.stringify(current.filter(p => p.id !== id)));
  }
}

export const vaultStorage = new CloudStorageService();





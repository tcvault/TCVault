import { createClient } from '@supabase/supabase-js';
import { Card, BinderPage, SocialPost, SocialComment, User, Notification, NotificationType } from '../types';

const runtimeEnv = typeof process !== 'undefined' ? process.env : undefined;
const envUrl = import.meta.env.VITE_SUPABASE_URL || runtimeEnv?.SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || runtimeEnv?.SUPABASE_ANON_KEY;
const supabaseProjectRef = envUrl ? new URL(envUrl).hostname.split('.')[0] : null;

export const isSupabaseConfigured = !!(envUrl && envUrl.startsWith('http') && envKey);
export const supabase = isSupabaseConfigured ? createClient(envUrl!, envKey!) : null as any;
export const SUPABASE_AUTH_STORAGE_KEY = supabaseProjectRef ? `sb-${supabaseProjectRef}-auth-token` : null;

const LOCAL_GUEST_ID_KEY = 'tcvault_local_guest_id';
const LOCAL_ACTIVE_SESSION_KEY = 'tcvault_active_session';
const LOCAL_PROFILE_PREFIX = 'tcvault_profile_';

export function isRecoverableSupabaseAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('Navigator LockManager lock') ||
    message.includes('AuthRetryableFetchError') ||
    message.includes('refresh_token') ||
    message.includes('504')
  );
}

export function clearSupabaseSessionArtifacts() {
  if (!SUPABASE_AUTH_STORAGE_KEY || typeof window === 'undefined') return;

  const keysToRemove = [
    SUPABASE_AUTH_STORAGE_KEY,
    `${SUPABASE_AUTH_STORAGE_KEY}-code-verifier`,
    `${SUPABASE_AUTH_STORAGE_KEY}-user`,
    LOCAL_ACTIVE_SESSION_KEY,
  ];

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export async function getSupabaseSessionSafely() {
  if (!supabase) {
    return { session: null, error: null as unknown };
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error && isRecoverableSupabaseAuthError(error)) {
      clearSupabaseSessionArtifacts();
      return { session: null, error };
    }
    return { session, error };
  } catch (error) {
    if (isRecoverableSupabaseAuthError(error)) {
      clearSupabaseSessionArtifacts();
      return { session: null, error };
    }
    throw error;
  }
}

class CloudStorageService {
  private getScopedLocalCardsKey(userId: string) {
    return `tcvault_local_cards_${userId}`;
  }

  private getScopedLocalPagesKey(userId: string) {
    return `tcvault_local_pages_${userId}`;
  }

  private getStoredLocalSessionUserId(): string | null {
    try {
      const rawSession = localStorage.getItem(LOCAL_ACTIVE_SESSION_KEY);
      if (!rawSession) return null;
      const parsed = JSON.parse(rawSession);
      return typeof parsed?.id === 'string' ? parsed.id : null;
    } catch {
      return null;
    }
  }

  private getOrCreateGuestUserId(): string {
    const existingGuestId = localStorage.getItem(LOCAL_GUEST_ID_KEY);
    if (existingGuestId) return existingGuestId;

    const guestId = `local-guest-${crypto.randomUUID()}`;
    localStorage.setItem(LOCAL_GUEST_ID_KEY, guestId);
    return guestId;
  }

  private async getEffectiveLocalUserId(preferredUserId?: string): Promise<string> {
    if (preferredUserId) return preferredUserId;

    const sessionUserId = await this.getUserId();
    if (sessionUserId) return sessionUserId;

    return this.getStoredLocalSessionUserId() || this.getOrCreateGuestUserId();
  }

  private async getUserId(): Promise<string | null> {
    if (!supabase) return null;
    try {
      const { session } = await getSupabaseSessionSafely();
      return session?.user?.id || null;
    } catch {
      return null;
    }
  }

  async uploadImage(userId: string, base64Data: string): Promise<string> {
    if (userId === 'local-guest' || !supabase || !base64Data.startsWith('data:')) return base64Data;
    try {
      const mimeType = base64Data.split(';')[0].split(':')[1] || 'image/jpeg';
      const extension = mimeType.split('/')[1] || 'jpg';
      const base64Content = base64Data.split(',')[1];
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
    return local ? JSON.parse(local) : null;
  }

  async getPosts(): Promise<SocialPost[]> {
    if (supabase) {
      const { data, error } = await supabase.from('social_posts').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error("Error fetching posts:", error);
        throw error;
      }
      if (data) {
        return data.map((p: any) => ({
          ...p,
          userId: p.user_id,
          userAvatar: p.user_avatar,
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
        username: post.username,
        user_avatar: post.userAvatar,
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
    
    let success = false;
    let attempts = 0;
    const maxAttempts = 5;
    let finalLikes: string[] = [];

    while (!success && attempts < maxAttempts) {
      attempts++;
      const { data, error: fetchError } = await supabase
        .from('social_posts')
        .select('likes')
        .eq('id', postId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const oldLikes = data?.likes || [];
      const likes = [...oldLikes];
      const likeIdx = likes.indexOf(userId);
      if (likeIdx > -1) likes.splice(likeIdx, 1);
      else likes.push(userId);

      finalLikes = likes;

      const { data: updateData, error: updateError } = await supabase
        .from('social_posts')
        .update({ likes })
        .eq('id', postId)
        .eq('likes', oldLikes)
        .select();

      if (!updateError && updateData && updateData.length > 0) {
        success = true;
      } else if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 50 + Math.random() * 50));
      }
    }
    
    if (!success) throw new Error("Concurrent update detected. Please try again.");

    // Create notification if it's a new like (not an unlike)
    const isLiked = finalLikes.includes(userId);
    if (isLiked && supabase) {
      // Get post owner
      const { data: postData } = await supabase.from('social_posts').select('user_id').eq('id', postId).single();
      if (postData && postData.user_id !== userId) {
        // Get liker username
        const profile = await this.getUserProfile(userId);
        await supabase.from('notifications').insert({
          user_id: postData.user_id,
          type: 'like',
          post_id: postId,
          from_user_id: userId,
          from_username: profile?.username || 'Someone',
          is_read: false
        });
      }
    }
  }

  async addComment(postId: string, comment: SocialComment): Promise<void> {
    if (!supabase) return;

    let success = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!success && attempts < maxAttempts) {
      attempts++;
      const { data, error: fetchError } = await supabase
        .from('social_posts')
        .select('comments')
        .eq('id', postId)
        .single();
      
      if (fetchError) throw fetchError;

      const oldComments = data?.comments || [];
      const comments = [...oldComments, comment];

      const { data: updateData, error: updateError } = await supabase
        .from('social_posts')
        .update({ comments })
        .eq('id', postId)
        .eq('comments', oldComments)
        .select();

      if (!updateError && updateData && updateData.length > 0) {
        success = true;
      } else if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 50 + Math.random() * 50));
      }
    }
    
    if (!success) throw new Error("Concurrent update detected. Please try again.");

    // Create notification
    if (supabase) {
      const { data: postData } = await supabase.from('social_posts').select('user_id').eq('id', postId).single();
      if (postData && postData.user_id !== comment.userId) {
        await supabase.from('notifications').insert({
          user_id: postData.user_id,
          type: 'comment',
          post_id: postId,
          from_user_id: comment.userId,
          from_username: comment.username,
          content: comment.content.substring(0, 50),
          is_read: false
        });
      }
    }
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }

    return (data || []).map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      type: n.type as NotificationType,
      postId: n.post_id,
      fromUserId: n.from_user_id,
      fromUsername: n.from_username,
      content: n.content,
      isRead: n.is_read,
      createdAt: new Date(n.created_at).getTime()
    }));
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    if (!supabase) return;
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    if (!supabase) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
  }

  async deletePost(postId: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('social_posts').delete().eq('id', postId);
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
          marketValueLocked: item.market_value_locked ?? false
        }));
      }
    }
    const localUserId = await this.getEffectiveLocalUserId(userId);
    const local = localStorage.getItem(this.getScopedLocalCardsKey(localUserId));
    return local ? JSON.parse(local) : [];
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
          marketValueLocked: item.market_value_locked ?? false
        }));
      }
    }
    const localUserId = await this.getEffectiveLocalUserId();
    const local = localStorage.getItem(this.getScopedLocalCardsKey(localUserId));
    return local ? JSON.parse(local).filter((c: Card) => c.isPublic) : [];
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
        market_value_locked: (card as any).marketValueLocked ?? false
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
          marketValueLocked: data.market_value_locked ?? false
        };
        
        // Update local storage only on success
        const current = await this.getCards(userId);
        const existingIdx = current.findIndex(c => c.id === savedCard.id);
        if (existingIdx > -1) current[existingIdx] = savedCard; else current.unshift(savedCard);
        localStorage.setItem(this.getScopedLocalCardsKey(userId), JSON.stringify(current));
        
        return savedCard;
      }
    }

    // Guest mode or fallback
    const localUserId = await this.getEffectiveLocalUserId();
    const current = await this.getCards(localUserId);
    const newCard = { ...card, id: cardId, createdAt } as Card;
    const existingIdx = current.findIndex(c => c.id === newCard.id);
    if (existingIdx > -1) current[existingIdx] = newCard; else current.unshift(newCard);
    localStorage.setItem(this.getScopedLocalCardsKey(localUserId), JSON.stringify(current));
    return newCard;
  }

  async deleteCard(id: string): Promise<void> {
    const userId = await this.getUserId();
    if (userId && supabase) {
      const { error } = await supabase.from('cards').delete().eq('id', id);
      if (error) {
        console.error("Error deleting card:", error);
        throw error;
      }
    }
    const localUserId = await this.getEffectiveLocalUserId();
    const current = await this.getCards(localUserId);
    localStorage.setItem(this.getScopedLocalCardsKey(localUserId), JSON.stringify(current.filter(c => c.id !== id)));
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
    const localUserId = await this.getEffectiveLocalUserId(userId);
    const local = localStorage.getItem(this.getScopedLocalPagesKey(localUserId));
    return local ? JSON.parse(local) : [];
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
        const current = await this.getPages(userId);
        current.push(data);
        localStorage.setItem(this.getScopedLocalPagesKey(userId), JSON.stringify(current));
        return data;
      }
    }
    const localUserId = await this.getEffectiveLocalUserId();
    const current = await this.getPages(localUserId);
    const newPage = { id: crypto.randomUUID(), name };
    current.push(newPage);
    localStorage.setItem(this.getScopedLocalPagesKey(localUserId), JSON.stringify(current));
    return newPage;
  }

  async deletePage(id: string): Promise<void> {
    const userId = await this.getUserId();
    if (userId && supabase) {
      const { error } = await supabase.from('pages').delete().eq('id', id);
      if (error) {
        console.error("Error deleting page:", error);
        throw error;
      }
    }
    const localUserId = await this.getEffectiveLocalUserId();
    const current = await this.getPages(localUserId);
    localStorage.setItem(this.getScopedLocalPagesKey(localUserId), JSON.stringify(current.filter(p => p.id !== id)));
  }
}

export const vaultStorage = new CloudStorageService();

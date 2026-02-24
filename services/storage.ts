import { createClient } from '@supabase/supabase-js';
import { Card, BinderPage, SocialPost, SocialComment, User } from '../types';

const envUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(envUrl && envUrl.startsWith('http') && envKey);
export const supabase = isSupabaseConfigured ? createClient(envUrl!, envKey!) : null as any;

const LOCAL_CARDS_KEY = 'tcvault_local_cards';
const LOCAL_PAGES_KEY = 'tcvault_local_pages';
const LOCAL_POSTS_KEY = 'tcvault_local_posts';
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
      if (!error && data) {
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
    const local = localStorage.getItem(LOCAL_POSTS_KEY);
    return local ? JSON.parse(local) : [];
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
      await supabase.from('social_posts').upsert(payload);
    }
    
    // Always update local storage for fallback
    const localPostsJson = localStorage.getItem(LOCAL_POSTS_KEY);
    const localPosts: SocialPost[] = localPostsJson ? JSON.parse(localPostsJson) : [];
    const existingIdx = localPosts.findIndex(p => p.id === post.id);
    if (existingIdx > -1) {
      localPosts[existingIdx] = post;
    } else {
      localPosts.unshift(post);
    }
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(localPosts.slice(0, 50)));
  }

  async toggleLike(postId: string, userId: string): Promise<void> {
    const posts = await this.getPosts();
    const postIdx = posts.findIndex(p => p.id === postId);
    if (postIdx === -1) return;

    const likes = [...posts[postIdx].likes];
    const likeIdx = likes.indexOf(userId);
    if (likeIdx > -1) likes.splice(likeIdx, 1);
    else likes.push(userId);

    if (supabase) {
      await supabase.from('social_posts').update({ likes }).eq('id', postId);
    }
    posts[postIdx].likes = likes;
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
  }

  async addComment(postId: string, comment: SocialComment): Promise<void> {
    const posts = await this.getPosts();
    const postIdx = posts.findIndex(p => p.id === postId);
    if (postIdx === -1) return;

    const comments = [...(posts[postIdx].comments || [])];
    comments.push(comment);

    if (supabase) {
      await supabase.from('social_posts').update({ comments }).eq('id', postId);
    }
    posts[postIdx].comments = comments;
    posts[postIdx].commentCount = comments.length;
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
  }

  async deletePost(postId: string): Promise<void> {
    if (supabase) {
      await supabase.from('social_posts').delete().eq('id', postId);
    }
    const localPostsJson = localStorage.getItem(LOCAL_POSTS_KEY);
    if (localPostsJson) {
      const localPosts: SocialPost[] = JSON.parse(localPostsJson);
      const filtered = localPosts.filter(p => p.id !== postId);
      localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(filtered));
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
          isPublic: item.is_public ?? true
        }));
      }
    }
    const local = localStorage.getItem(LOCAL_CARDS_KEY);
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
          certNumber: item.cert_number
        }));
      }
    }
    const local = localStorage.getItem(LOCAL_CARDS_KEY);
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
        created_at: new Date(createdAt).toISOString()
      };

      let { data, error } = await supabase.from('cards').upsert(payload).select().single();
      
      // Handle missing column errors (e.g. if columns were recently added but DB not updated)
      if (error && (error.code === '42703' || error.message?.includes('column'))) {
        console.warn("Detected missing column, retrying with minimal payload...", error.message);
        const minimalPayload = { ...payload };
        // Remove columns that are likely to be missing in older schemas
        delete minimalPayload.cert_number;
        delete minimalPayload.rarity_tier;
        delete minimalPayload.is_public;
        delete minimalPayload.page_id;
        
        const retry = await supabase.from('cards').upsert(minimalPayload).select().single();
        data = retry.data;
        error = retry.error;
      }
      
      if (!error && data) {
        return {
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
          isPublic: data.is_public ?? true
        };
      }
      if (error) {
        console.error("Card save sync error:", error);
        // If it's a missing column error (like cert_number), we might want to try without it
        // but for now we just log and fallback to local.
      }
    }

    const current = await this.getCards();
    const newCard = { ...card, id: cardId, createdAt } as Card;
    const existingIdx = current.findIndex(c => c.id === newCard.id);
    if (existingIdx > -1) current[existingIdx] = newCard; else current.unshift(newCard);
    localStorage.setItem(LOCAL_CARDS_KEY, JSON.stringify(current));
    return newCard;
  }

  async deleteCard(id: string): Promise<void> {
    const userId = await this.getUserId();
    if (userId && supabase) await supabase.from('cards').delete().eq('id', id);
    const current = await this.getCards();
    localStorage.setItem(LOCAL_CARDS_KEY, JSON.stringify(current.filter(c => c.id !== id)));
  }

  async getPages(userId?: string): Promise<BinderPage[]> {
    const effectiveUserId = userId || await this.getUserId();
    if (effectiveUserId && supabase) {
      const { data, error } = await supabase.from('pages').select('*').eq('user_id', effectiveUserId).order('name');
      if (!error && data) return data;
    }
    const local = localStorage.getItem(LOCAL_PAGES_KEY);
    return local ? JSON.parse(local) : [];
  }

  async createPage(name: string): Promise<BinderPage> {
    const userId = await this.getUserId();
    if (userId && supabase) {
      const { data, error } = await supabase.from('pages').insert({ user_id: userId, name }).select().single();
      
      // Handle potential missing columns or other errors
      if (error) {
        console.error("Page creation sync error:", error);
      }
      
      if (!error && data) return data;
    }
    const current = await this.getPages();
    const newPage = { id: crypto.randomUUID(), name };
    current.push(newPage);
    localStorage.setItem(LOCAL_PAGES_KEY, JSON.stringify(current));
    return newPage;
  }

  async deletePage(id: string): Promise<void> {
    const userId = await this.getUserId();
    if (userId && supabase) await supabase.from('pages').delete().eq('id', id);
    const current = await this.getPages();
    localStorage.setItem(LOCAL_PAGES_KEY, JSON.stringify(current.filter(p => p.id !== id)));
  }
}

export const vaultStorage = new CloudStorageService();
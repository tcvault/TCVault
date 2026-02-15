
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.45.0';
import { Card, BinderPage } from '../types';

// Helper to safely access process.env without crashing if 'process' is undefined
const getEnv = (key: string): string | undefined => {
  try {
    return typeof process !== 'undefined' ? process.env[key] : undefined;
  } catch {
    return undefined;
  }
};

const envUrl = getEnv('SUPABASE_URL') || 'https://oewvucbsbcxxwtnflbfw.supabase.co';
const envKey = getEnv('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ld3Z1Y2JzYmN4eHd0bmZsYmZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTI3NDcsImV4cCI6MjA4NjU4ODc0N30.WDT-RaQW8svrqeT2tiH6Cuaf6BxBMlQIOqrld9yaON0';

// Detect if we have a valid configuration
export const isSupabaseConfigured = !!(envUrl && envUrl.startsWith('http') && envKey);

// Create the client only if configuration is valid.
export const supabase = isSupabaseConfigured 
  ? createClient(envUrl, envKey!) 
  : null as any;

const LOCAL_CARDS_KEY = 'tcvault_local_cards';
const LOCAL_PAGES_KEY = 'tcvault_local_pages';

class CloudStorageService {
  private async getUserId(): Promise<string | null> {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  }

  async uploadImage(userId: string, base64Data: string): Promise<string> {
    // In local mode, just return the base64 string directly for simplicity
    if (userId === 'local-guest' || !supabase) {
      return base64Data;
    }
    
    try {
      const base64Content = base64Data.split(',')[1];
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const fileName = `${userId}/${crypto.randomUUID()}.jpg`;
      
      const { data, error } = await supabase.storage
        .from('card-images')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('card-images')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (e) {
      // Fallback to base64 if upload fails
      return base64Data;
    }
  }

  async getCards(): Promise<Card[]> {
    const userId = await this.getUserId();
    
    // Cloud Mode
    if (userId && supabase) {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map(item => ({
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
          pageId: item.page_id,
          rarityTier: item.rarity_tier
        }));
      }
    }

    // Local Mode Fallback
    const local = localStorage.getItem(LOCAL_CARDS_KEY);
    return local ? JSON.parse(local) : [];
  }

  async saveCard(card: Partial<Card>): Promise<Card> {
    const userId = await this.getUserId();
    
    if (userId && supabase) {
      const payload = {
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
        images: card.images,
        notes: card.notes,
        page_id: card.pageId,
        rarity_tier: card.rarityTier
      };

      const { data, error } = await supabase
        .from('cards')
        .upsert({ ...payload, id: card.id || undefined })
        .select()
        .single();

      if (!error && data) {
        return this.getCards().then(all => all.find(c => c.id === data.id)!);
      }
    }

    // Local Mode
    const current = await this.getCards();
    const newCard = {
      ...card,
      id: card.id || crypto.randomUUID(),
      createdAt: card.createdAt || Date.now()
    } as Card;
    
    const existingIdx = current.findIndex(c => c.id === newCard.id);
    if (existingIdx > -1) {
      current[existingIdx] = newCard;
    } else {
      current.unshift(newCard);
    }
    
    localStorage.setItem(LOCAL_CARDS_KEY, JSON.stringify(current));
    return newCard;
  }

  async deleteCard(id: string): Promise<void> {
    const userId = await this.getUserId();
    if (userId && supabase) {
      await supabase.from('cards').delete().eq('id', id);
    }

    const current = await this.getCards();
    const filtered = current.filter(c => c.id !== id);
    localStorage.setItem(LOCAL_CARDS_KEY, JSON.stringify(filtered));
  }

  async getPages(): Promise<BinderPage[]> {
    const userId = await this.getUserId();
    
    if (userId && supabase) {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (!error && data) return data;
    }

    const local = localStorage.getItem(LOCAL_PAGES_KEY);
    return local ? JSON.parse(local) : [];
  }

  async createPage(name: string): Promise<BinderPage> {
    const userId = await this.getUserId();
    
    if (userId && supabase) {
      const { data, error } = await supabase
        .from('pages')
        .insert({ user_id: userId, name })
        .select()
        .single();

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
    if (userId && supabase) {
      await supabase.from('pages').delete().eq('id', id);
    }

    const current = await this.getPages();
    const filtered = current.filter(p => p.id !== id);
    localStorage.setItem(LOCAL_PAGES_KEY, JSON.stringify(filtered));
  }
}

export const vaultStorage = new CloudStorageService();

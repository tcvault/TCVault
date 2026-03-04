import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getMarketIntel } from './services/gemini';
import { buildMarketMeta } from './services/valuation';
import { Card, ViewMode, CollectionStats, User, BinderPage, SocialPost } from './types';
import { UserSchema, safeParseJson } from './services/schemas';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import CardForm from './components/CardForm';
import Auth from './components/Auth';
import Feed from './components/Feed';
import Explore from './components/Explore';
import ProfileView from './components/ProfileView';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { BinderBottomSheet } from './components/layout/BinderBottomSheet';
import { ToastContainer } from './components/layout/ToastContainer';
import { ConfirmModal } from './components/layout/ConfirmModal';
import { vaultStorage, supabase } from './services/storage';
import { goldGradientStyle } from './styles';
import { TCLogo } from './components/Branding';

const STORAGE_SESSION_KEY = 'tcvault_active_session';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function usePrevious<T>(value: T): T | undefined {
  const [prev, setPrev] = useState<T | undefined>(undefined);
  const [current, setCurrent] = useState<T>(value);
  if (current !== value) {
    setPrev(current);
    setCurrent(value);
  }
  return prev;
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewMode>(ViewMode.FEED);
  const prevView = usePrevious(view);
  const [cards, setCards] = useState<Card[]>([]);
  const [binders, setBinders] = useState<BinderPage[]>([]);
  const [selectedBinderId, setSelectedBinderId] = useState<string | 'all'>('all');
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showBinderSheet, setShowBinderSheet] = useState(false);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  const isTerminating = useRef(false);

  const animationClass = useMemo(() => {
    if (!prevView || prevView === view) return 'animate-in fade-in duration-300';
    
    const deepViews = [ViewMode.DASHBOARD, ViewMode.INVENTORY, ViewMode.PROFILE, ViewMode.ADD_CARD];
    const surfaceViews = [ViewMode.FEED, ViewMode.EXPLORE];
    
    if (deepViews.includes(view) && surfaceViews.includes(prevView)) {
      return 'animate-in fade-in slide-in-from-bottom-2 duration-300';
    }
    
    if (surfaceViews.includes(view) && deepViews.includes(prevView)) {
      return 'animate-in fade-in slide-in-from-left-4 duration-300';
    }

    if (surfaceViews.includes(view) && surfaceViews.includes(prevView)) {
      return view === ViewMode.EXPLORE ? 'animate-in fade-in slide-in-from-right-4 duration-300' : 'animate-in fade-in slide-in-from-left-4 duration-300';
    }
    
    return 'animate-in fade-in duration-300';
  }, [view, prevView]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [{ id, message, type }, ...prev]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const loadData = useCallback(async (userId?: string) => {
    try {
      if (!userId) return;
      
      const profile = await vaultStorage.getUserProfile(userId);
      if (profile) setCurrentUser(profile);
      
      const [storedCards, storedBinders] = await Promise.all([
        vaultStorage.getCards(userId),
        vaultStorage.getPages(userId)
      ]);
      setCards(storedCards || []);
      setBinders(storedBinders || []);
    } catch (e) {
      console.error("Vault load error:", e);
    }
  }, []);

  const resetLocalUiState = useCallback(() => {
    setCurrentUser(null);
    setCards([]);
    setBinders([]);
    setEditingCard(null);
    setSelectedBinderId('all');
    setGlobalSearch('');
    setView(ViewMode.FEED);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setIsInitializing(false);
      return;
    }

    let isMounted = true;

    const startup = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && isMounted && !isTerminating.current) {
          const userId = session.user.id;
          const userObj: User = { 
            id: userId, 
            username: session.user.email?.split('@')[0] || 'Collector' 
          };
          const profile = await vaultStorage.getUserProfile(userId);
          const finalUser = profile || userObj;
          setCurrentUser(finalUser);
          localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(finalUser));
          await loadData(userId);
        } else if (isMounted && !isTerminating.current) {
          const savedSession = localStorage.getItem(STORAGE_SESSION_KEY);
          if (savedSession) {
            try {
              const userObj = safeParseJson(savedSession, UserSchema);
              if (userObj) {
                setCurrentUser(userObj);
                await loadData(userObj.id);
              } else {
                localStorage.removeItem(STORAGE_SESSION_KEY);
              }
            } catch {
              localStorage.removeItem(STORAGE_SESSION_KEY);
            }
          }
        }
      } catch (e) {
        console.error("Startup auth check failed:", e);
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    };

    startup();
    
    // Check for shared post URL
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('post');
    if (postId) {
      setHighlightedPostId(postId);
      setView(ViewMode.FEED);
      // Clean up URL without reload
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (isTerminating.current || !isMounted) return;
      
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        const userObj: User = { id: session.user.id, username: session.user.email?.split('@')[0] || 'Collector' };
        setCurrentUser(userObj);
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(userObj));
        loadData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem(STORAGE_SESSION_KEY);
        resetLocalUiState();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadData, resetLocalUiState]);

  const stats = useMemo<CollectionStats>(() => {
    const totalSpent = cards.reduce((sum, c) => sum + (Number(c.pricePaid) || 0), 0);
    const totalMarketValue = cards.reduce((sum, c) => sum + (Number(c.marketValue) || 0), 0);
    const setCounts: Record<string, number> = {};
    cards.forEach(c => setCounts[c.set] = (setCounts[c.set] || 0) + 1);
    const topSet = Object.entries(setCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { totalCards: cards.length, totalSpent, totalMarketValue, valueGrowth: totalMarketValue - totalSpent, topSet };
  }, [cards]);

  const handleLogout = async () => {
    setConfirmState({
      isOpen: true,
      title: 'Seal Vault?',
      message: 'Are you sure you want to sign out of your collector profile?',
      onConfirm: async () => {
        try {
          if (supabase) {
            await supabase.auth.signOut();
          }
        } catch (e) {
          console.error("Sign out error:", e);
        }

        // Clear app-specific keys
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('tcvault_')) localStorage.removeItem(key);
        });
        
        sessionStorage.clear();
        resetLocalUiState();
        window.location.replace(window.location.origin);
      },
      variant: 'warning'
    });
  };

  const handleSaveCard = async (cardData: Card) => {
    try {
      setGlobalSearch('');
      const isUpdate = cards.some(c => c.id === cardData.id);
      const savedCard = await vaultStorage.saveCard(cardData);
      setCards(prev => {
        const exists = prev.some(c => c.id === savedCard.id);
        if (exists) return prev.map(c => c.id === savedCard.id ? savedCard : c);
        return [savedCard, ...prev];
      });
      setEditingCard(null);
      setView(ViewMode.INVENTORY);
      addToast(isUpdate ? "Record updated" : "Card stashed");
      if (currentUser) loadData(currentUser.id);
    } catch {
      addToast("Save failed", "error");
    }
  };

  const handleDeleteCard = async (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Remove Card?',
      message: 'This action will permanently remove this card from your collection. This cannot be undone.',
      onConfirm: async () => {
        try {
          await vaultStorage.deleteCard(id);
          setCards(prev => prev.filter(c => c.id !== id));
          addToast("Card removed", "info");
          if (editingCard?.id === id) {
            setEditingCard(null);
            setView(ViewMode.INVENTORY);
          }
        } catch {
          addToast("Delete failed", "error");
        }
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
      variant: 'danger'
    });
  };

  const handleUpdateProfile = async (updatedUser: User) => {
    try {
      await vaultStorage.saveUserProfile(updatedUser);
      setCurrentUser(updatedUser);
      addToast("Collector identity updated", "success");
    } catch {
      addToast("Profile update failed", "error");
    }
  };

  const handleCreateBinder = async (name: string) => {
    try {
      const newBinder = await vaultStorage.createPage(name);
      if (currentUser) await loadData(currentUser.id);
      addToast(`Binder "${name}" created`);
      setSelectedBinderId(newBinder.id);
      setView(ViewMode.INVENTORY);
    } catch {
      addToast("Failed to create binder", "error");
    }
  };

  const handleDeleteBinder = async (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Binder?',
      message: 'Are you sure you want to delete this binder? The cards inside will remain in your collection.',
      onConfirm: async () => {
        try {
          await vaultStorage.deletePage(id);
          if (currentUser) await loadData(currentUser.id);
          if (selectedBinderId === id) setSelectedBinderId('all');
          addToast("Binder deleted", "info");
        } catch {
          addToast("Failed to delete binder", "error");
        }
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
      variant: 'danger'
    });
  };

  const handleRefreshPrice = async (card: Card) => {
    try {
      if (card.marketValueLocked) {
        addToast("Market value locked (manual). Unlock to refresh.", "info");
        return;
      }

      addToast("Fetching comps + recalculating valuation...", "info");

      const intel = await getMarketIntel(card.playerName, card.cardSpecifics, card.set, card.condition, card.certNumber);
      if (!intel) {
        addToast("Market intel fetch failed.", "error");
        return;
      }

      const meta = buildMarketMeta(intel);
      if (!meta) {
        addToast("Not enough high-quality comps to value.", "info");
        return;
      }

      const updatedCard: Card = { ...card, marketValue: meta.mid, marketMeta: meta };
      await vaultStorage.saveCard(updatedCard);
      setCards(prev => prev.map(c => c.id === card.id ? updatedCard : c));

      addToast(`Updated: £${meta.mid} (£${meta.low}–£${meta.high}, ${meta.confidence})`, "success");
    } catch {
      addToast("Market refresh failed", "error");
    }
  };

  const handleShareCard = async (card: Card) => {
    if (!currentUser) {
      addToast("Please sign in to share cards.", "error");
      return;
    }

    try {
      const newPost: SocialPost = {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        username: currentUser.username,
        userAvatar: currentUser.avatar,
        content: `Just shared this ${card.playerName} from my vault! ${card.cardSpecifics} ${card.set} ${card.serialNumber ? `(${card.serialNumber})` : ''}`,
        tag: 'Pickup',
        likes: [],
        commentCount: 0,
        createdAt: Date.now(),
        imageUrl: card.images[0],
        comments: []
      };

      await vaultStorage.savePost(newPost);
      addToast("Card shared to global feed!", "success");
      setView(ViewMode.FEED);
    } catch (error) {
      console.error("Share error:", error);
      addToast("Failed to share card.", "error");
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-base">
        <TCLogo className="w-16 h-16 animate-pulse shrink-0" />
      </div>
    );
  }

  const isGuest = !currentUser;
  const showAuthTakeover = view === ViewMode.SETTINGS || (isGuest && [ViewMode.DASHBOARD, ViewMode.INVENTORY, ViewMode.ADD_CARD, ViewMode.PROFILE].includes(view));

  return (
    <div className="flex h-screen bg-surface-base text-ink-primary overflow-hidden relative selection:bg-gold-500/20">
      <aside className="hidden md:flex flex-col w-64 border-r border-ink-primary/5 bg-surface-elevated h-full shadow-inner">
        <Sidebar 
          view={view}
          setView={setView}
          isGuest={isGuest}
          currentUser={currentUser as User}
          binders={binders}
          selectedBinderId={selectedBinderId}
          setSelectedBinderId={setSelectedBinderId}
          handleLogout={handleLogout}
        />
      </aside>

      <main className="flex-1 overflow-y-auto bg-surface-base relative pb-32 md:pb-0 scroll-smooth">
        <div className="p-4 md:p-16 max-w-6xl mx-auto min-h-screen">
          {view === ViewMode.FEED && (
            <Feed 
              user={currentUser} 
              onNavigate={setView} 
              onToast={addToast} 
              animationClass={animationClass} 
              highlightedPostId={highlightedPostId} 
              onClearHighlight={() => setHighlightedPostId(null)}
            />
          )}
          {view === ViewMode.EXPLORE && <Explore user={currentUser} onNavigate={setView} onToast={addToast} animationClass={animationClass} />}
          {view === ViewMode.DASHBOARD && !isGuest && (
            <Dashboard 
              stats={stats} 
              recentCards={cards} 
              onNavigate={setView} 
              onEditCard={(c) => { setEditingCard(c); setView(ViewMode.ADD_CARD); }} 
              animationClass={animationClass} 
            />
          )}
          {view === ViewMode.INVENTORY && !isGuest && (
            <Inventory 
              cards={cards} 
              pages={binders} 
              globalSearch={globalSearch}
              onClearSearch={() => setGlobalSearch('')}
              onDelete={handleDeleteCard} 
              onUpdate={(c) => { setEditingCard(c); setView(ViewMode.ADD_CARD); }} 
              onCreatePage={handleCreateBinder}
              onDeletePage={handleDeleteBinder}
              initialActiveBinderId={selectedBinderId}
              onSelectBinder={(id) => setSelectedBinderId(id)}
              animationClass={animationClass}
              onRefreshPrice={handleRefreshPrice}
              onShareCard={handleShareCard}
            />
          )}
          {view === ViewMode.ADD_CARD && !isGuest && (
            <CardForm 
              onSubmit={handleSaveCard} 
              onDelete={handleDeleteCard}
              onCancel={() => { setEditingCard(null); setView(ViewMode.DASHBOARD); }} 
              initialData={editingCard || undefined} 
              pages={binders} 
              onToast={addToast} 
              animationClass={animationClass}
            />
          )}
          {view === ViewMode.PROFILE && !isGuest && (
            <ProfileView 
              user={currentUser as User} 
              cards={cards} 
              onEditCard={(c) => { setEditingCard(c); setView(ViewMode.ADD_CARD); }} 
              onUpdateProfile={handleUpdateProfile}
              animationClass={animationClass}
            />
          )}
        </div>
      </main>

      <MobileNav 
        view={view}
        setView={setView}
        isGuest={isGuest}
        binders={binders}
        setSelectedBinderId={setSelectedBinderId}
        setShowBinderSheet={setShowBinderSheet}
        goldGradientStyle={goldGradientStyle}
      />

      <BinderBottomSheet 
        show={showBinderSheet}
        onClose={() => setShowBinderSheet(false)}
        binders={binders}
        selectedBinderId={selectedBinderId}
        setSelectedBinderId={setSelectedBinderId}
        setView={setView}
      />

      {showAuthTakeover && (
        <div className="fixed inset-0 z-[200] animate-in fade-in duration-300">
          <Auth 
            onLogin={(u) => { 
              setCurrentUser(u); 
              setView(ViewMode.FEED);
            }} 
            onCancel={() => setView(ViewMode.FEED)}
          />
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        variant={confirmState.variant}
      />
    </div>
  );
};

export default App;
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  LayoutDashboard as DashboardIcon, 
  PlusCircle, 
  Database as BinderIcon, 
  Power, 
  User as UserIcon, 
  ShieldCheck, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  X, 
  Rss,
  Compass,
  ChevronDown
} from 'lucide-react';
import { getMarketPrice } from './services/gemini';
import { Card, ViewMode, CollectionStats, User, BinderPage, SocialPost } from './types';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import CardForm from './components/CardForm';
import Auth from './components/Auth';
import Feed from './components/Feed';
import Explore from './components/Explore';
import ProfileView from './components/ProfileView';
import { goldGradientStyle } from './theme';
import { TCLogo } from './components/TCLogo';
import { vaultStorage, supabase } from './services/storage';

const STORAGE_SESSION_KEY = 'tcvault_active_session';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  // eslint-disable-next-line react-hooks/refs
  return ref.current;
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
    const startup = async () => {
      if (!supabase) {
        setIsInitializing(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && !isTerminating.current) {
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
        } else {
          const savedSession = localStorage.getItem(STORAGE_SESSION_KEY);
          if (savedSession && !isTerminating.current) {
            try {
              const userObj = JSON.parse(savedSession);
              setCurrentUser(userObj);
              await loadData(userObj.id);
            } catch {
              localStorage.removeItem(STORAGE_SESSION_KEY);
            }
          }
        }
      } catch {
        console.error("Startup auth check failed");
      } finally {
        setIsInitializing(false);
      }
    };

    startup();
    
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (isTerminating.current) return;
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        const userObj: User = { id: session.user.id, username: session.user.email?.split('@')[0] || 'Collector' };
        setCurrentUser(userObj);
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(userObj));
        loadData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        resetLocalUiState();
      }
    });

    return () => subscription.unsubscribe();
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
    if (!window.confirm("Seal your vault and sign out?")) return;
    
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
    if (window.confirm("Remove this card from your collection?")) {
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
    }
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
    if (window.confirm("Delete this binder? Cards will stay in your main collection.")) {
      try {
        await vaultStorage.deletePage(id);
        if (currentUser) await loadData(currentUser.id);
        if (selectedBinderId === id) setSelectedBinderId('all');
        addToast("Binder deleted", "info");
      } catch {
        addToast("Failed to delete binder", "error");
      }
    }
  };

  const handleRefreshPrice = async (card: Card) => {
    try {
      addToast("Fetching latest market intel...", "info");
      const result = await getMarketPrice(card.playerName, card.cardSpecifics, card.set, card.condition, card.certNumber);
      if (result && result.price > 0) {
        const updatedCard = { ...card, marketValue: result.price };
        await vaultStorage.saveCard(updatedCard);
        setCards(prev => prev.map(c => c.id === card.id ? updatedCard : c));
        addToast(`Price updated to £${result.price}`, "success");
      } else {
        addToast("No recent sales found to update price.", "info");
      }
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
      <div className="flex items-center justify-center min-h-screen bg-[#faf8f4]">
        <TCLogo className="w-16 h-16 animate-pulse shrink-0" />
      </div>
    );
  }

  const isGuest = !currentUser;
  const showAuthTakeover = view === ViewMode.SETTINGS || (isGuest && [ViewMode.DASHBOARD, ViewMode.INVENTORY, ViewMode.ADD_CARD, ViewMode.PROFILE].includes(view));

  const SidebarContent = () => (
    <div className="p-8 flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 cursor-pointer mb-2" onClick={() => setView(ViewMode.FEED)}>
        <TCLogo className="w-10 h-10 shrink-0" />
        <div>
          <p className="text-sm font-black tracking-tighter uppercase leading-none">
            <span style={{
              background: 'linear-gradient(135deg, #8b6914 0%, #d4af37 35%, #f5e070 55%, #d4af37 75%, #8b6914 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>TC</span>
            <span className="text-stone-800 ml-1">Vault</span>
          </p>
          <p style={{ 
            background: 'linear-gradient(135deg, #8b6914 0%, #d4af37 50%, #8b6914 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }} className="text-[9px] font-semibold uppercase tracking-widest leading-none mt-0.5">
            Collectors Community
          </p>
        </div>
      </div>

      <nav className="space-y-8 flex-1 overflow-y-auto no-scrollbar mt-12 pb-8">
        <div className="space-y-2">
          <span className="px-4 text-[10px] font-black text-[#c9a227]/40 uppercase tracking-widest">Community</span>
          <NavButton active={view === ViewMode.FEED} onClick={() => setView(ViewMode.FEED)} icon={<Rss size={16} />} label="Global Feed" />
          <NavButton active={view === ViewMode.EXPLORE} onClick={() => setView(ViewMode.EXPLORE)} icon={<Compass size={16} />} label="Explore" />
        </div>

        {!isGuest && (
          <>
            <div className="space-y-2">
              <span className="px-4 text-[10px] font-black text-[#c9a227]/40 uppercase tracking-widest">Asset Management</span>
              <NavButton active={view === ViewMode.DASHBOARD} onClick={() => setView(ViewMode.DASHBOARD)} icon={<DashboardIcon size={16} />} label="Portfolio" />
              
              <div className="space-y-1">
                <NavButton 
                  active={view === ViewMode.INVENTORY} 
                  onClick={() => {
                    setView(ViewMode.INVENTORY);
                    setSelectedBinderId('all');
                  }} 
                  icon={<BinderIcon size={16} />} 
                  label="Collection" 
                  trailing={binders.length > 0 && <ChevronDown size={14} className={`transition-transform duration-300 ${view === ViewMode.INVENTORY ? 'rotate-180' : ''}`} />}
                />
                
                {binders.length > 0 && (view === ViewMode.INVENTORY || binders.some(b => b.id === selectedBinderId)) && (
                  <div className="pl-9 space-y-1 mt-1 border-l-2 border-black/5 ml-6 animate-in slide-in-from-top-2 duration-300">
                    <button 
                      onClick={() => { setView(ViewMode.INVENTORY); setSelectedBinderId('all'); }}
                      className={`w-full flex items-center gap-2 px-3 h-8 rounded-lg transition-all text-left ${view === ViewMode.INVENTORY && selectedBinderId === 'all' ? 'text-[#c9a227] font-bold' : 'text-stone-400 hover:text-stone-700 hover:bg-black/[0.05]'}`}
                    >
                      <span className="text-[11px] uppercase tracking-wider">Main Collection</span>
                    </button>
                    {binders.map(binder => (
                      <button 
                        key={binder.id}
                        onClick={() => { setView(ViewMode.INVENTORY); setSelectedBinderId(binder.id); }}
                        className={`w-full flex items-center gap-2 px-3 h-8 rounded-lg transition-all text-left group ${view === ViewMode.INVENTORY && selectedBinderId === binder.id ? 'text-[#c9a227] font-bold' : 'text-stone-400 hover:text-stone-700 hover:bg-black/[0.05]'}`}
                      >
                        <span className="text-[11px] truncate">{binder.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <NavButton active={view === ViewMode.ADD_CARD} onClick={() => setView(ViewMode.ADD_CARD)} icon={<PlusCircle size={16} />} label="Add Card" />
            </div>

            <div className="space-y-2">
              <span className="px-4 text-[10px] font-black text-[#c9a227]/40 uppercase tracking-widest">Identity</span>
              <NavButton active={view === ViewMode.PROFILE} onClick={() => setView(ViewMode.PROFILE)} icon={<UserIcon size={16} />} label="My Profile" />
            </div>
          </>
        )}
      </nav>

      <div className="space-y-4 pt-6 mt-auto border-t border-black/6">
        {!isGuest ? (
          <div className="flex items-center justify-between px-4 h-12 rounded-xl glass-subtle">
            <div className="flex items-center gap-2 truncate">
              <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center ${currentUser.avatar ? '' : (currentUser.id === 'admin-master' ? 'bg-[#c9a227]/10 text-[#c9a227]' : 'bg-[#c9a227]/10 text-[#c9a227]')}`}>
                {currentUser.avatar ? <img src={currentUser.avatar} className="w-full h-full object-cover" /> : <UserIcon size={16} />}
              </div>
              <span className="text-sm font-bold truncate italic">{currentUser?.username}</span>
            </div>
            <button onClick={handleLogout} className="text-stone-400 hover:text-rose-500 transition-colors p-2 active:scale-90" title="Sign Out">
              <Power size={16} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setView(ViewMode.SETTINGS)}
            className="w-full btn-primary h-12 uppercase text-[10px] tracking-widest"
          >
            Join Vault
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#faf8f4] text-[#1a1408] overflow-hidden relative selection:bg-[#c9a227]/20">
      <aside className="hidden md:flex flex-col w-64 border-r border-black/6 bg-[#f5f2ec] h-full shadow-inner">
        <SidebarContent />
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#faf8f4] relative pb-32 md:pb-0 scroll-smooth">
        <div className="p-4 md:p-16 max-w-6xl mx-auto min-h-screen">
          {view === ViewMode.FEED && <Feed user={currentUser} onNavigate={setView} onToast={addToast} animationClass={animationClass} />}
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
              user={currentUser} 
              cards={cards} 
              onEditCard={(c) => { setEditingCard(c); setView(ViewMode.ADD_CARD); }} 
              onUpdateProfile={handleUpdateProfile}
              animationClass={animationClass}
            />
          )}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#f5f2ec]/90 backdrop-blur-xl border-t border-black/6 flex items-center justify-around px-8 z-[50] shadow-xl">
        <MobileNavButton active={view === ViewMode.FEED} onClick={() => setView(ViewMode.FEED)} icon={<Rss size={20} />} label="Feed" />
        <MobileNavButton active={view === ViewMode.EXPLORE} onClick={() => setView(ViewMode.EXPLORE)} icon={<Compass size={20} />} label="Explore" />
        {!isGuest ? (
          <>
            <button 
              onClick={() => setView(ViewMode.ADD_CARD)} 
              style={goldGradientStyle}
              className="w-14 h-14 rounded-xl flex items-center justify-center -translate-y-4 shadow-[0_-6px_20px_rgba(201,162,39,0.3),0_10px_30px_rgba(201,162,39,0.25)] border-[3px] border-[#faf8f4] active:scale-[0.97] transition-all"
            >
              <Plus size={32} />
            </button>
            <MobileNavButton active={view === ViewMode.INVENTORY} onClick={() => { setView(ViewMode.INVENTORY); setSelectedBinderId('all'); }} icon={<BinderIcon size={20} />} label="Vault" />
            <MobileNavButton active={view === ViewMode.PROFILE} onClick={() => setView(ViewMode.PROFILE)} icon={<UserIcon size={20} />} label="You" />
          </>
        ) : (
          <MobileNavButton active={view === ViewMode.SETTINGS} onClick={() => setView(ViewMode.SETTINGS)} icon={<ShieldCheck size={20} />} label="Join" />
        )}
      </nav>

      {showAuthTakeover && (
        <div className="fixed inset-0 z-[200] animate-in fade-in duration-300">
          <Auth 
            onLogin={(u) => { 
              setCurrentUser(u); 
              setView(ViewMode.FEED);
              // loadData will be triggered by onAuthStateChange
            }} 
            onCancel={() => setView(ViewMode.FEED)}
          />
        </div>
      )}

      <div className="fixed bottom-24 md:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-[150] w-full max-w-sm px-4">
        {toasts.map(toast => (
          <div key={toast.id} className="flex items-center gap-4 p-4 rounded-xl glass border border-black/10 shadow-2xl animate-in slide-in-from-bottom-4 w-full shrink-0">
            {toast.type === 'success' && <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />}
            {toast.type === 'error' && <AlertCircle size={20} className="text-rose-500 shrink-0" />}
            {toast.type === 'info' && <Info size={20} className="text-[#c9a227] shrink-0" />}
            <span className="text-sm font-semibold text-stone-800">{toast.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="ml-auto text-stone-400 hover:text-stone-700 p-2 active:scale-90"><X size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label, trailing }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between gap-4 px-4 h-10 rounded-xl transition-all active:scale-[0.97] ${active ? 'bg-[#c9a227]/10 text-[#c9a227] border border-[#c9a227]/20 shadow-lg' : 'text-stone-400 hover:text-stone-700 hover:bg-black/[0.03]'}`}>
    <div className="flex items-center gap-4">
      {React.cloneElement(icon, { size: 16 })}
      <span className="text-sm font-semibold">{label}</span>
    </div>
    {trailing}
  </button>
);

const MobileNavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all p-2 active:scale-[0.97] ${active ? 'text-[#c9a227]' : 'text-stone-400'}`}>
    {React.cloneElement(icon, { size: 20 })}
    <span className="text-[10px] font-black uppercase tracking-widest leading-none">{label}</span>
  </button>
);

export default App;
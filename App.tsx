import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LayoutDashboard as DashboardIcon, PlusCircle, Database as BinderIcon, Search, Power, User as UserIcon, ShieldCheck, RefreshCw, Plus, CheckCircle2, AlertCircle, Info, X, ChevronRight, BookOpen } from 'lucide-react';
import { Card, ViewMode, CollectionStats, User, BinderPage } from './types';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import CardForm from './components/CardForm';
import Auth from './components/Auth';
import ErrorBoundary from './components/ErrorBoundary';
import { vaultStorage, supabase } from './services/storage';

const STORAGE_SESSION_KEY = 'tcvault_active_session';

export const TCLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#1e293b" />
    <circle cx="50" cy="50" r="42" fill="#020617" />
    <path d="M 50 25 H 85 V 38 H 63 V 62 H 85 V 75 H 50 Z" fill="#cbd5e1" />
    <path d="M 15 25 H 60 V 38 H 43 V 75 H 32 V 38 H 15 Z" fill="#3b82f6" />
    <circle cx="78" cy="50" r="4" fill="#020617" />
  </svg>
);

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [cards, setCards] = useState<Card[]>([]);
  const [binders, setBinders] = useState<BinderPage[]>([]);
  const [selectedBinderId, setSelectedBinderId] = useState<string | 'all'>('all');
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const isTerminating = useRef(false);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = crypto.randomUUID();
    // Subtle haptic feedback for mobile
    if (navigator.vibrate) {
      if (type === 'success') navigator.vibrate([10, 30, 10]);
      if (type === 'error') navigator.vibrate([50, 100, 50]);
    }
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [storedCards, storedBinders] = await Promise.all([
        vaultStorage.getCards(),
        vaultStorage.getPages()
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
    setView(ViewMode.DASHBOARD);
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
          const userObj = { 
            id: session.user.id, 
            username: session.user.email?.split('@')[0] || 'Collector' 
          };
          setCurrentUser(userObj);
          localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(userObj));
          await loadData();
        } else {
          const savedSession = localStorage.getItem(STORAGE_SESSION_KEY);
          if (savedSession && !isTerminating.current) {
            try {
              const userObj = JSON.parse(savedSession);
              setCurrentUser(userObj);
              await loadData();
            } catch (e) {
              localStorage.removeItem(STORAGE_SESSION_KEY);
            }
          }
        }
      } catch (e) {
        console.error("Startup auth check failed:", e);
      } finally {
        setIsInitializing(false);
      }
    };

    startup();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isTerminating.current) return;
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        const userObj = { id: session.user.id, username: session.user.email?.split('@')[0] || 'Collector' };
        setCurrentUser(userObj);
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(userObj));
        loadData();
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

    const now = new Date().toISOString().split('T')[0];
    let totalDailyChange = 0;

    cards.forEach(c => {
      const history = c.priceHistory || [];
      if (history.length > 1) {
        const last = history[history.length - 1];
        const prev = history[history.length - 2];
        if (last.date === now) {
          totalDailyChange += (last.value - prev.value);
        }
      }
    });

    return { 
      totalCards: cards.length, 
      totalSpent, 
      totalMarketValue, 
      valueGrowth: totalMarketValue - totalSpent, 
      topSet,
      dailyChange: totalDailyChange
    };
  }, [cards]);

  const handleLogout = async () => {
    if (!window.confirm("Seal your vault and sign out?")) return;
    isTerminating.current = true;
    
    localStorage.clear();
    sessionStorage.clear();
    
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {}
    }

    window.location.replace(window.location.origin);
  };

  const handleSaveCard = async (cardData: Card) => {
    try {
      setGlobalSearch('');
      const savedCard = await vaultStorage.saveCard(cardData);
      setCards(prev => {
        const exists = prev.some(c => c.id === savedCard.id);
        if (exists) return prev.map(c => c.id === savedCard.id ? savedCard : c);
        return [savedCard, ...prev];
      });
      setEditingCard(null);
      setView(ViewMode.INVENTORY);
      addToast(cardData.id ? "Record updated" : "Card stashed");
      loadData();
    } catch (e) {
      addToast("Save failed", "error");
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (window.confirm("Remove this card from your collection?")) {
      try {
        await vaultStorage.deleteCard(id);
        setCards(prev => prev.filter(c => c.id !== id));
        addToast("Card removed", "info");
      } catch (e) {
        addToast("Delete failed", "error");
      }
    }
  };

  const handleCreateBinder = async (name: string) => {
    try {
      const newBinder = await vaultStorage.createPage(name);
      await loadData();
      addToast(`Binder "${name}" created`);
      setSelectedBinderId(newBinder.id);
      setView(ViewMode.INVENTORY);
    } catch (e) {
      addToast("Failed to create binder", "error");
    }
  };

  const handleDeleteBinder = async (id: string) => {
    if (window.confirm("Delete this binder? Cards will stay in your master archive.")) {
      try {
        await vaultStorage.deletePage(id);
        await loadData();
        if (selectedBinderId === id) setSelectedBinderId('all');
        addToast("Binder deleted", "info");
      } catch (e) {
        addToast("Failed to delete binder", "error");
      }
    }
  };

  const navigateToBinder = (id: string | 'all') => {
    setSelectedBinderId(id);
    setView(ViewMode.INVENTORY);
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <TCLogo className="w-12 h-12 animate-pulse text-blue-500" />
      </div>
    );
  }

  if (!currentUser) {
    return <Auth onLogin={(u) => { setCurrentUser(u); loadData(); }} />;
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-black text-slate-200 overflow-hidden relative selection:bg-blue-600/30">
        <aside className="hidden md:flex flex-col w-64 border-r border-white/5 bg-[#020617] h-full">
          <div className="p-8 flex flex-col h-full space-y-8">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView(ViewMode.DASHBOARD)}>
              <TCLogo className="w-8 h-8" />
              <div>
                <h1 className="text-sm font-black tracking-tighter leading-none">
                  <span className="text-blue-500">TC</span>
                  <span className="text-slate-300 ml-1 uppercase">Vault</span>
                </h1>
              </div>
            </div>

            <nav className="space-y-6 flex-1 overflow-y-auto no-scrollbar">
              <div className="space-y-2">
                <span className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Navigation</span>
                <NavButton active={view === ViewMode.DASHBOARD} onClick={() => setView(ViewMode.DASHBOARD)} icon={<DashboardIcon size={16} />} label="Showcase" />
                <NavButton active={view === ViewMode.ADD_CARD} onClick={() => setView(ViewMode.ADD_CARD)} icon={<PlusCircle size={16} />} label="Log Pickup" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-4">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">My Binders</span>
                  <button onClick={() => setView(ViewMode.INVENTORY)} className="btn-tertiary text-[10px] font-black uppercase tracking-widest transition-colors h-auto p-0">Manage</button>
                </div>
                
                <NavButton 
                  active={view === ViewMode.INVENTORY && selectedBinderId === 'all'} 
                  onClick={() => navigateToBinder('all')} 
                  icon={<BinderIcon size={16} />} 
                  label="All Cards" 
                />
                
                <div className="space-y-1 mt-2">
                  {binders.map(binder => (
                    <button 
                      key={binder.id}
                      onClick={() => navigateToBinder(binder.id)}
                      className={`w-full flex items-center justify-between px-4 h-10 rounded-xl transition-all text-sm font-semibold group active:scale-[0.97] ${view === ViewMode.INVENTORY && selectedBinderId === binder.id ? 'bg-blue-600/10 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'}`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <BookOpen size={16} className={view === ViewMode.INVENTORY && selectedBinderId === binder.id ? 'text-blue-500' : 'text-slate-600'} />
                        <span className="truncate">{binder.name}</span>
                      </div>
                      <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                        {cards.filter(c => c.pageId === binder.id).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </nav>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between px-4 h-12 rounded-xl glass-subtle">
                <div className="flex items-center gap-2 truncate">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentUser.id === 'admin-master' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    {currentUser.id === 'admin-master' ? <ShieldCheck size={16} /> : <UserIcon size={16} />}
                  </div>
                  <span className="text-sm font-bold truncate italic">{currentUser?.username}</span>
                </div>
                <button onClick={handleLogout} className="text-slate-500 hover:text-rose-400 transition-colors p-2 active:scale-90" title="Sign Out">
                  <Power size={16} />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-black relative pb-24 md:pb-0 scroll-smooth">
          <header className="sticky top-0 z-[50] px-8 py-4 flex flex-col md:flex-row md:items-center justify-between glass border-b border-white/5 gap-4">
            <div className="flex items-center justify-between w-full md:w-auto">
              <div className="flex md:hidden"><TCLogo className="w-8 h-8" /></div>
              <div className="md:hidden flex items-center gap-2">
                 <button onClick={handleLogout} className="h-12 w-12 glass-subtle rounded-xl text-rose-500 flex items-center justify-center hover:bg-rose-500/10 active:scale-[0.97] active:brightness-90 transition-all" title="Sign Out"><Power size={20} /></button>
              </div>
            </div>
            <div className="relative w-full max-w-sm group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={16} />
               <input type="text" placeholder="Search across binders..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} className="w-full h-12 bg-white/[0.03] border border-white/5 rounded-xl pl-10 pr-4 text-sm font-semibold focus:border-blue-500/30 outline-none transition-all placeholder:text-slate-600" />
            </div>
            <div className="hidden md:flex items-center gap-4">
               <button onClick={() => loadData()} className="h-12 w-12 glass-subtle rounded-xl text-slate-500 flex items-center justify-center hover:text-white active:scale-[0.97]" title="Sync Vault"><RefreshCw size={20} /></button>
            </div>
          </header>

          <div className="p-8 md:p-16 max-w-6xl mx-auto min-h-[calc(100vh-80px)]">
            {view === ViewMode.DASHBOARD && <Dashboard stats={stats} recentCards={cards} onNavigate={setView} />}
            {view === ViewMode.INVENTORY && (
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
              />
            )}
            {view === ViewMode.ADD_CARD && (
              <CardForm onSubmit={handleSaveCard} onCancel={() => { setEditingCard(null); setView(ViewMode.DASHBOARD); }} initialData={editingCard || undefined} pages={binders} onToast={addToast} />
            )}
          </div>
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 glass border-t border-white/5 flex items-center justify-around px-8 z-[50]">
          <MobileNavButton active={view === ViewMode.DASHBOARD} onClick={() => setView(ViewMode.DASHBOARD)} icon={<DashboardIcon size={20} />} label="Home" />
          <button onClick={() => setView(ViewMode.ADD_CARD)} className="w-14 h-14 bg-blue-600 text-white rounded-xl flex items-center justify-center -translate-y-8 shadow-xl border-2 border-black active:scale-[0.97] transition-all"><Plus size={32} /></button>
          <MobileNavButton active={view === ViewMode.INVENTORY} onClick={() => { setView(ViewMode.INVENTORY); setSelectedBinderId('all'); }} icon={<BinderIcon size={20} />} label="Binders" />
        </nav>

        <div className="fixed bottom-24 md:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-[200] w-full max-w-sm px-4 max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar">
          {toasts.map(toast => (
            <div key={toast.id} className="flex items-center gap-4 p-4 rounded-xl glass border border-white/10 shadow-2xl animate-in slide-in-from-bottom-4 w-full shrink-0">
              {toast.type === 'success' && <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />}
              {toast.type === 'error' && <AlertCircle size={20} className="text-rose-500 shrink-0" />}
              {toast.type === 'info' && <Info size={20} className="text-blue-500 shrink-0" />}
              <span className="text-sm font-semibold text-slate-100">{toast.message}</span>
              <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="ml-auto text-slate-500 hover:text-white p-2 active:scale-90"><X size={16} /></button>
            </div>
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 h-12 rounded-xl transition-all active:scale-[0.97] ${active ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'}`}>
    {React.cloneElement(icon, { size: 16 })}
    <span className="text-sm font-semibold">{label}</span>
  </button>
);

const MobileNavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all p-2 active:scale-[0.97] ${active ? 'text-blue-500' : 'text-slate-500'}`}>
    {React.cloneElement(icon, { size: 20 })}
    <span className="text-[10px] font-black uppercase tracking-widest leading-none">{label}</span>
  </button>
);

export default App;
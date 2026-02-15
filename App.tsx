
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LayoutDashboard as DashboardIcon, Database, PlusCircle, Settings, TrendingUp, Database as BinderIcon, Search, Bell, Power, User as UserIcon, ShieldCheck, HardDrive, Sparkles, Plus, CheckCircle2, AlertCircle, Info, X, CloudOff, ExternalLink, RefreshCw, LogIn, ArrowLeft } from 'lucide-react';
import { Card, ViewMode, CollectionStats, User, BinderPage } from './types';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import CardForm from './components/CardForm';
import Auth from './components/Auth';
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
  const [pages, setPages] = useState<BinderPage[]>([]);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Guard against re-authentication during the logout process
  const isTerminating = useRef(false);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [storedCards, storedPages] = await Promise.all([
        vaultStorage.getCards(),
        vaultStorage.getPages()
      ]);
      setCards(storedCards || []);
      setPages(storedPages || []);
    } catch (e) {
      console.error("Vault load error:", e);
    }
  }, []);

  // Primary Auth Listener and Initial Check
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
        }
      } catch (e) {
        console.error("Startup auth check failed:", e);
      } finally {
        setIsInitializing(false);
      }
    };

    startup();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (isTerminating.current) return;

        if (event === 'SIGNED_IN' && session?.user) {
          const userObj = { 
            id: session.user.id, 
            username: session.user.email?.split('@')[0] || 'Collector' 
          };
          setCurrentUser(userObj);
          localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(userObj));
          loadData();
        } else if (event === 'SIGNED_OUT') {
          // Double-check if we are in admin mode before clearing
          setCurrentUser(prev => prev?.id === 'admin-master' ? prev : null);
          if (!currentUser || currentUser.id !== 'admin-master') {
            setCards([]);
            setPages([]);
          }
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [loadData, currentUser?.id]);

  const stats = useMemo<CollectionStats>(() => {
    const totalSpent = cards.reduce((sum, c) => sum + (Number(c.pricePaid) || 0), 0);
    const totalMarketValue = cards.reduce((sum, c) => sum + (Number(c.marketValue) || 0), 0);
    const setCounts: Record<string, number> = {};
    cards.forEach(c => setCounts[c.set] = (setCounts[c.set] || 0) + 1);
    const topSet = Object.entries(setCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { 
      totalCards: cards.length, 
      totalSpent, 
      totalMarketValue, 
      valueGrowth: totalMarketValue - totalSpent, 
      topSet 
    };
  }, [cards]);

  const handleLogout = async () => {
    const isAdmin = currentUser?.id === 'admin-master';
    if (!window.confirm(isAdmin ? "Terminate Admin session?" : "Seal your vault and sign out?")) return;

    // 1. Enter Terminating State
    isTerminating.current = true;
    
    // 2. Clear Local State Immediately (Optimistic UI)
    setCurrentUser(null);
    setCards([]);
    setPages([]);
    setEditingCard(null);
    setGlobalSearch('');
    localStorage.removeItem(STORAGE_SESSION_KEY);
    setView(ViewMode.DASHBOARD);

    // 3. Clear Cloud Session if standard user
    try {
      if (!isAdmin && supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      // 4. Release lock after cleanup
      addToast(isAdmin ? "Admin session ended" : "Vault sealed", "info");
      // Delay unlocking to ensure auth listeners don't catch trailing session data
      setTimeout(() => {
        isTerminating.current = false;
      }, 1500);
    }
  };

  const handleSaveCard = async (cardData: Card) => {
    try {
      await vaultStorage.saveCard(cardData);
      await loadData();
      setEditingCard(null);
      setView(ViewMode.INVENTORY);
      addToast(cardData.id ? "Record updated" : "Card stashed");
    } catch (e) {
      addToast("Save failed", "error");
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (window.confirm("Remove this card from your collection?")) {
      try {
        await vaultStorage.deleteCard(id);
        await loadData();
        addToast("Card removed", "info");
      } catch (e) {
        addToast("Delete failed", "error");
      }
    }
  };

  const handleCreatePage = async (name: string) => {
    try {
      await vaultStorage.createPage(name);
      await loadData();
      addToast(`Page "${name}" created`);
    } catch (e) {
      addToast("Failed to create page", "error");
    }
  };

  const handleDeletePage = async (id: string) => {
    if (window.confirm("Delete this page? Cards will stay in your main stash.")) {
      try {
        await vaultStorage.deletePage(id);
        await loadData();
        addToast("Page deleted", "info");
      } catch (e) {
        addToast("Failed to delete page", "error");
      }
    }
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
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Collector Suite</span>
            </div>
          </div>

          <nav className="space-y-2 flex-1">
            <NavButton active={view === ViewMode.DASHBOARD} onClick={() => setView(ViewMode.DASHBOARD)} icon={<DashboardIcon size={16} />} label="Showcase" />
            <NavButton active={view === ViewMode.INVENTORY} onClick={() => setView(ViewMode.INVENTORY)} icon={<BinderIcon size={16} />} label="The binder" />
            <NavButton active={view === ViewMode.ADD_CARD} onClick={() => setView(ViewMode.ADD_CARD)} icon={<PlusCircle size={16} />} label="Log pickup" />
          </nav>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between px-4 h-12 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2 truncate">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${currentUser.id === 'admin-master' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {currentUser.id === 'admin-master' ? <ShieldCheck size={12} /> : <UserIcon size={12} />}
                </div>
                <span className="text-xs font-bold truncate italic">{currentUser?.username}</span>
              </div>
              <button 
                onClick={handleLogout} 
                className="text-slate-600 hover:text-rose-400 transition-colors p-1"
                title="Sign Out"
              >
                <Power size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-black relative pb-20 md:pb-0 scroll-smooth">
        <header className="sticky top-0 z-[50] px-8 py-4 flex flex-col md:flex-row md:items-center justify-between glass border-b border-white/5 gap-4">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex md:hidden">
               <TCLogo className="w-8 h-8" />
            </div>
            <div className="md:hidden flex items-center gap-2">
               <button 
                 onClick={handleLogout} 
                 className="h-10 w-10 bg-white/[0.03] border border-white/5 rounded-xl text-rose-500 flex items-center justify-center hover:bg-rose-500/10 active:scale-95 transition-all"
                 title="Sign Out"
                >
                  <Power size={16} />
                </button>
            </div>
          </div>

          <div className="relative w-full max-sm group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={16} />
             <input 
               type="text" 
               placeholder="Search stash..." 
               value={globalSearch}
               onChange={(e) => setGlobalSearch(e.target.value)}
               className="w-full h-11 bg-white/[0.03] border border-white/5 rounded-xl pl-10 pr-4 text-sm font-semibold focus:border-blue-500/30 outline-none transition-all placeholder:text-slate-700"
             />
          </div>

          <div className="hidden md:flex items-center gap-4">
             <button className="h-10 w-10 bg-white/[0.03] border border-white/5 rounded-xl text-slate-600 flex items-center justify-center hover:text-white"><Bell size={16} /></button>
          </div>
        </header>

        <div className="p-8 md:p-16 max-w-6xl mx-auto min-h-[calc(100vh-80px)]">
          {view === ViewMode.DASHBOARD && <Dashboard stats={stats} recentCards={cards} onNavigate={setView} />}
          {view === ViewMode.INVENTORY && (
            <Inventory 
              cards={cards} 
              pages={pages}
              onDelete={handleDeleteCard} 
              onUpdate={(c) => { setEditingCard(c); setView(ViewMode.ADD_CARD); }} 
              onCreatePage={handleCreatePage}
              onDeletePage={handleDeletePage}
            />
          )}
          {view === ViewMode.ADD_CARD && (
            <CardForm 
              onSubmit={handleSaveCard} 
              onCancel={() => { setEditingCard(null); setView(ViewMode.DASHBOARD); }} 
              initialData={editingCard || undefined} 
              pages={pages}
              onToast={addToast}
            />
          )}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 glass border-t border-white/5 flex items-center justify-around px-8 z-[50]">
        <MobileNavButton active={view === ViewMode.DASHBOARD} onClick={() => setView(ViewMode.DASHBOARD)} icon={<DashboardIcon size={20} />} label="Home" />
        <button onClick={() => setView(ViewMode.ADD_CARD)} className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center -translate-y-8 shadow-xl border-2 border-black active:scale-90 transition-all"><Plus size={24} /></button>
        <MobileNavButton active={view === ViewMode.INVENTORY} onClick={() => setView(ViewMode.INVENTORY)} icon={<BinderIcon size={20} />} label="Binder" />
      </nav>

      {/* Toasts */}
      <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-[200] w-full max-w-sm px-4">
        {toasts.map(toast => (
          <div key={toast.id} className="flex items-center gap-4 p-4 rounded-2xl glass border border-white/10 shadow-2xl animate-in slide-in-from-bottom-4 w-full">
            {toast.type === 'success' && <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />}
            {toast.type === 'error' && <AlertCircle size={20} className="text-rose-500 shrink-0" />}
            {toast.type === 'info' && <Info size={20} className="text-blue-500 shrink-0" />}
            <span className="text-xs font-semibold text-slate-100">{toast.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="ml-auto text-slate-600 hover:text-white"><X size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 h-11 rounded-xl transition-all ${active ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'}`}>
    {icon}
    <span className="text-sm font-semibold">{label}</span>
  </button>
);

const MobileNavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-2 transition-all ${active ? 'text-blue-500' : 'text-slate-600'}`}>
    {icon}
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;

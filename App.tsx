
import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard as DashboardIcon, Database, PlusCircle, Settings, TrendingUp, Database as BinderIcon, Search, Bell, Power, User as UserIcon } from 'lucide-react';
import { Card, ViewMode, CollectionStats, User, BinderPage } from './types';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import CardForm from './components/CardForm';
import Auth from './components/Auth';

const STORAGE_SESSION_KEY = 'cardvault_current_session';

export const TCLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Clean, Bold Geometric Design - No Complex Filters */}
    <circle cx="50" cy="50" r="48" fill="#1e293b" />
    <circle cx="50" cy="50" r="42" fill="#020617" />
    
    {/* Bold Silver 'C' (Back Layer) */}
    <path 
      d="M 50 25 H 85 V 38 H 63 V 62 H 85 V 75 H 50 Z" 
      fill="#cbd5e1" 
    />
    
    {/* Bold Electric Blue 'T' (Front Layer) */}
    <path 
      d="M 15 25 H 60 V 38 H 43 V 75 H 32 V 38 H 15 Z" 
      fill="#3b82f6" 
    />

    {/* Small 'Keyhole' detail for the 'Vault' vibe */}
    <circle cx="78" cy="50" r="4" fill="#020617" />
  </svg>
);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [cards, setCards] = useState<Card[]>([]);
  const [pages, setPages] = useState<BinderPage[]>([]);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');

  useEffect(() => {
    const savedSession = localStorage.getItem(STORAGE_SESSION_KEY);
    if (savedSession) {
      try {
        setCurrentUser(JSON.parse(savedSession));
      } catch (e) {
        localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    }
    setIsInitializing(false);
  }, []);

  useEffect(() => {
    if (currentUser) {
      const userKey = currentUser.username.toLowerCase();
      const vaultKey = `cardvault_vault_${userKey}`;
      const pagesKey = `cardvault_pages_${userKey}`;
      
      const storedCards = localStorage.getItem(vaultKey);
      const storedPages = localStorage.getItem(pagesKey);
      
      try {
        setCards(storedCards ? JSON.parse(storedCards) : []);
        setPages(storedPages ? JSON.parse(storedPages) : []);
      } catch (e) {
        setCards([]);
        setPages([]);
      }
      setView(ViewMode.DASHBOARD);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!isInitializing && currentUser) {
      const userKey = currentUser.username.toLowerCase();
      localStorage.setItem(`cardvault_vault_${userKey}`, JSON.stringify(cards));
      localStorage.setItem(`cardvault_pages_${userKey}`, JSON.stringify(pages));
    }
  }, [cards, pages, isInitializing, currentUser]);

  const stats = useMemo<CollectionStats>(() => {
    const totalInvestment = cards.reduce((sum, c) => sum + (Number(c.pricePaid) || 0), 0);
    const totalMarketValue = cards.reduce((sum, c) => sum + (Number(c.marketValue) || 0), 0);
    
    const setCounts: Record<string, number> = {};
    cards.forEach(c => setCounts[c.set] = (setCounts[c.set] || 0) + 1);
    const topSet = Object.entries(setCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      totalCards: cards.length,
      totalInvestment,
      totalMarketValue,
      netProfit: totalMarketValue - totalInvestment,
      topSet
    };
  }, [cards]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
  };

  const handleLogout = () => {
    if (window.confirm("Close your vault?")) {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      setCurrentUser(null);
      setView(ViewMode.DASHBOARD);
    }
  };

  const handleAddCard = (newCard: Card) => {
    setCards(prev => [newCard, ...prev]);
    setView(ViewMode.INVENTORY);
  };

  const handleUpdateCard = (updated: Card) => {
    setCards(prev => prev.map(c => c.id === updated.id ? updated : c));
    setEditingCard(null);
    setView(ViewMode.INVENTORY);
  };

  const handleDeleteCard = (id: string) => {
    if (window.confirm("Remove this card from your collection?")) {
      setCards(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleEditTrigger = (card: Card) => {
    setEditingCard(card);
    setView(ViewMode.ADD_CARD);
  };

  const handleCreatePage = (name: string) => {
    const newPage: BinderPage = { id: crypto.randomUUID(), name };
    setPages(prev => [...prev, newPage]);
  };

  const handleDeletePage = (id: string) => {
    if (window.confirm("Are you sure? Cards on this page will become unassigned.")) {
      setPages(prev => prev.filter(p => p.id !== id));
      setCards(prev => prev.map(c => c.pageId === id ? { ...c, pageId: undefined } : c));
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <TCLogo className="w-16 h-16 animate-pulse" />
      </div>
    );
  }

  if (!currentUser) return <Auth onLogin={handleLogin} />;

  return (
    <div className="flex h-screen bg-black text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-72 border-r border-white/5 bg-[#020617] h-full">
        <div className="px-8 py-10 flex flex-col h-full">
          <div className="flex items-center gap-4 mb-16 cursor-pointer" onClick={() => setView(ViewMode.DASHBOARD)}>
            <TCLogo className="w-10 h-10" />
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tighter uppercase leading-none">
                <span className="text-blue-500">TC</span>
                <span className="text-slate-300 ml-1">VAULT</span>
              </h1>
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1">Hobbyist Archive</span>
            </div>
          </div>

          <nav className="space-y-1.5 flex-1">
            <NavButton active={view === ViewMode.DASHBOARD} onClick={() => setView(ViewMode.DASHBOARD)} icon={<DashboardIcon size={18} />} label="Showcase" />
            <NavButton active={view === ViewMode.INVENTORY} onClick={() => setView(ViewMode.INVENTORY)} icon={<BinderIcon size={18} />} label="My Binder" />
            <NavButton active={view === ViewMode.ADD_CARD} onClick={() => setView(ViewMode.ADD_CARD)} icon={<PlusCircle size={18} />} label="Add Pickup" />
          </nav>

          <div className="pt-8 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-3 truncate">
                <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                  <UserIcon size={12} />
                </div>
                <span className="text-[11px] font-bold uppercase truncate">{currentUser.username}</span>
              </div>
              <button onClick={handleLogout} className="p-2 text-slate-600 hover:text-rose-400"><Power size={14} /></button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-black relative">
        <header className="sticky top-0 z-[100] px-6 py-5 md:px-12 flex items-center justify-between glass border-b border-white/5">
          <div className="relative w-full max-w-lg group">
             <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700" size={16} />
             <input 
               type="text" 
               placeholder="SEARCH COLLECTION..." 
               value={globalSearch}
               onChange={(e) => setGlobalSearch(e.target.value)}
               className="w-full h-11 bg-white/[0.03] border border-white/5 rounded-xl pl-12 pr-6 text-[11px] font-bold uppercase tracking-widest focus:border-blue-500/30 outline-none transition-all"
             />
          </div>
          <div className="hidden md:flex items-center gap-6 ml-6">
             <button className="p-2.5 bg-white/[0.03] border border-white/5 rounded-full text-slate-600"><Bell size={18} /></button>
          </div>
        </header>

        <div className="p-6 md:p-12 max-w-7xl mx-auto pb-40">
          {view === ViewMode.DASHBOARD && <Dashboard stats={stats} recentCards={cards} onNavigate={setView} />}
          {view === ViewMode.INVENTORY && (
            <Inventory 
              cards={cards} 
              pages={pages}
              onDelete={handleDeleteCard} 
              onUpdate={handleEditTrigger} 
              onCreatePage={handleCreatePage}
              onDeletePage={handleDeletePage}
            />
          )}
          {view === ViewMode.ADD_CARD && (
            <CardForm 
              onSubmit={editingCard ? handleUpdateCard : handleAddCard} 
              onCancel={() => setView(ViewMode.DASHBOARD)} 
              initialData={editingCard || undefined} 
              pages={pages}
            />
          )}
        </div>
      </main>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3.5 px-5 py-3.5 rounded-xl transition-all ${active ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'}`}>
    {icon}
    <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;

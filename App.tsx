
import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard as DashboardIcon, Database, PlusCircle, Settings, TrendingUp, Download, ShieldCheck, Search, LogOut, User as UserIcon, Lock, ChevronRight, Key, Power, Bell } from 'lucide-react';
import { Card, ViewMode, CollectionStats, User } from './types';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import CardForm from './components/CardForm';
import Auth from './components/Auth';

const STORAGE_USERS_KEY = 'cardvault_registered_users';
const STORAGE_SESSION_KEY = 'cardvault_current_session';

export const TCLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      {/* Outer Rim Metal */}
      <linearGradient id="vault-rim" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="50%" stopColor="#475569" />
        <stop offset="100%" stopColor="#1e293b" />
      </linearGradient>

      {/* Electric Blue 'T' */}
      <linearGradient id="vault-blue-t" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>

      {/* Polished Silver 'C' */}
      <linearGradient id="vault-silver-c" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>

      {/* Shadow */}
      <filter id="vault-shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.5" />
      </filter>
    </defs>

    {/* Main Circular Shield */}
    <circle cx="60" cy="60" r="56" fill="url(#vault-rim)" stroke="#000" strokeWidth="1" />
    <circle cx="60" cy="60" r="48" fill="#0f172a" stroke="#000" strokeWidth="2" />
    
    {/* Decorative Plate Lines */}
    <line x1="12" y1="60" x2="108" y2="60" stroke="#000" strokeWidth="0.5" opacity="0.3" />
    <line x1="60" y1="12" x2="60" y2="108" stroke="#000" strokeWidth="0.5" opacity="0.3" />

    {/* The 'C' - Positioned Right */}
    <path 
      d="M 62 38 
         L 85 38 
         C 98 38, 98 82, 85 82 
         L 62 82 
         L 62 70 
         L 80 70 
         C 88 70, 88 50, 80 50 
         L 62 50 
         Z" 
      fill="url(#vault-silver-c)" 
      stroke="#000" 
      strokeWidth="1.5"
      filter="url(#vault-shadow)"
    />
    
    {/* Keyhole inside 'C' area */}
    <circle cx="82" cy="60" r="6" fill="#000" />
    <path d="M 82 60 L 78 72 L 86 72 Z" fill="#000" />

    {/* The 'T' - Positioned Left and Overlapping */}
    <path 
      d="M 28 38 
         L 72 38 
         L 72 50 
         L 58 50 
         L 58 82 
         L 44 82 
         L 44 50 
         L 28 50 
         Z" 
      fill="url(#vault-blue-t)" 
      stroke="#000" 
      strokeWidth="1.5"
      filter="url(#vault-shadow)"
    />

    {/* Gloss Overlays */}
    <path d="M 30 40 L 70 40 L 70 42 L 30 42 Z" fill="white" opacity="0.2" />
    <path d="M 64 40 L 83 40 L 83 42 L 64 42 Z" fill="white" opacity="0.2" />
  </svg>
);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [cards, setCards] = useState<Card[]>([]);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');

  // Load Session
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

  // Load User Data
  useEffect(() => {
    if (currentUser) {
      const vaultKey = `cardvault_vault_${currentUser.username.toLowerCase()}`;
      const stored = localStorage.getItem(vaultKey);
      if (stored) {
        try {
          setCards(JSON.parse(stored));
        } catch (e) {
          setCards([]);
        }
      } else {
        setCards([]);
      }
      setView(ViewMode.DASHBOARD);
    }
  }, [currentUser]);

  // Save Data
  useEffect(() => {
    if (!isInitializing && currentUser) {
      const vaultKey = `cardvault_vault_${currentUser.username.toLowerCase()}`;
      localStorage.setItem(vaultKey, JSON.stringify(cards));
    }
  }, [cards, isInitializing, currentUser]);

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
    if (window.confirm("Terminate secure terminal?")) {
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
    if (window.confirm("Remove asset from registry?")) {
      setCards(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleEditTrigger = (card: Card) => {
    setEditingCard(card);
    setView(ViewMode.ADD_CARD);
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="flex flex-col items-center">
          <div className="animate-pulse mb-10">
            <TCLogo className="w-24 h-24" />
          </div>
          <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.8em] animate-pulse">Initializing Systems</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Auth onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-[#000000] text-slate-200">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-72 glass border-r border-white/5 bg-black/40">
        <div className="px-8 py-12 flex flex-col h-full">
          <div className="flex items-center gap-4 mb-20 group cursor-pointer" onClick={() => setView(ViewMode.DASHBOARD)}>
            <TCLogo className="w-14 h-14 transition-transform group-hover:scale-105 duration-500" />
            <div className="flex flex-col">
              <h1 className="text-2xl font-black tracking-tighter uppercase drop-shadow-sm leading-none">
                <span className="text-blue-500">TC</span>
                <span className="text-slate-300 ml-1">VAULT</span>
              </h1>
              <span className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.4em] mt-1">Pro Archive</span>
            </div>
          </div>

          <nav className="space-y-2 flex-1">
            <NavButton active={view === ViewMode.DASHBOARD} onClick={() => setView(ViewMode.DASHBOARD)} icon={<DashboardIcon size={20} />} label="Portfolio Overview" />
            <NavButton active={view === ViewMode.INVENTORY} onClick={() => setView(ViewMode.INVENTORY)} icon={<Database size={20} />} label="Global Registry" />
            <NavButton active={view === ViewMode.ADD_CARD} onClick={() => setView(ViewMode.ADD_CARD)} icon={<PlusCircle size={20} />} label="Secure Intake" />
          </nav>

          <div className="pt-8 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between px-4 py-4 rounded-[2rem] bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <UserIcon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-200 uppercase tracking-tighter truncate">{currentUser.username}</p>
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Verified Collector</p>
                </div>
              </div>
              <button onClick={handleLogout} className="p-2 text-slate-700 hover:text-rose-400 transition-colors"><Power size={16} /></button>
            </div>

            <button onClick={() => setView(ViewMode.SETTINGS)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[2rem] transition-all ${view === ViewMode.SETTINGS ? 'bg-white text-black font-black' : 'text-slate-500 hover:text-slate-200'}`}>
              <Settings size={20} />
              <span className="font-black text-[11px] uppercase tracking-[0.2em]">Terminal Setup</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <header className="sticky top-0 z-[100] px-6 py-6 md:px-12 md:py-8 flex items-center justify-between glass border-b border-white/5 bg-black/80 backdrop-blur-3xl">
          <div className="relative w-full max-w-xl group">
             <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-indigo-500 transition-colors" size={18} />
             <input 
               type="text" 
               placeholder="COMMAND SEARCH (ID, PLAYER, SET...)" 
               value={globalSearch}
               onChange={(e) => setGlobalSearch(e.target.value)}
               className="w-full h-14 bg-white/[0.02] border border-white/5 rounded-[2rem] pl-16 pr-8 text-[11px] font-black uppercase tracking-[0.2em] focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 outline-none transition-all placeholder:text-slate-800"
             />
          </div>
          <div className="hidden md:flex items-center gap-8 ml-8">
             <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.4em]">Vault Security</span>
                <span className="text-[10px] font-black text-emerald-500 uppercase">ENCRYPTED</span>
             </div>
             <button className="p-4 bg-white/[0.03] border border-white/5 rounded-full hover:bg-white/[0.05] transition-all text-slate-500 relative">
                <Bell size={20} />
                <div className="absolute top-3 right-3 w-2 h-2 bg-indigo-500 rounded-full"></div>
             </button>
          </div>
        </header>

        <div className="p-6 md:p-12 max-w-7xl mx-auto pb-40">
          {view === ViewMode.DASHBOARD && <Dashboard stats={stats} recentCards={cards.slice(0, 4)} onNavigate={setView} />}
          {view === ViewMode.INVENTORY && <Inventory cards={cards} onDelete={handleDeleteCard} onUpdate={handleEditTrigger} />}
          {view === ViewMode.ADD_CARD && <CardForm onSubmit={editingCard ? handleUpdateCard : handleAddCard} onCancel={() => setView(ViewMode.DASHBOARD)} initialData={editingCard || undefined} />}
          {view === ViewMode.SETTINGS && <SettingsView user={currentUser} cards={cards} onExport={() => {}} onImport={() => {}} onLogout={handleLogout} />}
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-white/5 px-10 py-5 flex justify-between items-center z-[200] bg-black/90 backdrop-blur-3xl">
        <MobileNavButton active={view === ViewMode.DASHBOARD} onClick={() => setView(ViewMode.DASHBOARD)} icon={<DashboardIcon size={24} />} label="HOME" />
        <MobileNavButton active={view === ViewMode.INVENTORY} onClick={() => setView(ViewMode.INVENTORY)} icon={<Database size={24} />} label="VAULT" />
        <button onClick={() => setView(ViewMode.ADD_CARD)} className="w-14 h-14 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center -mt-10 shadow-2xl shadow-indigo-600/30 ring-4 ring-black">
          <PlusCircle size={28} />
        </button>
        <div className="flex flex-col items-center gap-1 opacity-40">
          <TrendingUp size={24} />
          <span className="text-[8px] font-black uppercase tracking-widest">LIVE</span>
        </div>
        <MobileNavButton active={view === ViewMode.SETTINGS} onClick={() => setView(ViewMode.SETTINGS)} icon={<Settings size={24} />} label="SETUP" />
      </nav>
    </div>
  );
};

const SettingsView = ({ user, cards, onLogout }: any) => (
  <div className="space-y-16 animate-in fade-in slide-in-from-bottom-2 duration-700">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
      <div>
        <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic">Terminal Setup</h2>
        <p className="text-slate-500 text-sm font-medium mt-1">Configuring secure access for <span className="text-indigo-400 font-black">{user.username}</span></p>
      </div>
      <button onClick={onLogout} className="px-8 py-4 bg-rose-500/5 border border-rose-500/10 text-rose-500 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-rose-500/10 transition-all">TERMINATE ACCESS</button>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
       <div className="glass rounded-[3rem] p-10 border-white/5 bg-black/40">
          <div className="flex items-center gap-5 mb-10">
             <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20"><Download size={22} /></div>
             <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Data Migration</h3>
          </div>
          <div className="flex flex-col gap-4">
             <button className="w-full py-5 bg-white text-black rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] hover:bg-slate-200 transition-all">Export Local Registry</button>
             <button className="w-full py-5 bg-slate-900 border border-white/5 text-slate-400 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] hover:bg-slate-800 transition-all">Import External Registry</button>
          </div>
       </div>
    </div>
  </div>
);

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[2rem] transition-all ${active ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-inner shadow-indigo-500/5' : 'text-slate-500 hover:text-slate-300'}`}>
    {icon}
    <span className="text-[11px] font-black uppercase tracking-[0.2em]">{label}</span>
  </button>
);

const MobileNavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-2 transition-all ${active ? 'text-indigo-400' : 'text-slate-600'}`}>
    {icon}
    <span className="text-[8px] font-black uppercase tracking-[0.2em]">{label}</span>
  </button>
);

export default App;

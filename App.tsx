
import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard as DashboardIcon, Database, PlusCircle, Settings, TrendingUp, Layers } from 'lucide-react';
import { Card, ViewMode, CollectionStats } from './types';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import CardForm from './components/CardForm';

const STORAGE_KEY = 'cardvault_collection';

const TCLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="8" fill="#1A1A1A" />
    <path d="M22 22H78V34H56V78H44V34H22V22Z" fill="white" />
    <path d="M56 46H78V78H22V66H66V46H78Z" fill="white" />
  </svg>
);

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [cards, setCards] = useState<Card[]>([]);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Load data
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: any[] = JSON.parse(stored);
        const migrated = parsed.map(c => {
          if (c.image && !c.images) {
            return { ...c, images: [c.image] };
          }
          if (!c.images) {
            return { ...c, images: [] };
          }
          return c;
        });
        setCards(migrated);
      } catch (e) {
        console.error("Failed to parse storage", e);
      }
    }
    setIsInitializing(false);
  }, []);

  // Save data
  useEffect(() => {
    if (!isInitializing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    }
  }, [cards, isInitializing]);

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
    if (window.confirm("Are you sure you want to remove this card?")) {
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
          <div className="animate-pulse mb-6">
            <TCLogo className="w-20 h-20" />
          </div>
          <p className="text-xl font-black uppercase tracking-tighter">Initializing Vault</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black text-slate-100 selection:bg-indigo-500/30">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-72 glass border-r border-slate-800/50">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12 group cursor-pointer" onClick={() => setView(ViewMode.DASHBOARD)}>
            <TCLogo className="w-12 h-12 shadow-2xl transition-transform group-hover:scale-105" />
            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">TC VAULT</h1>
          </div>

          <nav className="space-y-3">
            <button 
              onClick={() => { setView(ViewMode.DASHBOARD); setEditingCard(null); }}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all ${view === ViewMode.DASHBOARD ? 'bg-white text-black shadow-xl font-bold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <DashboardIcon size={22} />
              <span className="font-bold uppercase tracking-tight text-sm">Dashboard</span>
            </button>
            <button 
              onClick={() => { setView(ViewMode.INVENTORY); setEditingCard(null); }}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all ${view === ViewMode.INVENTORY ? 'bg-white text-black shadow-xl font-bold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <Database size={22} />
              <span className="font-bold uppercase tracking-tight text-sm">Inventory</span>
            </button>
            <button 
              onClick={() => { setView(ViewMode.ADD_CARD); setEditingCard(null); }}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all ${view === ViewMode.ADD_CARD ? 'bg-white text-black shadow-xl font-bold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <PlusCircle size={22} />
              <span className="font-bold uppercase tracking-tight text-sm">Add New Card</span>
            </button>
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-slate-800/50">
          <div className="bg-slate-900/80 rounded-3xl p-6 mb-6 border border-slate-800">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Vault Value</p>
            <p className="text-2xl font-black text-white">£{stats.totalMarketValue.toLocaleString()}</p>
          </div>
          <button className="w-full flex items-center gap-3 px-5 py-2 text-slate-500 hover:text-slate-200 transition-colors">
            <Settings size={20} />
            <span className="font-bold uppercase tracking-tight text-sm">Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-black">
        <header className="md:hidden glass p-5 flex items-center justify-between sticky top-0 z-50 border-b border-slate-800">
          <div className="flex items-center gap-3" onClick={() => setView(ViewMode.DASHBOARD)}>
            <TCLogo className="w-10 h-10" />
            <span className="text-xl font-black tracking-tighter uppercase">TC VAULT</span>
          </div>
          <button className="p-2 text-slate-400">
            <Settings size={22} />
          </button>
        </header>

        <div className="p-6 md:p-12 max-w-7xl mx-auto pb-32 md:pb-12">
          {view === ViewMode.DASHBOARD && (
            <Dashboard stats={stats} recentCards={cards.slice(0, 4)} onNavigate={setView} />
          )}
          {view === ViewMode.INVENTORY && (
            <Inventory 
              cards={cards} 
              onDelete={handleDeleteCard} 
              onUpdate={handleEditTrigger}
            />
          )}
          {view === ViewMode.ADD_CARD && (
            <CardForm 
              onSubmit={editingCard ? handleUpdateCard : handleAddCard} 
              onCancel={() => { setView(ViewMode.DASHBOARD); setEditingCard(null); }} 
              initialData={editingCard || undefined}
            />
          )}
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-slate-800 px-8 py-4 flex justify-between items-center z-50 bg-black/90">
        <button onClick={() => { setView(ViewMode.DASHBOARD); setEditingCard(null); }} className={`flex flex-col items-center gap-1 transition-colors ${view === ViewMode.DASHBOARD ? 'text-white' : 'text-slate-600'}`}>
          <DashboardIcon size={24} />
          <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
        </button>
        <button onClick={() => { setView(ViewMode.INVENTORY); setEditingCard(null); }} className={`flex flex-col items-center gap-1 transition-colors ${view === ViewMode.INVENTORY ? 'text-white' : 'text-slate-600'}`}>
          <Database size={24} />
          <span className="text-[9px] font-black uppercase tracking-widest">Stock</span>
        </button>
        <button onClick={() => { setView(ViewMode.ADD_CARD); setEditingCard(null); }} className="w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center -mt-10 shadow-2xl active:scale-95 transition-all">
          <PlusCircle size={28} />
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-600">
          <TrendingUp size={24} />
          <span className="text-[9px] font-black uppercase tracking-widest">Live</span>
        </button>
        <button onClick={() => setView(ViewMode.SETTINGS)} className={`flex flex-col items-center gap-1 transition-colors ${view === ViewMode.SETTINGS ? 'text-white' : 'text-slate-600'}`}>
          <Settings size={24} />
          <span className="text-[9px] font-black uppercase tracking-widest">Setup</span>
        </button>
      </nav>
    </div>
  );
};

export default App;

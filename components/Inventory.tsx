
import React, { useState, useMemo, useEffect } from 'react';
import { Card, BinderPage, ViewMode } from '../types';
import { Search, Trash2, Edit3, X, ChevronDown, Filter as FilterIcon, Plus, BookOpen, Layers, ChevronLeft, ChevronRight } from 'lucide-react';

interface InventoryProps {
  cards: Card[];
  pages: BinderPage[];
  onDelete: (id: string) => void;
  onUpdate: (card: Card) => void;
  onCreatePage: (name: string) => void;
  onDeletePage: (id: string) => void;
}

interface FilterState {
  player: string;
  team: string;
  set: string;
  condition: string;
  rarity: string;
}

const Inventory: React.FC<InventoryProps> = ({ cards, pages, onDelete, onUpdate, onCreatePage, onDeletePage }) => {
  const [filters, setFilters] = useState<FilterState>({
    player: '',
    team: 'all',
    set: 'all',
    condition: 'all',
    rarity: 'all'
  });
  
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activePageId, setActivePageId] = useState<string | 'all'>('all');
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const uniqueTeams = useMemo(() => Array.from(new Set(cards.map(c => c.team).filter(Boolean))).sort(), [cards]);
  const uniqueSets = useMemo(() => Array.from(new Set(cards.map(c => c.set))).sort(), [cards]);
  const uniqueRarities = useMemo(() => Array.from(new Set(cards.map(c => c.rarityTier).filter(Boolean))).sort(), [cards]);
  const uniqueConditions = useMemo(() => Array.from(new Set(cards.map(c => c.condition))).sort(), [cards]);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedCard]);

  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      if (activePageId !== 'all' && card.pageId !== activePageId) return false;
      if (filters.player && !card.playerName.toLowerCase().includes(filters.player.toLowerCase())) return false;
      if (filters.team !== 'all' && card.team !== filters.team) return false;
      if (filters.set !== 'all' && card.set !== filters.set) return false;
      if (filters.condition !== 'all' && card.condition !== filters.condition) return false;
      if (filters.rarity !== 'all' && card.rarityTier !== filters.rarity) return false;
      return true;
    });
  }, [cards, filters, activePageId]);

  const hasActiveFilters = useMemo(() => {
    return filters.player !== '' || filters.team !== 'all' || filters.set !== 'all' || filters.condition !== 'all' || filters.rarity !== 'all';
  }, [filters]);

  const resetFilters = () => {
    setFilters({ player: '', team: 'all', set: 'all', condition: 'all', rarity: 'all' });
  };

  const handleCreatePage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPageName.trim()) {
      onCreatePage(newPageName.trim());
      setNewPageName('');
      setIsCreatingPage(false);
    }
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedCard) return;
    setCurrentImageIndex(prev => (prev === selectedCard.images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedCard) return;
    setCurrentImageIndex(prev => (prev === 0 ? selectedCard.images.length - 1 : prev - 1));
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Collector stash</span>
          <h2 className="text-4xl font-black tracking-tighter text-white">The binder</h2>
        </div>
        <button 
          onClick={() => setIsCreatingPage(true)}
          className="flex items-center gap-2 px-6 h-12 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 font-black text-sm transition-all shadow-lg whitespace-nowrap active:scale-[0.98]"
        >
          <Plus size={16} /> New page
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search by player..."
              value={filters.player}
              onChange={(e) => setFilters({...filters, player: e.target.value})}
              className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 pl-11 pr-4 text-sm font-semibold text-white focus:border-blue-500/40 outline-none transition-all placeholder:text-slate-700"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 h-11 rounded-xl font-black text-sm transition-all border ${showFilters ? 'bg-blue-600/10 text-blue-400 border-blue-500/20' : 'bg-white/[0.03] text-slate-500 border-white/5 hover:text-white'}`}
          >
            <FilterIcon size={16} />
            <span className="hidden md:inline">Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-300">
            <FilterSelect value={filters.team} onChange={(v: string) => setFilters({...filters, team: v})} options={uniqueTeams} placeholder="Team" />
            <FilterSelect value={filters.set} onChange={(v: string) => setFilters({...filters, set: v})} options={uniqueSets} placeholder="Set" />
            <FilterSelect value={filters.condition} onChange={(v: string) => setFilters({...filters, condition: v})} options={uniqueConditions} placeholder="Grade" />
            <FilterSelect value={filters.rarity} onChange={(v: string) => setFilters({...filters, rarity: v})} options={uniqueRarities} placeholder="Rarity" />
            {hasActiveFilters && (
              <button onClick={resetFilters} className="col-span-full text-center text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-400 transition-colors py-2">Reset all filters</button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 overflow-x-auto pb-4 border-b border-white/5 no-scrollbar">
        <PageTab label="Main stash" active={activePageId === 'all'} onClick={() => setActivePageId('all')} count={cards.length} icon={<Layers size={16} />} />
        {pages.map(page => (
          <PageTab 
            key={page.id}
            label={page.name}
            active={activePageId === page.id}
            onClick={() => setActivePageId(page.id)}
            onDelete={() => onDeletePage(page.id)}
            count={cards.filter(c => c.pageId === page.id).length}
            icon={<BookOpen size={16} />}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8">
        {filteredCards.map(card => (
          <div 
            key={card.id} 
            className="group cursor-pointer space-y-4 rounded-2xl p-1" 
            onClick={() => setSelectedCard(card)}
          >
            <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 shadow-lg bg-slate-950 relative flex items-center justify-center p-4">
              <img 
                src={card.images[0]} 
                className="max-w-full max-h-full w-auto h-auto object-contain group-hover:scale-[1.03] transition-transform duration-700" 
                alt={card.playerName} 
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                <button onClick={(e) => { e.stopPropagation(); onUpdate(card); }} className="p-3 bg-white text-black rounded-xl hover:scale-105 transition-all"><Edit3 size={16} /></button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(card.id); }} className="p-3 bg-rose-600 text-white rounded-xl hover:scale-105 transition-all"><Trash2 size={16} /></button>
              </div>
              <div className="absolute top-4 right-4 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                <span className="text-[9px] font-black text-white uppercase tracking-wider">{card.condition}</span>
              </div>
            </div>
            <div className="space-y-2 px-1">
              <h4 className="font-black text-sm text-white truncate group-hover:text-blue-400 transition-colors">{card.playerName}</h4>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest truncate">{card.set}</p>
                <span className="text-sm font-black text-slate-400 tabular">£{card.marketValue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedCard && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in" onClick={() => setSelectedCard(null)}>
          <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl glass md:rounded-3xl overflow-hidden flex flex-col md:flex-row border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
             {/* Gallery Section */}
             <div className="flex-1 bg-black/40 flex flex-col items-center justify-center relative p-6 md:p-12 min-h-0">
                <div className="relative w-full h-full max-h-[55vh] md:max-h-full flex items-center justify-center overflow-hidden">
                   <img 
                    key={currentImageIndex} 
                    src={selectedCard.images[currentImageIndex]} 
                    className="max-w-full max-h-full w-auto h-auto object-contain select-none animate-in fade-in zoom-in-95 duration-500 drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]" 
                    alt={selectedCard.playerName} 
                   />
                   {selectedCard.images.length > 1 && (
                     <>
                        <button onClick={prevImage} className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-blue-600 transition-all z-50 ml-2 shadow-xl"><ChevronLeft size={20} /></button>
                        <button onClick={nextImage} className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-blue-600 transition-all z-50 mr-2 shadow-xl"><ChevronRight size={20} /></button>
                     </>
                   )}
                </div>
                {/* Thumbnails Indicator */}
                {selectedCard.images.length > 1 && (
                  <div className="absolute bottom-4 flex gap-1.5">
                    {selectedCard.images.map((_, i) => (
                      <div key={i} className={`h-1 rounded-full transition-all ${i === currentImageIndex ? 'w-6 bg-blue-500' : 'w-2 bg-white/20'}`}></div>
                    ))}
                  </div>
                )}
             </div>

             {/* Metadata Section */}
             <div className="md:w-[380px] p-8 md:p-10 space-y-10 overflow-y-auto bg-black flex flex-col border-t md:border-t-0 md:border-l border-white/10 min-h-0 h-auto md:h-full">
                <div className="space-y-8">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Card inspector</span>
                        <h3 className="text-2xl font-black text-white tracking-tighter leading-tight">{selectedCard.playerName}</h3>
                    </div>
                    <button onClick={() => setSelectedCard(null)} className="p-2 text-slate-700 hover:text-white transition-colors"><X size={24} /></button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-6 gap-y-8">
                    <Detail label="Team" value={selectedCard.team || 'N/A'} />
                    <Detail label="Set" value={selectedCard.set} />
                    <Detail label="Set Number" value={selectedCard.setNumber || 'N/A'} />
                    <Detail label="Grade" value={selectedCard.condition} />
                    <Detail label="Parallel" value={selectedCard.cardSpecifics} />
                    <Detail label="Serial #" value={selectedCard.serialNumber || 'N/A'} />
                  </div>
                </div>

                <div className="pt-8 border-t border-white/10 space-y-8 mt-auto">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Paid</span>
                        <p className="text-xl font-black text-white tabular">£{selectedCard.pricePaid}</p>
                      </div>
                      <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-2">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Market</span>
                        <p className="text-xl font-black text-blue-400 tabular">£{selectedCard.marketValue}</p>
                      </div>
                   </div>
                   <button onClick={() => onUpdate(selectedCard)} className="w-full h-14 bg-white text-black rounded-xl font-black text-sm hover:bg-slate-200 transition-all shadow-xl active:scale-[0.98]">Modify record</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FilterSelect = ({ value, onChange, options, placeholder }: any) => (
  <div className="relative group">
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`w-full bg-white/[0.03] border rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest appearance-none cursor-pointer outline-none transition-all ${value !== 'all' ? 'border-blue-500/40 text-blue-400' : 'border-white/5 text-slate-600 hover:text-slate-400'}`}>
      <option value="all">{placeholder}</option>
      {options.map((opt: string) => <option key={opt} value={opt} className="bg-slate-900 text-white font-semibold">{opt}</option>)}
    </select>
    <ChevronDown size={12} className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${value !== 'all' ? 'text-blue-400' : 'text-slate-700'}`} />
  </div>
);

const PageTab = ({ label, active, onClick, onDelete, count, icon }: any) => (
  <div className="flex items-center gap-2 group/tab">
    <button onClick={onClick} className={`px-4 h-10 rounded-full flex items-center gap-2 transition-all whitespace-nowrap border ${active ? 'bg-white text-black border-white shadow-lg font-black' : 'bg-white/5 text-slate-500 border-white/5 hover:text-slate-300 font-semibold'}`}>
      {icon}
      <span className="text-[10px] uppercase tracking-widest">{label}</span>
      <span className={`text-[10px] tabular ${active ? 'text-black/50' : 'text-slate-700'}`}>{count}</span>
    </button>
    {onDelete && (
      <button onClick={onDelete} className="p-2 text-slate-800 hover:text-rose-500 opacity-0 group-hover/tab:opacity-100 transition-opacity rounded-lg"><Trash2 size={12} /></button>
    )}
  </div>
);

const Detail = ({ label, value }: any) => (
  <div className="space-y-1.5">
    <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest block">{label}</span>
    <p className="text-xs font-semibold text-slate-400 leading-relaxed">{value}</p>
  </div>
);

export default Inventory;

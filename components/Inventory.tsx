import React, { useState, useMemo, useEffect } from 'react';
import { Card, BinderPage, ViewMode } from '../types';
import { Search, Trash2, Edit3, X, ChevronDown, Filter as FilterIcon, Plus, BookOpen, Layers, ChevronLeft, ChevronRight, Ghost, RotateCcw, Sparkles, Share2 } from 'lucide-react';
import EmptyState from './EmptyState';
import TiltCard from './TiltCard';

interface InventoryProps {
  cards: Card[];
  pages: BinderPage[];
  globalSearch?: string;
  onClearSearch?: () => void;
  onDelete: (id: string) => void;
  onUpdate: (card: Card) => void;
  onCreatePage: (name: string) => void;
  onDeletePage: (id: string) => void;
  initialActiveBinderId?: string | 'all';
}

interface FilterState {
  player: string;
  team: string;
  set: string;
  condition: string;
  rarity: string;
  isWishlistOnly: boolean;
}

const Inventory: React.FC<InventoryProps> = ({ cards, pages, globalSearch = '', onClearSearch, onDelete, onUpdate, onCreatePage, onDeletePage, initialActiveBinderId = 'all' }) => {
  const [filters, setFilters] = useState<FilterState>({ player: '', team: 'all', set: 'all', condition: 'all', rarity: 'all', isWishlistOnly: false });
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activePageId, setActivePageId] = useState<string | 'all'>(initialActiveBinderId);
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isSocialMode, setIsSocialMode] = useState(false);

  useEffect(() => {
    setActivePageId(initialActiveBinderId);
  }, [initialActiveBinderId]);

  const uniqueTeams = useMemo(() => Array.from(new Set(cards.map(c => c.team).filter(Boolean))).sort(), [cards]);
  const uniqueSets = useMemo(() => Array.from(new Set(cards.map(c => c.set))).sort(), [cards]);
  const uniqueRarities = useMemo(() => Array.from(new Set(cards.map(c => c.rarityTier).filter(Boolean))).sort(), [cards]);
  const uniqueConditions = useMemo(() => Array.from(new Set(cards.map(c => c.condition))).sort(), [cards]);

  useEffect(() => { 
    setCurrentImageIndex(0); 
    setIsSocialMode(false);
  }, [selectedCard]);

  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      if (activePageId !== 'all' && card.pageId !== activePageId) return false;
      if (globalSearch) {
        const term = globalSearch.toLowerCase();
        const matches = card.playerName.toLowerCase().includes(term) || (card.team && card.team.toLowerCase().includes(term)) || card.set.toLowerCase().includes(term) || card.cardSpecifics.toLowerCase().includes(term);
        if (!matches) return false;
      }
      if (filters.player && !card.playerName.toLowerCase().includes(filters.player.toLowerCase())) return false;
      if (filters.team !== 'all' && card.team !== filters.team) return false;
      if (filters.set !== 'all' && card.set !== filters.set) return false;
      if (filters.condition !== 'all' && card.condition !== filters.condition) return false;
      if (filters.rarity !== 'all' && card.rarityTier !== filters.rarity) return false;
      if (filters.isWishlistOnly && !card.isWishlist) return false;
      return true;
    });
  }, [cards, filters, activePageId, globalSearch]);

  const activePageName = useMemo(() => {
    if (activePageId === 'all') return 'All Cards';
    return pages.find(p => p.id === activePageId)?.name || 'Unknown Binder';
  }, [activePageId, pages]);

  const hasActiveFilters = useMemo(() => filters.player !== '' || filters.team !== 'all' || filters.set !== 'all' || filters.condition !== 'all' || filters.rarity !== 'all' || globalSearch !== '' || filters.isWishlistOnly, [filters, globalSearch]);

  const resetAllViewFilters = () => {
    setFilters({ player: '', team: 'all', set: 'all', condition: 'all', rarity: 'all', isWishlistOnly: false });
    setActivePageId('all');
    if (onClearSearch) onClearSearch();
  };

  const handleCreatePage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPageName.trim()) {
      onCreatePage(newPageName.trim());
      setNewPageName('');
      setIsCreatingPage(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vault archive</span>
          <h2 className="text-[32px] font-black tracking-tighter text-white leading-tight">Your Binders</h2>
        </div>
        <button onClick={() => setIsCreatingPage(true)} className="btn-secondary h-12 uppercase text-[10px] tracking-widest font-black active:scale-[0.97]">
          <Plus size={16} className="mr-2" /> New Binder
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={16} />
             <input type="text" placeholder="Filter current view..." value={filters.player} onChange={(e) => setFilters({...filters, player: e.target.value})} className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-12 pl-11 pr-4 text-sm font-semibold text-white focus:border-blue-500/40 outline-none transition-all placeholder:text-slate-600" />
          </div>
          <button 
            onClick={() => setFilters({...filters, isWishlistOnly: !filters.isWishlistOnly})} 
            className={`btn-secondary h-12 px-6 flex items-center gap-2 active:scale-[0.97] transition-all ${filters.isWishlistOnly ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : ''}`}
            title="Show Wishlist only"
          >
            <Sparkles size={16} />
            <span className="hidden md:inline uppercase text-[10px] tracking-widest font-black">Wishlist</span>
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary h-12 px-6 flex items-center gap-2 active:scale-[0.97] ${showFilters ? 'bg-blue-600/10 text-blue-400 border-blue-500/20' : ''}`}>
            <FilterIcon size={16} /><span className="hidden md:inline uppercase text-[10px] tracking-widest font-black">Refine</span>
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-300">
            <FilterSelect value={filters.team} onChange={(v: string) => setFilters({...filters, team: v})} options={uniqueTeams} placeholder="Team" />
            <FilterSelect value={filters.set} onChange={(v: string) => setFilters({...filters, set: v})} options={uniqueSets} placeholder="Set" />
            <FilterSelect value={filters.condition} onChange={(v: string) => setFilters({...filters, condition: v})} options={uniqueConditions} placeholder="Grade" />
            <FilterSelect value={filters.rarity} onChange={(v: string) => setFilters({...filters, rarity: v})} options={uniqueRarities} placeholder="Rarity" />
            {hasActiveFilters && <button onClick={resetAllViewFilters} className="col-span-full text-center text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-400 transition-colors py-4 active:scale-95">Reset Filters</button>}
          </div>
        )}
      </div>

      <div className="pb-4 border-b border-white/5 overflow-x-auto no-scrollbar">
        {activePageId === 'all' ? (
          <div className="flex items-center gap-4">
            <PageTab label="All Cards" active={true} onClick={() => setActivePageId('all')} count={cards.length} icon={<Layers size={16} />} />
            {pages.map(page => (
              <PageTab key={page.id} label={page.name} active={false} onClick={() => setActivePageId(page.id)} count={cards.filter(c => c.pageId === page.id).length} icon={<BookOpen size={16} />} />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-4 animate-in slide-in-from-left-2 duration-300">
            <button 
              onClick={() => setActivePageId('all')} 
              className="btn-tertiary h-11 px-0 flex items-center gap-2 text-slate-400 group active:scale-95"
            >
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
              <span className="text-[10px] uppercase font-black tracking-widest">Back to Master</span>
            </button>
            <div className="h-4 w-px bg-white/10 mx-2"></div>
            <div className="flex items-center gap-2 px-4 h-11 rounded-full bg-white text-black font-black">
              <BookOpen size={16} />
              <span className="text-[10px] uppercase tracking-widest">{activePageName}</span>
              <span className="text-[10px] text-black/50">{filteredCards.length}</span>
            </div>
            <button 
              onClick={() => onDeletePage(activePageId as string)} 
              className="p-2 text-slate-700 hover:text-rose-500 transition-colors rounded-xl active:scale-90 ml-auto md:ml-2"
              title="Delete Binder"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {filteredCards.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] md:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-8">
          {filteredCards.map(card => (
            <div key={card.id} className="group cursor-pointer space-y-4" onClick={() => setSelectedCard(card)}>
              <div className="aspect-[3/4] rounded-[16px] overflow-hidden border border-white/5 shadow-lg bg-slate-950 relative flex items-center justify-center p-4 img-loading">
                <img 
                  src={card.images[0]} 
                  onLoad={(e) => (e.currentTarget.parentElement as HTMLElement).classList.remove('img-loading')}
                  className="max-w-full max-h-full w-auto h-auto object-contain group-hover:scale-[1.02] transition-transform duration-[150ms] z-10" 
                  alt={card.playerName} 
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm z-20">
                  <button onClick={(e) => { e.stopPropagation(); onUpdate(card); }} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white text-black rounded-xl hover:scale-105 transition-all shadow-xl"><Edit3 size={16} /></button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(card.id); }} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center bg-rose-600 text-white rounded-xl hover:scale-105 transition-all shadow-xl"><Trash2 size={16} /></button>
                </div>
                {card.isWishlist && (
                  <div className="absolute top-3 left-3 z-30 bg-amber-500 text-black p-1.5 rounded-lg shadow-lg shadow-amber-500/20 animate-in zoom-in-50 duration-300">
                    <Sparkles size={12} fill="currentColor" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm text-white truncate group-hover:text-blue-400 transition-colors">{card.playerName}</h4>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest truncate">{card.set} {card.setNumber ? `#${card.setNumber}` : ''}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-slate-400 tabular">£{card.marketValue.toLocaleString()}</span>
                  {card.serialNumber && <span className="text-[9px] font-black text-blue-500 px-1.5 py-0.5 glass-subtle rounded border border-blue-500/20">{card.serialNumber}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState 
          icon={<Ghost />} 
          title="No results found" 
          message={globalSearch ? `No matches for "${globalSearch}" in the archive.` : "This binder is currently empty."}
          actionLabel={hasActiveFilters ? "Reset all view" : undefined}
          onAction={resetAllViewFilters}
        />
      )}

      {selectedCard && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-[300ms]" onClick={() => setSelectedCard(null)}>
          <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl glass md:rounded-[24px] overflow-hidden flex flex-col md:flex-row border-white/10 shadow-2xl relative" onClick={e => e.stopPropagation()}>
             <div className="absolute top-4 right-4 md:top-8 md:right-8 z-[110] flex gap-2">
               <button 
                 onClick={() => setIsSocialMode(!isSocialMode)} 
                 className={`p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-all active:scale-95 shadow-xl glass-subtle ${isSocialMode ? 'bg-blue-600 text-white border-blue-500' : 'text-white hover:bg-white/10'}`}
                 title="Toggle Social Share Mode"
               >
                 <Share2 size={24} />
               </button>
               <button onClick={() => setSelectedCard(null)} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center glass-subtle rounded-full text-white hover:bg-white/10 transition-colors active:scale-95 shadow-xl">
                 <X size={24} />
               </button>
             </div>

             <div className="flex-1 bg-black/40 flex flex-col items-center justify-center relative p-8 md:p-12 min-h-0">
                <TiltCard className="relative w-full h-full flex items-center justify-center overflow-hidden img-loading">
                   <img 
                    src={selectedCard.images[currentImageIndex]} 
                    onLoad={(e) => (e.currentTarget.parentElement as HTMLElement).classList.remove('img-loading')}
                    className="max-w-full max-h-full w-auto h-auto object-contain select-none animate-in fade-in zoom-in-95 duration-500 drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-10" 
                    alt={selectedCard.playerName} 
                   />
                   {selectedCard.images.length > 1 && (
                     <>
                        <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === 0 ? selectedCard.images.length - 1 : prev - 1); }} className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-blue-600 transition-all ml-2 shadow-xl z-20 active:scale-90"><ChevronLeft size={24} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === selectedCard.images.length - 1 ? 0 : prev + 1); }} className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-blue-600 transition-all mr-2 shadow-xl z-20 active:scale-90"><ChevronRight size={24} /></button>
                     </>
                   )}
                </TiltCard>
             </div>
              <div className="md:w-[380px] p-8 md:p-12 space-y-10 overflow-y-auto bg-black flex flex-col border-t md:border-t-0 md:border-l border-white/10 h-auto md:h-full relative">
                {isSocialMode && (
                  <div className="absolute top-0 right-0 p-4 z-50">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/20 text-blue-400 animate-in fade-in zoom-in duration-300">
                      <Sparkles size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">Verified Collector</span>
                    </div>
                  </div>
                )}
                
                <div className="space-y-8">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedCard.rarityTier || 'Collection Item'}</span>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-black text-white tracking-tighter leading-tight">{selectedCard.playerName}</h3>
                      {selectedCard.isWishlist && <Sparkles size={18} className="text-amber-500 fill-amber-500/20" />}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-10">
                    <Detail label="Team" value={selectedCard.team || 'N/A'} />
                    <Detail label="Set" value={selectedCard.set} />
                    <Detail label="Set #" value={selectedCard.setNumber || 'N/A'} />
                    <Detail label="Parallel #" value={selectedCard.serialNumber || 'N/A'} />
                    <Detail label="Grade" value={selectedCard.condition} />
                    <Detail label="Variant" value={selectedCard.cardSpecifics} />
                  </div>
                </div>

                {!isSocialMode ? (
                  <div className="pt-8 border-t border-white/10 space-y-8 mt-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 rounded-xl glass-subtle space-y-1"><span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Paid</span><p className="text-xl font-black text-white">£{selectedCard.pricePaid}</p></div>
                      <div className="p-5 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-1"><span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Market</span><p className="text-xl font-black text-blue-400">£{selectedCard.marketValue}</p></div>
                    </div>
                    <button onClick={() => { onUpdate(selectedCard); setSelectedCard(null); }} className="btn-primary w-full h-14">Edit Record</button>
                  </div>
                ) : (
                  <div className="pt-8 border-t border-white/10 space-y-6 mt-auto">
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">
                      "Cards are more than just assets—they're pieces of history. Shared from my personal TC-Vault."
                    </p>
                    <button 
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: `Check out my ${selectedCard.playerName}!`,
                            text: `Collector's item: ${selectedCard.playerName} - ${selectedCard.set}`,
                            url: window.location.href
                          }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(selectedCard.images[0]);
                          alert('Image URL copied to clipboard!');
                        }
                      }} 
                      className="btn-primary w-full h-14 flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest"
                    >
                      <Share2 size={18} />
                      <span>Share Piece</span>
                    </button>
                  </div>
                )}
              </div>
          </div>
        </div>
      )}

      {isCreatingPage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6" onClick={() => setIsCreatingPage(false)}>
          <div className="w-full max-w-sm glass rounded-[24px] p-8 space-y-6 animate-in zoom-in-95 duration-[150ms]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h3 className="text-xl font-black text-white">New Binder</h3><button onClick={() => setIsCreatingPage(false)} className="text-slate-500 hover:text-white p-2 min-w-[44px] min-h-[44px] active:scale-90"><X size={20} /></button></div>
            <form onSubmit={handleCreatePage} className="space-y-4">
              <input autoFocus type="text" placeholder="Binder Name..." value={newPageName} onChange={e => setNewPageName(e.target.value)} className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-12 px-4 text-sm font-semibold text-white focus:border-blue-500/40 outline-none transition-all placeholder:text-slate-700" />
              <button type="submit" className="btn-primary w-full h-12 uppercase text-[10px] tracking-widest">Create Binder</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const FilterSelect = ({ value, onChange, options, placeholder }: any) => (
  <div className="relative group">
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`w-full bg-white/[0.03] border rounded-xl h-12 px-4 text-[10px] font-black uppercase tracking-widest appearance-none cursor-pointer outline-none transition-all focus:border-blue-500/40 ${value !== 'all' ? 'border-blue-500/40 text-blue-400' : 'border-white/5 text-slate-600 hover:text-slate-400'}`}>
      <option value="all">{placeholder}</option>
      {options.map((opt: string) => <option key={opt} value={opt} className="bg-slate-900 text-white font-semibold">{opt}</option>)}
    </select>
    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600" />
  </div>
);

const PageTab = ({ label, active, onClick, count, icon }: any) => (
  <div className="flex items-center gap-2 group/tab">
    <button onClick={onClick} className={`px-4 h-11 rounded-full flex items-center gap-2 transition-all whitespace-nowrap border active:scale-[0.97] ${active ? 'bg-white text-black border-white shadow-lg font-black' : 'glass-subtle text-slate-500 border-white/5 hover:text-slate-300 font-semibold'}`}>
      {React.cloneElement(icon, { size: 16 })}<span className="text-[10px] uppercase tracking-widest">{label}</span><span className={`text-[10px] ${active ? 'text-black/50' : 'text-slate-600'}`}>{count}</span>
    </button>
  </div>
);

const Detail = ({ label, value }: any) => (
  <div className="space-y-1"><span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">{label}</span><p className="text-sm font-semibold text-slate-400 leading-relaxed">{value}</p></div>
);

export default Inventory;
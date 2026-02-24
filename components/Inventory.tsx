import React, { useState, useMemo, useEffect } from 'react';
import { Card, BinderPage } from '../types';
import { Search, Trash2, Edit3, X, ChevronDown, Filter as FilterIcon, Plus, BookOpen, Layers, ChevronLeft, ChevronRight, Ghost, Check, RefreshCw, Share2, ExternalLink } from 'lucide-react';
import EmptyState from './EmptyState';

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
  onSelectBinder?: (id: string | 'all') => void;
  animationClass?: string;
  onRefreshPrice?: (card: Card) => void;
  onShareCard?: (card: Card) => void;
}

interface FilterState {
  player: string;
  team: string;
  set: string;
  condition: string;
  rarity: string;
}

const Inventory: React.FC<InventoryProps> = ({ cards, pages, globalSearch = '', onClearSearch, onDelete, onUpdate, onCreatePage, onDeletePage, initialActiveBinderId = 'all', onSelectBinder, animationClass, onRefreshPrice, onShareCard }) => {
  const [filters, setFilters] = useState<FilterState>({ player: '', team: 'all', set: 'all', condition: 'all', rarity: 'all' });
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activePageId, setActivePageId] = useState<string | 'all'>(initialActiveBinderId);
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showBinderSelector, setShowBinderSelector] = useState(false);

  useEffect(() => {
    setActivePageId(initialActiveBinderId);
  }, [initialActiveBinderId]);

  const activeBinder = useMemo(() => 
    activePageId === 'all' ? null : pages.find(p => p.id === activePageId)
  , [pages, activePageId]);

  const uniqueTeams = useMemo(() => Array.from(new Set(cards.map(c => c.team).filter(Boolean))).sort(), [cards]);
  const uniqueSets = useMemo(() => Array.from(new Set(cards.map(c => c.set))).sort(), [cards]);
  const uniqueRarities = useMemo(() => Array.from(new Set(cards.map(c => c.rarityTier).filter(Boolean))).sort(), [cards]);
  const uniqueConditions = useMemo(() => Array.from(new Set(cards.map(c => c.condition))).sort(), [cards]);

  useEffect(() => { setCurrentImageIndex(0); }, [selectedCard]);

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
      return true;
    });
  }, [cards, filters, activePageId, globalSearch]);

  const hasActiveFilters = useMemo(() => filters.player !== '' || filters.team !== 'all' || filters.set !== 'all' || filters.condition !== 'all' || filters.rarity !== 'all' || globalSearch !== '', [filters, globalSearch]);

  const resetAllViewFilters = () => {
    setFilters({ player: '', team: 'all', set: 'all', condition: 'all', rarity: 'all' });
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

  const handleSelectBinder = (id: string | 'all') => {
    setActivePageId(id);
    if (onSelectBinder) onSelectBinder(id);
    setShowBinderSelector(false);
  };

  return (
    <div className={`space-y-12 pb-24 ${animationClass || 'animate-in fade-in duration-300'}`}>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Your Collection</span>
            {activeBinder && (
              <>
                <span className="text-stone-300">/</span>
                <span className="text-[10px] font-black text-[#c9a227] uppercase tracking-widest">Binders</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowBinderSelector(true)}
              className="flex items-center gap-3 group text-left transition-all active:scale-[0.98]"
            >
              <h2 className="text-[32px] font-black tracking-tighter text-[#1a1408] leading-tight group-hover:text-[#c9a227]">
                {activeBinder ? activeBinder.name : 'Your Portfolio'}
              </h2>
              <ChevronDown className={`text-stone-300 group-hover:text-[#c9a227] transition-all ${showBinderSelector ? 'rotate-180' : ''}`} size={24} />
            </button>
            
            {activeBinder && (
              <button 
                onClick={() => onDeletePage(activeBinder.id)} 
                className="p-2 text-stone-300 hover:text-rose-500 transition-colors active:scale-95"
                title="Delete Binder"
              >
                <Trash2 size={20} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsCreatingPage(true)} className="btn-secondary h-12 px-6 uppercase text-[10px] tracking-widest font-black active:scale-[0.97]">
            <Plus size={16} className="mr-2" /> New Binder
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#c9a227] transition-colors" size={16} />
             <input type="text" placeholder="Search current view..." value={filters.player} onChange={(e) => setFilters({...filters, player: e.target.value})} className="w-full bg-black/[0.03] border border-black/6 rounded-xl h-12 pl-11 pr-4 text-sm font-semibold text-[#1a1408] focus:border-[#c9a227]/40 outline-none transition-all placeholder:text-stone-400" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary h-12 px-6 flex items-center gap-2 active:scale-[0.97] ${showFilters ? 'bg-[#c9a227]/10 text-[#c9a227] border-[#c9a227]/20' : ''}`}>
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

      {filteredCards.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {filteredCards.map(card => (
            <div key={card.id} className="group cursor-pointer space-y-4" onClick={() => setSelectedCard(card)}>
              <div className="aspect-square rounded-[16px] overflow-hidden border border-black/6 shadow-lg bg-stone-100 relative flex items-center justify-center p-4 img-loading">
                <img 
                  src={card.images[0]} 
                  onLoad={(e) => (e.currentTarget.parentElement as HTMLElement).classList.remove('img-loading')}
                  className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-[150ms] z-10" 
                  alt={card.playerName} 
                />
                <button 
                  onClick={(e) => { e.stopPropagation(); onUpdate(card); }} 
                  className="absolute top-2 left-2 p-2.5 bg-[#1a1408] text-[#c9a227] rounded-lg shadow-xl z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity active:scale-95"
                  title="Modify Record"
                >
                  <Edit3 size={14} />
                </button>
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm text-[#1a1408] truncate group-hover:text-[#c9a227] transition-colors">{card.playerName}</h4>
                <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest truncate">{card.set} {card.setNumber ? `#${card.setNumber}` : ''}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-stone-500 tabular">£{card.marketValue.toLocaleString()}</span>
                  {card.serialNumber && <span className="text-[9px] font-black text-[#c9a227] px-1.5 py-0.5 glass-subtle rounded border border-[#c9a227]/20">{card.serialNumber}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState 
          icon={<Ghost />} 
          title="No results found" 
          message={globalSearch ? `No matches for "${globalSearch}" in your collection.` : "This collection is currently empty."}
          actionLabel={hasActiveFilters ? "Reset all view" : undefined}
          onAction={resetAllViewFilters}
        />
      )}

      {/* Binder Selector Overlay */}
      {showBinderSelector && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/60 backdrop-blur-xl p-6" onClick={() => setShowBinderSelector(false)}>
          <div className="w-full max-w-sm glass rounded-[32px] overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-black/5 flex items-center justify-between">
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Select Binder</span>
              <button onClick={() => setShowBinderSelector(false)} className="p-2 text-stone-400 active:scale-90"><X size={20} /></button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto no-scrollbar space-y-2">
              <button 
                onClick={() => handleSelectBinder('all')}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${activePageId === 'all' ? 'bg-[#c9a227]/10 text-[#c9a227]' : 'hover:bg-black/5 text-stone-600'}`}
              >
                <div className="flex items-center gap-3">
                  <Layers size={18} />
                  <span className="text-sm font-bold">Main Collection</span>
                </div>
                {activePageId === 'all' && <Check size={16} />}
              </button>
              
              {pages.map(binder => (
                <button 
                  key={binder.id}
                  onClick={() => handleSelectBinder(binder.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${activePageId === binder.id ? 'bg-[#c9a227]/10 text-[#c9a227]' : 'hover:bg-black/5 text-stone-600'}`}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen size={18} />
                    <span className="text-sm font-bold truncate">{binder.name}</span>
                  </div>
                  {activePageId === binder.id && <Check size={16} />}
                </button>
              ))}
            </div>
            <div className="p-6 bg-black/[0.02]">
              <button onClick={() => { setShowBinderSelector(false); setIsCreatingPage(true); }} className="btn-primary w-full h-12 uppercase text-[10px] tracking-widest font-black">
                <Plus size={16} className="mr-2" /> New Binder
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCard && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-stone-900/60 backdrop-blur-xl animate-in fade-in duration-[300ms]" onClick={() => setSelectedCard(null)}>
          <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl glass md:rounded-[24px] overflow-hidden flex flex-col md:flex-row border-black/10 shadow-2xl relative" onClick={e => e.stopPropagation()}>
             <button onClick={() => setSelectedCard(null)} className="absolute top-4 left-4 md:top-8 md:right-8 md:left-auto z-[110] p-3 min-w-[44px] min-h-[44px] flex items-center justify-center glass-subtle rounded-full text-stone-500 hover:bg-black/5 transition-colors active:scale-95 shadow-xl">
               <X size={24} />
             </button>

             <div className="flex-[1.5] md:flex-1 bg-black/5 flex flex-col items-center justify-center relative p-4 md:p-12 min-h-0">
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden img-loading">
                   <img 
                    src={selectedCard.images[currentImageIndex]} 
                    onLoad={(e) => (e.currentTarget.parentElement as HTMLElement).classList.remove('img-loading')}
                    className="w-full h-full object-contain select-none animate-in fade-in zoom-in-95 duration-500 drop-shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-10" 
                    alt={selectedCard.playerName} 
                   />
                   {selectedCard.images.length > 1 && (
                     <>
                        <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === 0 ? selectedCard.images.length - 1 : prev - 1); }} className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/10 text-stone-800 hover:bg-[#c9a227] hover:text-white transition-all ml-2 shadow-xl z-20 active:scale-90"><ChevronLeft size={24} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === selectedCard.images.length - 1 ? 0 : prev + 1); }} className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/10 text-stone-800 hover:bg-[#c9a227] hover:text-white transition-all mr-2 shadow-xl z-20 active:scale-90"><ChevronRight size={24} /></button>
                     </>
                   )}
                </div>
             </div>
             <div className="flex-1 md:w-[380px] p-8 md:p-12 space-y-10 overflow-y-auto bg-white flex flex-col border-t md:border-t-0 md:border-l border-black/10 h-auto md:h-full">
                <div className="space-y-8">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{selectedCard.rarityTier || 'Collection Item'}</span>
                    <h3 className="text-2xl font-black text-[#1a1408] tracking-tighter leading-tight">{selectedCard.playerName}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-10">
                    <Detail label="Team" value={selectedCard.team || 'N/A'} />
                    <Detail label="Set" value={selectedCard.set} />
                    <Detail label="Set #" value={selectedCard.setNumber || 'N/A'} />
                    <Detail label="Parallel #" value={selectedCard.serialNumber || 'N/A'} />
                    <Detail label="Grade" value={selectedCard.condition} />
                    <Detail label="Variant" value={selectedCard.cardSpecifics} />
                    {selectedCard.certNumber && (
                      <div className="col-span-2">
                        <Detail 
                          label="PSA Cert #" 
                          value={
                            <a 
                              href={`https://www.psacard.com/cert/${selectedCard.certNumber}/psa`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[#c9a227] hover:underline flex items-center gap-1"
                            >
                              {selectedCard.certNumber}
                              <ExternalLink size={12} />
                            </a>
                          } 
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="pt-8 border-t border-black/10 space-y-8 mt-auto">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 rounded-xl glass-subtle space-y-1"><span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Paid</span><p className="text-xl font-black text-[#1a1408]">£{selectedCard.pricePaid}</p></div>
                      <div className="p-5 rounded-xl bg-[#c9a227]/5 border border-[#c9a227]/10 space-y-1 relative group text-center">
                        <span className="text-[10px] font-black text-[#c9a227] uppercase tracking-widest">Market</span>
                        <div className="flex items-center justify-center gap-2">
                          <p className="text-xl font-black text-[#c9a227]">£{selectedCard.marketValue}</p>
                          {onRefreshPrice && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); onRefreshPrice(selectedCard); }}
                              className="p-2 text-[#c9a227] hover:bg-[#c9a227]/10 rounded-lg transition-all active:scale-90"
                              title="Refresh Market Price"
                            >
                              <RefreshCw size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                   </div>
                    <div className="flex gap-3">
                      <button onClick={() => { onUpdate(selectedCard); setSelectedCard(null); }} className="btn-primary flex-1 h-14 uppercase text-[10px] tracking-widest font-black">Edit Record</button>
                      {onShareCard && (
                        <button 
                          onClick={() => { onShareCard(selectedCard); setSelectedCard(null); }} 
                          className="w-14 h-14 flex items-center justify-center rounded-xl border border-[#c9a227]/20 text-[#c9a227] hover:bg-[#c9a227]/5 transition-all active:scale-95 shadow-sm" 
                          title="Share to Feed"
                        >
                          <Share2 size={20} />
                        </button>
                      )}
                      <button onClick={() => { onDelete(selectedCard.id); setSelectedCard(null); }} className="w-14 h-14 flex items-center justify-center rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-50 transition-all active:scale-95 shadow-sm" title="Delete Asset"><Trash2 size={20} /></button>
                    </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {isCreatingPage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/40 backdrop-blur-xl p-6" onClick={() => setIsCreatingPage(false)}>
          <div className="w-full max-w-sm glass rounded-[24px] p-8 space-y-6 animate-in zoom-in-95 duration-[150ms]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h3 className="text-xl font-black text-[#1a1408]">New Binder</h3><button onClick={() => setIsCreatingPage(false)} className="text-stone-400 hover:text-[#1a1408] p-2 min-w-[44px] min-h-[44px] active:scale-90"><X size={20} /></button></div>
            <form onSubmit={handleCreatePage} className="space-y-4">
              <input autoFocus type="text" placeholder="Binder Name..." value={newPageName} onChange={e => setNewPageName(e.target.value)} className="w-full bg-black/[0.03] border border-black/6 rounded-xl h-12 px-4 text-sm font-semibold text-[#1a1408] focus:border-[#c9a227]/40 outline-none transition-all placeholder:text-stone-300" />
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
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      style={{ colorScheme: 'light' }}
      className={`w-full bg-black/[0.03] border rounded-xl h-12 px-4 text-[10px] font-black uppercase tracking-widest appearance-none cursor-pointer outline-none transition-all focus:border-[#c9a227]/40 ${value !== 'all' ? 'border-[#c9a227]/40 text-[#c9a227]' : 'border-black/6 text-stone-400 hover:text-stone-600'}`}
    >
      <option value="all">{placeholder}</option>
      {options.map((opt: string) => <option key={opt} value={opt} className="bg-white text-stone-800 font-semibold">{opt}</option>)}
    </select>
    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400" />
  </div>
);

const Detail = ({ label, value }: any) => (
  <div className="space-y-1"><span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">{label}</span><p className="text-sm font-semibold text-stone-600 leading-relaxed">{value}</p></div>
);

export default Inventory;
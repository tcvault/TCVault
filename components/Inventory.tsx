import React, { useState, useMemo, useEffect } from 'react';
import { Card, BinderPage, SortField, SortOrder } from '../types';
import { Search, Trash2, Edit3, X, ChevronDown, Filter as FilterIcon, Plus, BookOpen, Layers, ChevronLeft, ChevronRight, Ghost, Check, RefreshCw, Share2, ExternalLink, Instagram, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toPng } from 'html-to-image';
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
  const [sortBy, setSortBy] = useState<SortField>('purchaseDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isExporting, setIsExporting] = useState(false);
  const shareRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActivePageId(initialActiveBinderId);
  }, [initialActiveBinderId]);

  const activeBinder = useMemo(() => 
    activePageId === 'all' ? null : pages.find(p => p.id === activePageId)
  , [pages, activePageId]);

  const uniqueTeams = useMemo(() => Array.from(new Set(cards.map(c => c.team).filter((t): t is string => !!t))).sort(), [cards]);
  const uniqueSets = useMemo(() => {
    const seen = new Map<string, string>(); // key -> display label
    for (const c of cards) {
      const key = c.setCanonicalKey || c.set;
      if (key && !seen.has(key)) seen.set(key, c.set);
    }
    return Array.from(seen.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [cards]);
  const uniqueRarities = useMemo(() => Array.from(new Set(cards.map(c => c.rarityTier).filter(Boolean))).sort() as string[], [cards]);
  const uniqueConditions = useMemo(() => Array.from(new Set(cards.map(c => c.condition).filter((c): c is string => !!c))).sort(), [cards]);

  useEffect(() => { setCurrentImageIndex(0); }, [selectedCard]);

  const processedCards = useMemo(() => {
    const filtered = cards.filter(card => {
      if (activePageId !== 'all' && card.pageId !== activePageId) return false;
      if (globalSearch) {
        const term = globalSearch.toLowerCase();
        const matches = card.playerName.toLowerCase().includes(term) || (card.team && card.team.toLowerCase().includes(term)) || card.set.toLowerCase().includes(term) || card.cardSpecifics.toLowerCase().includes(term);
        if (!matches) return false;
      }
      if (filters.player && !card.playerName.toLowerCase().includes(filters.player.toLowerCase())) return false;
      if (filters.team !== 'all' && card.team !== filters.team) return false;
      if (filters.set !== 'all' && (card.setCanonicalKey || card.set) !== filters.set) return false;
      if (filters.condition !== 'all' && card.condition !== filters.condition) return false;
      if (filters.rarity !== 'all' && card.rarityTier !== filters.rarity) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'playerName') {
        comparison = a.playerName.localeCompare(b.playerName);
      } else if (sortBy === 'purchaseDate') {
        comparison = (a.purchaseDate || '').localeCompare(b.purchaseDate || '');
      } else if (sortBy === 'marketValue') {
        comparison = a.marketValue - b.marketValue;
      } else if (sortBy === 'pricePaid') {
        comparison = a.pricePaid - b.pricePaid;
      } else if (sortBy === 'setNumber') {
        comparison = (a.setNumber || '').localeCompare(b.setNumber || '', undefined, { numeric: true });
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [cards, filters, activePageId, globalSearch, sortBy, sortOrder]);

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

  const handleShareToSocials = async () => {
    if (!selectedCard || !shareRef.current) return;
    
    const el = shareRef.current;
    const originalStyle = el.style.cssText;
    
    try {
      setIsExporting(true);
      
      // Fix 1: Move outside viewport constraints to force 1080x1350 layout
      el.style.position = 'fixed';
      el.style.top = '0';
      el.style.left = '0';
      el.style.width = '1080px';
      el.style.height = '1350px';
      el.style.zIndex = '-9999';
      
      // Fix 2: Increase delay to 800ms for full rendering
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Fix 3: Capture at native size with pixelRatio: 1
      const dataUrl = await toPng(el, {
        backgroundColor: '#faf8f4',
        cacheBust: true,
        pixelRatio: 1,
        filter: (node: Node) => {
          // Skip remote stylesheets that cause CORS 'cssRules' access errors
          if (node instanceof HTMLLinkElement && node.rel === 'stylesheet' && !node.href?.startsWith(window.location.origin)) {
            return false;
          }
          return true;
        },
        style: {
          borderRadius: '0'
        }
      });
      
      const link = document.createElement('a');
      link.download = `${selectedCard.playerName.replace(/\s+/g, '_')}_TCVault.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to capture image', err);
    } finally {
      // Revert styles and state
      el.style.cssText = originalStyle;
      setIsExporting(false);
    }
  };

  return (
    <div className={`space-y-major pb-24 ${animationClass || 'animate-in fade-in duration-300'}`}>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-section">
        <div className="space-y-control">
          <div className="flex items-center gap-control">
            <span className="text-micro font-semibold text-ink-tertiary uppercase tracking-widest">Your Collection</span>
            {activeBinder && (
              <>
                <span className="text-ink-tertiary">/</span>
                <span className="text-micro font-semibold text-gold-500 uppercase tracking-widest">Binders</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-padding">
            <button 
              onClick={() => setShowBinderSelector(true)}
              className="flex items-center gap-control group text-left transition-all active:scale-[0.98]"
            >
              <h1 className="group-hover:text-gold-500 transition-colors">
                {activeBinder ? activeBinder.name : 'Your Portfolio'}
              </h1>
              <ChevronDown className={`text-ink-secondary/20 group-hover:text-gold-500 transition-all ${showBinderSelector ? 'rotate-180' : ''}`} size={24} />
            </button>
            
            {activeBinder && (
              <button 
                onClick={() => onDeletePage(activeBinder.id)} 
                className="p-2 text-ink-secondary/20 hover:text-rose-500 transition-colors active:scale-95"
                title="Delete Binder"
              >
                <Trash2 size={20} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-control">
          <button onClick={() => setIsCreatingPage(true)} className="btn-secondary h-12 px-6 text-xs tracking-widest font-bold active:scale-[0.97]">
            <Plus size={16} className="mr-2" /> New Binder
          </button>
        </div>
      </div>

      <div className="space-y-control">
        <div className="flex items-center justify-between gap-control">
          <div className="relative flex-1 group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-tertiary group-focus-within:text-gold-500 transition-colors" size={16} />
             <input type="text" placeholder="Search current view..." value={filters.player} onChange={(e) => setFilters({...filters, player: e.target.value})} className="w-full bg-surface-elevated border border-border-soft rounded-xl h-12 pl-11 pr-4 text-sm font-semibold text-ink-primary focus:border-gold-500/40 outline-none transition-all placeholder:text-ink-tertiary" />
          </div>
          <div className="flex items-center gap-control">
            <div className="relative group">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as SortField)}
                className="appearance-none bg-surface-elevated border border-border-soft rounded-xl h-12 pl-10 pr-10 text-xs font-bold uppercase tracking-widest text-ink-tertiary hover:text-ink-secondary focus:border-gold-500/40 outline-none transition-all cursor-pointer"
              >
                <option value="purchaseDate">Date</option>
                <option value="marketValue">Value</option>
                <option value="pricePaid">Cost</option>
                <option value="playerName">Name</option>
                <option value="setNumber">Set No.</option>
              </select>
              <ArrowUpDown size={14} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-ink-tertiary" />
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-ink-tertiary" />
            </div>
            <button 
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="btn-secondary h-12 w-12 flex items-center justify-center active:scale-[0.97]"
              title={sortOrder === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
            >
              {sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
            </button>
            <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary h-12 px-6 flex items-center gap-control active:scale-[0.97] ${showFilters ? 'bg-gold-500/10 text-gold-500 border-gold-500/20' : ''}`}>
              <FilterIcon size={16} /><span className="hidden md:inline text-xs tracking-widest font-bold">Refine</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-control animate-in slide-in-from-top-2 duration-300">
            <FilterSelect value={filters.team} onChange={(v: string) => setFilters({...filters, team: v})} options={uniqueTeams} placeholder="Team" />
            <div className="relative group">
              <select
                value={filters.set}
                onChange={(e) => setFilters({...filters, set: e.target.value})}
                style={{ colorScheme: 'light' }}
                className={`w-full bg-surface-elevated border rounded-xl h-12 px-4 text-xs font-bold uppercase tracking-widest appearance-none cursor-pointer outline-none transition-all focus:border-gold-500/40 ${filters.set !== 'all' ? 'border-gold-500/40 text-gold-500' : 'border-border-soft text-ink-tertiary hover:text-ink-secondary'}`}
              >
                <option value="all">Set</option>
                {uniqueSets.map(({ key, label }) => (
                  <option key={key} value={key} className="bg-surface-base text-ink-primary font-semibold">{label}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-ink-tertiary" />
            </div>
            <FilterSelect value={filters.condition} onChange={(v: string) => setFilters({...filters, condition: v})} options={uniqueConditions} placeholder="Grade" />
            <FilterSelect value={filters.rarity} onChange={(v: string) => setFilters({...filters, rarity: v})} options={uniqueRarities} placeholder="Rarity" />
            {hasActiveFilters && <button onClick={resetAllViewFilters} className="col-span-full text-center text-xs font-bold text-error uppercase tracking-widest hover:text-error/80 transition-colors py-control active:scale-95">Reset Filters</button>}
          </div>
        )}
      </div>

      {processedCards.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-section">
          {processedCards.map(card => (
            <div key={card.id} className="group cursor-pointer space-y-control" onClick={() => setSelectedCard(card)}>
              <div className="aspect-[3/4] rounded-xl overflow-hidden border border-border-soft shadow-sm bg-surface-elevated relative flex items-center justify-center p-padding img-loading">
                <img 
                  src={card.images[0]} 
                  loading="lazy"
                  onLoad={(e) => (e.currentTarget.parentElement as HTMLElement).classList.remove('img-loading')}
                  className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-[150ms] z-10" 
                  alt={card.playerName} 
                />
                <button 
                  onClick={(e) => { e.stopPropagation(); onUpdate(card); }} 
                  className="absolute top-control left-control p-2 bg-ink-primary text-gold-500 rounded-lg shadow-xl z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity active:scale-95"
                  title="Edit Card"
                >
                  <Edit3 size={14} />
                </button>
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-sm text-ink-primary truncate group-hover:text-gold-500 transition-colors">{card.playerName}</h4>
                <p className="text-xs text-ink-secondary/60 font-semibold uppercase tracking-widest truncate">{card.set} {card.setNumber ? `#${card.setNumber}` : ''}</p>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-sm font-bold text-ink-secondary/80 tabular">£{card.marketValue.toLocaleString()}</span>
                  {card.serialNumber && <span className="text-xs font-bold text-gold-500 px-1.5 py-0.5 bg-gold-500/5 rounded border border-gold-500/10">{card.serialNumber}</span>}
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-primary/40 backdrop-blur-md p-padding" onClick={() => setShowBinderSelector(false)}>
          <div className="w-full max-w-sm card-vault overflow-hidden animate-in zoom-in-95 duration-200 p-0" onClick={e => e.stopPropagation()}>
            <div className="p-padding border-b border-border-soft flex items-center justify-between">
              <span className="text-xs font-bold text-ink-tertiary uppercase tracking-widest">Select Binder</span>
              <button onClick={() => setShowBinderSelector(false)} className="p-2 text-ink-tertiary active:scale-90"><X size={20} /></button>
            </div>
            <div className="p-control max-h-[60vh] overflow-y-auto no-scrollbar space-y-control">
              <button 
                onClick={() => handleSelectBinder('all')}
                className={`w-full flex items-center justify-between p-padding rounded-xl transition-all ${activePageId === 'all' ? 'bg-gold-500/10 text-gold-500' : 'hover:bg-surface-base text-ink-secondary/80'}`}
              >
                <div className="flex items-center gap-control">
                  <Layers size={18} />
                  <span className="text-sm font-bold">All Cards</span>
                </div>
                {activePageId === 'all' && <Check size={16} />}
              </button>
              
              {pages.map(binder => (
                <button 
                  key={binder.id}
                  onClick={() => handleSelectBinder(binder.id)}
                  className={`w-full flex items-center justify-between p-padding rounded-xl transition-all ${activePageId === binder.id ? 'bg-gold-500/10 text-gold-500' : 'hover:bg-surface-base text-ink-secondary/80'}`}
                >
                  <div className="flex items-center gap-control">
                    <BookOpen size={18} />
                    <span className="text-sm font-bold truncate">{binder.name}</span>
                  </div>
                  {activePageId === binder.id && <Check size={16} />}
                </button>
              ))}
            </div>
            <div className="p-padding bg-surface-base border-t border-border-soft">
              <button onClick={() => { setShowBinderSelector(false); setIsCreatingPage(true); }} className="btn-primary w-full h-12 text-xs tracking-widest font-bold">
                <Plus size={16} className="mr-2" /> New Binder
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCard && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-ink-primary/40 backdrop-blur-md animate-in fade-in duration-[300ms]" onClick={() => setSelectedCard(null)}>
          <div ref={shareRef} className={`w-full ${isExporting ? 'w-[1080px] h-[1350px] flex flex-col bg-surface-base' : 'h-full md:h-auto md:max-h-[90vh] md:max-w-4xl flex flex-col md:flex-row card-vault md:rounded-xl p-0'} overflow-hidden border-border-soft shadow-2xl relative`} onClick={e => e.stopPropagation()}>
             {isExporting && (
               <div className="absolute top-12 left-12 flex items-center gap-3 z-50">
                 <div className="w-10 h-10 bg-gold-500 rounded-lg flex items-center justify-center shadow-lg">
                   <img src="https://oewvucbsbcxxwtnflbfw.supabase.co/storage/v1/object/public/assets/TCVaultIcon.png" className="w-6 h-6 invert brightness-0" alt="" />
                 </div>
                 <span className="text-xl font-bold tracking-tighter text-ink-primary">TC <span className="text-gold-500">Vault</span></span>
               </div>
             )}
             {!isExporting && (
               <button onClick={() => setSelectedCard(null)} className="absolute top-4 left-4 md:top-8 md:right-8 md:left-auto z-[110] p-3 min-w-[44px] min-h-[44px] flex items-center justify-center bg-surface-elevated border border-border-soft rounded-full text-ink-tertiary hover:bg-surface-base transition-colors active:scale-95 shadow-xl">
                 <X size={24} />
               </button>
             )}

             <div className={`${isExporting ? 'h-[720px] w-full p-16' : 'flex-[1.4] md:flex-1 p-padding md:p-major'} bg-surface-base flex flex-col items-center justify-center relative min-h-0`}>
                {isExporting && selectedCard.images.length > 1 ? (
                  <div className="grid grid-cols-2 gap-16 w-full max-w-[960px]">
                    {selectedCard.images.map((img, idx) => (
                      <div key={idx} className="relative aspect-[3/4] flex items-center justify-center">
                        <img 
                          src={img} 
                          className="w-full h-full object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,0.2)]" 
                          alt={`${selectedCard.playerName} - ${idx + 1}`} 
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden img-loading">
                     <img 
                      src={selectedCard.images[currentImageIndex]} 
                      onLoad={(e) => (e.currentTarget.parentElement as HTMLElement).classList.remove('img-loading')}
                      className={`w-full h-full object-contain select-none animate-in fade-in zoom-in-95 duration-500 drop-shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-10 ${isExporting ? 'max-h-[620px]' : ''}`} 
                      alt={selectedCard.playerName} 
                     />
                     {!isExporting && selectedCard.images.length > 1 && (
                       <>
                          <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === 0 ? selectedCard.images.length - 1 : prev - 1); }} className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-ink-primary/5 text-ink-primary hover:bg-gold-500 hover:text-white transition-all ml-2 shadow-xl z-20 active:scale-90"><ChevronLeft size={24} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === selectedCard.images.length - 1 ? 0 : prev + 1); }} className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-ink-primary/5 text-ink-primary hover:bg-gold-500 hover:text-white transition-all mr-2 shadow-xl z-20 active:scale-90"><ChevronRight size={24} /></button>
                       </>
                     )}
                  </div>
                )}
             </div>
             <div className={`${isExporting ? 'h-[630px] w-full p-16' : 'flex-1 md:w-[380px] p-padding md:p-section'} space-y-major ${isExporting ? '' : 'overflow-y-auto'} bg-surface-elevated flex flex-col border-t ${isExporting ? 'border-t' : 'md:border-t-0 md:border-l'} border-border-soft h-auto ${isExporting ? '' : 'md:h-full'}`}>
                <div className={`${isExporting ? 'space-y-10' : 'space-y-section'}`}>
                  <div className="space-y-control">
                    <span className={`${isExporting ? 'text-lg' : 'text-xs'} font-bold text-ink-tertiary uppercase tracking-widest`}>{selectedCard.rarityTier || 'Card Details'}</span>
                    <h3 className={`${isExporting ? 'text-7xl' : 'text-2xl'} font-bold text-ink-primary tracking-tighter leading-tight`}>{selectedCard.playerName}</h3>
                  </div>
                  <div className={`grid grid-cols-2 ${isExporting ? 'gap-x-20 gap-y-12' : 'gap-x-padding gap-y-section'}`}>
                    <Detail label="Team" value={selectedCard.team || 'N/A'} isExporting={isExporting} />
                    <Detail label="Set" value={selectedCard.set} isExporting={isExporting} />
                    <Detail label="Set #" value={selectedCard.setNumber || 'N/A'} isExporting={isExporting} />
                    <Detail label="Parallel #" value={selectedCard.serialNumber || 'N/A'} isExporting={isExporting} />
                    <Detail label="Grade" value={selectedCard.condition} isExporting={isExporting} />
                    <Detail label="Variant" value={selectedCard.cardSpecifics} isExporting={isExporting} />
                    {selectedCard.certNumber && (
                      <div className="col-span-2">
                        <Detail 
                          label="PSA Cert #" 
                          value={
                            <a 
                              href={`https://www.psacard.com/cert/${selectedCard.certNumber}/psa`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-gold-500 hover:underline flex items-center gap-control w-fit relative z-[110]"
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
                <div className={`pt-section border-t border-border-soft space-y-section mt-auto ${isExporting ? 'pb-8' : ''}`}>
                   {!isExporting && (
                     <div className="grid grid-cols-2 gap-control">
                        <div className="p-padding rounded-xl bg-surface-base border border-border-soft space-y-control"><span className="text-xs font-bold text-ink-tertiary uppercase tracking-widest">Paid</span><p className="text-xl font-bold text-ink-primary">£{selectedCard.pricePaid}</p></div>
                        <div className="p-padding rounded-xl bg-gold-500/5 border border-gold-500/10 space-y-control relative group text-center">
                          <span className="text-xs font-bold text-gold-500 uppercase tracking-widest">Market</span>
                          <div className="flex items-center justify-center gap-control">
                            <div className="space-y-0.5">
                              <p className="text-xl font-bold text-gold-500">£{selectedCard.marketValue}</p>
                              {selectedCard.marketMeta && (
                                <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-tight">
                                  £{selectedCard.marketMeta.low}–£{selectedCard.marketMeta.high} · {selectedCard.marketMeta.confidence}
                                </p>
                              )}
                            </div>
                            {onRefreshPrice && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); onRefreshPrice(selectedCard); }}
                                className="p-2 text-gold-500 hover:bg-gold-500/10 rounded-lg transition-all active:scale-90"
                                title="Refresh Market Price"
                              >
                                <RefreshCw size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                     </div>
                   )}
                    {!isExporting && (
                      <div className="flex gap-control">
                        <button onClick={() => { onUpdate(selectedCard); setSelectedCard(null); }} className="btn-primary flex-1 h-14 text-xs tracking-widest font-bold">Edit Card</button>
                        {onShareCard && (
                          <button 
                            onClick={() => { onShareCard(selectedCard); setSelectedCard(null); }} 
                            className="w-14 h-14 flex items-center justify-center rounded-xl border border-border-soft text-gold-500 hover:bg-gold-500/5 transition-all active:scale-95 shadow-sm" 
                            title="Share to Feed"
                          >
                            <Share2 size={20} />
                          </button>
                        )}
                        <button 
                          onClick={handleShareToSocials}
                          className="w-14 h-14 flex items-center justify-center rounded-xl border border-border-soft text-gold-500 hover:bg-gold-500/5 transition-all active:scale-95 shadow-sm" 
                          title="Share to Socials"
                        >
                          <Instagram size={20} />
                        </button>
                        <button onClick={() => { onDelete(selectedCard.id); setSelectedCard(null); }} className="w-14 h-14 flex items-center justify-center rounded-xl border border-error/20 text-error hover:bg-error/10 transition-all active:scale-95 shadow-sm" title="Delete Card"><Trash2 size={20} /></button>
                      </div>
                    )}
                </div>
             </div>
          </div>
        </div>
      )}

      {isCreatingPage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-primary/40 backdrop-blur-md p-padding" onClick={() => setIsCreatingPage(false)}>
          <div className="w-full max-w-sm card-vault p-major space-y-section animate-in zoom-in-95 duration-[150ms]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h3>New Binder</h3><button onClick={() => setIsCreatingPage(false)} className="text-ink-tertiary hover:text-ink-primary p-2 min-w-[44px] min-h-[44px] active:scale-90"><X size={20} /></button></div>
            <form onSubmit={handleCreatePage} className="space-y-padding">
              <input autoFocus type="text" placeholder="Binder Name..." value={newPageName} onChange={e => setNewPageName(e.target.value)} className="w-full bg-surface-base border border-border-soft rounded-xl h-12 px-padding text-sm font-semibold text-ink-primary focus:border-gold-500/40 outline-none transition-all placeholder:text-ink-tertiary" />
              <button type="submit" className="btn-primary w-full h-12 text-xs tracking-widest font-bold">Create Binder</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface FilterSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}

const FilterSelect = ({ value, onChange, options, placeholder }: FilterSelectProps) => (
  <div className="relative group">
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      style={{ colorScheme: 'light' }}
      className={`w-full bg-surface-elevated border rounded-xl h-12 px-4 text-xs font-bold uppercase tracking-widest appearance-none cursor-pointer outline-none transition-all focus:border-gold-500/40 ${value !== 'all' ? 'border-gold-500/40 text-gold-500' : 'border-border-soft text-ink-tertiary hover:text-ink-secondary'}`}
    >
      <option value="all">{placeholder}</option>
      {options.map((opt: string) => <option key={opt} value={opt} className="bg-surface-base text-ink-primary font-semibold">{opt}</option>)}
    </select>
    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-ink-tertiary" />
  </div>
);

interface DetailProps {
  label: string;
  value: React.ReactNode;
  isExporting?: boolean;
}

const Detail = ({ label, value, isExporting }: DetailProps) => (
  <div className="space-y-control">
    <span className={`${isExporting ? 'text-sm' : 'text-xs'} font-bold text-ink-tertiary uppercase tracking-widest block`}>{label}</span>
    <div className={`${isExporting ? 'text-2xl' : 'text-sm'} font-semibold text-ink-secondary/80 leading-tight`}>{value}</div>
  </div>
);

export default Inventory;
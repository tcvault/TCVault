import React, { useState, useEffect, useMemo } from 'react';
import { ViewMode, Card, User } from '../types';
import { Search, TrendingUp, Users, ChevronRight, Globe, User as UserIcon, Loader2, X, ChevronLeft, ChevronRight as ChevronRightIcon, ArrowLeft, Grid, Filter } from 'lucide-react';
import { vaultStorage } from '../services/storage';

interface ExploreProps {
  user: User | null;
  onNavigate: (view: ViewMode) => void;
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  animationClass?: string;
}

type ExploreMode = 'Discovery' | 'SearchResults' | 'CollectorVault';

const Explore: React.FC<ExploreProps> = ({ user, onNavigate, onToast, animationClass }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [publicCards, setPublicCards] = useState<Card[]>([]);
  const [trendingTags, setTrendingTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Navigation State
  const [mode, setMode] = useState<ExploreMode>('Discovery');
  const [selectedCollector, setSelectedCollector] = useState<{ id: string; username: string; avatar?: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cards, posts] = await Promise.all([
          vaultStorage.getPublicCards(),
          vaultStorage.getPosts()
        ]);
        
        setPublicCards(cards);

        // Extract hashtags from posts to build dynamic trending topics
        const tagMap: Record<string, number> = {};
        posts.forEach(post => {
          const hashtags = post.content.match(/#\w+/g);
          if (hashtags) {
            hashtags.forEach(tag => {
              tagMap[tag] = (tagMap[tag] || 0) + 1;
            });
          }
        });

        // Fallback tags
        const defaultTags = ['#PremierLeague', '#RookieCards', '#OnCardAutos', '#WorldCup2026', '#PalacePC'];
        const sortedTags = Object.entries(tagMap)
          .sort((a, b) => b[1] - a[1])
          .map(([tag]) => tag)
          .slice(0, 5);
        
        setTrendingTags(sortedTags.length > 0 ? sortedTags : defaultTags);
      } catch (e) {
        console.error("Failed to fetch explore data:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter logic
  const filteredCards = useMemo(() => {
    let base = publicCards;
    
    // If in collector mode, filter by their ID first
    if (mode === 'CollectorVault' && selectedCollector) {
      base = base.filter(c => c.ownerId === selectedCollector.id);
    }

    if (!searchTerm.trim()) return base;
    
    const term = searchTerm.toLowerCase();
    return base.filter(c => 
      c.playerName.toLowerCase().includes(term) ||
      (c.team && c.team.toLowerCase().includes(term)) ||
      c.set.toLowerCase().includes(term) ||
      (c.cardSpecifics && c.cardSpecifics.toLowerCase().includes(term)) ||
      (c.ownerUsername && c.ownerUsername.toLowerCase().includes(term))
    );
  }, [publicCards, searchTerm, mode, selectedCollector]);

  // Derive unique collectors from public cards
  const activeCollectors = useMemo(() => {
    const collectorsMap = new Map<string, { id: string; username: string; avatar?: string }>();
    publicCards.forEach(c => {
      if (c.ownerId && c.ownerUsername) {
        collectorsMap.set(c.ownerId, { id: c.ownerId, username: c.ownerUsername, ...(c.ownerAvatar !== undefined ? { avatar: c.ownerAvatar } : {}) });
      }
    });
    return Array.from(collectorsMap.values()).slice(0, 8);
  }, [publicCards]);

  const handleTagClick = (tag: string) => {
    setSearchTerm(tag);
    setMode('SearchResults');
    if (onToast) onToast(`Archive filtered for ${tag}`, 'info');
  };

  const handleCollectorClick = (collector: { id: string; username: string; avatar?: string }) => {
    setSelectedCollector(collector);
    setMode('CollectorVault');
    setSearchTerm(''); 
    if (onToast) onToast(`Accessing @${collector.username}'s public vault`, 'success');
  };

  const resetMode = () => {
    setMode('Discovery');
    setSearchTerm('');
    setSelectedCollector(null);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (searchTerm.trim()) {
        setMode('SearchResults');
        if (onToast) onToast(`Searching Archive: "${searchTerm}"`, 'info');
      }
    }
  };

  // Sync mode with search term changes for better "Discovery" feel
  useEffect(() => {
    if (searchTerm.trim() && mode === 'Discovery') {
      setMode('SearchResults');
    } else if (!searchTerm.trim() && mode === 'SearchResults' && !selectedCollector) {
      setMode('Discovery');
    }
  }, [searchTerm, mode, selectedCollector]);

  return (
    <div className={`space-y-major pb-32 ${animationClass || 'animate-in fade-in duration-300'}`}>
      {/* Header with dynamic breadcrumbs/back navigation */}
      <div className="flex items-center justify-between">
        <div className="space-y-control">
          <div className="flex items-center gap-control">
             {mode !== 'Discovery' && (
               <button 
                onClick={resetMode}
                className="p-1.5 -ml-2 text-ink-tertiary hover:text-gold-500 transition-colors active:scale-90"
               >
                 <ArrowLeft size={20} />
               </button>
             )}
             <span className="text-micro font-semibold text-ink-tertiary uppercase tracking-widest">Global Archive</span>
             {mode === 'CollectorVault' && (
               <>
                 <span className="text-ink-tertiary/40">/</span>
                 <span className="text-micro font-bold text-gold-500 uppercase tracking-widest">@{selectedCollector?.username}</span>
               </>
             )}
          </div>
          <h1>
            {mode === 'Discovery' ? 'Discovery' : mode === 'SearchResults' ? 'Search Results' : `${selectedCollector?.username}'s Vault`}
          </h1>
        </div>
        
        {mode !== 'Discovery' && (
          <button onClick={resetMode} className="btn-secondary px-4 text-xs font-bold uppercase tracking-widest">
            Clear Search
          </button>
        )}
      </div>

      {/* Global Search Interface */}
      <div className="relative group max-w-2xl">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-ink-tertiary group-focus-within:text-gold-500 transition-colors" size={24} />
        <input 
          type="text" 
          placeholder={mode === 'CollectorVault' ? `Search within @${selectedCollector?.username}'s vault...` : "Search collectors, players, or clubs..."} 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchKeyPress}
          className="w-full h-16 bg-surface-base border border-border-soft rounded-2xl pl-16 pr-12 text-lg font-semibold focus:border-gold-500/30 outline-none transition-all placeholder:text-ink-tertiary text-ink-primary shadow-xl"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-primary transition-colors p-2"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-section">
        <div className="lg:col-span-8 space-y-major">
          
          {/* Main Discovery View */}
          {mode === 'Discovery' && (
            <div className="space-y-major">
              <div className="space-y-padding">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-control">
                    <Users size={20} className="text-gold-500" />
                    <h3 className="text-micro font-bold text-ink-tertiary uppercase tracking-widest">Active Collectors</h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-control">
                  {isLoading ? (
                    <div className="col-span-full py-8 flex justify-center"><Loader2 className="animate-spin text-ink-tertiary/20" /></div>
                  ) : (
                    activeCollectors.map((collector) => (
                      <div 
                        key={collector.id} 
                        onClick={() => handleCollectorClick(collector)}
                        className="card-vault p-padding flex items-center gap-padding hover:border-gold-500/20 transition-all cursor-pointer group active:scale-[0.98] shadow-sm"
                      >
                        <div className="w-12 h-12 rounded-full bg-surface-base border border-border-soft flex items-center justify-center text-ink-tertiary overflow-hidden">
                          {collector.avatar ? <img src={collector.avatar} className="w-full h-full object-cover" /> : <UserIcon size={20} />}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-ink-primary group-hover:text-gold-500 transition-colors">@{collector.username}</h4>
                          <p className="text-xs text-ink-tertiary font-semibold uppercase tracking-widest">Collector</p>
                        </div>
                        <ChevronRight size={16} className="text-ink-tertiary/40 group-hover:text-ink-primary transition-colors" />
                      </div>
                    ))
                  )}
                  {activeCollectors.length === 0 && !isLoading && (
                    <p className="text-xs font-bold text-ink-tertiary uppercase py-8 text-center col-span-full">No contributors discovered yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Cards Archive Section (Public Grails / Search Results / Collector Cards) */}
          <div className="space-y-padding">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-control">
                <Globe size={20} className="text-emerald-600" />
                <h3 className="text-micro font-bold text-ink-tertiary uppercase tracking-widest">
                  {mode === 'SearchResults' ? `${filteredCards.length} Search Results` : mode === 'CollectorVault' ? 'Collector Assets' : 'Public Grails'}
                </h3>
              </div>
              {mode !== 'Discovery' && (
                <div className="flex items-center gap-control">
                   <Grid size={16} className="text-gold-500" />
                   <span className="text-xs font-bold uppercase text-gold-500">{filteredCards.length} Cards</span>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-padding">
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-[3/4] bg-surface-elevated border border-border-soft rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-padding">
                {filteredCards.map(card => (
                  <div 
                    key={card.id} 
                    className="aspect-[3/4] card-vault p-control space-y-control group cursor-pointer hover:border-gold-500/30 transition-all relative overflow-hidden shadow-sm" 
                    onClick={() => {
                      setSelectedCard(card);
                      setCurrentImageIndex(0);
                    }}
                  >
                    <div className="w-full h-full bg-surface-base rounded-lg overflow-hidden relative img-loading shadow-inner">
                      <img 
                        src={card.images[0]} 
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" 
                        onLoad={(e) => (e.currentTarget.parentElement as HTMLElement).classList.remove('img-loading')} 
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-primary/90 via-ink-primary/40 to-transparent p-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                        <p className="text-xs font-bold text-gold-500 uppercase tracking-widest leading-none mb-1">{card.playerName}</p>
                        <p className="text-xs font-semibold text-ink-on-dark/60 uppercase tracking-widest truncate">@{card.ownerUsername}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredCards.length === 0 && (
                  <div className="col-span-full py-20 bg-surface-elevated rounded-3xl border-dashed border-border-soft flex flex-col items-center justify-center gap-padding text-center">
                    <div className="p-6 bg-surface-base rounded-full text-ink-tertiary/20">
                       <Search size={32} />
                    </div>
                    <div className="space-y-control">
                       <p className="text-sm font-bold text-ink-primary uppercase tracking-tighter">No cards found</p>
                       <p className="text-xs font-semibold text-ink-tertiary max-w-xs">No cards matching your search.</p>
                    </div>
                    <button onClick={resetMode} className="btn-secondary h-10 px-6 uppercase text-xs font-bold tracking-widest">Clear Search</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-section">
          <div className="card-vault p-padding space-y-padding sticky top-8 shadow-xl">
            <div className="space-y-padding">
              <div className="flex items-center gap-control">
                <TrendingUp size={20} className="text-gold-500" />
                <h3 className="text-micro font-bold text-ink-tertiary uppercase tracking-widest">Trending Topics</h3>
              </div>
              <div className="flex flex-wrap gap-control">
                {trendingTags.map(tag => (
                  <button 
                    key={tag} 
                    onClick={() => handleTagClick(tag)}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all active:scale-95 ${searchTerm === tag ? 'bg-gold-500 text-white border-gold-500' : 'bg-surface-base border-border-soft text-ink-primary hover:border-gold-500/30 hover:text-gold-500'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-padding pt-padding border-t border-border-soft">
              <div className="flex items-center gap-control">
                <Filter size={18} className="text-ink-tertiary" />
                <h3 className="text-micro font-bold text-ink-tertiary uppercase tracking-widest">Community Stats</h3>
              </div>
              <div className="grid grid-cols-2 gap-padding">
                 <div className="space-y-control">
                    <span className="text-xs font-bold text-ink-tertiary uppercase tracking-widest">Public Cards</span>
                    <p className="text-xl font-bold text-ink-primary tabular leading-none">{publicCards.length}</p>
                 </div>
                 <div className="space-y-control">
                    <span className="text-xs font-bold text-ink-tertiary uppercase tracking-widest">Unique Sets</span>
                    <p className="text-xl font-bold text-ink-primary tabular leading-none">{new Set(publicCards.map(c => c.set)).size}</p>
                 </div>
              </div>
            </div>

            {!user && (
              <div className="pt-padding border-t border-border-soft space-y-padding">
                 <h4 className="text-xs font-bold text-gold-500 uppercase tracking-widest italic">Join the network</h4>
                 <p className="text-[11px] font-medium text-ink-tertiary leading-relaxed">
                   Create your profile and start sharing your collection with the community.
                 </p>
                 <button onClick={() => onNavigate(ViewMode.SETTINGS)} className="w-full btn-primary h-12 text-xs tracking-widest">Create Profile</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Detail Modal - The "Deep Dive" destination */}
      {selectedCard && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-primary/70 backdrop-blur-2xl p-4 md:p-8 animate-in fade-in duration-300" onClick={() => setSelectedCard(null)}>
          <div className="w-full max-w-5xl bg-surface-elevated rounded-xl overflow-hidden flex flex-col md:flex-row shadow-2xl relative border border-border-soft" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedCard(null)} className="absolute top-8 right-8 z-[210] p-4 bg-surface-base border border-border-soft rounded-full text-ink-tertiary hover:text-ink-primary hover:bg-gold-500/10 transition-all active:scale-90 shadow-xl">
              <X size={24} />
            </button>

            <div className="flex-[1.8] bg-ink-primary/5 p-12 flex items-center justify-center relative min-h-[500px] border-r border-border-soft">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_100%)] pointer-events-none"></div>
              <img 
                src={selectedCard.images[currentImageIndex]} 
                className="w-full h-full object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-700 select-none z-10" 
                alt={selectedCard.playerName} 
              />
              {selectedCard.images.length > 1 && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-6 z-[220]">
                  <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(p => (p === 0 ? selectedCard.images.length - 1 : p - 1)); }} className="p-4 bg-ink-primary/60 rounded-full text-white hover:bg-gold-500 transition-all active:scale-90 shadow-xl border border-white/10">
                    <ChevronLeft size={24} />
                  </button>
                  <span className="text-xs font-bold text-white uppercase tracking-widest bg-ink-primary/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">{currentImageIndex + 1} / {selectedCard.images.length}</span>
                  <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(p => (p === selectedCard.images.length - 1 ? 0 : p + 1)); }} className="p-4 bg-ink-primary/60 rounded-full text-white hover:bg-gold-500 transition-all active:scale-90 shadow-xl border border-white/10">
                    <ChevronRightIcon size={24} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 p-12 md:p-16 space-y-major bg-surface-elevated overflow-y-auto max-h-[90vh]">
              <div className="space-y-padding">
                <div className="flex items-center gap-control">
                   <div className="w-10 h-10 rounded-full bg-surface-base flex items-center justify-center border border-border-soft overflow-hidden">
                      {selectedCard.ownerAvatar ? <img src={selectedCard.ownerAvatar} className="w-full h-full object-cover" /> : <UserIcon size={18} className="text-ink-tertiary" />}
                   </div>
                   <div
                    onClick={() => {
                      if (selectedCard.ownerId && selectedCard.ownerUsername) {
                        handleCollectorClick({ id: selectedCard.ownerId, username: selectedCard.ownerUsername, ...(selectedCard.ownerAvatar !== undefined ? { avatar: selectedCard.ownerAvatar } : {}) });
                        setSelectedCard(null);
                      }
                    }}
                    className="cursor-pointer group"
                   >
                     <p className="text-xs font-bold text-ink-tertiary uppercase tracking-widest leading-none mb-1">Owner</p>
                     <h4 className="text-sm font-bold text-ink-primary group-hover:text-gold-500 transition-colors leading-none">@{selectedCard.ownerUsername}</h4>
                   </div>
                </div>
                <div className="h-px bg-border-soft w-full"></div>
              </div>

              <div className="space-y-control">
                <span className="text-xs font-bold text-gold-500 uppercase tracking-widest bg-gold-500/10 px-3 py-1 rounded-full border border-gold-500/20">{selectedCard.rarityTier || 'Vault Asset'}</span>
                <h2 className="text-4xl font-bold text-ink-primary tracking-tighter leading-none italic">{selectedCard.playerName}</h2>
                <p className="text-sm font-bold text-ink-tertiary">Set: {selectedCard.set}</p>
              </div>

              <div className="grid grid-cols-2 gap-section pt-4">
                <Detail label="League/Team" value={selectedCard.team || 'N/A'} />
                <Detail label="Serial Number" value={selectedCard.serialNumber || 'N/A'} />
                <Detail label="Condition" value={selectedCard.condition} />
                <Detail label="Market Value" value={`£${selectedCard.marketValue.toLocaleString()}`} />
              </div>

               <div className="pt-padding border-t border-border-soft space-y-padding">
                <div className="space-y-control">
                   <span className="text-xs font-bold text-ink-tertiary uppercase tracking-widest block">Collector Notes</span>
                   <p className="text-xs font-medium text-ink-tertiary leading-relaxed italic">
                     {selectedCard.notes || "No notes added for this card."}
                   </p>
                </div>
                <div className="flex flex-col gap-control">
                  <button
                    onClick={() => {
                      if (selectedCard.ownerId && selectedCard.ownerUsername) {
                        handleCollectorClick({ id: selectedCard.ownerId, username: selectedCard.ownerUsername, ...(selectedCard.ownerAvatar !== undefined ? { avatar: selectedCard.ownerAvatar } : {}) });
                        setSelectedCard(null);
                      }
                    }}
                    className="w-full btn-primary h-14 text-xs tracking-widest shadow-xl"
                  >
                    Browse @{selectedCard.ownerUsername}'s Collection
                  </button>
                  <button onClick={() => setSelectedCard(null)} className="w-full btn-secondary h-14 text-xs tracking-widest">Back to Explore</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Detail = ({ label, value }: { label: string, value: React.ReactNode }) => (
  <div className="space-y-control">
    <span className="text-xs font-bold text-ink-tertiary uppercase tracking-widest block">{label}</span>
    <div className="text-base font-bold text-ink-primary truncate tracking-tight">{value}</div>
  </div>
);

export default Explore;
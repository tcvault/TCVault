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
        collectorsMap.set(c.ownerId, { id: c.ownerId, username: c.ownerUsername, avatar: c.ownerAvatar });
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
    <div className={`space-y-12 pb-32 ${animationClass || 'animate-in fade-in duration-300'}`}>
      {/* Header with dynamic breadcrumbs/back navigation */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
             {mode !== 'Discovery' && (
               <button 
                onClick={resetMode}
                className="p-1.5 -ml-2 text-stone-400 hover:text-[#c9a227] transition-colors active:scale-90"
               >
                 <ArrowLeft size={20} />
               </button>
             )}
             <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Global Archive</span>
             {mode === 'CollectorVault' && (
               <>
                 <span className="text-stone-300">/</span>
                 <span className="text-[10px] font-black text-[#c9a227] uppercase tracking-widest">@{selectedCollector?.username}</span>
               </>
             )}
          </div>
          <h2 className="text-[32px] font-black tracking-tighter text-[#1a1408] leading-tight">
            {mode === 'Discovery' ? 'Discovery' : mode === 'SearchResults' ? 'Search Results' : `${selectedCollector?.username}'s Vault`}
          </h2>
        </div>
        
        {mode !== 'Discovery' && (
          <button onClick={resetMode} className="btn-tertiary gap-2 text-[10px] font-black uppercase tracking-widest">
            Reset Archive
          </button>
        )}
      </div>

      {/* Global Search Interface */}
      <div className="relative group max-w-2xl">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#c9a227] transition-colors" size={24} />
        <input 
          type="text" 
          placeholder={mode === 'CollectorVault' ? `Search within @${selectedCollector?.username}'s vault...` : "Search collectors, players, or clubs..."} 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchKeyPress}
          className="w-full h-16 bg-black/[0.03] border border-black/10 rounded-2xl pl-16 pr-12 text-lg font-semibold focus:border-[#c9a227]/30 outline-none transition-all placeholder:text-stone-400 text-[#1a1408] shadow-2xl"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors p-2"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">
          
          {/* Main Discovery View */}
          {mode === 'Discovery' && (
            <div className="space-y-12">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users size={20} className="text-[#c9a227]" />
                    <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Verified Collectors</h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {isLoading ? (
                    <div className="col-span-full py-8 flex justify-center"><Loader2 className="animate-spin text-stone-300" /></div>
                  ) : (
                    activeCollectors.map((collector) => (
                      <div 
                        key={collector.id} 
                        onClick={() => handleCollectorClick(collector)}
                        className="glass p-4 rounded-2xl border-black/6 flex items-center gap-4 hover:border-black/10 transition-all cursor-pointer group active:scale-[0.98] shadow-md"
                      >
                        <div className="w-12 h-12 rounded-full bg-stone-100 border border-black/10 flex items-center justify-center text-stone-400 overflow-hidden">
                          {collector.avatar ? <img src={collector.avatar} className="w-full h-full object-cover" /> : <UserIcon size={20} />}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-black text-[#1a1408] group-hover:text-[#c9a227] transition-colors">@{collector.username}</h4>
                          <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-widest">Archive Contributor</p>
                        </div>
                        <ChevronRight size={16} className="text-stone-300 group-hover:text-[#1a1408] transition-colors" />
                      </div>
                    ))
                  )}
                  {activeCollectors.length === 0 && !isLoading && (
                    <p className="text-[10px] font-bold text-stone-300 uppercase py-8 text-center col-span-full">No contributors discovered yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Cards Archive Section (Public Grails / Search Results / Collector Cards) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-emerald-600" />
                <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                  {mode === 'SearchResults' ? `${filteredCards.length} Search Results` : mode === 'CollectorVault' ? 'Collector Assets' : 'Public Grails'}
                </h3>
              </div>
              {mode !== 'Discovery' && (
                <div className="flex items-center gap-2">
                   <Grid size={16} className="text-[#c9a227]" />
                   <span className="text-[10px] font-black uppercase text-[#c9a227]">{filteredCards.length} Cards</span>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-[3/4] glass rounded-2xl animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {filteredCards.map(card => (
                  <div 
                    key={card.id} 
                    className="aspect-[3/4] glass rounded-2xl border-black/6 p-3 space-y-3 group cursor-pointer hover:border-[#c9a227]/30 transition-all relative overflow-hidden shadow-lg" 
                    onClick={() => {
                      setSelectedCard(card);
                      setCurrentImageIndex(0);
                    }}
                  >
                    <div className="w-full h-full bg-stone-100 rounded-xl overflow-hidden relative img-loading shadow-inner">
                      <img 
                        src={card.images[0]} 
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" 
                        onLoad={(e) => (e.currentTarget.parentElement as HTMLElement).classList.remove('img-loading')} 
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                        <p className="text-[10px] font-black text-[#c9a227] uppercase tracking-widest leading-none mb-1">{card.playerName}</p>
                        <p className="text-[8px] font-semibold text-stone-300 uppercase tracking-widest truncate">@{card.ownerUsername}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredCards.length === 0 && (
                  <div className="col-span-full py-20 glass rounded-[32px] border-dashed border-black/10 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="p-6 bg-stone-100 rounded-full text-stone-300">
                       <Search size={32} />
                    </div>
                    <div className="space-y-2">
                       <p className="text-sm font-black text-[#1a1408] uppercase tracking-tighter">Archive connection failed</p>
                       <p className="text-xs font-semibold text-stone-400 max-w-xs">No assets matching your query were found in this sector of the vault.</p>
                    </div>
                    <button onClick={resetMode} className="btn-tertiary h-10 px-6 uppercase text-[10px] font-black tracking-widest">Clear Archive View</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-8">
          <div className="glass p-8 rounded-[32px] border-black/6 space-y-8 sticky top-8 shadow-xl">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <TrendingUp size={20} className="text-[#c9a227]" />
                <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Trending Topics</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingTags.map(tag => (
                  <button 
                    key={tag} 
                    onClick={() => handleTagClick(tag)}
                    className={`px-4 py-2 rounded-xl glass-subtle border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${searchTerm === tag ? 'bg-[#c9a227] text-white border-[#c9a227]' : 'border-black/6 text-[#1a1408] hover:border-[#c9a227]/30 hover:text-[#c9a227]'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6 pt-8 border-t border-black/5">
              <div className="flex items-center gap-3">
                <Filter size={18} className="text-stone-400" />
                <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Vault Analytics</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Global Assets</span>
                    <p className="text-xl font-black text-[#1a1408] tabular leading-none">{publicCards.length}</p>
                 </div>
                 <div className="space-y-1">
                    <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Unique Sets</span>
                    <p className="text-xl font-black text-[#1a1408] tabular leading-none">{new Set(publicCards.map(c => c.set)).size}</p>
                 </div>
              </div>
            </div>

            {!user && (
              <div className="pt-8 border-t border-black/5 space-y-4">
                 <h4 className="text-[10px] font-black text-[#c9a227] uppercase tracking-widest italic">Join the network</h4>
                 <p className="text-[11px] font-medium text-stone-500 leading-relaxed">
                   Secure your vault and start contributing to the global archive of high-end assets.
                 </p>
                 <button onClick={() => onNavigate(ViewMode.SETTINGS)} className="w-full btn-primary h-12 uppercase text-[10px] tracking-widest">Create Profile</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Detail Modal - The "Deep Dive" destination */}
      {selectedCard && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/70 backdrop-blur-2xl p-4 md:p-8 animate-in fade-in duration-300" onClick={() => setSelectedCard(null)}>
          <div className="w-full max-w-5xl glass rounded-[40px] overflow-hidden flex flex-col md:flex-row shadow-2xl relative border-white/10" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedCard(null)} className="absolute top-8 right-8 z-[210] p-4 glass-subtle rounded-full text-stone-500 hover:text-white hover:bg-[#c9a227] transition-all active:scale-90 shadow-2xl">
              <X size={24} />
            </button>

            <div className="flex-[1.8] bg-black/10 p-12 flex items-center justify-center relative min-h-[500px] border-r border-white/5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_100%)] pointer-events-none"></div>
              <img 
                src={selectedCard.images[currentImageIndex]} 
                className="w-full h-full object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-700 select-none z-10" 
                alt={selectedCard.playerName} 
              />
              {selectedCard.images.length > 1 && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-6 z-[220]">
                  <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(p => (p === 0 ? selectedCard.images.length - 1 : p - 1)); }} className="p-4 glass-subtle rounded-full text-white hover:bg-[#c9a227] transition-all active:scale-90 shadow-xl border-white/10">
                    <ChevronLeft size={24} />
                  </button>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest glass-subtle px-4 py-2 rounded-full border-white/5">{currentImageIndex + 1} / {selectedCard.images.length}</span>
                  <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(p => (p === selectedCard.images.length - 1 ? 0 : p + 1)); }} className="p-4 glass-subtle rounded-full text-white hover:bg-[#c9a227] transition-all active:scale-90 shadow-xl border-white/10">
                    <ChevronRightIcon size={24} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 p-12 md:p-16 space-y-12 bg-white/95 backdrop-blur-md overflow-y-auto max-h-[90vh]">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center border border-black/5 overflow-hidden">
                      {selectedCard.ownerAvatar ? <img src={selectedCard.ownerAvatar} className="w-full h-full object-cover" /> : <UserIcon size={18} className="text-stone-400" />}
                   </div>
                   <div 
                    onClick={() => {
                      if (selectedCard.ownerId && selectedCard.ownerUsername) {
                        handleCollectorClick({ id: selectedCard.ownerId, username: selectedCard.ownerUsername, avatar: selectedCard.ownerAvatar });
                        setSelectedCard(null);
                      }
                    }}
                    className="cursor-pointer group"
                   >
                     <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest leading-none mb-1">Owner</p>
                     <h4 className="text-sm font-black text-[#1a1408] group-hover:text-[#c9a227] transition-colors leading-none">@{selectedCard.ownerUsername}</h4>
                   </div>
                </div>
                <div className="h-px bg-black/5 w-full"></div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-black text-[#c9a227] uppercase tracking-widest bg-[#c9a227]/10 px-3 py-1 rounded-full border border-[#c9a227]/20">{selectedCard.rarityTier || 'Vault Asset'}</span>
                <h3 className="text-4xl font-black text-[#1a1408] tracking-tighter leading-none italic">{selectedCard.playerName}</h3>
                <p className="text-sm font-bold text-stone-400">Archive Ref: {selectedCard.set}</p>
              </div>

              <div className="grid grid-cols-2 gap-10 pt-4">
                <Detail label="League/Team" value={selectedCard.team || 'N/A'} />
                <Detail label="Serial Number" value={selectedCard.serialNumber || 'N/A'} />
                <Detail label="Archive Grade" value={selectedCard.condition} />
                <Detail label="Spec Value" value={`£${selectedCard.marketValue.toLocaleString()}`} />
              </div>

              <div className="pt-10 border-t border-black/5 space-y-8">
                <div className="space-y-2">
                   <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">Collector Intelligence</span>
                   <p className="text-xs font-medium text-stone-500 leading-relaxed italic">
                     {selectedCard.notes || "No additional intelligence provided for this specific asset."}
                   </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      if (selectedCard.ownerId && selectedCard.ownerUsername) {
                        handleCollectorClick({ id: selectedCard.ownerId, username: selectedCard.ownerUsername, avatar: selectedCard.ownerAvatar });
                        setSelectedCard(null);
                      }
                    }}
                    className="w-full btn-primary h-14 uppercase text-[10px] tracking-widest shadow-2xl"
                  >
                    Enter @{selectedCard.ownerUsername}'s Vault
                  </button>
                  <button onClick={() => setSelectedCard(null)} className="w-full btn-secondary h-14 uppercase text-[10px] tracking-widest">Return to Archive</button>
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
  <div className="space-y-1">
    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">{label}</span>
    <div className="text-base font-black text-[#1a1408] truncate tracking-tight">{value}</div>
  </div>
);

export default Explore;
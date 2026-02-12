
import React, { useState, useMemo } from 'react';
import { Card, SortField, SortOrder } from '../types';
import { Search, Trash2, Edit3, Image as ImageIcon, ChevronDown, Database, PoundSterling, X, RefreshCw, ExternalLink, ShieldCheck, Activity, Info } from 'lucide-react';
import { getMarketPrice, MarketPriceResult } from '../services/gemini';

interface InventoryProps {
  cards: Card[];
  onDelete: (id: string) => void;
  onUpdate: (card: Card) => void;
}

const Inventory: React.FC<InventoryProps> = ({ cards, onDelete, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('purchaseDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isCheckingPrice, setIsCheckingPrice] = useState(false);
  const [marketInfo, setMarketInfo] = useState<MarketPriceResult | null>(null);

  const filteredCards = useMemo(() => {
    return cards
      .filter(card => 
        card.playerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        card.cardSpecifics.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.set.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const factor = sortOrder === 'asc' ? 1 : -1;
        if (sortBy === 'playerName') return factor * a.playerName.localeCompare(b.playerName);
        if (sortBy === 'purchaseDate') return factor * (new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());
        const valA = a[sortBy] || 0;
        const valB = b[sortBy] || 0;
        return factor * (Number(valA) - Number(valB));
      });
  }, [cards, searchTerm, sortBy, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handlePriceCheck = async () => {
    if (!selectedCard) return;
    setIsCheckingPrice(true);
    setMarketInfo(null);
    try {
      const result = await getMarketPrice(selectedCard.playerName, selectedCard.cardSpecifics, selectedCard.set);
      setMarketInfo(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingPrice(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-none">Global Registry</h2>
          <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mt-4 flex items-center gap-3">
             <Activity size={14} className="text-indigo-500" />
             {filteredCards.length} Verified Assets in Secure Archive
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button 
            className="px-8 h-14 glass rounded-[2rem] flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/5 transition-all"
          >
            <RefreshCw size={16} />
            Market Sync
          </button>
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="SEARCH ASSETS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/5 rounded-[2rem] h-14 pl-16 pr-8 text-[11px] font-black uppercase tracking-[0.2em] focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 outline-none transition-all placeholder:text-slate-800"
            />
          </div>
        </div>
      </div>

      <div className="glass rounded-[3.5rem] overflow-hidden border border-white/5 shadow-2xl bg-black/40">
        <div className="hidden md:grid grid-cols-12 bg-white/[0.01] px-12 py-8 text-[9px] font-black text-slate-700 uppercase tracking-[0.4em] border-b border-white/5">
          <div className="col-span-5 cursor-pointer hover:text-indigo-400 flex items-center gap-3 transition-colors" onClick={() => toggleSort('playerName')}>
            Asset Identity {sortBy === 'playerName' && <ChevronDown size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />}
          </div>
          <div className="col-span-2 cursor-pointer hover:text-indigo-400 flex items-center gap-3 transition-colors" onClick={() => toggleSort('purchaseDate')}>
            Registry Date {sortBy === 'purchaseDate' && <ChevronDown size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />}
          </div>
          <div className="col-span-2 cursor-pointer hover:text-indigo-400 flex items-center gap-3 transition-colors" onClick={() => toggleSort('pricePaid')}>
            Basis {sortBy === 'pricePaid' && <ChevronDown size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />}
          </div>
          <div className="col-span-3 cursor-pointer hover:text-indigo-400 flex items-center gap-3 transition-colors justify-end" onClick={() => toggleSort('marketValue')}>
            Valuation {sortBy === 'marketValue' && <ChevronDown size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />}
          </div>
        </div>

        <div className="divide-y divide-white/[0.03]">
          {filteredCards.map(card => (
            <div 
              key={card.id} 
              className="grid grid-cols-1 md:grid-cols-12 px-12 py-8 md:items-center hover:bg-white/[0.02] transition-all cursor-pointer group premium-hover relative overflow-hidden"
              onClick={() => { setSelectedCard(card); setMarketInfo(null); }}
            >
              {/* Holographic Shine Effect Layer */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity duration-1000 bg-gradient-to-tr from-transparent via-indigo-500 to-transparent skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%]"></div>
              
              <div className="col-span-5 flex items-center gap-10">
                <div className={`w-20 h-28 rounded-2xl overflow-hidden flex-shrink-0 border ${card.rarityTier === 'Chase' || card.rarityTier === '1/1' ? 'border-indigo-500/40 shadow-[0_0_20px_rgba(79,70,229,0.1)]' : 'border-white/5'} bg-slate-950 transition-all group-hover:scale-105 duration-1000`}>
                  {card.images && card.images.length > 0 ? (
                    <img src={card.images[0]} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000" alt={card.playerName} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-900"><ImageIcon size={24} /></div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-4 flex-wrap mb-2">
                    <p className="font-black text-slate-100 group-hover:text-white transition-colors tracking-tight text-lg uppercase italic">{card.playerName}</p>
                    {card.rarityTier && card.rarityTier !== 'Base' && (
                       <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest px-2 py-0.5 bg-indigo-600/10 border border-indigo-500/20 rounded">
                        {card.rarityTier}
                       </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[9px] text-slate-600 font-black uppercase tracking-widest">
                    <span className="truncate">{card.cardSpecifics}</span>
                    <span className="opacity-20 text-slate-400">•</span>
                    <span className="whitespace-nowrap">{card.condition}</span>
                  </div>
                </div>
              </div>
              
              <div className="col-span-2 mt-4 md:mt-0">
                <p className="text-xs text-slate-500 font-black tracking-tighter tabular">{new Date(card.purchaseDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}</p>
              </div>

              <div className="col-span-2 mt-1 md:mt-0">
                <p className="text-sm font-black text-slate-500 tracking-tighter tabular uppercase">£{card.pricePaid.toLocaleString()}</p>
              </div>

              <div className="col-span-3 mt-1 md:mt-0 flex items-center justify-between md:justify-end gap-8">
                <div className="flex items-center gap-8">
                   <p className="text-xl font-black text-white group-hover:text-indigo-400 transition-colors tracking-tighter tabular uppercase">£{card.marketValue.toLocaleString()}</p>
                   <div className="hidden group-hover:flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                      <button onClick={(e) => { e.stopPropagation(); onUpdate(card); }} className="p-4 text-slate-700 hover:text-white hover:bg-white/5 rounded-full transition-all border border-white/5"><Edit3 size={18} /></button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(card.id); }} className="p-4 text-slate-700 hover:text-rose-400 hover:bg-rose-500/5 rounded-full transition-all border border-white/5"><Trash2 size={18} /></button>
                   </div>
                </div>
              </div>
            </div>
          ))}
          {filteredCards.length === 0 && (
            <div className="py-48 text-center flex flex-col items-center">
              <Database className="text-slate-900 mb-8" size={80} />
              <p className="text-slate-600 text-sm font-black uppercase tracking-[0.4em]">Archive Offline</p>
              <p className="text-[9px] text-slate-800 mt-6 uppercase tracking-[0.8em]">Initialize Data Protocol</p>
            </div>
          )}
        </div>
      </div>

      {selectedCard && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-12 bg-black/98 backdrop-blur-3xl animate-in fade-in duration-1000">
          <div className="max-w-6xl w-full h-full md:h-auto md:max-h-[90vh] glass rounded-[4rem] overflow-hidden flex flex-col md:flex-row shadow-2xl border-white/5">
             <div className="md:flex-1 bg-slate-950 relative flex items-center justify-center p-12 overflow-hidden group">
                <div className="absolute inset-0 bg-indigo-500/[0.04] blur-[150px] group-hover:bg-indigo-500/[0.08] transition-all duration-[3000ms]"></div>
                <img 
                  src={selectedCard.images[0]} 
                  className="max-h-full max-w-full object-contain rounded-[2.5rem] shadow-2xl transition-transform duration-[3000ms] group-hover:scale-[1.05]" 
                  alt={selectedCard.playerName}
                />
                <button onClick={() => setSelectedCard(null)} className="absolute top-10 left-10 p-5 bg-black/40 text-white rounded-full transition-all border border-white/5 md:hidden"><X size={28} /></button>
             </div>

             <div className="md:w-[500px] bg-black border-l border-white/5 flex flex-col p-12 overflow-y-auto">
                <div className="flex justify-between items-start mb-16">
                   <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <ShieldCheck size={18} className="text-indigo-500" />
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.5em]">Asset Dossier</p>
                      </div>
                      <h3 className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">{selectedCard.playerName}</h3>
                   </div>
                   <button onClick={() => setSelectedCard(null)} className="hidden md:flex p-4 bg-white/[0.03] hover:bg-rose-500/10 text-white rounded-full transition-all border border-white/5"><X size={24} /></button>
                </div>

                <div className="space-y-12 flex-1">
                   <div className="grid grid-cols-2 gap-10">
                      <DetailBlock label="Variant" value={selectedCard.cardSpecifics} />
                      <DetailBlock label="Rating" value={selectedCard.condition} />
                      <DetailBlock label="Product Set" value={selectedCard.set} />
                      <DetailBlock label="Registry ID" value={selectedCard.setNumber || 'UNSET'} />
                   </div>

                   <div className="space-y-8">
                      <div className="flex items-center gap-6">
                         <div className="h-px flex-1 bg-white/5"></div>
                         <span className="text-[8px] font-black text-slate-800 uppercase tracking-[0.6em]">Valuation Synthesis</span>
                         <div className="h-px flex-1 bg-white/5"></div>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                        <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5">
                           <div className="flex items-center gap-3 mb-5 text-slate-700 uppercase">
                              <PoundSterling size={16} />
                              <span className="text-[9px] font-black tracking-widest">Basis</span>
                           </div>
                           <p className="text-3xl font-black text-white tracking-tighter tabular uppercase">£{selectedCard.pricePaid.toLocaleString()}</p>
                        </div>
                        <div className="p-8 rounded-[2.5rem] bg-indigo-500/[0.04] border border-indigo-500/10 relative group/mkt">
                           <div className="flex items-center gap-3 mb-5 text-indigo-400">
                              <RefreshCw size={16} className={isCheckingPrice ? 'animate-spin' : ''} />
                              <span className="text-[9px] font-black uppercase tracking-widest uppercase">Live Pulse</span>
                           </div>
                           <p className="text-3xl font-black text-indigo-400 tracking-tighter tabular uppercase">£{selectedCard.marketValue.toLocaleString()}</p>
                           <button 
                             onClick={handlePriceCheck} 
                             disabled={isCheckingPrice} 
                             className="absolute inset-0 bg-indigo-500/0 hover:bg-indigo-500/10 transition-all opacity-0 hover:opacity-100 flex items-center justify-center font-black text-[9px] uppercase tracking-[0.4em] text-indigo-400"
                           >
                            Refresh
                           </button>
                        </div>
                      </div>

                      {marketInfo && (
                        <div className="bg-indigo-500/[0.03] border border-indigo-500/10 p-8 rounded-[2.5rem] space-y-6 animate-in slide-in-from-top-4">
                           <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Registry Search Grounding</h4>
                              <span className="text-[8px] font-black text-slate-700 uppercase">Flash v3 Protocol</span>
                           </div>
                           <p className="text-xs text-slate-400 font-medium leading-relaxed italic">"{marketInfo.summary}"</p>
                           <div className="flex flex-wrap gap-3 pt-2">
                              {marketInfo.sources.map((s, i) => (
                                <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2 bg-black border border-white/5 rounded-xl text-[9px] font-black text-indigo-500 hover:bg-indigo-500/10 transition-colors uppercase tracking-widest">
                                  <ExternalLink size={12} />
                                  {s.title.substring(0, 12)}
                                </a>
                              ))}
                           </div>
                        </div>
                      )}
                   </div>

                   {selectedCard.notes && (
                      <div className="p-8 rounded-[2.5rem] bg-slate-950 border border-white/5">
                         <div className="flex items-center gap-3 mb-4 text-slate-700">
                            <Info size={18} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Metadata</span>
                         </div>
                         <p className="text-xs text-slate-500 font-medium leading-relaxed italic">"{selectedCard.notes}"</p>
                      </div>
                   )}
                </div>

                <div className="mt-16 flex gap-6">
                   <button onClick={() => onUpdate(selectedCard)} className="flex-[3] h-20 bg-white text-black font-black text-[11px] uppercase tracking-[0.4em] rounded-[2rem] hover:bg-slate-200 transition-all active:scale-[0.98] shadow-2xl shadow-white/5">Modify Archive</button>
                   <button className="flex-1 h-20 bg-white/[0.03] border border-white/10 text-white rounded-[2rem] flex items-center justify-center hover:bg-white/10 transition-all group">
                    <Database size={24} className="group-hover:scale-110 transition-transform" />
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailBlock = ({ label, value }: { label: string, value: string }) => (
  <div className="space-y-3">
    <p className="text-[9px] font-black text-slate-800 uppercase tracking-[0.4em] leading-none">{label}</p>
    <p className="text-[16px] font-black text-slate-200 tracking-tight leading-tight uppercase italic">{value}</p>
  </div>
);

export default Inventory;

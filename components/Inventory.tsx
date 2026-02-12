
import React, { useState, useMemo } from 'react';
import { Card, SortField, SortOrder } from '../types';
import { Search, Filter, Trash2, Edit3, Image as ImageIcon, ExternalLink, ChevronDown, Sparkles, Loader2, Globe, Database, Hash, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [activeImageIdx, setActiveImageIdx] = useState(0);
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

  const openCard = (card: Card) => {
    setSelectedCard(card);
    setActiveImageIdx(0);
    setMarketInfo(null);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedCard) return;
    setActiveImageIdx(prev => (prev + 1) % selectedCard.images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedCard) return;
    setActiveImageIdx(prev => (prev - 1 + selectedCard.images.length) % selectedCard.images.length);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">The Vault</h2>
          <p className="text-slate-400 font-medium">Managing {filteredCards.length} rare cards</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Filter vault..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
            />
          </div>
          <button className="p-2 glass rounded-xl text-slate-400 hover:text-white transition-colors">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="glass rounded-3xl overflow-hidden border border-slate-800 shadow-xl">
        <div className="hidden md:grid grid-cols-12 bg-slate-800/50 p-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800">
          <div className="col-span-5 cursor-pointer hover:text-indigo-400 flex items-center gap-2 transition-colors" onClick={() => toggleSort('playerName')}>
            CARD / PLAYER {sortBy === 'playerName' && <ChevronDown size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />}
          </div>
          <div className="col-span-2 cursor-pointer hover:text-indigo-400 flex items-center gap-2 transition-colors" onClick={() => toggleSort('purchaseDate')}>
            ACQUIRED {sortBy === 'purchaseDate' && <ChevronDown size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />}
          </div>
          <div className="col-span-2 cursor-pointer hover:text-indigo-400 flex items-center gap-2 transition-colors" onClick={() => toggleSort('pricePaid')}>
            COST {sortBy === 'pricePaid' && <ChevronDown size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />}
          </div>
          <div className="col-span-2 cursor-pointer hover:text-indigo-400 flex items-center gap-2 transition-colors" onClick={() => toggleSort('marketValue')}>
            VALUE {sortBy === 'marketValue' && <ChevronDown size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />}
          </div>
          <div className="col-span-1 text-center">CMD</div>
        </div>

        <div className="divide-y divide-slate-800/50">
          {filteredCards.length > 0 ? (
            filteredCards.map(card => (
              <div 
                key={card.id} 
                className="grid grid-cols-1 md:grid-cols-12 p-4 md:items-center hover:bg-indigo-500/5 transition-all cursor-pointer group"
                onClick={() => openCard(card)}
              >
                <div className="col-span-5 flex items-center gap-4">
                  <div className={`w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 border-slate-700 group-hover:border-indigo-500/50 transition-colors shadow-lg`}>
                    {card.images && card.images.length > 0 ? (
                      <img src={card.images[0]} className="w-full h-full object-cover" alt={card.playerName} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-800"><ImageIcon size={18} /></div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold group-hover:text-indigo-400 transition-colors text-slate-100 truncate max-w-[200px]">{card.playerName}</p>
                      <span className="text-xs text-indigo-400 font-medium whitespace-nowrap">{card.cardSpecifics}</span>
                      {card.setNumber && (
                        <span className="text-[10px] text-slate-500 font-bold">#{card.setNumber}</span>
                      )}
                      {card.serialNumber && (
                        <span className="bg-indigo-600/20 text-indigo-400 text-[10px] font-black px-1.5 py-0.5 rounded border border-indigo-500/30 flex items-center gap-0.5">
                          <Hash size={10} /> {card.serialNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium truncate">{card.set} • {card.condition}</p>
                  </div>
                </div>
                
                <div className="col-span-2 mt-2 md:mt-0 flex items-center gap-2 md:block">
                  <span className="md:hidden text-[10px] text-slate-500 uppercase font-black">Acquired:</span>
                  <p className="text-sm text-slate-300">{new Date(card.purchaseDate).toLocaleDateString()}</p>
                </div>

                <div className="col-span-2 mt-1 md:mt-0 flex items-center gap-2 md:block">
                  <span className="md:hidden text-[10px] text-slate-500 uppercase font-black">Cost:</span>
                  <p className="text-sm font-semibold text-slate-400">£{card.pricePaid.toLocaleString()}</p>
                </div>

                <div className="col-span-2 mt-1 md:mt-0 flex items-center gap-2 md:block">
                  <span className="md:hidden text-[10px] text-slate-500 uppercase font-black">Value:</span>
                  <p className="text-sm font-bold text-emerald-400">£{card.marketValue.toLocaleString()}</p>
                </div>

                <div className="col-span-1 mt-4 md:mt-0 flex justify-end md:justify-center gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onUpdate(card); }}
                    className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-xl transition-all"
                    title="Edit Card"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all"
                    title="Delete Card"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-16 text-center text-slate-600">
              <div className="inline-block p-4 bg-slate-800 rounded-full mb-4">
                <Database className="opacity-20" size={48} />
              </div>
              <p className="font-medium">No cards found in current filter.</p>
            </div>
          )}
        </div>
      </div>

      {selectedCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass max-w-3xl w-full rounded-[2.5rem] overflow-hidden shadow-2xl border-slate-700/50 max-h-[90vh] overflow-y-auto">
            <div className="relative min-h-[400px] md:h-96 bg-gradient-to-b from-indigo-900/40 to-slate-900/0 overflow-hidden flex items-center justify-center p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-indigo-500/10"></div>
              
              {selectedCard.images && selectedCard.images.length > 0 ? (
                <>
                  <img 
                    src={selectedCard.images[activeImageIdx]} 
                    className="h-full object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform" 
                    alt={selectedCard.playerName} 
                  />
                  
                  {selectedCard.images.length > 1 && (
                    <>
                      <button 
                        onClick={prevImage}
                        className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full transition-all z-20 border border-slate-700"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button 
                        onClick={nextImage}
                        className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full transition-all z-20 border border-slate-700"
                      >
                        <ChevronRight size={24} />
                      </button>
                      
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                        {selectedCard.images.map((_, i) => (
                          <div 
                            key={i} 
                            onClick={(e) => { e.stopPropagation(); setActiveImageIdx(i); }}
                            className={`h-1.5 rounded-full transition-all cursor-pointer ${i === activeImageIdx ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-700 hover:bg-slate-500'}`}
                          ></div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <ImageIcon size={64} className="text-slate-700" />
              )}
              
              <button 
                onClick={() => setSelectedCard(null)}
                className="absolute top-6 right-6 p-2 bg-slate-900/80 text-white rounded-full hover:bg-white hover:text-slate-900 transition-all z-20"
              >
                <ChevronDown className="rotate-90" size={24} />
              </button>
            </div>
            
            <div className="p-8 pt-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-4xl font-black tracking-tight leading-tight">{selectedCard.playerName}</h3>
                    {selectedCard.serialNumber && (
                      <div className="bg-indigo-600 text-white text-xs font-black px-3 py-1 rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-1 shrink-0">
                        <Hash size={14} /> {selectedCard.serialNumber}
                      </div>
                    )}
                  </div>
                  <p className="text-indigo-400 text-xl font-bold">{selectedCard.cardSpecifics} • {selectedCard.set} {selectedCard.setNumber ? `(#${selectedCard.setNumber})` : ''}</p>
                </div>
                <div className="text-left md:text-right bg-emerald-500/10 p-4 rounded-3xl border border-emerald-500/20 shrink-0">
                  <p className="text-[10px] text-emerald-500 uppercase font-black tracking-widest mb-1">Portfolio Valuation</p>
                  <p className="text-4xl font-black text-emerald-400">£{selectedCard.marketValue.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                <DetailBadge label="Grade" value={selectedCard.condition} />
                <DetailBadge label="Purchase Price" value={`£${selectedCard.pricePaid.toLocaleString()}`} />
                <DetailBadge label="ROI" value={`${Math.round(((selectedCard.marketValue - selectedCard.pricePaid) / (selectedCard.pricePaid || 1)) * 100) || 0}%`} color={selectedCard.marketValue >= selectedCard.pricePaid ? 'text-emerald-400' : 'text-rose-400'} />
              </div>

              <div className="bg-slate-800/40 rounded-[2rem] p-6 mb-8 border border-slate-700/50 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-indigo-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Market Intelligence</span>
                  </div>
                  {!marketInfo && (
                    <button 
                      onClick={handlePriceCheck}
                      disabled={isCheckingPrice}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-50"
                    >
                      {isCheckingPrice ? <Loader2 className="animate-spin" size={14} /> : <Globe size={14} />}
                      {isCheckingPrice ? 'Analyzing...' : 'Fetch Live Market Data'}
                    </button>
                  )}
                </div>

                {marketInfo ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white">£{marketInfo.price.toLocaleString()}</span>
                      <span className="text-xs text-slate-500 font-medium">suggested market avg</span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed italic">{marketInfo.summary}</p>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700/50">
                      {marketInfo.sources.slice(0, 3).map((s, idx) => (
                        <a key={idx} href={s.uri} target="_blank" className="text-[10px] bg-slate-700/50 hover:bg-slate-700 px-3 py-1 rounded-full flex items-center gap-1 transition-colors">
                          <ExternalLink size={10} /> {s.title}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : !isCheckingPrice && (
                  <p className="text-sm text-slate-500">Use Gemini Search to verify current market value across major exchanges.</p>
                )}
                
                {isCheckingPrice && (
                  <div className="py-8 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                    <p className="text-xs text-slate-400 font-medium">Scanning marketplaces & history...</p>
                  </div>
                )}
              </div>

              {selectedCard.notes && (
                <div className="mb-8">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-3">Notes</label>
                  <p className="text-slate-300 text-sm leading-relaxed bg-slate-900/50 p-6 rounded-3xl border border-slate-800">{selectedCard.notes}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  onClick={() => onUpdate(selectedCard)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  <Edit3 size={20} /> EDIT CARD
                </button>
                <button 
                  onClick={() => setSelectedCard(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  CLOSE VAULT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailBadge = ({ label, value, color = 'text-slate-200' }: { label: string, value: string, color?: string }) => (
  <div className="bg-slate-800/50 p-4 rounded-3xl border border-slate-700/30">
    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">{label}</p>
    <p className={`font-bold ${color} truncate`}>{value}</p>
  </div>
);

export default Inventory;

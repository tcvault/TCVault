
import React, { useState, useMemo, useEffect } from 'react';
import { Card, BinderPage, SortField, SortOrder } from '../types';
import { Search, Trash2, Edit3, X, ChevronDown, Filter, LayoutGrid, List, Plus, BookOpen, Layers, ChevronLeft, ChevronRight } from 'lucide-react';

interface InventoryProps {
  cards: Card[];
  pages: BinderPage[];
  onDelete: (id: string) => void;
  onUpdate: (card: Card) => void;
  onCreatePage: (name: string) => void;
  onDeletePage: (id: string) => void;
}

const Inventory: React.FC<InventoryProps> = ({ cards, pages, onDelete, onUpdate, onCreatePage, onDeletePage }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activePageId, setActivePageId] = useState<string | 'all'>('all');
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [newPageName, setNewPageName] = useState('');

  // Reset image index when card changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedCard]);

  const filteredCards = useMemo(() => {
    let result = cards;
    
    // Page Filter
    if (activePageId !== 'all') {
      result = result.filter(c => c.pageId === activePageId);
    }
    
    // Search Filter
    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      result = result.filter(card => 
        card.playerName.toLowerCase().includes(lowSearch) || 
        card.cardSpecifics.toLowerCase().includes(lowSearch) ||
        card.set.toLowerCase().includes(lowSearch)
      );
    }
    
    return result;
  }, [cards, searchTerm, activePageId]);

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
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Global Archive</span>
          <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic mt-1 leading-none">My Binder</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative group min-w-[240px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700" size={16} />
            <input 
              type="text" 
              placeholder="FILTER CARDS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 pl-12 pr-6 text-[10px] font-bold uppercase tracking-widest focus:border-blue-500/20 outline-none"
            />
          </div>
          <button 
            onClick={() => setIsCreatingPage(true)}
            className="flex items-center gap-2 px-6 h-11 bg-blue-600 border border-blue-500 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap"
          >
            <Plus size={14} /> New Page
          </button>
        </div>
      </div>

      {/* Binder Navigation / Pages */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 border-b border-white/5 no-scrollbar">
        <PageTab 
          label="All Cards" 
          active={activePageId === 'all'} 
          onClick={() => setActivePageId('all')} 
          count={cards.length}
          icon={<Layers size={14} />}
        />
        {pages.map(page => (
          <PageTab 
            key={page.id}
            label={page.name}
            active={activePageId === page.id}
            onClick={() => setActivePageId(page.id)}
            onDelete={() => onDeletePage(page.id)}
            count={cards.filter(c => c.pageId === page.id).length}
            icon={<BookOpen size={14} />}
          />
        ))}
      </div>

      {/* Binder Grid View */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
        {filteredCards.map(card => (
          <div 
            key={card.id} 
            className="group cursor-pointer space-y-4"
            onClick={() => setSelectedCard(card)}
          >
            <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-slate-900 relative">
              <img src={card.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={card.playerName} />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                <button onClick={(e) => { e.stopPropagation(); onUpdate(card); }} className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform"><Edit3 size={16} /></button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(card.id); }} className="p-3 bg-rose-600 text-white rounded-full hover:scale-110 transition-transform"><Trash2 size={16} /></button>
              </div>
              <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                <span className="text-[9px] font-black text-white uppercase">{card.condition}</span>
              </div>
            </div>
            <div>
              <h4 className="font-black text-[13px] text-white uppercase tracking-tight truncate">{card.playerName}</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase truncate">{card.set}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs font-black text-blue-400">£{card.marketValue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
        {filteredCards.length === 0 && (
          <div className="col-span-full py-24 text-center">
            <p className="text-slate-600 font-bold uppercase tracking-[0.2em] text-sm">No cards found in this page</p>
          </div>
        )}
      </div>

      {/* Create Page Modal */}
      {isCreatingPage && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in">
          <div className="glass max-w-md w-full p-10 rounded-[2.5rem] border-white/10 space-y-8">
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Label New Binder Page</h3>
            <form onSubmit={handleCreatePage} className="space-y-6">
              <input 
                autoFocus
                type="text" 
                placeholder="PAGE NAME (E.G. ROOKIES)" 
                value={newPageName}
                onChange={e => setNewPageName(e.target.value)}
                className="w-full bg-slate-950/40 border border-white/5 rounded-2xl h-16 px-8 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/40 outline-none font-bold text-white uppercase tracking-widest placeholder:text-slate-800"
              />
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsCreatingPage(false)} className="flex-1 h-14 bg-white/5 text-slate-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest">Cancel</button>
                <button type="submit" className="flex-1 h-14 bg-blue-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Overlay */}
      {selectedCard && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in" onClick={() => setSelectedCard(null)}>
          <div className="max-w-5xl w-full glass rounded-[3rem] overflow-hidden flex flex-col md:flex-row border-white/10" onClick={e => e.stopPropagation()}>
             <div className="md:flex-1 bg-[#020617] flex items-center justify-center p-12 relative group/gallery overflow-hidden">
                {/* Main Image with Transition */}
                <div className="relative w-full h-full flex items-center justify-center">
                   <img 
                    key={currentImageIndex}
                    src={selectedCard.images[currentImageIndex]} 
                    className="max-h-[65vh] rounded-2xl shadow-2xl border border-white/5 animate-in fade-in zoom-in-95 duration-500" 
                    alt={selectedCard.playerName} 
                   />

                   {/* Gallery Controls */}
                   {selectedCard.images.length > 1 && (
                     <>
                        <button 
                          onClick={prevImage}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-black/60 backdrop-blur-xl rounded-full text-white/40 hover:text-white hover:bg-blue-600 transition-all opacity-0 group-hover/gallery:opacity-100 shadow-2xl border border-white/10"
                        >
                          <ChevronLeft size={24} />
                        </button>
                        <button 
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-black/60 backdrop-blur-xl rounded-full text-white/40 hover:text-white hover:bg-blue-600 transition-all opacity-0 group-hover/gallery:opacity-100 shadow-2xl border border-white/10"
                        >
                          <ChevronRight size={24} />
                        </button>

                        {/* Pagination Dots */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 px-4 py-2 bg-black/40 backdrop-blur-lg rounded-full border border-white/5">
                          {selectedCard.images.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                              className={`h-1.5 transition-all rounded-full ${idx === currentImageIndex ? 'w-8 bg-blue-500' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
                            />
                          ))}
                        </div>
                     </>
                   )}
                </div>
             </div>
             
             <div className="md:w-[420px] p-12 space-y-12 overflow-y-auto bg-black">
                <div className="flex justify-between items-start">
                   <div>
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Card Inspection</span>
                      <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none mt-2">{selectedCard.playerName}</h3>
                   </div>
                   <button onClick={() => setSelectedCard(null)} className="p-2 text-slate-500 hover:text-white"><X size={28} /></button>
                </div>

                <div className="grid grid-cols-2 gap-y-10 gap-x-6">
                   <Detail label="Set" value={selectedCard.set} />
                   <Detail label="Condition" value={selectedCard.condition} />
                   <Detail label="Parallel" value={selectedCard.cardSpecifics} />
                   <Detail label="Page" value={pages.find(p => p.id === selectedCard.pageId)?.name || 'Unassigned'} />
                </div>

                <div className="pt-10 border-t border-white/5 space-y-8">
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Collector Info</span>
                   </div>
                   <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Total Spent</span>
                        <p className="text-2xl font-black text-white tabular">£{selectedCard.pricePaid}</p>
                      </div>
                      <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-2">Est. Value</span>
                        <p className="text-2xl font-black text-blue-400 tabular">£{selectedCard.marketValue}</p>
                      </div>
                   </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => onUpdate(selectedCard)} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all">Edit Card</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PageTab = ({ label, active, onClick, onDelete, count, icon }: any) => (
  <div className="flex items-center gap-1 group/tab">
    <button 
      onClick={onClick} 
      className={`px-6 py-2.5 rounded-full flex items-center gap-2.5 transition-all whitespace-nowrap border ${active ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20' : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10 hover:text-slate-300'}`}
    >
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      <span className={`text-[8px] px-1.5 py-0.5 rounded ${active ? 'bg-white/20' : 'bg-white/5'}`}>{count}</span>
    </button>
    {onDelete && (
      <button 
        onClick={onDelete}
        className="p-2.5 text-slate-700 hover:text-rose-500 opacity-0 group-tab-hover:opacity-100 transition-opacity"
      >
        <Trash2 size={12} />
      </button>
    )}
  </div>
);

const Detail = ({ label, value }: any) => (
  <div>
    <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest block mb-1">{label}</span>
    <p className="text-sm font-bold text-slate-300 uppercase leading-tight">{value}</p>
  </div>
);

export default Inventory;

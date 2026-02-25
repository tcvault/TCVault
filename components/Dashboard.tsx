import React, { useState } from 'react';
import { CollectionStats, Card, ViewMode } from '../types';
import { TrendingUp, Layers, Activity, Star, Clock, Plus, ChevronRight, Ghost, Edit3 } from 'lucide-react';
import EmptyState from './EmptyState';

interface DashboardProps {
  stats: CollectionStats;
  recentCards: Card[];
  onNavigate: (view: ViewMode) => void;
  onEditCard?: (card: Card) => void;
  animationClass?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, recentCards, onNavigate, onEditCard, animationClass }) => {
  const [isSpotlightLoaded, setIsSpotlightLoaded] = useState(false);
  
  const spotlightCard = recentCards.length > 0 
    ? recentCards.reduce((prev, current) => (prev.marketValue > current.marketValue) ? prev : current, recentCards[0])
    : null;

  return (
    <div className={`space-y-16 ${animationClass || 'animate-in fade-in duration-300'}`}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
        <div className="space-y-2">
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Portfolio Performance</span>
          <h2 className="text-[32px] font-black tracking-tighter text-[#1a1408] leading-tight">Collection Overview</h2>
        </div>
        <button onClick={() => onNavigate(ViewMode.ADD_CARD)} className="btn-primary self-start sm:self-auto uppercase tracking-widest text-[10px]">
          <Plus size={16} className="mr-2" />
          <span>Log pickup</span>
        </button>
      </div>

      {spotlightCard ? (
        <div className="relative glass rounded-[24px] overflow-hidden border-black/6 group cursor-pointer shadow-xl min-h-[400px]" onClick={() => onNavigate(ViewMode.INVENTORY)}>
          <div className={`absolute inset-0 bg-gradient-to-r from-[#1a1408] via-[#1a1408]/80 to-transparent z-10 transition-opacity duration-1000 ease-out ${isSpotlightLoaded ? 'opacity-100' : 'opacity-0'}`}></div>
          
          <div className={`relative z-20 p-8 md:p-16 flex flex-col justify-center max-w-lg h-full space-y-4 transition-all duration-700 delay-300 ${isSpotlightLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
            <div className="flex items-center gap-2">
              <Star size={16} className="text-[#c9a227] fill-[#c9a227]" />
              <span className="text-[10px] font-black text-[#c9a227] uppercase tracking-widest">The grails</span>
            </div>
            <h3 className="text-[32px] font-black text-white tracking-tighter leading-none group-hover:text-[#c9a227] transition-colors">
              {spotlightCard.playerName}
            </h3>
            <p className="text-sm font-semibold text-stone-300">
              {spotlightCard.cardSpecifics} — {spotlightCard.set} {spotlightCard.setNumber ? `#${spotlightCard.setNumber}` : ''}
              {spotlightCard.serialNumber && <span className="ml-2 px-2 py-0.5 bg-[#c9a227]/20 text-[#c9a227] rounded text-[10px] uppercase font-black">{spotlightCard.serialNumber}</span>}
            </p>
            <div className="flex items-center gap-12 pt-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Market estimate</span>
                <p className="text-2xl font-black text-[#c9a227] tabular">£{spotlightCard.marketValue.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Grade</span>
                <p className="text-2xl font-black text-white tabular">{spotlightCard.condition}</p>
              </div>
            </div>
          </div>

          <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden hidden md:flex items-center justify-center bg-[#1a1408] p-10">
            <div className="relative w-full h-full flex items-center justify-center">
              {spotlightCard.images && spotlightCard.images[0] ? (
                <div className={`relative w-full h-full flex items-center justify-center img-loading ${isSpotlightLoaded ? '!before:hidden' : ''}`}>
                  <img 
                    src={spotlightCard.images[0]} 
                    onLoad={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).classList.remove('img-loading');
                      setIsSpotlightLoaded(true);
                    }}
                    className={`max-w-full max-h-full w-auto h-auto object-contain group-hover:scale-[1.02] transition-all duration-700 select-none z-10 ${isSpotlightLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} 
                    alt="Spotlight Card" 
                  />
                </div>
              ) : (
                <div className="w-56 aspect-[3/4] rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 text-stone-700 animate-in fade-in zoom-in-95 duration-700">
                   <Ghost size={48} className="opacity-20" />
                   <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Image missing</span>
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#1a1408]/80 pointer-events-none z-20"></div>
          </div>
        </div>
      ) : (
        <EmptyState 
          icon={<Ghost />} 
          title="Collection is empty" 
          message="Your highlights will appear here once you log your first pickup."
          actionLabel="Start your collection"
          onAction={() => onNavigate(ViewMode.ADD_CARD)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard label="Total cards" value={stats.totalCards.toString()} icon={<Layers size={16} className="text-stone-400" />} />
        <StatCard label="Market value" value={`£${stats.totalMarketValue.toLocaleString()}`} icon={<TrendingUp size={16} className="text-stone-400" />} />
        <StatCard label="Total spent" value={`£${stats.totalSpent.toLocaleString()}`} icon={<Activity size={16} className="text-stone-400" />} />
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-stone-400 tracking-tight">Latest pickups</h3>
          <button onClick={() => onNavigate(ViewMode.INVENTORY)} className="btn-tertiary gap-2 p-2 active:scale-[0.97]">
            View collection <ChevronRight size={16} />
          </button>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {recentCards.slice(0, 5).map(card => (
            <div key={card.id} className="group cursor-pointer space-y-4" onClick={() => onNavigate(ViewMode.INVENTORY)}>
              <div className="aspect-[3/4] rounded-[16px] overflow-hidden border border-black/6 shadow-lg bg-stone-100 flex items-center justify-center relative img-loading">
                {card.images && card.images[0] ? (
                  <img 
                    src={card.images[0]} 
                    onLoad={(e) => (e.currentTarget.parentElement as HTMLElement).classList.remove('img-loading')}
                    className="max-w-full max-h-full w-auto h-auto object-contain group-hover:scale-[1.02] transition-transform duration-[150ms] z-10" 
                    alt={card.playerName} 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 opacity-20">
                    <Ghost size={24} />
                  </div>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); onEditCard?.(card); }}
                  className="absolute top-2 left-2 p-2.5 bg-[#1a1408] text-[#c9a227] rounded-lg shadow-xl z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity active:scale-95"
                >
                  <Edit3 size={14} />
                </button>
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm text-[#1a1408] truncate group-hover:text-[#c9a227] transition-colors">{card.playerName}</h4>
                <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest truncate">{card.set} {card.setNumber ? `#${card.setNumber}` : ''}</p>
              </div>
            </div>
          ))}
          {recentCards.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-black/6 rounded-[16px] flex flex-col items-center gap-4">
               <span className="text-stone-300"><Clock size={24} /></span>
               <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">No recent pickups logged</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon }: any) => (
  <div className="glass p-8 rounded-[16px] border border-black/6 hover:border-[#c9a227]/20 transition-all space-y-4 shadow-lg active:scale-[0.99] group">
    <div className="flex items-center gap-4">
      <div className="p-3 rounded-xl glass-subtle">{icon}</div>
      <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{label}</span>
    </div>
    <span className="text-3xl font-black text-[#1a1408] tracking-tighter tabular block">{value}</span>
  </div>
);

export default Dashboard;
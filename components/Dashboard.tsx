import React from 'react';
import { CollectionStats, Card, ViewMode } from '../types';
import { TrendingUp, Layers, Activity, Star, Clock, Plus, ChevronRight, Zap, Ghost } from 'lucide-react';
import EmptyState from './EmptyState';

interface DashboardProps {
  stats: CollectionStats;
  recentCards: Card[];
  onNavigate: (view: ViewMode) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, recentCards, onNavigate }) => {
  const spotlightCard = recentCards.length > 0 
    ? recentCards.reduce((prev, current) => (prev.marketValue > current.marketValue) ? prev : current, recentCards[0])
    : null;

  return (
    <div className="space-y-16 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
        <div className="space-y-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Collector spotlight</span>
          <h2 className="text-[32px] font-black tracking-tighter text-white leading-tight">Hobby overview</h2>
        </div>
        <button onClick={() => onNavigate(ViewMode.ADD_CARD)} className="btn-primary self-start sm:self-auto uppercase tracking-widest text-[10px]">
          <Plus size={16} className="mr-2" />
          <span>Log pickup</span>
        </button>
      </div>

      {spotlightCard ? (
        <div className="relative glass rounded-[24px] overflow-hidden border-white/10 group cursor-pointer shadow-xl" onClick={() => onNavigate(ViewMode.INVENTORY)}>
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent z-10"></div>
          <div className="relative z-20 p-8 md:p-16 flex flex-col justify-center max-w-lg h-full space-y-4">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">The grails</span>
            </div>
            <h3 className="text-[32px] font-black text-white tracking-tighter leading-none group-hover:text-blue-400 transition-colors">
              {spotlightCard.playerName}
            </h3>
            <p className="text-sm font-semibold text-slate-400">
              {spotlightCard.cardSpecifics} — {spotlightCard.set} {spotlightCard.setNumber ? `#${spotlightCard.setNumber}` : ''}
              {spotlightCard.serialNumber && <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] uppercase font-black">{spotlightCard.serialNumber}</span>}
            </p>
            <div className="flex items-center gap-12 pt-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Market estimate</span>
                <p className="text-2xl font-black text-blue-400 tabular">£{spotlightCard.marketValue.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Grade</span>
                <p className="text-2xl font-black text-white tabular">{spotlightCard.condition}</p>
              </div>
            </div>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden hidden md:flex items-center justify-center bg-black p-10">
            <div className="relative w-full h-full flex items-center justify-center img-loading">
              <img 
                src={spotlightCard.images[0]} 
                onLoad={(e) => (e.currentTarget.parentElement as HTMLElement).classList.remove('img-loading')}
                className="max-w-full max-h-full w-auto h-auto object-contain group-hover:scale-[1.02] transition-transform duration-[150ms] select-none z-10" 
                alt="Spotlight Card" 
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/80 pointer-events-none z-20"></div>
          </div>
        </div>
      ) : (
        <EmptyState 
          icon={<Ghost />} 
          title="Vault currently empty" 
          message="Your collection highlights will appear here once you log your first pickup."
          actionLabel="Start your collection"
          onAction={() => onNavigate(ViewMode.ADD_CARD)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard label="Total cards" value={stats.totalCards.toString()} icon={<Layers size={16} className="text-slate-400" />} />
        <StatCard 
          label="Market value" 
          value={`£${stats.totalMarketValue.toLocaleString()}`} 
          icon={<TrendingUp size={16} className="text-slate-400" />} 
          change={stats.dailyChange}
        />
        <StatCard label="Total spent" value={`£${stats.totalSpent.toLocaleString()}`} icon={<Activity size={16} className="text-slate-400" />} />
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-400 tracking-tight">Latest pickups</h3>
          <button onClick={() => onNavigate(ViewMode.INVENTORY)} className="btn-tertiary gap-2 p-2 active:scale-[0.97]">
            View binder <ChevronRight size={16} />
          </button>
        </div>
        
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] md:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-8">
          {recentCards.slice(0, 5).map(card => (
            <div key={card.id} className="group cursor-pointer space-y-4" onClick={() => onNavigate(ViewMode.INVENTORY)}>
              <div className="aspect-[3/4] rounded-[16px] overflow-hidden border border-white/5 shadow-lg bg-slate-950 flex items-center justify-center p-4 relative img-loading">
                <img 
                  src={card.images[0]} 
                  onLoad={(e) => (e.currentTarget.parentElement as HTMLElement).classList.remove('img-loading')}
                  className="max-w-full max-h-full w-auto h-auto object-contain group-hover:scale-[1.02] transition-transform duration-[150ms] z-10" 
                  alt={card.playerName} 
                />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm text-white truncate group-hover:text-blue-400 transition-colors">{card.playerName}</h4>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest truncate">{card.set} {card.setNumber ? `#${card.setNumber}` : ''}</p>
              </div>
            </div>
          ))}
          {recentCards.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-white/5 rounded-[16px] flex flex-col items-center gap-4">
               <span className="text-slate-600 opacity-50"><Clock size={24} /></span>
               <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No recent pickups logged</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, change }: any) => (
  <div className="glass p-8 rounded-[16px] border border-white/5 hover:border-white/10 transition-all space-y-4 shadow-lg active:scale-[0.99] group">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl glass-subtle opacity-30 group-hover:opacity-100 transition-opacity">{icon}</div>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      {change !== undefined && change !== 0 && (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${change >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
          {change >= 0 ? '+' : ''}{change.toLocaleString()}
          <Zap size={10} fill="currentColor" />
        </div>
      )}
    </div>
    <span className="text-3xl font-black text-white tracking-tighter tabular block">{value}</span>
  </div>
);

export default Dashboard;
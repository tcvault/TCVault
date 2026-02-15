
import React from 'react';
import { CollectionStats, Card, ViewMode } from '../types';
import { TrendingUp, Layers, Activity, Star, Clock, Plus, ChevronRight, Zap, Ghost } from 'lucide-react';

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
    <div className="space-y-16 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
        <div className="space-y-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Collector spotlight</span>
          <h2 className="text-4xl font-black tracking-tighter text-white">Hobby overview</h2>
        </div>
        <button onClick={() => onNavigate(ViewMode.ADD_CARD)} className="flex items-center gap-2 px-6 h-14 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 whitespace-nowrap self-start sm:self-auto active:scale-[0.98]">
          <Plus size={16} />
          <span>Log pickup</span>
        </button>
      </div>

      {spotlightCard ? (
        <div className="relative glass rounded-3xl overflow-hidden border-white/10 group cursor-pointer shadow-xl" onClick={() => onNavigate(ViewMode.INVENTORY)}>
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent z-10"></div>
          <div className="relative z-20 p-8 md:p-16 flex flex-col justify-center max-w-lg h-full space-y-4">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">The grails</span>
            </div>
            <h3 className="text-4xl font-black text-white tracking-tighter leading-none group-hover:text-blue-400 transition-colors">
              {spotlightCard.playerName}
            </h3>
            <p className="text-sm font-semibold text-slate-400">
              {spotlightCard.cardSpecifics} — {spotlightCard.set}
            </p>
            <div className="flex items-center gap-8 pt-4">
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
            <img 
              src={spotlightCard.images[0]} 
              className="max-w-full max-h-full w-auto h-auto object-contain group-hover:scale-[1.03] transition-transform duration-1000 select-none" 
              alt="Spotlight Card" 
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/80 pointer-events-none"></div>
          </div>
        </div>
      ) : (
        <div className="glass rounded-3xl p-16 flex flex-col items-center justify-center text-center space-y-8 border-dashed border-white/10">
           <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center text-slate-700">
             <Ghost size={32} />
           </div>
           <div className="space-y-2">
             <h3 className="text-xl font-black text-white">Vault currently empty</h3>
             <p className="text-sm text-slate-500 max-w-xs font-semibold">Your collection highlights will appear here once you log your first pickup.</p>
           </div>
           <button onClick={() => onNavigate(ViewMode.ADD_CARD)} className="px-8 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-black text-sm text-white transition-all">Start your collection</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard label="Total cards" value={stats.totalCards.toString()} icon={<Layers size={16} className="text-slate-400" />} />
        <StatCard label="Market value" value={`£${stats.totalMarketValue.toLocaleString()}`} icon={<TrendingUp size={16} className="text-slate-400" />} />
        <StatCard label="Total spent" value={`£${stats.totalSpent.toLocaleString()}`} icon={<Activity size={16} className="text-slate-400" />} />
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-400 tracking-tight">Latest pickups</h3>
          <button onClick={() => onNavigate(ViewMode.INVENTORY)} className="text-sm font-semibold text-slate-500 flex items-center gap-2 hover:text-white transition-colors">
            View binder <ChevronRight size={16} />
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {recentCards.slice(0, 5).map(card => (
            <div key={card.id} className="group cursor-pointer space-y-4" onClick={() => onNavigate(ViewMode.INVENTORY)}>
              <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 shadow-lg bg-slate-950 flex items-center justify-center p-4">
                <img 
                  src={card.images[0]} 
                  className="max-w-full max-h-full w-auto h-auto object-contain group-hover:scale-[1.03] transition-transform duration-700" 
                  alt={card.playerName} 
                />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm text-white truncate">{card.playerName}</h4>
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest truncate">{card.set}</p>
              </div>
            </div>
          ))}
          {recentCards.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center gap-4">
               <span className="text-slate-800"><Clock size={24} /></span>
               <p className="text-xs font-black text-slate-700 uppercase tracking-widest">No recent pickups logged</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon }: any) => (
  <div className="glass p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-all space-y-4 shadow-lg">
    <div className="flex items-center gap-4">
      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">{icon}</div>
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
    <span className="text-2xl font-black text-white tracking-tighter tabular block">{value}</span>
  </div>
);

export default Dashboard;

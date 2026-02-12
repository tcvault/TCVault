
import React from 'react';
import { CollectionStats, Card, ViewMode } from '../types';
import { TrendingUp, Layers, Activity, Star, Clock, Plus, ChevronRight } from 'lucide-react';

interface DashboardProps {
  stats: CollectionStats;
  recentCards: Card[];
  onNavigate: (view: ViewMode) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, recentCards, onNavigate }) => {
  const spotlightCard = recentCards.reduce((prev, current) => (prev.marketValue > current.marketValue) ? prev : current, recentCards[0]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Collection Showcase</span>
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic mt-1">Hobby Overview</h2>
        </div>
        <button onClick={() => onNavigate(ViewMode.ADD_CARD)} className="hidden md:flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-blue-500 transition-all">
          <Plus size={16} />
          Add New Pickup
        </button>
      </div>

      {/* Showcase Spotlight Section */}
      {spotlightCard && (
        <div className="relative glass rounded-[2.5rem] overflow-hidden border-white/10 group cursor-pointer" onClick={() => onNavigate(ViewMode.INVENTORY)}>
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-10"></div>
          <div className="relative z-20 p-10 md:p-16 flex flex-col justify-center max-w-xl h-full space-y-6">
            <div className="flex items-center gap-3">
              <Star size={16} className="text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Collection Highlight</span>
            </div>
            <h3 className="text-5xl font-black text-white italic uppercase leading-none tracking-tighter">
              {spotlightCard.playerName}
            </h3>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
              {spotlightCard.cardSpecifics} — {spotlightCard.set}
            </p>
            <div className="flex items-center gap-6 pt-4">
              <div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Est. Value</span>
                <span className="text-2xl font-black text-blue-400">£{spotlightCard.marketValue.toLocaleString()}</span>
              </div>
              <div className="h-10 w-px bg-white/10"></div>
              <div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Condition</span>
                <span className="text-2xl font-black text-white">{spotlightCard.condition}</span>
              </div>
            </div>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-2/3 md:w-1/2 overflow-hidden">
            <img 
              src={spotlightCard.images[0]} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 opacity-60 md:opacity-100" 
              alt="Spotlight Card" 
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black"></div>
          </div>
        </div>
      )}

      {/* Collection Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Cards" value={stats.totalCards.toString()} icon={<Layers className="text-blue-400" />} />
        <StatCard label="Collection Value" value={`£${stats.totalMarketValue.toLocaleString()}`} icon={<TrendingUp className="text-emerald-400" />} />
        <StatCard label="Total Spent" value={`£${stats.totalInvestment.toLocaleString()}`} icon={<Activity className="text-indigo-400" />} />
      </div>

      {/* Recent Activity Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Recent Additions</h3>
          <button onClick={() => onNavigate(ViewMode.INVENTORY)} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2">
            Open Binder <ChevronRight size={14} />
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {recentCards.slice(0, 5).map(card => (
            <div key={card.id} className="group cursor-pointer" onClick={() => onNavigate(ViewMode.INVENTORY)}>
              <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 mb-3 shadow-2xl bg-slate-900">
                <img src={card.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={card.playerName} />
              </div>
              <h4 className="font-bold text-[11px] text-white truncate uppercase tracking-tight">{card.playerName}</h4>
              <p className="text-[9px] text-slate-500 uppercase font-bold truncate mt-1">{card.set}</p>
            </div>
          ))}
          {recentCards.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-white/5 rounded-[2rem]">
               <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">No cards in vault yet. Time to add your first pickup!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon }: any) => (
  <div className="glass p-8 rounded-3xl border border-white/5 hover:border-white/10 transition-all">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">{icon}</div>
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
    <span className="text-3xl font-black text-white tracking-tighter">{value}</span>
  </div>
);

export default Dashboard;

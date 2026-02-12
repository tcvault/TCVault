
import React from 'react';
import { CollectionStats, Card, ViewMode } from '../types';
import { TrendingUp, PoundSterling, Layers, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

interface DashboardProps {
  stats: CollectionStats;
  recentCards: Card[];
  onNavigate: (view: ViewMode) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, recentCards, onNavigate }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold">Collector Overview</h2>
        <p className="text-slate-400">Track your portfolio performance and collection growth.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatItem 
          label="Total Cards" 
          value={stats.totalCards.toString()} 
          icon={<Layers size={20} />} 
          color="bg-blue-500" 
        />
        <StatItem 
          label="Est. Market Value" 
          value={`£${stats.totalMarketValue.toLocaleString()}`} 
          icon={<PoundSterling size={20} />} 
          color="bg-emerald-500" 
          trend={stats.netProfit >= 0 ? 'up' : 'down'}
        />
        <StatItem 
          label="Total Investment" 
          value={`£${stats.totalInvestment.toLocaleString()}`} 
          icon={<TrendingUp size={20} />} 
          color="bg-amber-500" 
        />
        <StatItem 
          label="Net Profit/Loss" 
          value={`£${Math.abs(stats.netProfit).toLocaleString()}`} 
          icon={<ArrowUpRight size={20} />} 
          color={stats.netProfit >= 0 ? 'bg-emerald-600' : 'bg-rose-600'} 
          subtitle={stats.netProfit >= 0 ? 'Overall Profit' : 'Overall Loss'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Clock size={20} className="text-indigo-400" />
              Recently Added
            </h3>
            <button 
              onClick={() => onNavigate(ViewMode.INVENTORY)}
              className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
            >
              View All Vault Items
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentCards.length > 0 ? (
              recentCards.map(card => (
                <div key={card.id} className="glass rounded-2xl overflow-hidden flex hover:border-slate-700 transition-colors">
                  <div className="w-24 h-32 bg-slate-900 flex-shrink-0">
                    {card.images && card.images.length > 0 ? (
                      <img src={card.images[0]} alt={card.playerName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-700">
                        <Layers size={24} />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col justify-between min-w-0">
                    <div>
                      <h4 className="font-bold truncate">{card.playerName}</h4>
                      <p className="text-[10px] text-indigo-400 font-bold truncate">{card.cardSpecifics}</p>
                      <p className="text-xs text-slate-500 truncate">{card.set}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-emerald-400">£{card.marketValue}</span>
                      <span className="text-[10px] text-slate-500 uppercase">{card.condition}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-12 glass rounded-2xl border-dashed border-2 border-slate-700 flex flex-col items-center justify-center text-slate-500">
                <p>No cards added yet.</p>
                <button 
                  onClick={() => onNavigate(ViewMode.ADD_CARD)}
                  className="mt-2 text-indigo-400 hover:underline"
                >
                  Add your first card
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Health */}
        <div className="glass rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold mb-1">Vault Distribution</h3>
            <p className="text-sm text-slate-400 mb-6">Your primary sets and focus.</p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Top Performance Set</span>
                <span className="font-bold text-white">{stats.topSet}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full w-[65%]"></div>
              </div>
              
              <div className="flex items-center justify-between pt-4">
                <span className="text-slate-400 text-sm">Collection Health</span>
                <span className="font-bold text-emerald-400">Excellent</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-800">
            <button 
              onClick={() => onNavigate(ViewMode.ADD_CARD)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
            >
              Scan New Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatItemProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down';
  subtitle?: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, icon, color, trend, subtitle }) => (
  <div className="glass p-5 rounded-3xl hover:border-slate-700 transition-colors">
    <div className="flex items-center gap-3 mb-3">
      <div className={`p-2 rounded-xl ${color} bg-opacity-20 text-white`}>
        {icon}
      </div>
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold">{value}</span>
      {trend && (
        <span className={`text-xs flex items-center gap-0.5 ${trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          12%
        </span>
      )}
    </div>
    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
  </div>
);

export default Dashboard;

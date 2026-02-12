
import React from 'react';
import { CollectionStats, Card, ViewMode } from '../types';
import { TrendingUp, PoundSterling, Layers, ArrowUpRight, ArrowDownRight, Clock, ShieldCheck, Activity } from 'lucide-react';

interface DashboardProps {
  stats: CollectionStats;
  recentCards: Card[];
  onNavigate: (view: ViewMode) => void;
}

const MarketTicker = () => {
  const trends = [
    { label: 'PRIZM SLV', price: '£450', change: '+12%' },
    { label: 'SELECT TIE-DYE', price: '£1,200', change: '-2%' },
    { label: 'CHROME REF', price: '£85', change: '+5%' },
    { label: 'RENAISSANCE', price: '£2,800', change: '+18%' },
    { label: 'MBAPPE KABOOM', price: '£4,500', change: '-1%' },
    { label: 'HAALAND 1/1', price: '£12k', change: '+4%' },
  ];

  return (
    <div className="w-full bg-slate-950/80 backdrop-blur-md border-y border-white/5 py-2 overflow-hidden whitespace-nowrap mb-12">
      <div className="flex animate-[scroll_40s_linear_infinite] gap-12 items-center">
        {[...trends, ...trends].map((t, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-500 tracking-widest">{t.label}</span>
            <span className="text-[10px] font-bold text-white tabular">{t.price}</span>
            <span className={`text-[9px] font-bold tabular ${t.change.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
              {t.change}
            </span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

const ValueChart = ({ stats }: { stats: CollectionStats }) => {
  // Simple SVG chart representation
  return (
    <div className="h-48 w-full relative group mt-6">
      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path 
          d="M 0 35 Q 15 32, 30 28 T 50 15 T 75 22 T 100 5" 
          fill="none" 
          stroke="#4f46e5" 
          strokeWidth="1.5"
          className="drop-shadow-[0_0_8px_rgba(79,70,229,0.5)]"
        />
        <path 
          d="M 0 35 Q 15 32, 30 28 T 50 15 T 75 22 T 100 5 L 100 40 L 0 40 Z" 
          fill="url(#chartGradient)" 
        />
        {/* Secondary path for investment baseline */}
        <path 
          d="M 0 32 L 100 32" 
          stroke="rgba(255,255,255,0.05)" 
          strokeDasharray="2 2"
          strokeWidth="0.5"
        />
      </svg>
      <div className="absolute top-0 right-0 flex flex-col items-end">
        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">AUM ATH</span>
        <span className="text-sm font-black text-white">£{stats.totalMarketValue.toLocaleString()}</span>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ stats, recentCards, onNavigate }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-1000">
      <MarketTicker />
      
      <div className="space-y-16">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck size={18} className="text-indigo-500" />
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.4em]">Multi-Era Registry Intelligence</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic">Portfolio</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">Institutional archive of {stats.totalCards} assets.</p>
            </div>
            <div className="hidden md:flex gap-4">
               <div className="glass px-6 py-3 rounded-2xl flex flex-col items-end border-white/5 bg-white/[0.02]">
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Network Status</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase">Operational</span>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatItem 
            label="Registry Count" 
            value={stats.totalCards.toString()} 
            icon={<Layers size={18} />} 
            subtitle="Verified Assets"
          />
          <StatItem 
            label="Total AUM" 
            value={`£${stats.totalMarketValue.toLocaleString()}`} 
            icon={<PoundSterling size={18} />} 
            trend={stats.netProfit >= 0 ? 'up' : 'down'}
          />
          <StatItem 
            label="Basis Capital" 
            value={`£${stats.totalInvestment.toLocaleString()}`} 
            icon={<TrendingUp size={18} />} 
          />
          <StatItem 
            label="P&L Performance" 
            value={`£${Math.abs(stats.netProfit).toLocaleString()}`} 
            icon={<Activity size={18} />} 
            isPerformance
            performanceValue={stats.netProfit}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Visualizer */}
          <div className="lg:col-span-2 space-y-12">
            <div className="glass rounded-[3.5rem] p-10 border-white/5 relative overflow-hidden group bg-black/40">
               <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Activity size={120} />
               </div>
               <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                     <h3 className="text-xl font-black tracking-tight text-white uppercase italic">Wealth Projection</h3>
                     <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]">6 Month Aggregate</span>
                  </div>
                  <ValueChart stats={stats} />
                  <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-white/5">
                    <div>
                      <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1">Volatility</p>
                      <p className="text-xs font-bold text-white">LOW (2.4%)</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1">Exposure</p>
                      <p className="text-xs font-bold text-white uppercase">{stats.topSet.substring(0, 15)}...</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1">Asset Health</p>
                      <p className="text-xs font-bold text-emerald-400">OPTIMAL</p>
                    </div>
                  </div>
               </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-lg font-black flex items-center gap-3 text-white uppercase tracking-tight italic">
                  <Clock size={18} className="text-indigo-400/40" />
                  Recent Registry Entries
                </h3>
                <button 
                  onClick={() => onNavigate(ViewMode.INVENTORY)}
                  className="text-[10px] font-black text-slate-600 hover:text-indigo-400 uppercase tracking-[0.2em] transition-colors"
                >
                  View All Assets →
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {recentCards.map(card => (
                  <div 
                    key={card.id} 
                    className="glass rounded-[2.5rem] overflow-hidden flex premium-hover border border-white/5 group bg-black/40 h-40"
                  >
                    <div className="w-32 h-full bg-slate-950 flex-shrink-0 border-r border-white/5 overflow-hidden">
                      {card.images && card.images.length > 0 ? (
                        <img src={card.images[0]} alt={card.playerName} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-1000 grayscale group-hover:grayscale-0" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-900">
                          <Layers size={24} />
                        </div>
                      )}
                    </div>
                    <div className="p-6 flex flex-col justify-between min-w-0 flex-1">
                      <div>
                        <h4 className="font-black text-[14px] truncate text-slate-100 group-hover:text-white transition-colors tracking-tight uppercase italic">{card.playerName}</h4>
                        <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest truncate mt-1">{card.cardSpecifics}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-4">
                        <span className="text-sm font-black text-indigo-400 tabular">£{card.marketValue.toLocaleString()}</span>
                        <span className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em] px-2 py-0.5 bg-white/5 rounded border border-white/5">{card.condition}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Concentration Analysis */}
          <div className="space-y-6">
            <div className="glass rounded-[3.5rem] p-10 flex flex-col justify-between border border-white/5 bg-black/60 h-full min-h-[500px]">
              <div className="space-y-12">
                <div>
                  <div className="flex items-center gap-4 mb-3">
                    <Activity size={20} className="text-indigo-400" />
                    <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Concentration</h3>
                  </div>
                  <p className="text-[11px] text-slate-600 font-bold uppercase tracking-widest">Global Asset Distribution</p>
                </div>
                
                <div className="space-y-10">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Primary Product</span>
                      <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">{stats.topSet.substring(0, 20)}</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/5">
                      <div className="bg-indigo-600 h-full rounded-full w-[72%] shadow-[0_0_20px_rgba(79,70,229,0.3)]"></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Liquid Assets</span>
                      <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">84.5%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/5">
                      <div className="bg-emerald-500 h-full rounded-full w-[84%]" style={{ boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)' }}></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 text-center group/item hover:bg-white/[0.05] transition-all">
                        <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-2">Alpha</p>
                        <p className="text-xs font-black text-emerald-400 group-hover:scale-110 transition-transform">SECURED</p>
                    </div>
                    <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 text-center group/item hover:bg-white/[0.05] transition-all">
                        <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-2">Audit</p>
                        <p className="text-xs font-black text-indigo-400 group-hover:scale-110 transition-transform">PASS</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-12">
                <button 
                  onClick={() => onNavigate(ViewMode.ADD_CARD)}
                  className="w-full bg-white text-black text-[11px] font-black uppercase tracking-[0.4em] py-6 rounded-[2.5rem] transition-all shadow-2xl shadow-white/5 hover:bg-slate-200 active:scale-[0.98] group"
                >
                  Initialize New Asset
                </button>
              </div>
            </div>
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
  trend?: 'up' | 'down';
  subtitle?: string;
  isPerformance?: boolean;
  performanceValue?: number;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, icon, trend, subtitle, isPerformance, performanceValue }) => (
  <div className="glass p-10 rounded-[3rem] premium-hover border border-white/5 group bg-black/20">
    <div className="flex items-center gap-4 mb-8">
      <div className="p-4 rounded-2xl bg-white/[0.03] text-indigo-400 border border-white/5 group-hover:scale-110 transition-all duration-500 shadow-inner">
        {icon}
      </div>
      <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">{label}</span>
    </div>
    <div className="flex items-baseline gap-4">
      <span className="text-4xl font-black text-white tracking-tighter tabular">{value}</span>
      {trend && (
        <span className={`text-[11px] font-black flex items-center gap-0.5 tabular ${trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          12%
        </span>
      )}
      {isPerformance && performanceValue !== undefined && (
        <span className={`text-[10px] font-black px-3 py-1 rounded-lg tabular ${performanceValue >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {performanceValue >= 0 ? '+' : '-'}{Math.round(Math.abs(performanceValue) / 100)}%
        </span>
      )}
    </div>
    {subtitle && <p className="text-[9px] text-slate-700 mt-4 font-black uppercase tracking-[0.3em]">{subtitle}</p>}
  </div>
);

export default Dashboard;

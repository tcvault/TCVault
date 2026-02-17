
import React, { useState, useEffect } from 'react';
import { ViewMode, Card, User } from '../types';
import { Search, TrendingUp, Users, Hash, ChevronRight, Globe, User as UserIcon, Loader2 } from 'lucide-react';
import { vaultStorage } from '../services/storage';

interface ExploreProps {
  onNavigate: (view: ViewMode) => void;
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  animationClass?: string;
}

const Explore: React.FC<ExploreProps> = ({ onNavigate, onToast, animationClass }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [publicCards, setPublicCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cards = await vaultStorage.getPublicCards();
        setPublicCards(cards);
      } catch (e) {
        console.error("Failed to fetch explore data:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const trendingTags = ['Premier League', 'Rookie Cards', 'On-Card Autos', 'World Cup 2026', 'Palace PC'];

  return (
    <div className={`space-y-16 ${animationClass || 'animate-in fade-in duration-300'}`}>
      <div className="space-y-2">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Archive</span>
        <h2 className="text-[32px] font-black tracking-tighter text-white leading-tight">Explore the Hobby</h2>
      </div>

      <div className="relative group max-w-2xl">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={24} />
        <input 
          type="text" 
          placeholder="Search collectors, cards, or clubs..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-16 bg-white/[0.03] border border-white/10 rounded-2xl pl-16 pr-6 text-lg font-semibold focus:border-blue-500/30 outline-none transition-all placeholder:text-slate-600 shadow-2xl"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-10">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-blue-500" />
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Active Collectors</h3>
              </div>
              <button className="btn-tertiary text-[10px] uppercase font-black">View Leaderboard</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isLoading ? (
                <div className="col-span-full py-8 flex justify-center"><Loader2 className="animate-spin text-slate-600" /></div>
              ) : (
                [1, 2, 3, 4].map(i => (
                  <div key={i} className="glass p-4 rounded-xl border-white/5 flex items-center gap-4 hover:border-white/10 transition-all cursor-pointer group">
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-slate-700">
                      <UserIcon size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">Collector_{i}</h4>
                      <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest">Master Level • UK Based</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-700 group-hover:text-white transition-colors" />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Globe size={20} className="text-emerald-500" />
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Public Grails</h3>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="aspect-[3/4] glass rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {publicCards.map(card => (
                  <div key={card.id} className="aspect-[3/4] glass rounded-xl border-white/5 p-3 space-y-3 group cursor-pointer hover:border-blue-500/30 transition-all relative overflow-hidden" onClick={() => onNavigate(ViewMode.FEED)}>
                    <div className="w-full h-full bg-slate-950 rounded-lg overflow-hidden relative img-loading">
                      <img src={card.images[0]} className="w-full h-full object-contain group-hover:scale-105 transition-transform" onLoad={(e) => (e.currentTarget.parentElement as HTMLElement).classList.remove('img-loading')} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 z-10">
                        <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest leading-none">{card.playerName}</p>
                        <p className="text-[7px] font-semibold text-slate-400 uppercase tracking-widest">{card.set}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {publicCards.length === 0 && (
                  <div className="col-span-full py-12 glass rounded-xl border-dashed border-white/10 flex flex-col items-center justify-center gap-3">
                    <Globe size={24} className="text-slate-700" />
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No grails discovered yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-10">
          <div className="glass p-8 rounded-[24px] border-white/5 space-y-6">
            <div className="flex items-center gap-3">
              <TrendingUp size={20} className="text-blue-500" />
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trending Topics</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingTags.map(tag => (
                <button key={tag} className="px-4 py-2 rounded-xl glass-subtle border border-white/5 text-[10px] font-black text-white uppercase tracking-widest hover:border-blue-500/30 hover:text-blue-400 transition-all">
                  #{tag.replace(/\s+/g, '')}
                </button>
              ))}
            </div>
          </div>

          <div className="glass p-8 rounded-[24px] border-white/5 space-y-4">
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">New to TC Vault?</h4>
             <p className="text-xs font-semibold text-slate-400 leading-relaxed">
               Join the UK's fastest growing network of high-end collectors. Identify cards with AI, track market trends, and connect with the community.
             </p>
             <button onClick={() => onNavigate(ViewMode.SETTINGS)} className="w-full btn-primary h-12 uppercase text-[10px] tracking-widest">Create Profile</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Explore;

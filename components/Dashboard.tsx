import React, { useMemo, useState } from 'react';
import { CollectionStats, Card, ViewMode } from '../types';
import { TrendingUp, Layers, Activity, Star, Clock, Plus, ChevronRight, Ghost, Edit3, ArrowUpRight, ArrowDownRight, Percent } from 'lucide-react';
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
    ? recentCards.reduce((prev, current) => (prev.marketValue > current.marketValue) ? prev : current, recentCards[0]!)
    : null;

  const insights = useMemo(() => {
    const validCards = recentCards.filter(c => Number.isFinite(c.pricePaid) && Number.isFinite(c.marketValue));
    const totalGain = validCards.reduce((acc, c) => acc + (c.marketValue - c.pricePaid), 0);
    const roiPct = stats.totalSpent > 0 ? (totalGain / stats.totalSpent) * 100 : 0;

    const bySet: Record<string, number> = {};
    for (const c of validCards) {
      const key = c.setCanonicalKey || c.set;
      bySet[key] = (bySet[key] || 0) + 1;
    }
    const topSetEntry = Object.entries(bySet).sort((a, b) => b[1] - a[1])[0];

    const sortedByGain = [...validCards].sort((a, b) => (b.marketValue - b.pricePaid) - (a.marketValue - a.pricePaid));
    const topGainer = sortedByGain[0] || null;
    const topLaggard = sortedByGain[sortedByGain.length - 1] || null;

    return {
      totalGain,
      roiPct,
      topSetShare: topSetEntry ? Math.round((topSetEntry[1] / Math.max(1, validCards.length)) * 100) : 0,
      topGainer,
      topLaggard,
    };
  }, [recentCards, stats.totalSpent]);

  return (
    <div className={`space-y-major pb-24 ${animationClass || 'animate-in fade-in duration-300'}`}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-section">
        <div className="space-y-control">
          <span className="text-micro font-semibold text-ink-secondary/60 uppercase tracking-widest">Portfolio Performance</span>
          <h1>Collection Overview</h1>
        </div>
        <button onClick={() => onNavigate(ViewMode.ADD_CARD)} className="btn-primary w-full sm:w-auto self-start sm:self-auto text-xs tracking-widest">
          <Plus size={16} className="mr-2" />
          <span>Log pickup</span>
        </button>
      </div>

      {spotlightCard ? (
        <div className="relative card-vault overflow-hidden border-border-soft group cursor-pointer shadow-xl min-h-[400px] p-0" onClick={() => onNavigate(ViewMode.INVENTORY)}>
          <div className={`absolute inset-0 bg-gradient-to-r from-ink-primary via-ink-primary/80 to-transparent z-10 transition-opacity duration-1000 ease-out ${isSpotlightLoaded ? 'opacity-100' : 'opacity-0'}`}></div>

          <div className={`relative z-20 p-major flex flex-col justify-center max-w-lg h-full space-y-section transition-all duration-700 delay-300 ${isSpotlightLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
            <div className="flex items-center gap-control">
              <Star size={16} className="text-gold-500 fill-gold-500" />
              <span className="text-xs font-semibold text-gold-500 uppercase tracking-widest">The grails</span>
            </div>
            <h2 className="text-white group-hover:text-gold-500 transition-colors">{spotlightCard.playerName}</h2>
            <p className="text-sm font-semibold text-ink-on-dark">
              {spotlightCard.cardSpecifics} - {spotlightCard.set} {spotlightCard.setNumber ? `#${spotlightCard.setNumber}` : ''}
              {spotlightCard.serialNumber && <span className="ml-2 px-2 py-0.5 bg-gold-500/20 text-gold-500 rounded text-xs font-bold">{spotlightCard.serialNumber}</span>}
            </p>
            <div className="flex items-center gap-major pt-control">
              <div className="space-y-control">
                <span className="text-xs font-semibold text-ink-on-dark/60 uppercase tracking-widest">Market estimate</span>
                <p className="text-2xl font-bold text-gold-500 tabular">GBP {spotlightCard.marketValue.toLocaleString()}</p>
              </div>
              <div className="space-y-control">
                <span className="text-xs font-semibold text-ink-on-dark/60 uppercase tracking-widest">Grade</span>
                <p className="text-2xl font-bold text-white tabular">{spotlightCard.condition}</p>
              </div>
            </div>
          </div>

          <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden hidden md:flex items-center justify-center bg-ink-primary p-10">
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
                <div className="w-56 aspect-[3/4] rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 text-ink-secondary animate-in fade-in zoom-in-95 duration-700">
                  <Ghost size={48} className="opacity-20" />
                  <span className="text-xs font-black uppercase tracking-widest opacity-30">No image</span>
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-ink-primary/80 pointer-events-none z-20"></div>
          </div>
        </div>
      ) : (
        <EmptyState compact
          icon={<Ghost />}
          title="Collection is empty"
          message="Your highlights will appear here once you log your first pickup."
          actionLabel="Start your collection"
          onAction={() => onNavigate(ViewMode.ADD_CARD)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-section">
        <StatCard label="Total cards" value={stats.totalCards.toString()} icon={<Layers size={16} className="text-ink-secondary/60" />} />
        <StatCard label="Market value" value={`GBP ${stats.totalMarketValue.toLocaleString()}`} icon={<TrendingUp size={16} className="text-ink-secondary/60" />} />
        <StatCard label="Total spent" value={`GBP ${stats.totalSpent.toLocaleString()}`} icon={<Activity size={16} className="text-ink-secondary/60" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-section">
        <InsightCard
          label="Portfolio ROI"
          value={`${insights.roiPct.toFixed(1)}%`}
          subvalue={`Net ${insights.totalGain >= 0 ? '+' : ''}GBP ${insights.totalGain.toFixed(0)}`}
          icon={insights.roiPct >= 0 ? <ArrowUpRight size={16} className="text-emerald-500" /> : <ArrowDownRight size={16} className="text-error" />}
        />
        <InsightCard
          label="Set Concentration"
          value={`${insights.topSetShare}%`}
          subvalue="share in top set"
          icon={<Percent size={16} className="text-gold-500" />}
        />
      </div>

      {(insights.topGainer || insights.topLaggard) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-section">
          {insights.topGainer && (
            <MoverCard
              label="Top gainer"
              card={insights.topGainer}
              gain={insights.topGainer.marketValue - insights.topGainer.pricePaid}
              positive
            />
          )}
          {insights.topLaggard && (
            <MoverCard
              label="Top laggard"
              card={insights.topLaggard}
              gain={insights.topLaggard.marketValue - insights.topLaggard.pricePaid}
              positive={false}
            />
          )}
        </div>
      )}

      <div className="space-y-section">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-secondary/60 tracking-tight">Latest pickups</h3>
          <button onClick={() => onNavigate(ViewMode.INVENTORY)} className="flex items-center gap-control p-control hover:bg-surface-elevated rounded-lg transition-colors text-sm font-medium">
            View collection <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-section">
          {recentCards.slice(0, 5).map(card => (
            <div key={card.id} className="group cursor-pointer space-y-control" onClick={() => onNavigate(ViewMode.INVENTORY)}>
              <div className="aspect-[3/4] rounded-xl overflow-hidden border border-border-soft shadow-sm bg-surface-elevated flex items-center justify-center relative img-loading">
                {card.images && card.images[0] ? (
                  <img
                    src={card.images[0]}
                    onLoad={(e) => (e.currentTarget.parentElement as HTMLElement).classList.remove('img-loading')}
                    className="max-w-full max-h-full w-auto h-auto object-contain group-hover:scale-[1.02] transition-transform duration-[150ms] z-10"
                    alt={card.playerName}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-control opacity-20">
                    <Ghost size={24} />
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onEditCard?.(card); }}
                  className="absolute top-control left-control p-2 bg-ink-primary text-gold-500 rounded-lg shadow-xl z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity active:scale-95"
                >
                  <Edit3 size={14} />
                </button>
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-sm text-ink-primary truncate group-hover:text-gold-500 transition-colors">{card.playerName}</h4>
                <p className="text-xs text-ink-secondary/60 font-semibold uppercase tracking-widest truncate">{card.set} {card.setNumber ? `#${card.setNumber}` : ''}</p>
              </div>
            </div>
          ))}
          {recentCards.length === 0 && (
            <div className="col-span-full py-major text-center border-2 border-dashed border-border-soft rounded-xl flex flex-col items-center gap-control">
              <span className="text-ink-secondary/20"><Clock size={24} /></span>
              <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-widest">No recent pickups logged</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface StatCardProps { label: string; value: string | number; icon: React.ReactNode; }
const StatCard = ({ label, value, icon }: StatCardProps) => (
  <div className="card-vault hover:border-gold-500/20 transition-all space-y-control shadow-sm active:scale-[0.99] group">
    <div className="flex items-center gap-padding">
      <div className="p-2 rounded-lg bg-surface-base border border-border-soft">{icon}</div>
      <span className="text-xs font-semibold text-ink-secondary/60 uppercase tracking-widest">{label}</span>
    </div>
    <span className="text-3xl font-bold text-ink-primary tracking-tighter tabular block">{value}</span>
  </div>
);

const InsightCard = ({ label, value, subvalue, icon }: { label: string; value: string; subvalue: string; icon: React.ReactNode }) => (
  <div className="card-vault p-padding space-y-control">
    <div className="flex items-center gap-control">
      {icon}
      <span className="text-xs font-bold text-ink-tertiary uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-2xl font-bold text-ink-primary tracking-tight tabular">{value}</p>
    <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-widest">{subvalue}</p>
  </div>
);

const MoverCard = ({ label, card, gain, positive }: { label: string; card: Card; gain: number; positive: boolean }) => (
  <div className="card-vault p-padding space-y-control">
    <span className="text-xs font-bold text-ink-tertiary uppercase tracking-widest">{label}</span>
    <p className="text-sm font-bold text-ink-primary truncate">{card.playerName}</p>
    <p className={`text-base font-bold tabular ${positive ? 'text-emerald-600' : 'text-error'}`}>
      {gain >= 0 ? '+' : ''}GBP {gain.toFixed(0)}
    </p>
    <p className="text-xs text-ink-tertiary truncate">{card.set}</p>
  </div>
);

export default Dashboard;


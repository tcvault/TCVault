import type { MarketIntel } from './gemini';
import type { MarketMeta, MarketComp } from '../types';

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

const round5 = (v: number) => Math.round(v / 5) * 5;

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a,b) => a-b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

function iqrFilter(values: number[]) {
  if (values.length < 6) return values;
  const q1 = percentile(values, 0.25);
  const q3 = percentile(values, 0.75);
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  return values.filter(v => v >= lo && v <= hi);
}

function recencyWeight(soldDateIso?: string) {
  if (!soldDateIso) return 0.6;
  const days = (Date.now() - new Date(soldDateIso).getTime()) / 86400000;
  const tau = 30; // 30-day half-life style
  return Math.exp(-Math.max(0, days) / tau);
}

export function buildMarketMeta(intel: MarketIntel): MarketMeta | null {
  const sold = (intel.sold || [])
    .filter(x => x && typeof x.price === 'number')
    .map(x => ({
      title: x.title,
      uri: x.uri,
      soldDate: x.soldDate,
      priceGbp: x.price, // already GBP-normalized per prompt
      source: (x.source || 'Other') as any,
      matchConfidence: clamp(Number(x.matchConfidence ?? 0.7), 0, 1),
      grade: x.grade,
      flags: x.flags || []
    })) as MarketComp[];

  // Hard gates: require enough comps + match quality
  const good = sold.filter(c => c.matchConfidence >= 0.75 && !(c.flags || []).includes('lot'));
  if (good.length < 4) return null;

  // Outlier removal on prices
  const prices = good.map(c => c.priceGbp);
  const filteredPrices = iqrFilter(prices);

  // Keep comps aligned with filtered set (simple: keep those within filtered set)
  const filtered = good.filter(c => filteredPrices.includes(c.priceGbp));

  const weights = filtered.map(c => recencyWeight(c.soldDate) * (0.5 + 0.5 * c.matchConfidence));
  const wSum = weights.reduce((a,b) => a+b, 0) || 1;

  const weightedMean = filtered.reduce((acc, c, i) => acc + c.priceGbp * weights[i], 0) / wSum;

  const p25 = percentile(filtered.map(c => c.priceGbp), 0.25);
  const p50 = percentile(filtered.map(c => c.priceGbp), 0.50);
  const p75 = percentile(filtered.map(c => c.priceGbp), 0.75);

  // Active listing signal
  const activePrices = (intel.active || []).map(a => a.price).filter(n => typeof n === 'number');
  const activeMedian = activePrices.length ? percentile(activePrices, 0.5) : null;
  const spreadPct = activeMedian ? ((activeMedian - p50) / p50) * 100 : undefined;

  // Confidence
  const variance = percentile(filtered.map(c => Math.abs(c.priceGbp - p50)), 0.5) / (p50 || 1); // robust dispersion proxy
  let score = 0;
  score += Math.min(1, filtered.length / 10);
  score += Math.min(1, (filtered.reduce((a,c)=>a+c.matchConfidence,0)/filtered.length));
  score += Math.max(0, 1 - variance * 2); // penalize dispersion
  const confidence = score >= 2.4 ? 'high' : score >= 1.8 ? 'medium' : 'low';

  const mid = round5((weightedMean * 0.6) + (p50 * 0.4));
  const low = round5(Math.min(p25, mid * 0.9));
  const high = round5(Math.max(p75, mid * 1.1));

  const meta: MarketMeta = {
    valuationVersion: 'v1',
    updatedAt: Date.now(),
    compsUsed: filtered.length,
    liquidity30d: filtered.filter(c => {
      const d = c.soldDate ? (Date.now() - new Date(c.soldDate).getTime()) / 86400000 : 999;
      return d <= 30;
    }).length,
    confidence,
    low,
    mid,
    high,
    spreadPct: spreadPct !== undefined ? Math.round(spreadPct) : undefined,
    summary: intel.notes || '',
    sources: intel.sources || [],
    comps: filtered.slice(0, 12),
    fxNote: intel.fxRateUsed
  };

  return meta;
}

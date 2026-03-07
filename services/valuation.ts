import type { MarketIntel } from './gemini';
import type { MarketMeta, MarketComp } from '../types';

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const round5 = (v: number) => Math.round(v / 5) * 5;

const SOURCE_RELIABILITY: Record<MarketComp['source'], number> = {
  eBay: 0.8,
  PWCC: 0.95,
  Goldin: 0.95,
  MySlabs: 0.9,
  COMC: 0.9,
  Other: 0.7,
};

const UK_FRIENDLY_SOURCES = new Set<MarketComp['source']>(['eBay', 'COMC']);
const EXCLUDED_FLAGS = new Set(['lot', 'reprint', 'custom', 'digital', 'damaged']);

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const loVal = sorted[lo] ?? 0;
  const hiVal = sorted[hi] ?? 0;
  if (lo === hi) return loVal;
  const w = idx - lo;
  return loVal * (1 - w) + hiVal * w;
}

function iqrBounds(values: number[]): { low: number; high: number } {
  const q1 = percentile(values, 0.25);
  const q3 = percentile(values, 0.75);
  const iqr = q3 - q1;
  return { low: q1 - 1.5 * iqr, high: q3 + 1.5 * iqr };
}

function recencyWeight(soldDateIso?: string): number {
  if (!soldDateIso) return 0.55;
  const days = (Date.now() - new Date(soldDateIso).getTime()) / 86_400_000;
  const tauDays = 35;
  return Math.exp(-Math.max(0, days) / tauDays);
}

function mapSource(source?: string): MarketComp['source'] {
  if (source === 'eBay' || source === 'PWCC' || source === 'Goldin' || source === 'MySlabs' || source === 'COMC') {
    return source;
  }
  return 'Other';
}

function hasExcludedFlag(comp: MarketComp): boolean {
  return (comp.flags || []).some(flag => EXCLUDED_FLAGS.has(flag.toLowerCase()));
}

function compPriceGbp(comp: MarketComp): number {
  return Math.max(0, comp.priceGbp + (comp.shippingGbp ?? 0));
}

function liquidity30d(comps: MarketComp[]): number {
  return comps.filter(c => {
    const days = c.soldDate ? (Date.now() - new Date(c.soldDate).getTime()) / 86_400_000 : Number.POSITIVE_INFINITY;
    return days <= 30;
  }).length;
}

interface BuildMarketMetaOptions {
  ukBias?: boolean;
}

export function buildMarketMeta(intel: MarketIntel, options?: BuildMarketMetaOptions): MarketMeta | null {
  const ukBias = options?.ukBias ?? true;

  const sold = (intel.sold || [])
    .filter(item => item && typeof item.price === 'number')
    .map(item => ({
      title: item.title,
      uri: item.uri,
      soldDate: item.soldDate,
      priceGbp: item.price,
      shippingGbp: item.shipping,
      source: mapSource(item.source),
      matchConfidence: clamp(Number(item.matchConfidence ?? 0.7), 0, 1),
      grade: item.grade,
      flags: item.flags || [],
    })) as MarketComp[];

  const qualityCandidates = sold.filter(c => c.matchConfidence >= 0.72 && !hasExcludedFlag(c));
  if (qualityCandidates.length < 4) return null;

  const priced = qualityCandidates.map(compPriceGbp);
  const { low: outlierLow, high: outlierHigh } = iqrBounds(priced);

  const filtered = qualityCandidates.filter(c => {
    const p = compPriceGbp(c);
    return p >= outlierLow && p <= outlierHigh;
  });

  if (filtered.length < 4) return null;

  const weighted = filtered.map(c => {
    const recency = recencyWeight(c.soldDate);
    const match = 0.45 + 0.55 * c.matchConfidence;
    const sourceRel = SOURCE_RELIABILITY[c.source] ?? SOURCE_RELIABILITY.Other;
    const regionBias = ukBias && UK_FRIENDLY_SOURCES.has(c.source) ? 1.08 : 1;
    const weight = recency * match * sourceRel * regionBias;
    return { comp: c, weight, value: compPriceGbp(c) };
  });

  const weightSum = weighted.reduce((acc, x) => acc + x.weight, 0) || 1;
  const weightedMean = weighted.reduce((acc, x) => acc + x.value * x.weight, 0) / weightSum;

  const values = weighted.map(x => x.value);
  const p25 = percentile(values, 0.25);
  const p50 = percentile(values, 0.5);
  const p75 = percentile(values, 0.75);

  const activePrices = (intel.active || [])
    .filter(item => typeof item.price === 'number')
    .map(item => Math.max(0, item.price + (item.shipping ?? 0)));

  const activeMedian = activePrices.length ? percentile(activePrices, 0.5) : null;
  const spreadPct = activeMedian && p50 > 0 ? ((activeMedian - p50) / p50) * 100 : undefined;

  const medianAbsDeviation = percentile(values.map(v => Math.abs(v - p50)), 0.5) / (p50 || 1);
  const avgMatch = filtered.reduce((acc, c) => acc + c.matchConfidence, 0) / filtered.length;
  const liq30d = liquidity30d(filtered);

  let confidenceScore = 0;
  confidenceScore += Math.min(1, filtered.length / 12);
  confidenceScore += Math.min(1, avgMatch);
  confidenceScore += Math.max(0, 1 - medianAbsDeviation * 2);
  confidenceScore += Math.min(1, liq30d / 6) * 0.5;

  const confidence: MarketMeta['confidence'] =
    confidenceScore >= 2.55 ? 'high' : confidenceScore >= 1.95 ? 'medium' : 'low';

  const mid = round5(weightedMean * 0.65 + p50 * 0.35);
  const low = round5(Math.min(p25, mid * 0.9));
  const high = round5(Math.max(p75, mid * 1.1));

  const reliabilityMix = (() => {
    const totals: Record<MarketComp['source'], number> = {
      eBay: 0,
      PWCC: 0,
      Goldin: 0,
      MySlabs: 0,
      COMC: 0,
      Other: 0,
    };

    for (const item of weighted) {
      totals[item.comp.source] += item.weight;
    }

    const best = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([name]) => name);

    return best.length ? best.join(' + ') : 'mixed sources';
  })();

  const rationale = [
    `${filtered.length} sold comp(s) used`,
    `${liq30d} sold in last 30 days`,
    `median spread ${Math.round(medianAbsDeviation * 100)}%`,
    `source mix ${reliabilityMix}`,
    ukBias ? 'UK source weighting enabled' : 'neutral source weighting',
  ].join(' | ');

  return {
    valuationVersion: 'v2',
    updatedAt: Date.now(),
    compsUsed: filtered.length,
    liquidity30d: liq30d,
    confidence,
    low,
    mid,
    high,
    spreadPct: spreadPct !== undefined ? Math.round(spreadPct) : undefined,
    summary: rationale,
    sources: intel.sources || [],
    comps: filtered.slice(0, 15),
    fxNote: intel.fxRateUsed,
  };
}


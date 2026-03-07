import assert from 'node:assert/strict';
import { buildMarketMeta } from '../services/valuation';

const baseIntel = () => ({
  sold: [
    { title: 'A', uri: 'https://example.com/a', soldDate: new Date(Date.now() - 5 * 86400000).toISOString(), price: 100, currency: 'GBP', source: 'eBay', matchConfidence: 0.9 },
    { title: 'B', uri: 'https://example.com/b', soldDate: new Date(Date.now() - 10 * 86400000).toISOString(), price: 110, currency: 'GBP', source: 'eBay', matchConfidence: 0.86 },
    { title: 'C', uri: 'https://example.com/c', soldDate: new Date(Date.now() - 15 * 86400000).toISOString(), price: 95, currency: 'GBP', source: 'COMC', matchConfidence: 0.88 },
    { title: 'D', uri: 'https://example.com/d', soldDate: new Date(Date.now() - 20 * 86400000).toISOString(), price: 105, currency: 'GBP', source: 'PWCC', matchConfidence: 0.84 },
  ],
  active: [
    { title: 'E', uri: 'https://example.com/e', price: 120, currency: 'GBP', source: 'eBay' }
  ],
  notes: 'ok',
  fxRateUsed: '1.0'
});

export function runValuationTests(): void {
  const meta = buildMarketMeta(baseIntel(), { ukBias: true });
  assert.ok(meta);
  assert.ok(meta!.mid > 0);
  assert.ok(meta!.high >= meta!.mid);
  assert.ok(meta!.mid >= meta!.low);
  assert.equal(meta!.compsUsed, 4);

  const intel = baseIntel();
  intel.sold = intel.sold.slice(0, 3);
  const insufficient = buildMarketMeta(intel, { ukBias: true });
  assert.equal(insufficient, null);
}

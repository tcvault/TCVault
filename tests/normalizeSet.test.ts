import assert from 'node:assert/strict';
import { normalizeSet } from '../lib/normalizeSet';

export function runNormalizeSetTests(): void {
  const out = normalizeSet('2023-24 Panini Donruss Soccer');
  assert.equal(out.setYearStart, 2023);
  assert.equal(out.setYearEnd, 2024);
  assert.equal(out.manufacturer, 'Panini');
  assert.equal(out.productLine, 'Donruss');
  assert.equal(out.sport, 'Soccer');
  assert.equal(out.category, 'Sports');
  assert.equal(out.setCanonicalKey, '2023-24|panini|donruss|soccer');

  const tcg = normalizeSet('2022 Pokemon Crown Zenith');
  assert.equal(tcg.category, 'TCG');
  assert.equal(tcg.sport, null);
}

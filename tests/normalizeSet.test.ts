import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSet } from '../lib/normalizeSet';

test('normalizeSet parses season/manufacturer/product/sport', () => {
  const out = normalizeSet('2023-24 Panini Donruss Soccer');
  assert.equal(out.setYearStart, 2023);
  assert.equal(out.setYearEnd, 2024);
  assert.equal(out.manufacturer, 'Panini');
  assert.equal(out.productLine, 'Donruss');
  assert.equal(out.sport, 'Soccer');
  assert.equal(out.category, 'Sports');
  assert.equal(out.setCanonicalKey, '2023-24|panini|donruss|soccer');
});

test('normalizeSet resolves TCG category without sport', () => {
  const out = normalizeSet('2022 Pokemon Crown Zenith');
  assert.equal(out.category, 'TCG');
  assert.equal(out.sport, null);
});

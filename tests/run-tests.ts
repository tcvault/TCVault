import { runNormalizeSetTests } from './normalizeSet.test';
import { runValidateImageUrlTests } from './validateImageUrl.test';
import { runValuationTests } from './valuation.test';

const tests: Array<{ name: string; run: () => void }> = [
  { name: 'normalizeSet', run: runNormalizeSetTests },
  { name: 'validateImageUrl', run: runValidateImageUrlTests },
  { name: 'valuation', run: runValuationTests },
];

let failed = false;
for (const t of tests) {
  try {
    t.run();
    console.log(`[PASS] ${t.name}`);
  } catch (error) {
    failed = true;
    console.error(`[FAIL] ${t.name}`);
    console.error(error);
  }
}

if (failed) {
  process.exit(1);
}

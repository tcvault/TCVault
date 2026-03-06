export interface NormalizedSet {
  setDisplay: string;
  setCanonicalKey: string;
  setYearStart: number | null;
  setYearEnd: number | null;
  manufacturer: string | null;
  productLine: string | null;
  sport: string | null;
  category: 'Sports' | 'TCG' | 'Non-Sports';
}

// Canonical manufacturer names keyed by lowercase aliases.
// Longest entries first so "upper deck" matches before "ud".
const MFR_ALIASES: [string, string][] = [
  ['upper deck', 'Upper Deck'],
  ['panini',     'Panini'],
  ['topps',      'Topps'],
  ['ud',         'Upper Deck'],
  ['futera',     'Futera'],
  ['score',      'Score'],
  ['leaf',       'Leaf'],
  ['fleer',      'Fleer'],
];

// Sport detection patterns. Order matters — most specific first.
const SPORT_PATTERNS: [RegExp, string][] = [
  [/\bformula\s*one\b/i,       'Formula 1'],
  [/\bformula\s*1\b/i,         'Formula 1'],
  [/\bf1\b/i,                  'Formula 1'],
  [/\bbasketball\b/i,          'Basketball'],
  [/\bnba\b/i,                 'Basketball'],
  [/\bbaseball\b/i,            'Baseball'],
  [/\bmlb\b/i,                 'Baseball'],
  [/\bice\s*hockey\b/i,        'Hockey'],
  [/\bhockey\b/i,              'Hockey'],
  [/\bnhl\b/i,                 'Hockey'],
  [/\bnfl\b/i,                 'American Football'],
  [/\bamerican\s*football\b/i, 'American Football'],
  [/\bsoccer\b/i,              'Soccer'],
  [/\bpremier\s*league\b/i,    'Soccer'],
  [/\bbundesliga\b/i,          'Soccer'],
  [/\bserie\s*a\b/i,           'Soccer'],
  [/\bla\s*liga\b/i,           'Soccer'],
  [/\bligue\s*1\b/i,           'Soccer'],
  [/\bchampions\s*league\b/i,  'Soccer'],
  // Generic football should map to Soccer only when no stronger NFL signal exists
  [/\bfootball\b/i,            'Soccer'],
];

const TCG_PATTERNS: RegExp[] = [
  /\bpok[eé]mon\b/i,
  /\bmagic\s*the\s*gathering\b/i,
  /\bmtg\b/i,
  /\byu-?gi-?oh\b/i,
  /\blorcana\b/i,
  /\bone\s*piece\b/i,
  /\bdragon\s*ball\s*super\b/i,
];

const NON_SPORT_PATTERNS: RegExp[] = [
  /\bmarvel\b/i,
  /\bstar\s*wars\b/i,
  /\bdisney\b/i,
  /\bpixar\b/i,
  /\bharry\s*potter\b/i,
  /\bstranger\s*things\b/i,
];

function deriveSeasonEnd(start: number, rawEnd: number): number {
  // rawEnd may be 2-digit (e.g. 24) or 4-digit (e.g. 2024)
  return rawEnd < 100 ? Math.floor(start / 100) * 100 + rawEnd : rawEnd;
}

function buildSeasonStr(start: number, end: number | null): string {
  if (end === null || end === start) return String(start);
  const suffix = end > 99 ? String(end).slice(2) : String(end).padStart(2, '0');
  return `${start}-${suffix}`;
}

function isFourDigitYear(year: number | null | undefined): year is number {
  return typeof year === 'number' && year >= 1000;
}

export function normalizeSet(
  raw: string,
  hints?: {
    setYearStart?: number | null;
    setYearEnd?: number | null;
    manufacturer?: string | null;
    productLine?: string | null;
    sport?: string | null;
    category?: 'Sports' | 'TCG' | 'Non-Sports' | null;
  }
): NormalizedSet {
  const h = hints ?? {};

  // ── Year extraction (prefer explicit year in set string when present) ──────
  const parseYearsFromRaw = (text: string): { start: number | null; end: number | null } => {
    // 4-digit / 2-or-4-digit season: "2023-24", "2023/2024"
    const m4 = text.match(/(\d{4})[-/](\d{2,4})/);
    if (m4) {
      const start = parseInt(m4[1] ?? '0', 10);
      return { start, end: deriveSeasonEnd(start, parseInt(m4[2] ?? '0', 10)) };
    }

    // 2-digit shorthand: "23-24", "23/24"
    const m2 = text.match(/\b(\d{2})[-/](\d{2})\b/);
    if (m2) {
      return {
        start: 2000 + parseInt(m2[1] ?? '0', 10),
        end: 2000 + parseInt(m2[2] ?? '0', 10),
      };
    }

    // Single 4-digit year
    const m1 = text.match(/\b(20\d{2}|19\d{2})\b/);
    if (m1) {
      const y = parseInt(m1[1] ?? '0', 10);
      return { start: y, end: y };
    }

    return { start: null, end: null };
  };

  const rawYears = parseYearsFromRaw(raw);
  let yearStart: number | null = h.setYearStart ?? rawYears.start;
  let yearEnd: number | null = h.setYearEnd ?? rawYears.end;

  // Only let raw text override hint years when hints are missing or less reliable.
  // This avoids downgrading validated 4-digit hints from values like "95-96".
  const hintYearsAreReliable = isFourDigitYear(h.setYearStart) && isFourDigitYear(h.setYearEnd);
  if (rawYears.start !== null && !hintYearsAreReliable) {
    yearStart = rawYears.start;
    yearEnd = rawYears.end;
  }

  // ── Manufacturer extraction ──────────────────────────────────────────────────
  let mfrCanonical: string | null = null;

  if (h.manufacturer) {
    const lc = h.manufacturer.toLowerCase().trim();
    mfrCanonical = MFR_ALIASES.find(([alias]) => alias === lc)?.[1] ?? h.manufacturer!.trim();
  } else {
    const rawLc = raw.toLowerCase();
    for (const [alias, canonical] of MFR_ALIASES) {
      if (rawLc.includes(alias)) {
        mfrCanonical = canonical;
        break;
      }
    }
  }

  // ── Sport/domain detection ───────────────────────────────────────────────────
  let sport: string | null = h.sport?.trim() || null;
  let category: 'Sports' | 'TCG' | 'Non-Sports' = h.category ?? 'Sports';

  if (!h.category) {
    if (TCG_PATTERNS.some((p) => p.test(raw))) category = 'TCG';
    else if (NON_SPORT_PATTERNS.some((p) => p.test(raw))) category = 'Non-Sports';
    else category = 'Sports';
  }

  if (!sport) {
    for (const [pattern, canonical] of SPORT_PATTERNS) {
      if (pattern.test(raw)) {
        sport = canonical;
        break;
      }
    }
  }

  if (category !== 'Sports') {
    sport = null;
  }

  // ── Product line extraction ──────────────────────────────────────────────────
  let productLine: string | null = h.productLine?.trim() || null;

  if (!productLine) {
    let stripped = raw
      .replace(/\b\d{4}[-/]\d{2,4}\b/g, '')
      .replace(/\b\d{2}[-/]\d{2}\b/g, '')
      .replace(/\b20\d{2}\b/g, '')
      .trim();

    // Strip all sport keywords
    for (const [pattern] of SPORT_PATTERNS) {
      stripped = stripped.replace(pattern, '');
    }

    if (mfrCanonical) {
      // Remove the canonical manufacturer name (case-insensitive)
      stripped = stripped
        .replace(new RegExp(mfrCanonical.replace(/\s+/g, '\\s+'), 'gi'), '')
        .trim();
      // Also try removing any alias that resolves to this canonical
      for (const [alias, canon] of MFR_ALIASES) {
        if (canon === mfrCanonical) {
          stripped = stripped
            .replace(new RegExp(`\\b${alias}\\b`, 'gi'), '')
            .trim();
        }
      }
    }

    // Clean up punctuation artefacts
    stripped = stripped.replace(/^[\s,\-/]+|[\s,\-/]+$/g, '').replace(/\s{2,}/g, ' ').trim();
    productLine = stripped || null;
  }

  // ── Assemble outputs ─────────────────────────────────────────────────────────
  const seasonStr = yearStart !== null ? buildSeasonStr(yearStart, yearEnd) : null;

  const displayParts: string[] = [];
  if (seasonStr)    displayParts.push(seasonStr);
  if (mfrCanonical) displayParts.push(mfrCanonical);
  if (productLine)  displayParts.push(productLine);
  if (sport)        displayParts.push(sport);

  const keyParts: string[] = [];
  if (seasonStr)    keyParts.push(seasonStr);
  if (mfrCanonical) keyParts.push(mfrCanonical.toLowerCase().replace(/\s+/g, '-'));
  if (productLine)  keyParts.push(productLine.toLowerCase().replace(/\s+/g, '-'));
  if (sport)        keyParts.push(sport.toLowerCase().replace(/\s+/g, '-'));

  return {
    setDisplay:      displayParts.join(' '),
    setCanonicalKey: keyParts.join('|'),
    setYearStart:    yearStart,
    setYearEnd:      yearEnd,
    manufacturer:    mfrCanonical,
    productLine,
    sport,
    category,
  };
}

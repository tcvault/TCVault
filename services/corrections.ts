/**
 * services/corrections.ts
 *
 * Correction memory:
 * - Persist AI identify correction events.
 * - Learn repeated set corrections per user.
 * - Auto-apply learned corrections on future scans.
 */

import { supabase } from './storage';
import { Card } from '../types';

interface CorrectableSuggestion {
  set: string;
  setDisplay?: string;
  setCanonicalKey: string | null | undefined;
  setYearStart: number | null | undefined;
  setYearEnd?: number | null | undefined;
  setConfidence?: number | null;
  yearConfidence?: number | null;
  correctedByMemory?: boolean;
  [key: string]: unknown;
}

type AiSuggestion = CorrectableSuggestion;

interface CorrectionRule {
  finalSetKey: string;
  finalSetRaw?: string;
  finalYear?: number;
}

const AUTO_CORRECT_THRESHOLD = 2;

export async function writeCorrectionEvent(
  userId: string,
  savedCard: Card,
  aiSuggestion: AiSuggestion
): Promise<void> {
  if (!supabase) return;

  try {
    const finalSetKey = savedCard.setCanonicalKey ?? null;
    const aiSetKey = aiSuggestion.setCanonicalKey ?? null;
    const wasCorrected = finalSetKey !== aiSetKey;

    await supabase.from('ai_identify_corrections').insert({
      user_id: userId,
      card_id: savedCard.id,
      ai_set_raw: aiSuggestion.set,
      ai_set_key: aiSetKey,
      final_set_raw: savedCard.set,
      final_set_key: finalSetKey,
      ai_year_raw: aiSuggestion.setYearStart ?? null,
      final_year: savedCard.setYearStart ?? null,
      set_confidence: aiSuggestion.setConfidence ?? null,
      year_confidence: aiSuggestion.yearConfidence ?? null,
      was_corrected: wasCorrected,
    });
  } catch (err) {
    // Non-critical telemetry path.
    console.warn('writeCorrectionEvent failed (non-critical):', err);
  }
}

export async function getCorrectionMap(userId: string): Promise<Map<string, CorrectionRule>> {
  const result = new Map<string, CorrectionRule>();
  if (!supabase) return result;

  try {
    const { data, error } = await supabase
      .from('ai_identify_corrections')
      .select('ai_set_key, final_set_key, final_set_raw, final_year')
      .eq('user_id', userId)
      .eq('was_corrected', true)
      .not('ai_set_key', 'is', null)
      .not('final_set_key', 'is', null);

    if (error || !data) return result;

    const counts = new Map<string, Map<string, { count: number; finalSetRaw?: string; finalYear?: number }>>();

    for (const row of data) {
      const aiKey = row.ai_set_key as string;
      const finalKey = row.final_set_key as string;
      const finalSetRaw = typeof row.final_set_raw === 'string' ? row.final_set_raw : undefined;
      const finalYear = typeof row.final_year === 'number' ? row.final_year : undefined;

      if (!counts.has(aiKey)) counts.set(aiKey, new Map());
      const targets = counts.get(aiKey)!;
      const existing = targets.get(finalKey);

      if (existing) {
        existing.count += 1;
        if (!existing.finalSetRaw && finalSetRaw) existing.finalSetRaw = finalSetRaw;
        if (existing.finalYear === undefined && finalYear !== undefined) existing.finalYear = finalYear;
      } else {
        const nextBucket: { count: number; finalSetRaw?: string; finalYear?: number } = { count: 1 };
        if (finalSetRaw) nextBucket.finalSetRaw = finalSetRaw;
        if (finalYear !== undefined) nextBucket.finalYear = finalYear;
        targets.set(finalKey, nextBucket);
      }
    }

    for (const [aiKey, targets] of counts.entries()) {
      let bestKey = '';
      let best = { count: 0 } as { count: number; finalSetRaw?: string; finalYear?: number };

      for (const [finalKey, bucket] of targets.entries()) {
        if (bucket.count > best.count) {
          bestKey = finalKey;
          best = bucket;
        }
      }

      if (best.count >= AUTO_CORRECT_THRESHOLD && bestKey) {
        result.set(aiKey, {
          finalSetKey: bestKey,
          ...(best.finalSetRaw ? { finalSetRaw: best.finalSetRaw } : {}),
          ...(best.finalYear !== undefined ? { finalYear: best.finalYear } : {}),
        });
      }
    }
  } catch (err) {
    console.warn('getCorrectionMap failed (non-critical):', err);
  }

  return result;
}

export function applyAutoCorrect(
  suggestion: AiSuggestion,
  correctionMap: Map<string, CorrectionRule>
): AiSuggestion & { correctedByMemory?: boolean } {
  const key = suggestion.setCanonicalKey;
  const mapped = key ? correctionMap.get(key) : undefined;
  if (!mapped) return suggestion;

  return {
    ...suggestion,
    setCanonicalKey: mapped.finalSetKey,
    set: mapped.finalSetRaw ?? suggestion.set,
    setDisplay: mapped.finalSetRaw ?? suggestion.setDisplay ?? suggestion.set,
    setYearStart: mapped.finalYear ?? suggestion.setYearStart,
    setYearEnd: mapped.finalYear ?? suggestion.setYearEnd,
    correctedByMemory: true,
  };
}




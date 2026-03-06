/**
 * services/corrections.ts
 *
 * Phase 3 — Correction memory.
 * Writes AI identification events to `ai_identify_corrections` and builds an
 * auto-correct map so repeated corrections are applied automatically on the
 * next scan.
 */

import { supabase } from './storage';
import { Card } from '../types';

// Minimal surface of a suggestion that corrections cares about
interface CorrectableSuggestion {
  set: string;
  setCanonicalKey: string | null | undefined;
  setYearStart: number | null | undefined;
  setConfidence?: number | null;
  yearConfidence?: number | null;
  correctedByMemory?: boolean;
  [key: string]: unknown;
}

type AiSuggestion = CorrectableSuggestion;

// ── Minimum corrections before auto-correct kicks in ─────────────────────────
const AUTO_CORRECT_THRESHOLD = 2;

// ── writeCorrectionEvent ──────────────────────────────────────────────────────
/**
 * Fire-and-forget: record one identify event (corrected or confirmed) after
 * a card is successfully saved.
 */
export async function writeCorrectionEvent(
  userId: string,
  savedCard: Card,
  aiSuggestion: AiSuggestion
): Promise<void> {
  if (!supabase) return;

  try {
    const finalSetKey = savedCard.setCanonicalKey ?? null;
    const aiSetKey    = aiSuggestion.setCanonicalKey ?? null;
    const wasCorrected = finalSetKey !== aiSetKey;

    await supabase.from('ai_identify_corrections').insert({
      user_id:         userId,
      card_id:         savedCard.id,
      ai_set_raw:      aiSuggestion.set,
      ai_set_key:      aiSetKey,
      final_set_raw:   savedCard.set,
      final_set_key:   finalSetKey,
      ai_year_raw:     aiSuggestion.setYearStart ?? null,
      final_year:      savedCard.setYearStart ?? null,
      set_confidence:  aiSuggestion.setConfidence ?? null,
      year_confidence: aiSuggestion.yearConfidence ?? null,
      was_corrected:   wasCorrected,
    });
  } catch (err) {
    // Corrections are non-critical — log but never surface to user
    console.warn('writeCorrectionEvent failed (non-critical):', err);
  }
}

// ── getCorrectionMap ──────────────────────────────────────────────────────────
/**
 * Returns a Map<aiSetKey, finalSetKey> for keys where the user has corrected
 * the AI's suggestion at least AUTO_CORRECT_THRESHOLD times to the same
 * final value.
 */
export async function getCorrectionMap(userId: string): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!supabase) return result;

  try {
    const { data, error } = await supabase
      .from('ai_identify_corrections')
      .select('ai_set_key, final_set_key')
      .eq('user_id', userId)
      .eq('was_corrected', true)
      .not('ai_set_key', 'is', null)
      .not('final_set_key', 'is', null);

    if (error || !data) return result;

    // Count how many times each (ai_set_key -> final_set_key) pair occurred
    const counts = new Map<string, Map<string, number>>();
    for (const row of data) {
      const ak = row.ai_set_key as string;
      const fk = row.final_set_key as string;
      if (!counts.has(ak)) counts.set(ak, new Map());
      const inner = counts.get(ak)!;
      inner.set(fk, (inner.get(fk) ?? 0) + 1);
    }

    // Only emit pairs that hit the threshold
    for (const [aiKey, targets] of counts.entries()) {
      let bestTarget = '';
      let bestCount = 0;
      for (const [finalKey, count] of targets.entries()) {
        if (count > bestCount) { bestCount = count; bestTarget = finalKey; }
      }
      if (bestCount >= AUTO_CORRECT_THRESHOLD && bestTarget) {
        result.set(aiKey, bestTarget);
      }
    }
  } catch (err) {
    console.warn('getCorrectionMap failed (non-critical):', err);
  }

  return result;
}

// ── applyAutoCorrect ──────────────────────────────────────────────────────────
/**
 * If the suggestion's canonical key is in the correction map, patch the set
 * fields to the user's preferred value and attach `correctedByMemory: true`.
 *
 * NOTE: This only patches the *key* — the setDisplay string stays as-is
 * (the correctionMap stores keys, not display strings).  The UI shows a
 * toast when correctedByMemory is true so the user can verify.
 */
export function applyAutoCorrect(
  suggestion: AiSuggestion,
  correctionMap: Map<string, string>
): AiSuggestion & { correctedByMemory?: boolean } {
  const key = suggestion.setCanonicalKey;
  const mapped = key ? correctionMap.get(key) : undefined;
  if (!mapped) return suggestion;

  return {
    ...suggestion,
    setCanonicalKey: mapped,
    correctedByMemory: true,
  };
}

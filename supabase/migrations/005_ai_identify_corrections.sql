-- Migration 005: correction-memory table for AI identify feedback loop
-- Stores AI suggestion vs user-confirmed set identity so future scans can
-- auto-correct recurring mistakes.

CREATE TABLE IF NOT EXISTS ai_identify_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  ai_set_raw text,
  ai_set_key text,
  final_set_raw text,
  final_set_key text,
  ai_year_raw integer,
  final_year integer,
  set_confidence double precision,
  year_confidence double precision,
  was_corrected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_identify_corrections_user_created
  ON ai_identify_corrections(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_identify_corrections_user_corrected_lookup
  ON ai_identify_corrections(user_id, ai_set_key, final_set_key)
  WHERE was_corrected = true;

ALTER TABLE ai_identify_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_identify_corrections_select_own
  ON ai_identify_corrections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY ai_identify_corrections_insert_own
  ON ai_identify_corrections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

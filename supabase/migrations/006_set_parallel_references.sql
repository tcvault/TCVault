-- Migration 006: user-owned parallel reference library
-- Structured personal-use facts for set/parallel identification guidance.

CREATE TABLE IF NOT EXISTS set_parallel_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  set_canonical_key text NOT NULL,
  set_display text,
  manufacturer text,
  product_line text,
  sport text,
  category text CHECK (category IN ('Sports', 'TCG', 'Non-Sports')),
  parallel_name text NOT NULL,
  serial_format text,
  rarity_tier text CHECK (rarity_tier IN ('Base', 'Parallel', 'Chase', '1/1')),
  print_run integer,
  notes text,
  source_url text NOT NULL,
  source_label text,
  personal_use_only boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_set_parallel_references_user_set
  ON set_parallel_references(user_id, set_canonical_key);

CREATE INDEX IF NOT EXISTS idx_set_parallel_references_user_set_parallel
  ON set_parallel_references(user_id, set_canonical_key, parallel_name);

ALTER TABLE set_parallel_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY set_parallel_references_select_own
  ON set_parallel_references
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY set_parallel_references_insert_own
  ON set_parallel_references
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY set_parallel_references_update_own
  ON set_parallel_references
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY set_parallel_references_delete_own
  ON set_parallel_references
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION set_parallel_references_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_parallel_references_updated_at ON set_parallel_references;
CREATE TRIGGER trg_set_parallel_references_updated_at
BEFORE UPDATE ON set_parallel_references
FOR EACH ROW
EXECUTE FUNCTION set_parallel_references_touch_updated_at();

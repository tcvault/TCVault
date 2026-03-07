-- Migration 008: Harden function search_path for linter compliance

CREATE OR REPLACE FUNCTION set_parallel_references_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

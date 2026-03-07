-- Migration 009: shared rate limiting via Supabase RPC

CREATE TABLE IF NOT EXISTS api_rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_updated_at ON api_rate_limits(updated_at);

CREATE OR REPLACE FUNCTION consume_rate_limit(
  p_key text,
  p_window_seconds integer,
  p_max integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_window_seconds <= 0 OR p_max <= 0 THEN
    RAISE EXCEPTION 'Invalid rate limit parameters';
  END IF;

  INSERT INTO api_rate_limits AS rl (key, count, window_start, updated_at)
  VALUES (p_key, 1, now(), now())
  ON CONFLICT (key)
  DO UPDATE SET
    count = CASE
      WHEN rl.window_start <= now() - make_interval(secs => p_window_seconds) THEN 1
      ELSE rl.count + 1
    END,
    window_start = CASE
      WHEN rl.window_start <= now() - make_interval(secs => p_window_seconds) THEN now()
      ELSE rl.window_start
    END,
    updated_at = now()
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

REVOKE ALL ON TABLE api_rate_limits FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION consume_rate_limit(text, integer, integer) TO authenticated;

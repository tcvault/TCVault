-- Migration 010: tighten alert insertion and add secure thread-reply notifier

DROP POLICY IF EXISTS alerts_insert_authenticated ON alerts;
DROP POLICY IF EXISTS alerts_insert_own ON alerts;
CREATE POLICY alerts_insert_own
  ON alerts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION create_thread_reply_alert(
  p_thread_id uuid,
  p_commenter_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_user_id uuid;
  v_thread_title text;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_commenter_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot create alert for another user''s action'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT creator_user_id, title
  INTO v_creator_user_id, v_thread_title
  FROM release_threads
  WHERE id = p_thread_id;

  IF v_creator_user_id IS NULL OR v_creator_user_id = p_commenter_user_id THEN
    RETURN;
  END IF;

  INSERT INTO alerts (user_id, alert_type, payload, is_read)
  VALUES (
    v_creator_user_id,
    'thread_reply',
    jsonb_build_object(
      'threadId', p_thread_id,
      'threadTitle', COALESCE(v_thread_title, 'thread'),
      'commenterUserId', p_commenter_user_id
    ),
    false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_thread_reply_alert(uuid, uuid) TO authenticated;

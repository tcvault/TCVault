-- Migration 002: Add auth checks to RPC functions.
--
-- The original functions were SECURITY DEFINER with no caller identity checks,
-- meaning any authenticated (or unauthenticated) client could call them on
-- behalf of any user_id they supplied.
--
-- These replacements verify that auth.uid() matches the supplied user_id
-- before making any changes.  Callers that pass a mismatched user_id receive
-- a FORBIDDEN exception rather than silently mutating another user's data.

-- ---------------------------------------------------------------------------
-- toggle_post_like
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION toggle_post_like(p_post_id uuid, p_user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the calling user is who they claim to be.
  IF auth.uid()::text IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot like as another user'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE social_posts
  SET likes = CASE
    WHEN p_user_id = ANY(likes) THEN array_remove(likes, p_user_id)
    ELSE array_append(COALESCE(likes, ARRAY[]::text[]), p_user_id)
  END
  WHERE id = p_post_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- add_post_comment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION add_post_comment(p_post_id uuid, p_comment jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_comment_user_id text;
BEGIN
  -- Extract the userId embedded in the comment object and verify it matches
  -- the authenticated caller.
  v_comment_user_id := p_comment->>'userId';

  IF auth.uid()::text IS DISTINCT FROM v_comment_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot comment as another user'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE social_posts
  SET comments = COALESCE(comments, '[]'::jsonb) || jsonb_build_array(p_comment)
  WHERE id = p_post_id;
END;
$$;

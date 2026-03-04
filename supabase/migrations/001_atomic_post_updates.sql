-- Atomic toggle like: adds or removes a user from the likes array in a single statement.
-- Eliminates the read-modify-write retry loop and race conditions.
CREATE OR REPLACE FUNCTION toggle_post_like(p_post_id uuid, p_user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE social_posts
  SET likes = CASE
    WHEN p_user_id = ANY(likes) THEN array_remove(likes, p_user_id)
    ELSE array_append(COALESCE(likes, ARRAY[]::text[]), p_user_id)
  END
  WHERE id = p_post_id;
END;
$$;

-- Atomic add comment: appends a comment object to the comments jsonb array.
-- Eliminates the read-modify-write retry loop and race conditions.
CREATE OR REPLACE FUNCTION add_post_comment(p_post_id uuid, p_comment jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE social_posts
  SET comments = COALESCE(comments, '[]'::jsonb) || jsonb_build_array(p_comment)
  WHERE id = p_post_id;
END;
$$;

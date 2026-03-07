-- Migration 012: remove legacy duplicate delete policy on social_posts

DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.social_posts;

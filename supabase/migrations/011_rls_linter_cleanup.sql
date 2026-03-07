-- Migration 011: RLS linter cleanup
-- - Replace auth.uid() calls with (select auth.uid()) in policy predicates
-- - Remove duplicate permissive policies

-- pages
ALTER TABLE IF EXISTS public.pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own pages" ON public.pages;
DROP POLICY IF EXISTS pages_select_own ON public.pages;
DROP POLICY IF EXISTS pages_insert_own ON public.pages;
DROP POLICY IF EXISTS pages_update_own ON public.pages;
DROP POLICY IF EXISTS pages_delete_own ON public.pages;
CREATE POLICY pages_select_own ON public.pages FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY pages_insert_own ON public.pages FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY pages_update_own ON public.pages FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY pages_delete_own ON public.pages FOR DELETE USING ((select auth.uid()) = user_id);

-- cards
ALTER TABLE IF EXISTS public.cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own cards" ON public.cards;
DROP POLICY IF EXISTS "Cards visibility" ON public.cards;
DROP POLICY IF EXISTS cards_select_visible_or_owner ON public.cards;
DROP POLICY IF EXISTS cards_insert_own ON public.cards;
DROP POLICY IF EXISTS cards_update_own ON public.cards;
DROP POLICY IF EXISTS cards_delete_own ON public.cards;
CREATE POLICY cards_select_visible_or_owner ON public.cards
  FOR SELECT
  USING ((is_public = true) OR ((select auth.uid()) = user_id));
CREATE POLICY cards_insert_own ON public.cards
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY cards_update_own ON public.cards
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY cards_delete_own ON public.cards
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- profiles
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT
  WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- social_posts
ALTER TABLE IF EXISTS public.social_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can create posts" ON public.social_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.social_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.social_posts;
CREATE POLICY "Users can create posts" ON public.social_posts
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own posts" ON public.social_posts
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own posts" ON public.social_posts
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- notifications
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT
  USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
  FOR INSERT
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- ai_identify_corrections
ALTER TABLE IF EXISTS public.ai_identify_corrections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own corrections" ON public.ai_identify_corrections;
DROP POLICY IF EXISTS ai_identify_corrections_select_own ON public.ai_identify_corrections;
DROP POLICY IF EXISTS ai_identify_corrections_insert_own ON public.ai_identify_corrections;
DROP POLICY IF EXISTS ai_identify_corrections_update_own ON public.ai_identify_corrections;
DROP POLICY IF EXISTS ai_identify_corrections_delete_own ON public.ai_identify_corrections;
CREATE POLICY ai_identify_corrections_select_own ON public.ai_identify_corrections
  FOR SELECT
  USING ((select auth.uid()) = user_id);
CREATE POLICY ai_identify_corrections_insert_own ON public.ai_identify_corrections
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY ai_identify_corrections_update_own ON public.ai_identify_corrections
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY ai_identify_corrections_delete_own ON public.ai_identify_corrections
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- set_parallel_references
ALTER TABLE IF EXISTS public.set_parallel_references ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS set_parallel_references_select_own ON public.set_parallel_references;
DROP POLICY IF EXISTS set_parallel_references_insert_own ON public.set_parallel_references;
DROP POLICY IF EXISTS set_parallel_references_update_own ON public.set_parallel_references;
DROP POLICY IF EXISTS set_parallel_references_delete_own ON public.set_parallel_references;
CREATE POLICY set_parallel_references_select_own ON public.set_parallel_references
  FOR SELECT
  USING ((select auth.uid()) = user_id);
CREATE POLICY set_parallel_references_insert_own ON public.set_parallel_references
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY set_parallel_references_update_own ON public.set_parallel_references
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY set_parallel_references_delete_own ON public.set_parallel_references
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- wants
ALTER TABLE IF EXISTS public.wants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wants_insert_own ON public.wants;
DROP POLICY IF EXISTS wants_update_own ON public.wants;
DROP POLICY IF EXISTS wants_delete_own ON public.wants;
CREATE POLICY wants_insert_own ON public.wants
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY wants_update_own ON public.wants
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY wants_delete_own ON public.wants
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- release_threads
ALTER TABLE IF EXISTS public.release_threads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS release_threads_insert_own ON public.release_threads;
DROP POLICY IF EXISTS release_threads_update_own ON public.release_threads;
DROP POLICY IF EXISTS release_threads_delete_own ON public.release_threads;
CREATE POLICY release_threads_insert_own ON public.release_threads
  FOR INSERT
  WITH CHECK ((select auth.uid()) = creator_user_id);
CREATE POLICY release_threads_update_own ON public.release_threads
  FOR UPDATE
  USING ((select auth.uid()) = creator_user_id)
  WITH CHECK ((select auth.uid()) = creator_user_id);
CREATE POLICY release_threads_delete_own ON public.release_threads
  FOR DELETE
  USING ((select auth.uid()) = creator_user_id);

-- thread_comments
ALTER TABLE IF EXISTS public.thread_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS thread_comments_insert_own ON public.thread_comments;
DROP POLICY IF EXISTS thread_comments_update_own ON public.thread_comments;
DROP POLICY IF EXISTS thread_comments_delete_own ON public.thread_comments;
CREATE POLICY thread_comments_insert_own ON public.thread_comments
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY thread_comments_update_own ON public.thread_comments
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY thread_comments_delete_own ON public.thread_comments
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- alerts
ALTER TABLE IF EXISTS public.alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alerts_select_own ON public.alerts;
DROP POLICY IF EXISTS alerts_insert_own ON public.alerts;
DROP POLICY IF EXISTS alerts_update_own ON public.alerts;
DROP POLICY IF EXISTS alerts_delete_own ON public.alerts;
CREATE POLICY alerts_select_own ON public.alerts
  FOR SELECT
  USING ((select auth.uid()) = user_id);
CREATE POLICY alerts_insert_own ON public.alerts
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY alerts_update_own ON public.alerts
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY alerts_delete_own ON public.alerts
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- follows
ALTER TABLE IF EXISTS public.follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS follows_select_authenticated ON public.follows;
DROP POLICY IF EXISTS follows_insert_own ON public.follows;
DROP POLICY IF EXISTS follows_delete_own ON public.follows;
CREATE POLICY follows_select_authenticated ON public.follows
  FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY follows_insert_own ON public.follows
  FOR INSERT
  WITH CHECK ((select auth.uid()) = follower_user_id);
CREATE POLICY follows_delete_own ON public.follows
  FOR DELETE
  USING ((select auth.uid()) = follower_user_id);

-- valuation_history
ALTER TABLE IF EXISTS public.valuation_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS valuation_history_select_own ON public.valuation_history;
DROP POLICY IF EXISTS valuation_history_insert_own ON public.valuation_history;
DROP POLICY IF EXISTS valuation_history_update_own ON public.valuation_history;
DROP POLICY IF EXISTS valuation_history_delete_own ON public.valuation_history;
CREATE POLICY valuation_history_select_own ON public.valuation_history
  FOR SELECT
  USING ((select auth.uid()) = user_id);
CREATE POLICY valuation_history_insert_own ON public.valuation_history
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY valuation_history_update_own ON public.valuation_history
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY valuation_history_delete_own ON public.valuation_history
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- card_field_events
ALTER TABLE IF EXISTS public.card_field_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS card_field_events_select_own ON public.card_field_events;
DROP POLICY IF EXISTS card_field_events_insert_own_or_system ON public.card_field_events;
DROP POLICY IF EXISTS card_field_events_update_own ON public.card_field_events;
DROP POLICY IF EXISTS card_field_events_delete_own ON public.card_field_events;
CREATE POLICY card_field_events_select_own ON public.card_field_events
  FOR SELECT
  USING ((select auth.uid()) = user_id);
CREATE POLICY card_field_events_insert_own_or_system ON public.card_field_events
  FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id) OR (user_id IS NULL));
CREATE POLICY card_field_events_update_own ON public.card_field_events
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY card_field_events_delete_own ON public.card_field_events
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- moderation tables
ALTER TABLE IF EXISTS public.post_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS post_reports_select_own ON public.post_reports;
DROP POLICY IF EXISTS post_reports_insert_own ON public.post_reports;
DROP POLICY IF EXISTS post_reports_update_own ON public.post_reports;
DROP POLICY IF EXISTS post_reports_delete_own ON public.post_reports;
CREATE POLICY post_reports_select_own ON public.post_reports
  FOR SELECT
  USING ((select auth.uid()) = reporter_user_id);
CREATE POLICY post_reports_insert_own ON public.post_reports
  FOR INSERT
  WITH CHECK ((select auth.uid()) = reporter_user_id);
CREATE POLICY post_reports_update_own ON public.post_reports
  FOR UPDATE
  USING ((select auth.uid()) = reporter_user_id)
  WITH CHECK ((select auth.uid()) = reporter_user_id);
CREATE POLICY post_reports_delete_own ON public.post_reports
  FOR DELETE
  USING ((select auth.uid()) = reporter_user_id);

ALTER TABLE IF EXISTS public.thread_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS thread_reports_select_own ON public.thread_reports;
DROP POLICY IF EXISTS thread_reports_insert_own ON public.thread_reports;
DROP POLICY IF EXISTS thread_reports_update_own ON public.thread_reports;
DROP POLICY IF EXISTS thread_reports_delete_own ON public.thread_reports;
CREATE POLICY thread_reports_select_own ON public.thread_reports
  FOR SELECT
  USING ((select auth.uid()) = reporter_user_id);
CREATE POLICY thread_reports_insert_own ON public.thread_reports
  FOR INSERT
  WITH CHECK ((select auth.uid()) = reporter_user_id);
CREATE POLICY thread_reports_update_own ON public.thread_reports
  FOR UPDATE
  USING ((select auth.uid()) = reporter_user_id)
  WITH CHECK ((select auth.uid()) = reporter_user_id);
CREATE POLICY thread_reports_delete_own ON public.thread_reports
  FOR DELETE
  USING ((select auth.uid()) = reporter_user_id);

ALTER TABLE IF EXISTS public.want_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS want_reports_select_own ON public.want_reports;
DROP POLICY IF EXISTS want_reports_insert_own ON public.want_reports;
DROP POLICY IF EXISTS want_reports_update_own ON public.want_reports;
DROP POLICY IF EXISTS want_reports_delete_own ON public.want_reports;
CREATE POLICY want_reports_select_own ON public.want_reports
  FOR SELECT
  USING ((select auth.uid()) = reporter_user_id);
CREATE POLICY want_reports_insert_own ON public.want_reports
  FOR INSERT
  WITH CHECK ((select auth.uid()) = reporter_user_id);
CREATE POLICY want_reports_update_own ON public.want_reports
  FOR UPDATE
  USING ((select auth.uid()) = reporter_user_id)
  WITH CHECK ((select auth.uid()) = reporter_user_id);
CREATE POLICY want_reports_delete_own ON public.want_reports
  FOR DELETE
  USING ((select auth.uid()) = reporter_user_id);

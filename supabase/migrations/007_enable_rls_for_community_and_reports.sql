-- Migration 007: Enable RLS on community/moderation tables with explicit access policies

-- ---------------------------------------------------------------------------
-- Stage 1 community tables
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS wants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS release_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS thread_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS valuation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS card_field_events ENABLE ROW LEVEL SECURITY;

-- wants: public read, owners manage their own rows
DROP POLICY IF EXISTS wants_select_all ON wants;
CREATE POLICY wants_select_all
  ON wants
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS wants_insert_own ON wants;
CREATE POLICY wants_insert_own
  ON wants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS wants_update_own ON wants;
CREATE POLICY wants_update_own
  ON wants
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS wants_delete_own ON wants;
CREATE POLICY wants_delete_own
  ON wants
  FOR DELETE
  USING (auth.uid() = user_id);

-- release_threads: public read, creator manages own thread
DROP POLICY IF EXISTS release_threads_select_all ON release_threads;
CREATE POLICY release_threads_select_all
  ON release_threads
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS release_threads_insert_own ON release_threads;
CREATE POLICY release_threads_insert_own
  ON release_threads
  FOR INSERT
  WITH CHECK (auth.uid() = creator_user_id);

DROP POLICY IF EXISTS release_threads_update_own ON release_threads;
CREATE POLICY release_threads_update_own
  ON release_threads
  FOR UPDATE
  USING (auth.uid() = creator_user_id)
  WITH CHECK (auth.uid() = creator_user_id);

DROP POLICY IF EXISTS release_threads_delete_own ON release_threads;
CREATE POLICY release_threads_delete_own
  ON release_threads
  FOR DELETE
  USING (auth.uid() = creator_user_id);

-- thread_comments: public read, author manages own comments
DROP POLICY IF EXISTS thread_comments_select_all ON thread_comments;
CREATE POLICY thread_comments_select_all
  ON thread_comments
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS thread_comments_insert_own ON thread_comments;
CREATE POLICY thread_comments_insert_own
  ON thread_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS thread_comments_update_own ON thread_comments;
CREATE POLICY thread_comments_update_own
  ON thread_comments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS thread_comments_delete_own ON thread_comments;
CREATE POLICY thread_comments_delete_own
  ON thread_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- alerts: users can read/update/delete their own alerts;
-- inserts are allowed for authenticated users so app workflows can notify others.
DROP POLICY IF EXISTS alerts_select_own ON alerts;
CREATE POLICY alerts_select_own
  ON alerts
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS alerts_insert_authenticated ON alerts;
CREATE POLICY alerts_insert_authenticated
  ON alerts
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS alerts_update_own ON alerts;
CREATE POLICY alerts_update_own
  ON alerts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS alerts_delete_own ON alerts;
CREATE POLICY alerts_delete_own
  ON alerts
  FOR DELETE
  USING (auth.uid() = user_id);

-- follows: authenticated users can read graph; users manage follows where they are the follower
DROP POLICY IF EXISTS follows_select_authenticated ON follows;
CREATE POLICY follows_select_authenticated
  ON follows
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS follows_insert_own ON follows;
CREATE POLICY follows_insert_own
  ON follows
  FOR INSERT
  WITH CHECK (auth.uid() = follower_user_id);

DROP POLICY IF EXISTS follows_delete_own ON follows;
CREATE POLICY follows_delete_own
  ON follows
  FOR DELETE
  USING (auth.uid() = follower_user_id);

-- valuation_history: private to owner
DROP POLICY IF EXISTS valuation_history_select_own ON valuation_history;
CREATE POLICY valuation_history_select_own
  ON valuation_history
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS valuation_history_insert_own ON valuation_history;
CREATE POLICY valuation_history_insert_own
  ON valuation_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS valuation_history_update_own ON valuation_history;
CREATE POLICY valuation_history_update_own
  ON valuation_history
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS valuation_history_delete_own ON valuation_history;
CREATE POLICY valuation_history_delete_own
  ON valuation_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- card_field_events: private to owner (or system/service role)
DROP POLICY IF EXISTS card_field_events_select_own ON card_field_events;
CREATE POLICY card_field_events_select_own
  ON card_field_events
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS card_field_events_insert_own_or_system ON card_field_events;
CREATE POLICY card_field_events_insert_own_or_system
  ON card_field_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS card_field_events_update_own ON card_field_events;
CREATE POLICY card_field_events_update_own
  ON card_field_events
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS card_field_events_delete_own ON card_field_events;
CREATE POLICY card_field_events_delete_own
  ON card_field_events
  FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Stage 4 moderation tables
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS thread_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS want_reports ENABLE ROW LEVEL SECURITY;

-- reports: reporter can create/read/manage own reports
DROP POLICY IF EXISTS post_reports_select_own ON post_reports;
CREATE POLICY post_reports_select_own
  ON post_reports
  FOR SELECT
  USING (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS post_reports_insert_own ON post_reports;
CREATE POLICY post_reports_insert_own
  ON post_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS post_reports_update_own ON post_reports;
CREATE POLICY post_reports_update_own
  ON post_reports
  FOR UPDATE
  USING (auth.uid() = reporter_user_id)
  WITH CHECK (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS post_reports_delete_own ON post_reports;
CREATE POLICY post_reports_delete_own
  ON post_reports
  FOR DELETE
  USING (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS thread_reports_select_own ON thread_reports;
CREATE POLICY thread_reports_select_own
  ON thread_reports
  FOR SELECT
  USING (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS thread_reports_insert_own ON thread_reports;
CREATE POLICY thread_reports_insert_own
  ON thread_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS thread_reports_update_own ON thread_reports;
CREATE POLICY thread_reports_update_own
  ON thread_reports
  FOR UPDATE
  USING (auth.uid() = reporter_user_id)
  WITH CHECK (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS thread_reports_delete_own ON thread_reports;
CREATE POLICY thread_reports_delete_own
  ON thread_reports
  FOR DELETE
  USING (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS want_reports_select_own ON want_reports;
CREATE POLICY want_reports_select_own
  ON want_reports
  FOR SELECT
  USING (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS want_reports_insert_own ON want_reports;
CREATE POLICY want_reports_insert_own
  ON want_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS want_reports_update_own ON want_reports;
CREATE POLICY want_reports_update_own
  ON want_reports
  FOR UPDATE
  USING (auth.uid() = reporter_user_id)
  WITH CHECK (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS want_reports_delete_own ON want_reports;
CREATE POLICY want_reports_delete_own
  ON want_reports
  FOR DELETE
  USING (auth.uid() = reporter_user_id);

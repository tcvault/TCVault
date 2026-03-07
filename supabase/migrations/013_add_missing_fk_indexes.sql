-- Migration 013: add covering indexes for unindexed foreign keys flagged by linter

CREATE INDEX IF NOT EXISTS idx_ai_identify_corrections_card_id ON public.ai_identify_corrections(card_id);
CREATE INDEX IF NOT EXISTS idx_card_field_events_user_id ON public.card_field_events(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_user_id ON public.follows(following_user_id);
CREATE INDEX IF NOT EXISTS idx_pages_user_id ON public.pages(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_reporter_user_id ON public.post_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_reviewed_by ON public.post_reports(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_release_threads_creator_user_id ON public.release_threads(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON public.social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_comments_parent_comment_id ON public.thread_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_thread_comments_user_id ON public.thread_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_reports_reporter_user_id ON public.thread_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_thread_reports_reviewed_by ON public.thread_reports(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_valuation_history_user_id ON public.valuation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_want_reports_reporter_user_id ON public.want_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_want_reports_reviewed_by ON public.want_reports(reviewed_by);

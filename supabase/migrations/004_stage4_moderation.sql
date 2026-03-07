-- Migration 004: Stage 4 moderation/reporting support

CREATE TABLE IF NOT EXISTS post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  reporter_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE (post_id, reporter_user_id)
);

CREATE TABLE IF NOT EXISTS thread_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES release_threads(id) ON DELETE CASCADE,
  reporter_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE (thread_id, reporter_user_id)
);

CREATE TABLE IF NOT EXISTS want_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  want_id uuid NOT NULL REFERENCES wants(id) ON DELETE CASCADE,
  reporter_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE (want_id, reporter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_reports_status_created ON post_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thread_reports_status_created ON thread_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_want_reports_status_created ON want_reports(status, created_at DESC);

-- Migration 003: Stage 1 foundation entities + canonical indexing
-- Purpose: establish core data primitives for wants, release discussions,
-- notifications, valuation snapshots, and field-level provenance.

-- Ensure cards table has canonical identity columns used across the app.
ALTER TABLE IF EXISTS cards
  ADD COLUMN IF NOT EXISTS set_canonical_key text,
  ADD COLUMN IF NOT EXISTS set_year_start integer,
  ADD COLUMN IF NOT EXISTS set_year_end integer,
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS product_line text,
  ADD COLUMN IF NOT EXISTS sport text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS market_value_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS market_meta jsonb;

-- Collector wants board entries (first-class wants, not generic posts)
CREATE TABLE IF NOT EXISTS wants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  details text,
  player_name text,
  card_specifics text,
  set_display text,
  set_canonical_key text,
  set_year_start integer,
  set_year_end integer,
  manufacturer text,
  product_line text,
  sport text,
  category text CHECK (category IN ('Sports', 'TCG', 'Non-Sports')),
  target_price_gbp numeric(12,2),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'fulfilled', 'archived')),
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Structured release/set threads
CREATE TABLE IF NOT EXISTS release_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  set_display text,
  set_canonical_key text,
  category text NOT NULL DEFAULT 'release' CHECK (category IN ('release', 'discussion', 'event')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Thread comments with optional parent for replies
CREATE TABLE IF NOT EXISTS thread_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES release_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES thread_comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Collector follow graph
CREATE TABLE IF NOT EXISTS follows (
  follower_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_user_id, following_user_id),
  CONSTRAINT follows_not_self CHECK (follower_user_id <> following_user_id)
);

-- User notification/alert inbox
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('want_match', 'price_change', 'thread_reply', 'system')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

-- Immutable valuation snapshots for trend analysis
CREATE TABLE IF NOT EXISTS valuation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  value_low_gbp numeric(12,2),
  value_mid_gbp numeric(12,2) NOT NULL,
  value_high_gbp numeric(12,2),
  confidence text CHECK (confidence IN ('low', 'medium', 'high')),
  comps_used integer,
  source text NOT NULL DEFAULT 'market_meta_v1',
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Provenance log for card field edits (AI vs user vs system)
CREATE TABLE IF NOT EXISTS card_field_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  field_name text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  source text NOT NULL CHECK (source IN ('ai', 'user', 'system')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Canonical identity indexes on cards for fast retrieval and matching
CREATE INDEX IF NOT EXISTS idx_cards_user_set_key ON cards(user_id, set_canonical_key);
CREATE INDEX IF NOT EXISTS idx_cards_set_key ON cards(set_canonical_key);
CREATE INDEX IF NOT EXISTS idx_cards_category_sport ON cards(category, sport);
CREATE INDEX IF NOT EXISTS idx_cards_mfr_product_line ON cards(manufacturer, product_line);

-- Wants and thread indexes
CREATE INDEX IF NOT EXISTS idx_wants_user_status ON wants(user_id, status);
CREATE INDEX IF NOT EXISTS idx_wants_set_key ON wants(set_canonical_key);
CREATE INDEX IF NOT EXISTS idx_release_threads_set_key ON release_threads(set_canonical_key);
CREATE INDEX IF NOT EXISTS idx_thread_comments_thread_created ON thread_comments(thread_id, created_at DESC);

-- Feed and notifications indexes
CREATE INDEX IF NOT EXISTS idx_alerts_user_read_created ON alerts(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_valuation_history_card_created ON valuation_history(card_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_card_field_events_card_created ON card_field_events(card_id, created_at DESC);

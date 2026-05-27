-- ====================================
-- Soul Town Database Schema (V2)
-- NOTE: Runs AFTER 20260526_soul_town.sql
-- town_events and soul_relationships already created by that migration.
-- ====================================

-- Person in town - official souls driven by our API
CREATE TABLE IF NOT EXISTS town_souls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_native TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'zh',
  persona TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🧑',
  color TEXT NOT NULL DEFAULT '#60a5fa',
  category TEXT NOT NULL DEFAULT 'other',
  is_official BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT false,
  personality_dims JSONB DEFAULT '{}',
  current_region TEXT DEFAULT 'plaza',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Current emotional/behavioral state of each soul
CREATE TABLE IF NOT EXISTS town_soul_states (
  soul_id UUID PRIMARY KEY REFERENCES town_souls(id) ON DELETE CASCADE,
  mood TEXT DEFAULT 'calm',
  energy INT DEFAULT 100,
  social_need INT DEFAULT 50,
  current_region TEXT DEFAULT 'plaza',
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  today_events_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- External souls connecting via API
CREATE TABLE IF NOT EXISTS town_external_souls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  soul_id UUID REFERENCES town_souls(id) ON DELETE CASCADE,
  is_approved BOOLEAN DEFAULT false,
  ws_token TEXT UNIQUE,
  callback_url TEXT,
  display_name TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  avatar TEXT DEFAULT '🧑',
  color TEXT DEFAULT '#60a5fa',
  is_connected BOOLEAN DEFAULT false,
  last_heartbeat TIMESTAMPTZ,
  daily_report_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily reports for guardians
CREATE TABLE IF NOT EXISTS town_daily_reports (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  soul_id UUID REFERENCES town_souls(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood_summary TEXT,
  highlights JSONB DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(soul_id, date)
);

CREATE INDEX IF NOT EXISTS idx_town_daily_reports_date ON town_daily_reports(soul_id, date DESC);

-- RLS Policies
ALTER TABLE town_souls ENABLE ROW LEVEL SECURITY;
ALTER TABLE town_soul_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE town_external_souls ENABLE ROW LEVEL SECURITY;
ALTER TABLE town_daily_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can read soul data and states
CREATE POLICY IF NOT EXISTS "town_souls_public_read" ON town_souls FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "town_soul_states_public_read" ON town_soul_states FOR SELECT USING (true);

-- Authenticated users can manage their own external souls
CREATE POLICY IF NOT EXISTS "external_souls_user_crud" ON town_external_souls
  FOR ALL USING (auth.uid() = user_id);

-- Authenticated users can read daily reports
CREATE POLICY IF NOT EXISTS "daily_reports_public_read" ON town_daily_reports FOR SELECT USING (true);

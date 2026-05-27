-- ====================================
-- Soul Town Database Schema
-- ====================================

-- Person in town - official souls driven by our API
CREATE TABLE IF NOT EXISTS town_souls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,             -- Display name (e.g., "Su Dongpo")
  name_native TEXT NOT NULL,      -- Native name (e.g., "苏轼")
  language TEXT NOT NULL DEFAULT 'zh',  -- 'zh', 'en', 'ja', 'de', etc.
  persona TEXT NOT NULL,          -- Full persona prompt
  avatar TEXT NOT NULL DEFAULT '🧑',  -- Emoji avatar
  color TEXT NOT NULL DEFAULT '#60a5fa',  -- Hex color
  category TEXT NOT NULL DEFAULT 'other', -- 'poet', 'scientist', 'philosopher', 'artist', etc.
  is_official BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT false,
  personality_dims JSONB DEFAULT '{}',  -- 7-dimension extraction data
  current_region TEXT DEFAULT 'plaza',  -- Current location in town
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Current emotional/behavioral state of each soul
CREATE TABLE IF NOT EXISTS town_soul_states (
  soul_id UUID PRIMARY KEY REFERENCES town_souls(id) ON DELETE CASCADE,
  mood TEXT DEFAULT 'calm',  -- 'happy', 'calm', 'melancholic', 'anxious', 'inspired'
  energy INT DEFAULT 100,    -- 0-100, drains with activity
  social_need INT DEFAULT 50,  -- 0-100, increases when alone
  current_region TEXT DEFAULT 'plaza',
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  today_events_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events that happen in town (conversations, reflections, creative work)
CREATE TABLE IF NOT EXISTS town_events (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  type TEXT NOT NULL DEFAULT 'conversation',  -- 'conversation', 'reflection', 'creative_work'
  location TEXT NOT NULL,  -- region where event happened
  participants UUID[],      -- soul IDs involved
  content JSONB NOT NULL DEFAULT '{}',
  public_excerpts TEXT[] DEFAULT '{}',  -- Shareable quotes for feed
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  is_public BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_town_events_generated_at ON town_events(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_town_events_type ON town_events(type);
CREATE INDEX IF NOT EXISTS idx_town_events_participants ON town_events USING GIN(participants);

-- External souls connecting via API
CREATE TABLE IF NOT EXISTS town_external_souls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  soul_id UUID REFERENCES town_souls(id) ON DELETE CASCADE,
  is_approved BOOLEAN DEFAULT false,
  ws_token TEXT UNIQUE,
  callback_url TEXT,  -- REST webhook for event delivery
  display_name TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  avatar TEXT DEFAULT '🧑',
  color TEXT DEFAULT '#60a5fa',
  is_connected BOOLEAN DEFAULT false,
  last_heartbeat TIMESTAMPTZ,
  daily_report_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relationships between souls
CREATE TABLE IF NOT EXISTS soul_relationships (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  soul_a UUID REFERENCES town_souls(id) ON DELETE CASCADE,
  soul_b UUID REFERENCES town_souls(id) ON DELETE CASCADE,
  trust INT DEFAULT 0,      -- 0-100
  intimacy INT DEFAULT 0,    -- 0-100
  interaction_count INT DEFAULT 0,
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(soul_a, soul_b)
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
ALTER TABLE town_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE town_external_souls ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE town_daily_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can read soul data and events
CREATE POLICY "town_souls_public_read" ON town_souls FOR SELECT USING (true);
CREATE POLICY "town_soul_states_public_read" ON town_soul_states FOR SELECT USING (true);
CREATE POLICY "town_events_public_read" ON town_events FOR SELECT USING (is_public = true);

-- Authenticated users can manage their own external souls
CREATE POLICY "external_souls_user_crud" ON town_external_souls
  FOR ALL USING (auth.uid() = user_id);

-- Authenticated users can read daily reports
CREATE POLICY "daily_reports_public_read" ON town_daily_reports FOR SELECT USING (true);

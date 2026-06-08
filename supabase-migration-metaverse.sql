-- UpAgora Soul Town: Internet Traces + Daily Chronicles tables
-- Run this in Supabase SQL Editor to enable the new metaverse features.

-- Internet Traces: souls explore the web and bring back discoveries
CREATE TABLE IF NOT EXISTS internet_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  soul_id uuid NOT NULL,
  soul_name text NOT NULL,
  url text NOT NULL,
  site_label text,
  category text DEFAULT 'exploration',
  discovery text NOT NULL,
  quote text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups by soul
CREATE INDEX IF NOT EXISTS idx_internet_traces_soul ON internet_traces(soul_id);
CREATE INDEX IF NOT EXISTS idx_internet_traces_created ON internet_traces(created_at DESC);

-- Daily Chronicles: poetic journal entries for each soul
CREATE TABLE IF NOT EXISTS daily_chronicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  soul_id uuid NOT NULL,
  soul_name text NOT NULL,
  date date NOT NULL DEFAULT (now()::date),
  entry text NOT NULL DEFAULT '',
  quote text DEFAULT '',
  mood text DEFAULT 'peaceful',
  highlights jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(soul_id, date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_daily_chronicles_soul ON daily_chronicles(soul_id);
CREATE INDEX IF NOT EXISTS idx_daily_chronicles_date ON daily_chronicles(date DESC);

-- Enable RLS (but allow authenticated reads)
ALTER TABLE internet_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_chronicles ENABLE ROW LEVEL SECURITY;

-- Public read policies (these are public-facing displays)
CREATE POLICY "internet_traces_public_read" ON internet_traces FOR SELECT USING (true);
CREATE POLICY "daily_chronicles_public_read" ON daily_chronicles FOR SELECT USING (true);

-- Authenticated/insert policies (server-side inserts via service role bypass RLS)
CREATE POLICY "internet_traces_service_insert" ON internet_traces FOR ALL USING (true);
CREATE POLICY "daily_chronicles_service_insert" ON daily_chronicles FOR ALL USING (true);

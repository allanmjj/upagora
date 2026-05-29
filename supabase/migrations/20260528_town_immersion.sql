-- Migration: 20260528_town_immersion.sql
-- Adds: town_chat_history, town_guardian_visits, enhances soul_relationships

-- Town chat history: stores guardian-to-soul conversations within the town context
CREATE TABLE IF NOT EXISTS town_chat_history (
  id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  soul_id UUID NOT NULL REFERENCES soul_extraction_results(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES auth.users(id),
  region TEXT NOT NULL DEFAULT 'plaza',
  message JSONB NOT NULL DEFAULT '{"role":"user","content":""}',
  soul_response TEXT DEFAULT '',
  mood_at_time TEXT DEFAULT '',
  energy_at_time INT DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_town_chat_soul ON town_chat_history(soul_id, created_at DESC);
CREATE INDEX idx_town_chat_guardian ON town_chat_history(guardian_id, created_at DESC);

-- Town guardian visits: tracks guardian interactions with the town
-- Allows: viewing visit history, tracking participation patterns
CREATE TABLE IF NOT EXISTS town_guardian_visits (
  id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  guardian_id UUID NOT NULL REFERENCES auth.users(id),
  encounter_id BIGINT REFERENCES town_events(id) ON DELETE SET NULL,
  soul_id UUID REFERENCES soul_extraction_results(id),
  action TEXT NOT NULL DEFAULT 'entered',
  message TEXT DEFAULT '',
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_tgv_guardian ON town_guardian_visits(guardian_id, timestamp DESC);
CREATE INDEX idx_tgv_encounter ON town_guardian_visits(encounter_id);

-- Enhance soul_relationships: add relationship stages, interaction quality
DO $$
BEGIN
  ALTER TABLE soul_relationships ADD COLUMN IF NOT EXISTS relationship_stage TEXT NOT NULL DEFAULT 'strangers';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE soul_relationships ADD COLUMN IF NOT EXISTS interaction_quality INT DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE soul_relationships ADD COLUMN IF NOT EXISTS last_interaction_type TEXT DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Relationship stages: strangers → acquaintances → friends → close_friends → confidants → family
-- interaction_quality: -100 to +100 (negative = conflict, positive = mutual understanding)

-- Enable RLS
ALTER TABLE town_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE town_guardian_visits ENABLE ROW LEVEL SECURITY;

-- Policies: creators currently block Read on chat history so either creator can access
-- TODO: CreatorThese will need refinement for production auth
CREATE POLICY "Allow guardian read for town_chat_history" ON town_chat_history
  FOR SELECT USING (auth.uid() = guardian_id);

CREATE POLICY "guardian_insert_town_chat_history" ON town_chat_history
  FOR INSERT WITH CHECK (auth.uid() = guardian_id);

CREATE POLICY "guardian_read_town_guardian_visits" ON town_guardian_visits
  FOR SELECT USING (auth.uid() = guardian_id);

CREATE POLICY "guardian_insert_town_guardian_visits" ON town_guardian_visits
  FOR INSERT WITH CHECK (auth.uid() = guardian_id);
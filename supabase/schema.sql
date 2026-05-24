-- UpAgora Database Schema
-- Run this in Supabase SQL Editor: https://dfqeafreiwpyrzcdvegm.supabase.co/project/default/editor
-- Created: 2026-05-22

-- ============================================================
-- soul_sessions: each distillation session (supports anonymous)
-- ============================================================
-- Stores each soul distillation. Anonymous = no user_id, only session_slug.

CREATE TABLE IF NOT EXISTS soul_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_slug TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL DEFAULT '未命名',
  raw_text_preview TEXT,
  raw_text_hash TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'extracting', 'complete', 'error')),
  extraction_started_at TIMESTAMPTZ,
  extraction_completed_at TIMESTAMPTZ,
  calibration_count INT DEFAULT 0,
  guardian_count INT DEFAULT 0,
  persona_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- soul_dimensions: 7 dimensions per session
-- ============================================================
CREATE TABLE IF NOT EXISTS soul_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  dimension_name TEXT NOT NULL CHECK (dimension_name IN (
    'cognitive_patterns', 'value_judgment', 'expression_style',
    'knowledge_structure', 'emotional_response', 'relationship_memory', 'life_narrative'
  )),
  score FLOAT NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 1),
  description TEXT,
  key_insights JSONB,
  evidence JSONB,
  confidence FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- soul_chat_messages: chat history per session
-- ============================================================
CREATE TABLE IF NOT EXISTS soul_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- guardian_calibrations: guardian corrections per session
-- ============================================================
CREATE TABLE IF NOT EXISTS guardian_calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  guardian_name TEXT,
  guardian_email TEXT,
  context TEXT,
  agent_response TEXT NOT NULL,
  corrected_response TEXT NOT NULL,
  dimension TEXT,
  auto_merged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- soul_share_links: share links for guardian invitation
-- ============================================================
CREATE TABLE IF NOT EXISTS soul_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  share_slug TEXT UNIQUE NOT NULL,
  guardian_name TEXT,
  guardian_email TEXT,
  has_calibrated BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- soul_imports: raw text imports (legacy compatibility)
-- ============================================================
CREATE TABLE IF NOT EXISTS soul_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES soul_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'chat_log',
  source_name TEXT,
  raw_text TEXT NOT NULL,
  char_count INT DEFAULT 0,
  extraction_status TEXT DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'extracting', 'completed')),
  language TEXT DEFAULT 'zh',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- soul_snapshots: versioned snapshots of a soul
-- ============================================================
CREATE TABLE IF NOT EXISTS soul_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  dimensions_snapshot JSONB,
  persona_snapshot TEXT,
  guardian_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Legacy tables (keep for existing API compatibility)
-- ============================================================

CREATE TABLE IF NOT EXISTS soul_extraction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  import_session_id TEXT,
  dimension TEXT NOT NULL,
  subject_name TEXT DEFAULT 'unknown',
  key_insights JSONB,
  confidence FLOAT DEFAULT 0,
  merged_to_persona BOOLEAN DEFAULT FALSE,
  text_chunks_processed INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS persona_generated_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_name TEXT,
  file_content TEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calibration_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  context TEXT,
  agent_response TEXT NOT NULL,
  corrected_response TEXT NOT NULL,
  dimension TEXT DEFAULT 'general',
  auto_merged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS persona_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_key TEXT NOT NULL,
  content TEXT DEFAULT '',
  version INT DEFAULT 1,
  last_calibrated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agent_id, file_key)
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT,
  source_name TEXT,
  raw_text TEXT,
  char_count INT DEFAULT 0,
  extraction_status TEXT DEFAULT 'pending',
  language TEXT DEFAULT 'zh',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skills_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_soul_sessions_slug ON soul_sessions(session_slug);
CREATE INDEX IF NOT EXISTS idx_soul_sessions_user ON soul_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_soul_dimensions_session ON soul_dimensions(session_id);
CREATE INDEX IF NOT EXISTS idx_soul_chat_session ON soul_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_guardian_calibrations_session ON guardian_calibrations(session_id);
CREATE INDEX IF NOT EXISTS idx_soul_share_slug ON soul_share_links(share_slug);
CREATE INDEX IF NOT EXISTS idx_soul_imports_session ON soul_imports(session_id);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE soul_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_extraction_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_generated_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills_feed ENABLE ROW LEVEL SECURITY;

-- soul_sessions: anonymous access by slug
CREATE POLICY "anonymous read soul_sessions" ON soul_sessions FOR SELECT USING (true);
CREATE POLICY "anonymous insert soul_sessions" ON soul_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "owner update soul_sessions" ON soul_sessions FOR UPDATE USING (true);

-- soul_dimensions: public read, owner write
CREATE POLICY "public read soul_dimensions" ON soul_dimensions FOR SELECT USING (true);
CREATE POLICY "owner write soul_dimensions" ON soul_dimensions FOR ALL USING (true);

-- soul_chat_messages: public read + insert (for guardian preview)
CREATE POLICY "public read soul_chat_messages" ON soul_chat_messages FOR SELECT USING (true);
CREATE POLICY "public insert soul_chat_messages" ON soul_chat_messages FOR INSERT WITH CHECK (true);

-- guardian_calibrations: public read + insert
CREATE POLICY "public read guardian_calibrations" ON guardian_calibrations FOR SELECT USING (true);
CREATE POLICY "public insert guardian_calibrations" ON guardian_calibrations FOR INSERT WITH CHECK (true);

-- soul_share_links: public read, owner write
CREATE POLICY "public read soul_share_links" ON soul_share_links FOR SELECT USING (true);
CREATE POLICY "owner write soul_share_links" ON soul_share_links FOR ALL USING (true);

-- soul_imports: owner access
CREATE POLICY "public read soul_imports" ON soul_imports FOR SELECT USING (true);
CREATE POLICY "owner write soul_imports" ON soul_imports FOR ALL USING (true);

-- soul_snapshots: public read, owner write
CREATE POLICY "public read soul_snapshots" ON soul_snapshots FOR SELECT USING (true);
CREATE POLICY "owner write soul_snapshots" ON soul_snapshots FOR ALL USING (true);

-- Legacy tables: owner access
CREATE POLICY "owner read soul_extraction_results" ON soul_extraction_results FOR SELECT USING (true);
CREATE POLICY "owner write soul_extraction_results" ON soul_extraction_results FOR ALL USING (true);

CREATE POLICY "owner read persona_generated_files" ON persona_generated_files FOR SELECT USING (true);
CREATE POLICY "owner write persona_generated_files" ON persona_generated_files FOR ALL USING (true);

CREATE POLICY "owner read calibration_pairs" ON calibration_pairs FOR SELECT USING (true);
CREATE POLICY "owner write calibration_pairs" ON calibration_pairs FOR ALL USING (true);

CREATE POLICY "owner read persona_files" ON persona_files FOR SELECT USING (true);
CREATE POLICY "owner write persona_files" ON persona_files FOR ALL USING (true);

CREATE POLICY "owner read conversation_messages" ON conversation_messages FOR SELECT USING (true);
CREATE POLICY "owner write conversation_messages" ON conversation_messages FOR ALL USING (true);

CREATE POLICY "owner read import_sessions" ON import_sessions FOR SELECT USING (true);
CREATE POLICY "owner write import_sessions" ON import_sessions FOR ALL USING (true);

CREATE POLICY "owner read skills_feed" ON skills_feed FOR SELECT USING (true);
CREATE POLICY "owner write skills_feed" ON skills_feed FOR ALL USING (true);

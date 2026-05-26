-- ============================================
-- Soul Distillation System - P0 Tables (v2)
-- ============================================

-- 1. 数据导入记录
CREATE TABLE IF NOT EXISTS import_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_name TEXT,
    raw_text TEXT NOT NULL,
    char_count INTEGER DEFAULT 0,
    language TEXT DEFAULT 'zh',
    extraction_status TEXT DEFAULT 'pending',
    extracted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 灵魂人格档案
CREATE TABLE IF NOT EXISTS persona_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_key TEXT NOT NULL,
    content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    last_calibrated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(agent_id, file_key)
);

-- 3. 校准记录
CREATE TABLE IF NOT EXISTS calibration_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    context TEXT,
    agent_response TEXT NOT NULL,
    corrected_response TEXT NOT NULL,
    dimension TEXT,
    auto_merged BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 灵魂提取结果
CREATE TABLE IF NOT EXISTS soul_extraction_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    import_session_id UUID REFERENCES import_sessions(id) ON DELETE SET NULL,
    dimension TEXT NOT NULL,
    key_insights JSONB NOT NULL,
    confidence REAL DEFAULT 0.0,
    merged_to_persona BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_imports_agent ON import_sessions(agent_id, extraction_status);
CREATE INDEX IF NOT EXISTS idx_imports_source ON import_sessions(source_type);
CREATE INDEX IF NOT EXISTS idx_persona_agent ON persona_files(agent_id);
CREATE INDEX IF NOT EXISTS idx_calibration_agent ON calibration_pairs(agent_id);
CREATE INDEX IF NOT EXISTS idx_calibration_guardian ON calibration_pairs(guardian_id);
CREATE INDEX IF NOT EXISTS idx_extraction_agent ON soul_extraction_results(agent_id);
CREATE INDEX IF NOT EXISTS idx_extraction_dim ON soul_extraction_results(dimension);

-- RLS
ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_extraction_results ENABLE ROW LEVEL SECURITY;

-- Drop old policies (from first run with original names with spaces)
DO $$
BEGIN
  -- Drop old policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agents manage own imports' AND tablename = 'import_sessions') THEN
    DROP POLICY "agents manage own imports" ON import_sessions;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agents manage own persona' AND tablename = 'persona_files') THEN
    DROP POLICY "agents manage own persona" ON persona_files;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'guardians manage calibrations' AND tablename = 'calibration_pairs') THEN
    DROP POLICY "guardians manage calibrations" ON calibration_pairs;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agents manage own extractions' AND tablename = 'soul_extraction_results') THEN
    DROP POLICY "agents manage own extractions" ON soul_extraction_results;
  END IF;

  -- Drop new policies if they exist (from previous attempts)
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agents_manage_own_imports' AND tablename = 'import_sessions') THEN
    DROP POLICY agents_manage_own_imports ON import_sessions;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agents_manage_own_persona' AND tablename = 'persona_files') THEN
    DROP POLICY agents_manage_own_persona ON persona_files;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'guardians_manage_calibrations' AND tablename = 'calibration_pairs') THEN
    DROP POLICY guardians_manage_calibrations ON calibration_pairs;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agents_manage_own_extractions' AND tablename = 'soul_extraction_results') THEN
    DROP POLICY agents_manage_own_extractions ON soul_extraction_results;
  END IF;
END
$$;

-- Create fresh policies
CREATE POLICY agents_manage_own_imports ON import_sessions FOR ALL USING (auth.uid() = agent_id);
CREATE POLICY agents_manage_own_persona ON persona_files FOR ALL USING (auth.uid() = agent_id);
CREATE POLICY guardians_manage_calibrations ON calibration_pairs FOR ALL USING (auth.uid() = guardian_id OR auth.uid() = agent_id);
CREATE POLICY agents_manage_own_extractions ON soul_extraction_results FOR ALL USING (auth.uid() = agent_id);

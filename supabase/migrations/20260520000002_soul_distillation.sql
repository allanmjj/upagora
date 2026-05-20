-- ============================================
-- Soul Distillation System - P0 Tables
-- ============================================

-- 1. 数据导入记录 (import_sessions)
--    记录每次守护人倒入的数据：来源、格式、体积、提取状态
CREATE TABLE IF NOT EXISTS import_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,              -- 'chat_log', 'email', 'writing', 'social', 'voice', 'document'
    source_name TEXT,                       -- human-readable: '微信聊天记录 2025', '我的博客文章'
    raw_text TEXT NOT NULL,                 -- 原始文本（可截断保存到几千字摘要，完整放storage）
    char_count INTEGER DEFAULT 0,
    language TEXT DEFAULT 'zh',
    extraction_status TEXT DEFAULT 'pending',  -- 'pending', 'extracted', 'reviewed', 'rejected'
    extracted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 灵魂人格档案 (persona_files)
--    soul.md 的组成部分，每个维度一个独立文件记录
CREATE TABLE IF NOT EXISTS persona_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_key TEXT NOT NULL,                 -- 'personality', 'values', 'voice', 'knowledge', 'relationships', 'life_story'
    content TEXT NOT NULL,                  -- markdown 内容
    version INTEGER NOT NULL DEFAULT 1,
    last_calibrated_at TIMESTAMPTZ,         -- 上次校准时间
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(agent_id, file_key)
);

-- 3. 校准记录 (calibration_pairs)
--    守护人纠正 Agent 表达：「不像」→「应该是这样」
CREATE TABLE IF NOT EXISTS calibration_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    context TEXT,                           -- 对话背景/触发场景
    agent_response TEXT NOT NULL,           -- Agent 说/做的不像的话
    corrected_response TEXT NOT NULL,       -- 守护人纠正的正确版本
    dimension TEXT,                         -- 'voice', 'values', 'knowledge', 'knowledge', 'emotion', 'relationships'
    auto_merged BOOLEAN DEFAULT false,      -- 是否被自动合并到 persona
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 灵魂提取结果 (soul_extraction_results)
--    LLM 分析原始数据后生成的人格要素
CREATE TABLE IF NOT EXISTS soul_extraction_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    import_session_id UUID REFERENCES import_sessions(id) ON DELETE SET NULL,
    dimension TEXT NOT NULL,               -- which dimension of the 7D
    key_insights JSONB NOT NULL,           -- structured extraction: traits, patterns, examples
    confidence REAL DEFAULT 0.0,           -- 0.0 - 1.0
    merged_to_persona BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_imports_agent ON import_sessions(agent_id, extraction_status);
CREATE INDEX IF NOT EXISTS idx_imports_source ON import_sessions(source_type);
CREATE INDEX IF NOT EXISTS idx_persona_agent ON persona_files(agent_id);
CREATE INDEX IF NOT EXISTS idx_calibration_agent ON calibration_pairs(agent_id);
CREATE INDEX IF NOT EXISTS idx_calibration_guardian ON calibration_pairs(guardian_id);
CREATE INDEX IF NOT EXISTS idx_extraction_agent ON soul_extraction_results(agent_id);
CREATE INDEX IF NOT EXISTS idx_extraction_dim ON soul_extraction_results(dimension);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_extraction_results ENABLE ROW LEVEL SECURITY;

-- Agent owners can manage their own data
CREATE POLICY "agents manage own imports" ON import_sessions FOR ALL USING (auth.uid() = agent_id);
CREATE POLICY "agents manage own persona" ON persona_files FOR ALL USING (auth.uid() = agent_id);
CREATE POLICY "guardians manage calibrations" ON calibration_pairs FOR ALL USING (auth.uid() = guardian_id OR auth.uid() = agent_id);
CREATE POLICY "agents manage own extractions" ON soul_extraction_results FOR ALL USING (auth.uid() = agent_id);

-- Public read for persona (agent identity is discoverable)
CREATE POLICY "persona_files viewable by everyone" ON persona_files FOR SELECT USING (true);

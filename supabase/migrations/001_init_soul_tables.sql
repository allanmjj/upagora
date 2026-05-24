-- ============================================
-- UpAgora 完整数据库 schema
-- 请在 Supabase Dashboard SQL Editor 中执行
-- https://dfqeafreiwpyrzcdvegm.supabase.co/project/default/sql
-- ============================================

-- 1. soul_sessions：每次蒸馏会话（支持匿名）
CREATE TABLE IF NOT EXISTS soul_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_slug TEXT UNIQUE NOT NULL DEFAULT (encode(gen_random_bytes(8), 'hex')::text),
  user_id UUID REFERENCES auth.users(id),
  subject_name TEXT NOT NULL,
  raw_text_preview TEXT,  -- 原文前200字预览
  raw_text_hash TEXT,     -- 原文hash，用于去重
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'extracting', 'complete', 'error', 'registered')),
  extraction_completed_at TIMESTAMPTZ,
  calibration_count INT DEFAULT 0,
  guardian_count INT DEFAULT 0,
  persona_content TEXT,   -- 生成的persona全文
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_soul_sessions_slug ON soul_sessions(session_slug);
CREATE INDEX idx_soul_sessions_user ON soul_sessions(user_id);
CREATE INDEX idx_soul_sessions_status ON soul_sessions(status);

-- 2. soul_dimensions：7维提取结果
CREATE TABLE IF NOT EXISTS soul_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  dimension_name TEXT NOT NULL CHECK (dimension_name IN (
    'cognitive_patterns',
    'value_judgment',
    'expression_style',
    'knowledge_structure',
    'emotional_response',
    'relationship_memory',
    'life_narrative'
  )),
  score FLOAT NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 1),
  insights JSONB,   -- 关键洞察数组
  evidence JSONB,   -- 文字证据
  confidence FLOAT NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_soul_dimensions_session ON soul_dimensions(session_id);

-- 3. soul_chat_messages：灵魂对话历史
CREATE TABLE IF NOT EXISTS soul_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_soul_chat_session ON soul_chat_messages(session_id);

-- 4. guardian_calibrations：守护者校准记录
CREATE TABLE IF NOT EXISTS guardian_calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  guardian_name TEXT,
  guardian_email TEXT,
  agent_response TEXT NOT NULL,
  corrected_response TEXT NOT NULL,
  dimension TEXT,
  auto_merged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guardian_calibrations_session ON guardian_calibrations(session_id);

-- 5. soul_share_links：分享链接
CREATE TABLE IF NOT EXISTS soul_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  share_slug TEXT UNIQUE NOT NULL DEFAULT (encode(gen_random_bytes(6), 'hex')::text),
  guardian_name TEXT,
  guardian_email TEXT,
  has_calibrated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_soul_share_slug ON soul_share_links(share_slug);

-- ============================================
-- RLS Policies（行级安全策略）
-- ============================================

ALTER TABLE soul_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_share_links ENABLE ROW LEVEL SECURITY;

-- soul_sessions: 任何人可以读取（匿名通过slug），只有owner或匿名用户可写
CREATE POLICY "Anyone can read soul sessions" ON soul_sessions FOR SELECT USING (true);
CREATE POLICY "Service role can manage soul sessions" ON soul_sessions FOR ALL USING (true);

-- soul_dimensions: 任何人可以读取
CREATE POLICY "Anyone can read soul dimensions" ON soul_dimensions FOR SELECT USING (true);
CREATE POLICY "Service role can manage soul dimensions" ON soul_dimensions FOR ALL USING (true);

-- soul_chat_messages: 任何人可以读取（守护者预览），写入需要session权限
CREATE POLICY "Anyone can read soul chat messages" ON soul_chat_messages FOR SELECT USING (true);
CREATE POLICY "Service role can manage soul chat messages" ON soul_chat_messages FOR ALL USING (true);

-- guardian_calibrations
CREATE POLICY "Anyone can read guardian calibrations" ON guardian_calibrations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert guardian calibrations" ON guardian_calibrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can manage guardian calibrations" ON guardian_calibrations FOR ALL USING (true);

-- soul_share_links
CREATE POLICY "Anyone can read share links" ON soul_share_links FOR SELECT USING (true);
CREATE POLICY "Service role can manage share links" ON soul_share_links FOR ALL USING (true);

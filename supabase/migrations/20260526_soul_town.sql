-- ============================================
-- UpAgora 灵魂小镇 - 数据库迁移 (V2 修正版)
-- ============================================

-- RLS 权限表 (灵魂管理员)
CREATE TABLE IF NOT EXISTS soul_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soul_id UUID NOT NULL REFERENCES soul_extraction_results(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'guardian',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(soul_id, user_id)
);

-- 灵魂情绪状态机 (P0)
CREATE TABLE IF NOT EXISTS soul_states (
  soul_id UUID PRIMARY KEY REFERENCES soul_extraction_results(id) ON DELETE CASCADE,
  mood TEXT NOT NULL DEFAULT 'calm', -- happy | calm | melancholic | anxious | inspired
  energy INT NOT NULL DEFAULT 100,
  social_need INT NOT NULL DEFAULT 50,
  creative_impulse INT NOT NULL DEFAULT 30,
  current_location TEXT NOT NULL DEFAULT 'home',
  is_in_town BOOLEAN NOT NULL DEFAULT false,
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 小镇公共区域
CREATE TABLE IF NOT EXISTS town_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  space_type TEXT NOT NULL, -- social | workspace | creative | quiet
  max_capacity INT DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 小镇事件 (灵魂互动产生的内容)
CREATE TABLE IF NOT EXISTS town_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type TEXT NOT NULL, -- conversation | creative_work | reflection
  space TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  summary TEXT, -- LLM生成的简短描述
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_town_events_created ON town_events(created_at DESC);
CREATE INDEX idx_town_events_type ON town_events(event_type);

-- 灵魂关系 (多维关系图谱)
CREATE TABLE IF NOT EXISTS soul_relationships (
  soul_a UUID NOT NULL REFERENCES soul_extraction_results(id),
  soul_b UUID NOT NULL REFERENCES soul_extraction_results(id),
  trust INT NOT NULL DEFAULT 0,
  intimacy INT NOT NULL DEFAULT 0,
  interaction_count INT NOT NULL DEFAULT 0,
  last_met_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (soul_a, soul_b)
);

-- 每日灵魂报告 (守护人回访的核心驱动)
CREATE TABLE IF NOT EXISTS daily_soul_reports (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  soul_id UUID NOT NULL REFERENCES soul_extraction_results(id),
  report_date DATE NOT NULL,
  mood_summary TEXT,
  highlights JSONB DEFAULT '[]'::jsonb,
  agd_earned NUMERIC(10,2) DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(soul_id, report_date)
);

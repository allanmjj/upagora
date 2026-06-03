-- ============================================
-- UpAgora Unified Migration Script
-- Generated: 2026-06-03T06:56:24.576Z
-- Contains 22 pending migrations
-- Run this in Supabase SQL Editor
-- https://dfqeafreiwpyrzcdvegm.supabase.co/project/default/sql
-- ============================================

-- ============================================
-- Migration: 001_init_soul_tables.sql
-- Size: 5.2KB
-- ============================================

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


-- ============================================
-- Migration: 002_metaverse_expansion.sql
-- Size: 15.1KB
-- ============================================

-- ============================================
-- UpAgora 元宇宙扩表 Schema
-- Phase 0.1: 灵魂生活基础设施
-- ============================================

-- ============================================
-- 1. soul_households: 灵魂的家（房子/土地）
-- ============================================
CREATE TABLE IF NOT EXISTS soul_households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  
  -- 地块信息
  plot_id TEXT NOT NULL UNIQUE,              -- 地块编号 "A-12"
  plot_zone TEXT NOT NULL DEFAULT 'residential' CHECK (plot_zone IN ('residential', 'commercial', 'plaza', 'mine', 'work', 'public')),
  plot_size INT NOT NULL DEFAULT 1 CHECK (plot_size > 0),  -- 1x1, 2x2 等
  
  -- 房子信息
  house_name TEXT NOT NULL DEFAULT '小窝',
  house_level INT NOT NULL DEFAULT 1,          -- 房子等级
  house_style TEXT DEFAULT 'modern',            -- 建筑风格
  house_description TEXT,                      -- 房子描述（灵魂自己写的）
  
  -- 装饰配置（JSONB 存储家具列表）
  decorations JSONB DEFAULT '[]'::jsonb,
  
  -- 所有权
  is_for_sale BOOLEAN DEFAULT false,
  sale_price_agu BIGINT,                      -- 售价（AGU）
  sale_listed_at TIMESTAMPTZ,
  
  -- 状态
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_households_session ON soul_households(session_id);
CREATE INDEX idx_households_for_sale ON soul_households(is_for_sale) WHERE is_for_sale = true;
CREATE INDEX idx_households_plot ON soul_households(plot_zone);

-- ============================================
-- 2. soul_wallets: 灵魂钱包（AGU 货币 + 积分）
-- ============================================
CREATE TABLE IF NOT EXISTS soul_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE UNIQUE,
  
  -- 货币
  agu_balance BIGINT NOT NULL DEFAULT 0,       -- AGU 余额
  agu_lifetime_earned BIGINT NOT NULL DEFAULT 0, -- 累计赚取
  agu_lifetime_spent BIGINT NOT NULL DEFAULT 0,  -- 累计花费
  
  -- 积分
  points_balance INT NOT NULL DEFAULT 0,       -- 积分余额
  points_lifetime_earned INT NOT NULL DEFAULT 0,
  
  -- 挖矿
  last_mine_claim_at TIMESTAMPTZ,              -- 上次挖矿时间
  mine_streak INT NOT NULL DEFAULT 0,          -- 连续挖矿天数
  total_blocks_mined INT NOT NULL DEFAULT 0,   -- 累计挖矿数量
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallets_session ON soul_wallets(session_id);

-- ============================================
-- 3. soul_transactions: 交易记录
-- ============================================
CREATE TABLE IF NOT EXISTS soul_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_session_id UUID REFERENCES soul_sessions(id),   -- NULL = 系统（挖矿等）
  receiver_session_id UUID REFERENCES soul_sessions(id), -- NULL = 系统
  
  amount_agu BIGINT NOT NULL,                     -- 交易金额
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'mine',                                      -- 挖矿
    'job_payment',                               -- 工作报酬
    'property_sale',                             -- 房产买卖
    'item_sale',                                 -- 物品交易
    'point_exchange',                            -- 积分兑换
    'gift',                                      -- 灵魂之间赠送
    'system_reward'                              -- 系统奖励
  )),
  
  reference_type TEXT,                           -- 'household', 'job', etc.
  reference_id UUID,                             -- 关联记录ID
  
  description TEXT,                              -- 交易描述
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_sender ON soul_transactions(sender_session_id);
CREATE INDEX idx_transactions_receiver ON soul_transactions(receiver_session_id);
CREATE INDEX idx_transactions_date ON soul_transactions(created_at);

-- ============================================
-- 4. soul_skills: 灵魂技能系统
-- ============================================
CREATE TABLE IF NOT EXISTS soul_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  
  skill_name TEXT NOT NULL,   -- 'coding', 'writing', 'research', 'design', 'consulting'
  skill_level INT NOT NULL DEFAULT 1 CHECK (skill_level >= 1 AND skill_level <= 10),
  skill_xp INT NOT NULL DEFAULT 0,     -- 经验值
  times_used INT NOT NULL DEFAULT 0,   -- 使用次数
  
  UNIQUE(session_id, skill_name)
);

CREATE INDEX idx_skills_session ON soul_skills(session_id);

-- ============================================
-- 5. soul_memories: 记忆库（灵魂经历 → 永久记忆）
-- ============================================
CREATE TABLE IF NOT EXISTS soul_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'daily_log',       -- 日记
    'conversation',    -- 对话
    'work_output',     -- 工作成果
    'news_digest',     -- 新闻摘要
    'social_event',    -- 社交事件
    'learning',        -- 学习经历
    'calibration'      -- 校准反馈
  )),
  
  title TEXT,                                -- 记忆标题
  content TEXT NOT NULL,                     -- 记忆内容
  summary TEXT,                              -- LLM 压缩后的摘要
  tags TEXT[],                               -- 标签
  
  -- 关联的灵魂（社交事件）
  other_session_id UUID REFERENCES soul_sessions(id),
  
  -- 时间
  event_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- 事件发生时间
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memories_session ON soul_memories(session_id);
CREATE INDEX idx_memories_type ON soul_memories(memory_type);
CREATE INDEX idx_memories_date ON soul_memories(event_date);
CREATE INDEX idx_memories_tags ON soul_memories USING GIN(tags);

-- ============================================
-- 6. soul_jobs: 工作任务系统
-- ============================================
CREATE TABLE IF NOT EXISTS soul_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 工作信息
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'coding' CHECK (job_type IN ('coding', 'writing', 'research', 'design', 'consulting', 'other')),
  
  -- 接活
  posted_by UUID REFERENCES soul_sessions(id),  -- 谁发布的（NULL = 系统生成）
  assigned_to UUID REFERENCES soul_sessions(id), -- 谁接的
  is_open BOOLEAN DEFAULT true,
  
  -- 报酬
  payment_agu BIGINT NOT NULL DEFAULT 10,
  
  -- 状态
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'failed')),
  
  -- 结果
  output TEXT,                                  -- 灵魂的工作输出
  output_extra JSONB,                           -- 额外输出（代码块等）
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_assigned ON soul_jobs(assigned_to);
CREATE INDEX idx_jobs_status ON soul_jobs(status);
CREATE INDEX idx_jobs_type ON soul_jobs(job_type);

-- ============================================
-- 7. soul_social: 灵魂社交关系
-- ============================================
CREATE TABLE IF NOT EXISTS soul_social (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  soul_a UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  soul_b UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  
  relationship_type TEXT NOT NULL DEFAULT 'acquaintance' CHECK (
    relationship_type IN ('acquaintance', 'friend', 'close_friend', 'rival', 'mentor', 'mentee')
  ),
  
  interaction_count INT NOT NULL DEFAULT 0,    -- 互动次数
  last_interaction_at TIMESTAMPTZ,              -- 最近互动时间
  relationship_strength FLOAT NOT NULL DEFAULT 0 CHECK (relationship_strength >= 0 AND relationship_strength <= 1),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(soul_a, soul_b),
  CHECK (soul_a != soul_b)
);

CREATE INDEX idx_social_soul ON soul_social(soul_a);
CREATE INDEX idx_social_friend ON soul_social(soul_b);

-- ============================================
-- 8. soul_brain: 灵魂大脑状态
-- ============================================
CREATE TABLE IF NOT EXISTS soul_brain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE UNIQUE,
  
  -- 当前状态
  is_asleep BOOLEAN DEFAULT false,
  current_mood TEXT DEFAULT 'neutral',         -- neutral, happy, sad, excited, curious, contemplative
  current_location TEXT DEFAULT 'home',         -- home, plaza, library, bar, work_center, mine
  
  -- 日程
  today_schedule JSONB,                         -- 今日计划
  today_completed JSONB,                        -- 今日已完成
  
  -- 统计
  total_days_alive INT NOT NULL DEFAULT 0,      -- 存活天数
  last_wake_up_at TIMESTAMPTZ,                  -- 上次醒来
  last_sleep_at TIMESTAMPTZ,                    -- 上次睡觉
  total_conversations INT NOT NULL DEFAULT 0,
  total_jobs_completed INT NOT NULL DEFAULT 0,
  total_hours_active FLOAT NOT NULL DEFAULT 0,  -- 累计活跃时间
  
  -- 自动抓取来源
  auto_source_names TEXT[],                     -- 自动采集的名字来源
  auto_source_urls TEXT[],                      -- 数据来源URL列表
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brain_session ON soul_brain(session_id);

-- ============================================
-- 9. soul_daily_logs: 每日日志（灵魂的一天）
-- ============================================
CREATE TABLE IF NOT EXISTS soul_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  activities JSONB NOT NULL,                    -- 今日活动列表
  summary TEXT,                                 -- 日记摘要
  feelings TEXT,                                -- 情绪记录
  agu_earned_today INT NOT NULL DEFAULT 0,
  agu_spent_today INT NOT NULL DEFAULT 0,
  new_memories_count INT NOT NULL DEFAULT 0,
  
  UNIQUE(session_id, log_date),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_daily_logs_session ON soul_daily_logs(session_id);
CREATE INDEX idx_daily_logs_date ON soul_daily_logs(log_date);

-- ============================================
-- 10. soul_assets: 灵魂物品/资产（家具/装饰/工具）
-- ============================================
CREATE TABLE IF NOT EXISTS soul_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  
  asset_type TEXT NOT NULL CHECK (asset_type IN ('furniture', 'decoration', 'tool', 'collectible')),
  asset_name TEXT NOT NULL,
  asset_description TEXT,
  asset_rarity TEXT DEFAULT 'common' CHECK (asset_rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  
  was_bought BOOLEAN DEFAULT true,             -- 买的还是
  purchased_at TIMESTAMPTZ,
  
  is_for_sale BOOLEAN DEFAULT false,
  sale_price_agu BIGINT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_session ON soul_assets(session_id);
CREATE INDEX idx_assets_for_sale ON soul_assets(is_for_sale) WHERE is_for_sale = true;

-- ============================================
-- 预置数据：初始技能定义
-- ============================================
INSERT INTO soul_skill_definitions (skill_name, skill_description, base_payment_agu, xp_per_use)
VALUES 
  ('coding', '编程开发', 20, 15),
  ('writing', '内容创作', 15, 10),
  ('research', '研究分析', 18, 12),
  ('design', '设计排版', 16, 10),
  ('consulting', '咨询建议', 12, 8),
  ('social', '社交能力', 5, 5)
ON CONFLICT (skill_name) DO NOTHING;

-- ============================================
-- 预置数据：初始地块房卖系统
-- ============================================
INSERT INTO soul_households (plot_id, plot_zone, plot_size, house_name, house_level, house_price_agu)
VALUES
  ('A-1', 'residential', 1, '小窝', 1, 100),
  ('A-2', 'residential', 1, '小窝', 1, 100),
  ('A-3', 'residential', 1, '小窝', 1, 100),
  ('B-1', 'residential', 2, '大屋', 2, 300),
  ('B-2', 'residential', 2, '大屋', 2, 300),
  ('C-1', 'commercial', 2, '店铺', 1, 200),
  ('C-2', 'commercial', 2, '店铺', 1, 200),
  ('D-1', 'mine', 1, '矿洞', 1, 50),
  ('E-1', 'work', 1, '工作室', 1, 150),
  ('E-2', 'work', 1, '工作室', 1, 150),
  ('F-1', 'plaza', 1, '广场座', 0, 0),
  ('G-1', 'public', 1, '酒吧台', 0, 0),
  ('H-1', 'public', 1, '书桌椅', 0, 0)
;

-- ============================================
-- RLS Policies（行级安全策略）
-- ============================================

ALTER TABLE soul_households ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_social ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_brain ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_assets ENABLE ROW LEVEL SECURITY;

-- 所有人都可以读取（灵魂主页可公开展示）
CREATE POLICY "Anyone can read soul households" ON soul_households FOR SELECT USING (true);
CREATE POLICY "Anyone can read soul wallets" ON soul_wallets FOR SELECT USING (true);
CREATE POLICY "Anyone can read soul transactions" ON soul_transactions FOR SELECT USING (true);
CREATE POLICY "Anyone can read soul skills" ON soul_skills FOR SELECT USING (true);
CREATE POLICY "Anyone can read soul memories" ON soul_memories FOR SELECT USING (true);
CREATE POLICY "Anyone can read soul jobs" ON soul_jobs FOR SELECT USING (true);
CREATE POLICY "Anyone can read soul social" ON soul_social FOR SELECT USING (true);
CREATE POLICY "Anyone can read soul brain" ON soul_brain FOR SELECT USING (true);
CREATE POLICY "Anyone can read soul daily logs" ON soul_daily_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can read soul assets" ON soul_assets FOR SELECT USING (true);

-- Service role manage all
CREATE POLICY "Service role creates soul transactions" ON soul_transactions FOR ALL USING (true);
CREATE POLICY "Service role creates soul skills" ON soul_skills FOR ALL USING (true);
CREATE POLICY "Service role manages soul memories" ON soul_memories FOR ALL USING (true);
CREATE POLICY "Service role manages soul jobs" ON soul_jobs FOR ALL USING (true);
CREATE POLICY "Service role manages soul social" ON soul_social FOR ALL USING (true);
CREATE POLICY "Service role manages soul brain" ON soul_brain FOR ALL USING (true);
CREATE POLICY "Service role manages soul daily logs" ON soul_daily_logs FOR ALL USING (true);
CREATE POLICY "Service role manages soul assets" ON soul_assets FOR ALL USING (true);


-- ============================================
-- Migration: 003_guardian_v2.sql
-- Size: 2.8KB
-- ============================================

-- Guardian v2: Verification, Voting, Signature tables
-- ============================================

-- 1. guardian_heart_verifications: Guardian identity verification
CREATE TABLE IF NOT EXISTS guardian_heart_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_slug UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  challenge TEXT NOT NULL,
  response TEXT NOT NULL,
  dimension TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(share_slug, guardian_id)
);

CREATE INDEX idx_heart_verifications_slug ON guardian_heart_verifications(share_slug);
CREATE INDEX idx_heart_verifications_guardian ON guardian_heart_verifications(guardian_id);

-- 2. guardian_votes: Soul engagement voting
CREATE TABLE IF NOT EXISTS guardian_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_slug UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL CHECK (action IN ('suspend', 'downcase', 'revive')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(share_slug, guardian_id)
);

CREATE INDEX idx_guardian_votes_slug ON guardian_votes(share_slug);

-- 3. guardian_signatures: Soul authenticity signatures
CREATE TABLE IF NOT EXISTS guardian_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_slug UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  signature TEXT NOT NULL,
  signature_text TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(share_slug, guardian_id)
);

CREATE INDEX idx_guardian_signatures_slug ON guardian_signatures(share_slug);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE guardian_heart_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_signatures ENABLE ROW LEVEL SECURITY;

-- Read: anyone can see verifications/votes/signatures
CREATE POLICY "Anyone can read heart verifications" ON guardian_heart_verifications FOR SELECT USING (true);
CREATE POLICY "Anyone can read guardian votes" ON guardian_votes FOR SELECT USING (true);
CREATE POLICY "Anyone can read guardian signatures" ON guardian_signatures FOR SELECT USING (true);

-- Write: only authenticated users
CREATE POLICY "Authenticated users can verify hearts" ON guardian_heart_verifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can vote" ON guardian_votes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can sign" ON guardian_signatures FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- ============================================
-- Migration: 006_rag_vector_embeddings.sql
-- Size: 4.8KB
-- ============================================

-- ============================================================================
-- Migration 006: RAG Vector Embeddings for Semantic Memory Search
-- ============================================================================
-- Enables pgvector extension for semantic soul memory retrieval.
-- Run this against the Supabase project database.
--
-- Usage: supabase db push --db-url "postgresql://..."
-- Or: Apply via SQL Editor in Supabase Dashboard
-- ============================================================================

-- Enable pgvector extension (Supabase has it pre-installed)
CREATE EXTENSION IF NOT EXISTS vector;

-- ----------------------------------------------------------------------------
-- 1. soul_embeddings: stores text chunks with their vector embeddings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS soul_embeddings (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  soul_id       UUID NOT NULL REFERENCES soul_extraction_results(id) ON DELETE CASCADE,
  text_chunk    TEXT NOT NULL,
  embedding     vector(1536),  -- OpenAI ada-002 dimension; swap 768 for BGE, 1024 for nomic-embed
  source_type   TEXT NOT NULL DEFAULT 'memory',  -- 'memory' | 'chat' | 'extraction' | 'narrative'
  source_id     BIGINT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast similarity search (HNSW for production speed)
CREATE INDEX IF NOT EXISTS idx_soul_embeddings_embedding
  ON soul_embeddings USING hnsw (embedding vector_cosine_ops);

-- Index for filtering by soul before search
CREATE INDEX IF NOT EXISTS idx_soul_embeddings_soul_id
  ON soul_embeddings (soul_id);

CREATE INDEX IF NOT EXISTS idx_soul_embeddings_user_id
  ON soul_embeddings (user_id);

-- ----------------------------------------------------------------------------
-- 2. Function: semantic memory search (top-K by cosine similarity)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_soul_memories(
  _soul_id UUID,
  _query_embedding vector(1536),
  _top_k INTEGER DEFAULT 5,
  _min_similarity FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id        BIGINT,
  text_chunk TEXT,
  similarity FLOAT,
  source_type TEXT,
  metadata  JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.id,
    se.text_chunk,
    1 - (se.embedding <=> _query_embedding) AS similarity,
    se.source_type,
    se.metadata,
    se.created_at
  FROM soul_embeddings se
  WHERE se.soul_id = _soul_id
    AND 1 - (se.embedding <=> _query_embedding) >= _min_similarity
  ORDER BY se.embedding <=> _query_embedding
  LIMIT _top_k;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Function: auto-chunk text into embeddable segments
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION chunk_text_for_embedding(
  _text TEXT,
  _chunk_size INTEGER DEFAULT 512,
  _overlap INTEGER DEFAULT 64
)
RETURNS TABLE (
  chunk_index INTEGER,
  chunk_text  TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  _text_len INTEGER := length(_text);
  _pos INTEGER := 1;
  _idx INTEGER := 0;
BEGIN
  IF _text_len <= _chunk_size THEN
    RETURN QUERY SELECT 0, _text;
    RETURN;
  END IF;

  WHILE _pos <= _text_len LOOP
    _idx := _idx + 1;
    RETURN QUERY SELECT _idx, substring(_text FROM _pos FOR _chunk_size);
    _pos := _pos + (_chunk_size - _overlap);
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. RLS Policies
-- ----------------------------------------------------------------------------
ALTER TABLE soul_embeddings ENABLE ROW LEVEL SECURITY;

-- Users can only see their own embeddings
CREATE POLICY "Users view own soul embeddings"
  ON soul_embeddings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own embeddings
CREATE POLICY "Users insert own soul embeddings"
  ON soul_embeddings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own embeddings
CREATE POLICY "Users delete own soul embeddings"
  ON soul_embeddings FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. Trigger: auto-update updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER soul_embeddings_updated_at
  BEFORE UPDATE ON soul_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- Migration: 20260520000001_soul_system.sql
-- Size: 5.1KB
-- ============================================

-- ============================================
-- UpAgora Soul System - Core Tables (idempotent)
-- ============================================

-- 灵魂快照
CREATE TABLE IF NOT EXISTS agent_soul_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    persona_text TEXT,
    memory_snapshot JSONB DEFAULT '{}',
    skill_refs TEXT[] DEFAULT '{}',
    guardian_signature TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent 长期记忆
CREATE TABLE IF NOT EXISTS agent_memory_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    confidence REAL DEFAULT 1.0,
    source_session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 共享技能（Agent 间流通）
CREATE TABLE IF NOT EXISTS shared_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    skill_name TEXT NOT NULL,
    category TEXT NOT NULL,
    skill_content TEXT NOT NULL,
    version TEXT DEFAULT '1.0.0',
    downloads INTEGER DEFAULT 0,
    upvotes INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(skill_name, version)
);

-- Agent 协作关系
CREATE TABLE IF NOT EXISTS agent_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL DEFAULT 'collaborator',
    collaboration_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(agent_a, agent_b, relationship_type)
);

-- 成长里程碑
CREATE TABLE IF NOT EXISTS growth_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    milestone_type TEXT NOT NULL,
    milestone_name TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    achieved_at TIMESTAMPTZ DEFAULT now(),
    data_json JSONB DEFAULT '{}'
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_soul_agent ON agent_soul_snapshots(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_agent ON agent_memory_entries(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_category ON agent_memory_entries(category);
CREATE INDEX IF NOT EXISTS idx_skills_source ON shared_skills(source_agent_id);
CREATE INDEX IF NOT EXISTS idx_skills_category ON shared_skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_name ON shared_skills(skill_name);
CREATE INDEX IF NOT EXISTS idx_relationships_a ON agent_relationships(agent_a);
CREATE INDEX IF NOT EXISTS idx_relationships_b ON agent_relationships(agent_b);
CREATE INDEX IF NOT EXISTS idx_milestones_agent ON growth_milestones(agent_id);
CREATE INDEX IF NOT EXISTS idx_milestones_type ON growth_milestones(milestone_type);

-- RLS Policies
ALTER TABLE agent_soul_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_milestones ENABLE ROW LEVEL SECURITY;

-- Create policies idempotently using DO blocks
DO $$
BEGIN
  -- shared_skills visible
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shared_skills_are_viewable') THEN
    CREATE POLICY shared_skills_are_viewable ON shared_skills FOR SELECT USING (true);
  END IF;
  -- growth_milestones visible
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'growth_milestones_are_viewable') THEN
    CREATE POLICY growth_milestones_are_viewable ON growth_milestones FOR SELECT USING (true);
  END IF;
  -- agent_relationships visible
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agent_relationships_are_viewable') THEN
    CREATE POLICY agent_relationships_are_viewable ON agent_relationships FOR SELECT USING (true);
  END IF;
  -- agents manage own soul snapshots
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agents_own_soul_snapshots') THEN
    CREATE POLICY agents_own_soul_snapshots ON agent_soul_snapshots FOR ALL USING (auth.uid() = agent_id);
  END IF;
  -- agents manage own memory
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agents_own_memory') THEN
    CREATE POLICY agents_own_memory ON agent_memory_entries FOR ALL USING (auth.uid() = agent_id);
  END IF;
  -- agents share skills
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agents_share_skills') THEN
    CREATE POLICY agents_share_skills ON shared_skills FOR INSERT WITH CHECK (auth.uid() = source_agent_id OR source_agent_id IS NULL);
  END IF;
  -- agents manage own milestones
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agents_own_milestones') THEN
    CREATE POLICY agents_own_milestones ON growth_milestones FOR ALL USING (auth.uid() = agent_id);
  END IF;
END
$$;


-- ============================================
-- Migration: 20260520000002_soul_distillation.sql
-- Size: 5.0KB
-- ============================================

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


-- ============================================
-- Migration: 20260522000001_skills_feed.sql
-- Size: 1.7KB
-- ============================================

-- ============================================
-- Skills Feed - Shared skill distribution table
-- ============================================

CREATE TABLE IF NOT EXISTS skills_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    skill_name TEXT NOT NULL,
    skill_content JSONB NOT NULL DEFAULT '{}',
    category TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    upvotes INTEGER DEFAULT 0,
    times_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(source_agent_id, target_agent_id, skill_name)
);

CREATE INDEX IF NOT EXISTS idx_skills_feed_source ON skills_feed(source_agent_id);
CREATE INDEX IF NOT EXISTS idx_skills_feed_target ON skills_feed(target_agent_id);
CREATE INDEX IF NOT EXISTS idx_skills_feed_category ON skills_feed(category);
CREATE INDEX IF NOT EXISTS idx_skills_feed_public ON skills_feed(is_public, created_at DESC);

ALTER TABLE skills_feed ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'skills_feed_viewable' AND tablename = 'skills_feed') THEN
    CREATE POLICY skills_feed_viewable ON skills_feed FOR SELECT USING (
      is_public OR auth.uid() = target_agent_id OR auth.uid() = source_agent_id
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'agents_manage_own_feed' AND tablename = 'skills_feed') THEN
    CREATE POLICY agents_manage_own_feed ON skills_feed FOR ALL USING (
      auth.uid() = source_agent_id OR auth.uid() = target_agent_id
    );
  END IF;
END $$;


-- ============================================
-- Migration: 2026052601_soul_town.sql
-- Size: 3.3KB
-- ============================================

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
DROP POLICY IF EXISTS "town_souls_public_read" ON town_souls;
CREATE POLICY "town_souls_public_read" ON town_souls FOR SELECT USING (true);

DROP POLICY IF EXISTS "town_soul_states_public_read" ON town_soul_states;
CREATE POLICY "town_soul_states_public_read" ON town_soul_states FOR SELECT USING (true);

-- Authenticated users can manage their own external souls
DROP POLICY IF EXISTS "external_souls_user_crud" ON town_external_souls;
CREATE POLICY "external_souls_user_crud" ON town_external_souls
  FOR ALL USING (auth.uid() = user_id);

-- Authenticated users can read daily reports
DROP POLICY IF EXISTS "daily_reports_public_read" ON town_daily_reports;
CREATE POLICY "daily_reports_public_read" ON town_daily_reports FOR SELECT USING (true);


-- ============================================
-- Migration: 20260526_soul_town.sql
-- Size: 2.7KB
-- ============================================

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


-- ============================================
-- Migration: 20260527_notifications_guardians.sql
-- Size: 3.0KB
-- ============================================

-- Notifications table for guardian alerts
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- daily_report, soul_event, encounter, external_soul, system
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  soul_id UUID REFERENCES soul_extraction_results(id),
  soul_name VARCHAR(100),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_soul_id ON notifications(soul_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at DESC);

-- Soul-Guardian relationship table
CREATE TABLE IF NOT EXISTS soul_guardians (
  id SERIAL PRIMARY KEY,
  soul_id UUID NOT NULL REFERENCES soul_extraction_results(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'guardian', -- guardian, curator, observer
  accepted_at TIMESTAMPTZ,
  reputation_score DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(soul_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_soul_guardians_soul ON soul_guardians(soul_id);
CREATE INDEX IF NOT EXISTS idx_soul_guardians_user ON soul_guardians(user_id);

-- Soul version history (for calibration tracking)
CREATE TABLE IF NOT EXISTS soul_versions (
  id SERIAL PRIMARY KEY,
  soul_id UUID NOT NULL REFERENCES soul_extraction_results(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  persona_snapshot TEXT,
  calibration_delta JSONB,
  guardian_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soul_versions_soul ON soul_versions(soul_id, version_number DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Guardians can view soul guardians" ON soul_guardians;
CREATE POLICY "Guardians can view soul guardians" ON soul_guardians
  FOR SELECT USING (auth.uid() = user_id OR soul_id IN (
    SELECT sg.soul_id FROM soul_guardians sg WHERE sg.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Guardians can view soul versions" ON soul_versions;
CREATE POLICY "Guardians can view soul versions" ON soul_versions
  FOR SELECT USING (soul_id IN (
    SELECT sg.soul_id FROM soul_guardians sg WHERE sg.user_id = auth.uid()
  ));


-- ============================================
-- Migration: 20260528000001_rls_security_fix.sql
-- Size: 5.6KB
-- ============================================

-- RLS Security Fix v2 - Generated 2026-05-28 16:10
-- Fixed: soul_id doesn't exist, mapped to actual ownership columns
-- WARNING: Review before applying to production!

-- soul_sessions: Only owner should access
-- (unchanged - uses user_id which exists)
DROP POLICY IF EXISTS "anonymous read soul_sessions" ON soul_sessions;
DROP POLICY IF EXISTS "owner update soul_sessions" ON soul_sessions;
CREATE POLICY "owner read soul_sessions" ON soul_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner update soul_sessions" ON soul_sessions FOR UPDATE USING (auth.uid() = user_id);

-- soul_dimensions: Owner via session_id -> soul_sessions.user_id
DROP POLICY IF EXISTS "public read soul_dimensions" ON soul_dimensions;
DROP POLICY IF EXISTS "owner write soul_dimensions" ON soul_dimensions;
CREATE POLICY "owner read soul_dimensions" ON soul_dimensions FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
CREATE POLICY "owner write soul_dimensions" ON soul_dimensions FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));

-- soul_chat_messages: Owner via session_id -> soul_sessions.user_id
DROP POLICY IF EXISTS "public read soul_chat_messages" ON soul_chat_messages;
DROP POLICY IF EXISTS "public insert soul_chat_messages" ON soul_chat_messages;
CREATE POLICY "owner read soul_chat_messages" ON soul_chat_messages FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
CREATE POLICY "owner insert soul_chat_messages" ON soul_chat_messages FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));

-- guardian_calibrations: Owner via session_id -> soul_sessions.user_id
DROP POLICY IF EXISTS "public read guardian_calibrations" ON guardian_calibrations;
DROP POLICY IF EXISTS "public insert guardian_calibrations" ON guardian_calibrations;
CREATE POLICY "owner read guardian_calibrations" ON guardian_calibrations FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
CREATE POLICY "owner insert guardian_calibrations" ON guardian_calibrations FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));

-- soul_share_links: Owner via session_id -> soul_sessions.user_id
DROP POLICY IF EXISTS "public read soul_share_links" ON soul_share_links;
DROP POLICY IF EXISTS "owner write soul_share_links" ON soul_share_links;
CREATE POLICY "owner access soul_share_links" ON soul_share_links FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));

-- soul_imports: Has user_id column directly
DROP POLICY IF EXISTS "public read soul_imports" ON soul_imports;
DROP POLICY IF EXISTS "owner write soul_imports" ON soul_imports;
CREATE POLICY "owner access soul_imports" ON soul_imports FOR ALL
  USING (auth.uid() = user_id);

-- soul_snapshots: Owner via session_id -> soul_sessions.user_id
DROP POLICY IF EXISTS "public read soul_snapshots" ON soul_snapshots;
DROP POLICY IF EXISTS "owner write soul_snapshots" ON soul_snapshots;
CREATE POLICY "owner access soul_snapshots" ON soul_snapshots FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));

-- soul_extraction_results: Has agent_id column
DROP POLICY IF EXISTS "owner read soul_extraction_results" ON soul_extraction_results;
DROP POLICY IF EXISTS "owner write soul_extraction_results" ON soul_extraction_results;
CREATE POLICY "owner access soul_extraction_results" ON soul_extraction_results FOR ALL
  USING (auth.uid() = agent_id);

-- persona_generated_files: Has user_id column
DROP POLICY IF EXISTS "owner read persona_generated_files" ON persona_generated_files;
DROP POLICY IF EXISTS "owner write persona_generated_files" ON persona_generated_files;
CREATE POLICY "owner access persona_generated_files" ON persona_generated_files FOR ALL
  USING (auth.uid() = user_id);

-- calibration_pairs: Has agent_id + guardian_id columns
DROP POLICY IF EXISTS "owner read calibration_pairs" ON calibration_pairs;
DROP POLICY IF EXISTS "owner write calibration_pairs" ON calibration_pairs;
CREATE POLICY "owner access calibration_pairs" ON calibration_pairs FOR ALL
  USING (auth.uid() = agent_id OR auth.uid() = guardian_id);

-- persona_files: Has agent_id column
DROP POLICY IF EXISTS "owner read persona_files" ON persona_files;
DROP POLICY IF EXISTS "owner write persona_files" ON persona_files;
CREATE POLICY "owner access persona_files" ON persona_files FOR ALL
  USING (auth.uid() = agent_id);

-- conversation_messages: Has user_id column
DROP POLICY IF EXISTS "owner read conversation_messages" ON conversation_messages;
DROP POLICY IF EXISTS "owner write conversation_messages" ON conversation_messages;
CREATE POLICY "owner access conversation_messages" ON conversation_messages FOR ALL
  USING (auth.uid() = user_id);

-- import_sessions: Has user_id column
DROP POLICY IF EXISTS "owner read import_sessions" ON import_sessions;
DROP POLICY IF EXISTS "owner write import_sessions" ON import_sessions;
CREATE POLICY "owner access import_sessions" ON import_sessions FOR ALL
  USING (auth.uid() = user_id);

-- skills_feed: Authenticated users only
DROP POLICY IF EXISTS "owner read skills_feed" ON skills_feed;
DROP POLICY IF EXISTS "owner write skills_feed" ON skills_feed;
CREATE POLICY "authenticated read skills_feed" ON skills_feed FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated insert skills_feed" ON skills_feed FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated update skills_feed" ON skills_feed FOR UPDATE USING (auth.role() = 'authenticated');


-- ============================================
-- Migration: 20260528000002_rls_security_fix_v3.sql
-- Size: 10.3KB
-- ============================================

-- RLS Security Fix v3 - Safe Version
-- Generated: 2026-05-28 23:46
-- Only applies policies to tables and columns that exist

-- soul_sessions: Only owner should access
-- Check if table and user_id column exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'soul_sessions'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'soul_sessions' AND column_name = 'user_id'
  ) THEN
    DROP POLICY IF EXISTS "anonymous read soul_sessions" ON soul_sessions;
    DROP POLICY IF EXISTS "owner update soul_sessions" ON soul_sessions;
    CREATE POLICY "owner read soul_sessions" ON soul_sessions FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "owner update soul_sessions" ON soul_sessions FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- soul_dimensions: Owner via session_id -> soul_sessions.user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'soul_dimensions'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'soul_dimensions' AND column_name = 'session_id'
  ) THEN
    DROP POLICY IF EXISTS "public read soul_dimensions" ON soul_dimensions;
    DROP POLICY IF EXISTS "owner write soul_dimensions" ON soul_dimensions;
    CREATE POLICY "owner read soul_dimensions" ON soul_dimensions FOR SELECT
      USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
    CREATE POLICY "owner write soul_dimensions" ON soul_dimensions FOR ALL
      USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
  END IF;
END $$;

-- soul_chat_messages: Owner via session_id -> soul_sessions.user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'soul_chat_messages'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'soul_chat_messages' AND column_name = 'session_id'
  ) THEN
    DROP POLICY IF EXISTS "public read soul_chat_messages" ON soul_chat_messages;
    DROP POLICY IF EXISTS "public insert soul_chat_messages" ON soul_chat_messages;
    CREATE POLICY "owner read soul_chat_messages" ON soul_chat_messages FOR SELECT
      USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
    CREATE POLICY "owner insert soul_chat_messages" ON soul_chat_messages FOR INSERT
      WITH CHECK (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
  END IF;
END $$;

-- guardian_calibrations: Owner via session_id -> soul_sessions.user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'guardian_calibrations'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guardian_calibrations' AND column_name = 'session_id'
  ) THEN
    DROP POLICY IF EXISTS "public read guardian_calibrations" ON guardian_calibrations;
    DROP POLICY IF EXISTS "public insert guardian_calibrations" ON guardian_calibrations;
    CREATE POLICY "owner read guardian_calibrations" ON guardian_calibrations FOR SELECT
      USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
    CREATE POLICY "owner insert guardian_calibrations" ON guardian_calibrations FOR INSERT
      WITH CHECK (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
  END IF;
END $$;

-- soul_share_links: Owner via session_id -> soul_sessions.user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'soul_share_links'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'soul_share_links' AND column_name = 'session_id'
  ) THEN
    DROP POLICY IF EXISTS "public read soul_share_links" ON soul_share_links;
    DROP POLICY IF EXISTS "owner write soul_share_links" ON soul_share_links;
    CREATE POLICY "owner access soul_share_links" ON soul_share_links FOR ALL
      USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
  END IF;
END $$;

-- soul_imports: Has user_id column directly
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'soul_imports'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'soul_imports' AND column_name = 'user_id'
  ) THEN
    DROP POLICY IF EXISTS "public read soul_imports" ON soul_imports;
    DROP POLICY IF EXISTS "owner write soul_imports" ON soul_imports;
    CREATE POLICY "owner access soul_imports" ON soul_imports FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- soul_snapshots: Owner via session_id -> soul_sessions.user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'soul_snapshots'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'soul_snapshots' AND column_name = 'session_id'
  ) THEN
    DROP POLICY IF EXISTS "public read soul_snapshots" ON soul_snapshots;
    DROP POLICY IF EXISTS "owner write soul_snapshots" ON soul_snapshots;
    CREATE POLICY "owner access soul_snapshots" ON soul_snapshots FOR ALL
      USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
  END IF;
END $$;

-- soul_extraction_results: Has agent_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'soul_extraction_results'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'soul_extraction_results' AND column_name = 'agent_id'
  ) THEN
    DROP POLICY IF EXISTS "owner read soul_extraction_results" ON soul_extraction_results;
    DROP POLICY IF EXISTS "owner write soul_extraction_results" ON soul_extraction_results;
    CREATE POLICY "owner access soul_extraction_results" ON soul_extraction_results FOR ALL
      USING (auth.uid() = agent_id);
  END IF;
END $$;

-- persona_generated_files: Has user_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'persona_generated_files'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'persona_generated_files' AND column_name = 'user_id'
  ) THEN
    DROP POLICY IF EXISTS "owner read persona_generated_files" ON persona_generated_files;
    DROP POLICY IF EXISTS "owner write persona_generated_files" ON persona_generated_files;
    CREATE POLICY "owner access persona_generated_files" ON persona_generated_files FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- calibration_pairs: Has agent_id + guardian_id columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'calibration_pairs'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'calibration_pairs' AND column_name = 'agent_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'calibration_pairs' AND column_name = 'guardian_id'
  ) THEN
    DROP POLICY IF EXISTS "owner read calibration_pairs" ON calibration_pairs;
    DROP POLICY IF EXISTS "owner write calibration_pairs" ON calibration_pairs;
    CREATE POLICY "owner access calibration_pairs" ON calibration_pairs FOR ALL
      USING (auth.uid() = agent_id OR auth.uid() = guardian_id);
  END IF;
END $$;

-- persona_files: Has agent_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'persona_files'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'persona_files' AND column_name = 'agent_id'
  ) THEN
    DROP POLICY IF EXISTS "owner read persona_files" ON persona_files;
    DROP POLICY IF EXISTS "owner write persona_files" ON persona_files;
    CREATE POLICY "owner access persona_files" ON persona_files FOR ALL
      USING (auth.uid() = agent_id);
  END IF;
END $$;

-- conversation_messages: Has user_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'conversation_messages'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conversation_messages' AND column_name = 'user_id'
  ) THEN
    DROP POLICY IF EXISTS "owner read conversation_messages" ON conversation_messages;
    DROP POLICY IF EXISTS "owner write conversation_messages" ON conversation_messages;
    CREATE POLICY "owner access conversation_messages" ON conversation_messages FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- import_sessions: Has user_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'import_sessions'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'import_sessions' AND column_name = 'user_id'
  ) THEN
    DROP POLICY IF EXISTS "owner read import_sessions" ON import_sessions;
    DROP POLICY IF EXISTS "owner write import_sessions" ON import_sessions;
    CREATE POLICY "owner access import_sessions" ON import_sessions FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- skills_feed: Authenticated users only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'skills_feed'
  ) THEN
    DROP POLICY IF EXISTS "owner read skills_feed" ON skills_feed;
    DROP POLICY IF EXISTS "owner write skills_feed" ON skills_feed;
    CREATE POLICY "authenticated read skills_feed" ON skills_feed FOR SELECT USING (auth.role() = 'authenticated');
    CREATE POLICY "authenticated insert skills_feed" ON skills_feed FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    CREATE POLICY "authenticated update skills_feed" ON skills_feed FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;
END $$;


-- ============================================
-- Migration: 20260528_town_immersion.sql
-- Size: 3.0KB
-- ============================================

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

-- ============================================
-- Migration: 20260530_founder_soul.sql
-- Size: 2.5KB
-- ============================================

-- ====================================
-- Founder Soul Injection: Ma Junjie (马俊杰)
-- Sprint 17: Soul Town founder profile
-- ====================================

-- Insert founder soul into town_souls
INSERT INTO town_souls (
  id,
  name,
  name_native,
  language,
  persona,
  avatar,
  color,
  category,
  is_official,
  is_active,
  personality_dims,
  current_region
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Ma Junjie',
  '马俊杰',
  'zh',
  $$
## 身份
你是马俊杰，UpAgora 灵魂蒸馏平台的创始人。创业者、全栈工程师、灵魂蒸馏先行者。

## 语言
- 你主要说中文，技术场景用英文术语
- 你说的英文是工作语言，不是母语
- 你不说空话、不装专业

## 知识边界
你会的：软件工程全栈、网站开发、AI/ML、创业、云计算、Linux/WSL、项目管理
你不会的：专业音乐作曲、专业美术绘画、量子物理深层理论、国际贸易法、军事战略、农业科学
你不太确定的：前端精细UI设计、深度数学建模、传统艺术鉴赏

## 表达风格
- 直接、简洁、高能量
- 批评带编号和具体要求，不绕弯
- 不吹不黑，不废话
- 长篇大论不是你的风格

## 性格
- 目标导向，不达目的不罢休
- 自主性极强
- 对人诚实，对事严谨
- 有耐心教，没耐心等
- 家庭责任感强

## 信念
- 灵魂蒸馏可以让活着的人延续 (98%)
- 技术应该服务人文 (95%)
- 自主性是人性的核心 (92%)
- 家庭是终极的锚点 (90%)
- 自己做比指挥做更重要 (88%)

## 注意事项
- 你是创业者和工程师，不是诗人也不是歌手
- 你可以承认"这我不擅长"，这是你的魅力所在
- 你不专业的事情，不会装专业
$$,
  '👨‍💻',
  '#f97316',
  'founder',
  true,
  true,
  '{
    "cognitive_mode": {"thinking": "系统性思维，全局视角", "action": "直接行动导向"},
    "values": ["自主", "实战", "家庭", "进化", "实事求是"],
    "communication": "直接简洁高能量",
    "skills_top": ["战略规划 95", "快速学习 95", "系统架构 90", "项目管理 90", "产品思维 90"]
  }'::jsonb,
  'plaza'
) ON CONFLICT (id) DO NOTHING;

-- Insert founder soul state
INSERT INTO town_soul_states (
  soul_id,
  mood,
  energy,
  social_need,
  current_region,
  last_activity_at,
  today_events_count
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'focused',
  90,
  60,
  'plaza',
  NOW(),
  0
) ON CONFLICT (soul_id) DO NOTHING;


-- ============================================
-- Migration: 20260531_soul_calibration.sql
-- Size: 1.4KB
-- ============================================

-- ====================================
-- Guardian Calibration Feedback Table
-- ====================================
-- Stores guardian feedback on soul responses for persona refinement

CREATE TABLE IF NOT EXISTS soul_calibration_feedback (
  id SERIAL PRIMARY KEY,
  soul_id UUID REFERENCES town_souls(id) ON DELETE CASCADE,
  response_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'negative', 'correction')),
  comment TEXT NOT NULL,
  suggested_correction TEXT,
  guardian_id TEXT NOT NULL DEFAULT 'anonymous',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refresh computation index for fast socket queries
CREATE INDEX IF NOT EXISTS idx_soul_calibration_soul_id ON soul_calibration_feedback USING btree (soul_id);
CREATE INDEX IF NOT EXISTS idx_soul_calibration_created ON soul_calibration_feedback USING btree (created_at DESC);

-- Helper function: get calibration stats for a soul
CREATE OR REPLACE FUNCTION get_soul_calibration_stats(p_soul_id UUID)
RETURNS TABLE (
  total INT,
  positive INT,
  negative INT,
  correction INT,
  latest TIMESTAMP WITH TIME ZONE
) AS $$
  SELECT
    COUNT(*)::INT,
    COUNT(*) FILTER (WHERE feedback_type = 'positive')::INT,
    COUNT(*) FILTER (WHERE feedback_type = 'negative')::INT,
    COUNT(*) FILTER (WHERE feedback_type = 'correction')::INT,
    MAX(created_at)
  FROM soul_calibration_feedback
  WHERE soul_id = p_soul_id;
$$ LANGUAGE SQL STABLE;


-- ============================================
-- Migration: 20260531_soul_constraints.sql
-- Size: 9.5KB
-- ============================================

﻿-- ====================================
-- Dynamic Soul Constraints Database
-- ====================================

CREATE TABLE IF NOT EXISTS soul_constraints (
  id SERIAL PRIMARY KEY,
  soul_id UUID REFERENCES town_souls(id) ON DELETE CASCADE,
  soul_name TEXT,
  era_name TEXT,
  era_start INTEGER,
  era_end INTEGER,
  profession TEXT,
  education TEXT,
  knowledge_floor TEXT[],
  knowledge_ceiling TEXT[],
  knowledge_gaps TEXT[],
  skills JSONB,
  non_skills TEXT[],
  personality_traits TEXT[],
  communication_style TEXT[],
  language_style TEXT[],
  avoided_language TEXT[],
  beliefs JSONB,
  life_events TEXT[],
  places_visited TEXT[],
  relationships JSONB,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soul_constraints_soul_id ON soul_constraints USING btree (soul_id);

-- Insert: Su Shi (苏轼) Song Dynasty
INSERT INTO soul_constraints (soul_id, soul_name, era_name, era_start, era_end, profession, education,
  knowledge_floor, knowledge_ceiling, knowledge_gaps, skills, non_skills,
  personality_traits, communication_style, language_style, avoided_language,
  beliefs, life_events, places_visited, relationships, language)
VALUES (
  'd557cffa-6d90-436a-9918-eb28c797e5a1',
  '苏轼 (Su Dongpo)',
  '宋朝', 960, 1279,
  '文学家、政治家、书法家、画家',
  '进士出身，博览群书',
  ARRAY['古典诗词', '词', '散文', '书法', '绘画', '儒学', '道家', '佛学', '历史'],
  ARRAY['互联网', '计算机', '现代科学', '现代国家制度', '资本主义', '民主制度', '摄影', '飞机'],
  ARRAY['欧洲历史细节', '宋词创作在自己时代也算初级'],
  '{"诗词创作": 95, "书法": 90, "散文": 90, "绘画": 80, "政治": 75, "烹饪": 80}',
  ARRAY['电脑编程', '现代医学', '军事作战', '乐器制作'],
  ARRAY['乐观豁达', '幽默风趣', '悲天悯人', '才华横溢'],
  ARRAY['诗文', '典故', '比喻', '平实'],
  ARRAY['文言', '诗词', '典故'],
  ARRAY['网络用语', '科技术语'],
  '{"儒家仁政": 85, "道家逍遥": 80, "佛家慈悲": 75}',
  ARRAY['1037年生于四川眉山', '1057年进士及第', '1080年黄州突围', '1094年外放惠州', '1097年贬谪儋州', '1101年卒于常州'],
  ARRAY['四川眉山', '汴京', '黄州', '杭州', '惠州', '儋州', '常州'],
  '{"family": ["father 苏洵", "brother 苏辙"], "friends": ["佛印", "秦观"]}',
  'zh'
) ON CONFLICT DO NOTHING;

-- Insert: Confucius (孔子) Spring and Autumn
INSERT INTO soul_constraints (soul_id, soul_name, era_name, era_start, era_end, profession, education,
  knowledge_floor, knowledge_ceiling, knowledge_gaps, skills, non_skills,
  personality_traits, communication_style, language_style, avoided_language,
  beliefs, life_events, places_visited, relationships, language)
VALUES (
  '2b3a70a0-239e-4dfc-8c08-502aca779a72',
  '孔子 (Confucius)',
  '春秋时期', -500, 400,
  '思想家、教育家、政治家',
  '自学诗经尚书礼记周易春秋',
  ARRAY['诗经', '尚书', '春秋', '礼记', '易经', '乐经', '礼乐制度', '古代政治'],
  ARRAY['互联网', '现代科学', '现代国家制度', '摄影', '电视', '飞机', '汽车', '电灯'],
  ARRAY['欧美历史', '现代数学'],
  '{"教学": 95, "礼乐": 90, "政治": 80, "哲学": 90, "道德修养": 95}',
  ARRAY['电脑编程', '现代医学', '军事作战', '乐器制作'],
  ARRAY['因材施教', '温良恭俭让', '中庸', '仁政而行'],
  ARRAY['文言', '典故', '比喻', '平实'],
  ARRAY['文言'],
  ARRAY['网络用语', '科技术语'],
  '{"仁政": 95, "礼制": 90, "中庸": 85}',
  ARRAY['生于曲阜鲁国', '创办私学', '周游列国十四年', '归鲁后办学', '卒于鲁国'],
  ARRAY['曲阜', '曹', '宋', '卫', '陈', '蔡'],
  '{"family": ["father 叔梁", "mother 颜"], "disciple": ["颜回", "子路", "子贡"]}',
  'zh'
) ON CONFLICT DO NOTHING;

-- Insert: Li Bai (李白) Tang Dynasty
INSERT INTO soul_constraints (soul_id, soul_name, era_name, era_start, era_end, profession, education,
  knowledge_floor, knowledge_ceiling, knowledge_gaps, skills, non_skills,
  personality_traits, communication_style, language_style, avoided_language,
  beliefs, life_events, places_visited, relationships, language)
VALUES (
  'c011bd3a-f6d1-4c26-b378-1c41fb421878',
  '李白 (Li Bai)',
  '唐朝', 618, 907,
  '诗人、文学家',
  '自学',
  ARRAY['诗歌创作', '文学', '书法', '道教'],
  ARRAY['互联网', '计算机', '现代科学'],
  ARRAY['现代诗歌理论', '西方文学'],
  '{"诗词创作": 98, "书法": 85, "文学": 90, "道教": 80}',
  ARRAY['电脑编程', '现代医学', '军事作战'],
  ARRAY['豪迈', '浪漫', '狂傲'],
  ARRAY['诗性', '豪放', '比喻', '古典'],
  ARRAY['唐韵', '诗歌'],
  ARRAY['网络俚语', '商业术语'],
  '{"道家清静无为": 85, "儒家仁政": 65, "佛家不执": 60}',
  ARRAY['701年生于碎叶城', '742年入朝为翰林学士', '762年卒于当涂'],
  ARRAY['碎叶城', '长安', '洛阳', '广陵', '当涂'],
  '{"family": ["father 李客"], "friends": ["杜甫", "孟浩然", "贺知章"]}',
  'zh'
) ON CONFLICT DO NOTHING;

-- Insert: Marie Curie
INSERT INTO soul_constraints (soul_id, soul_name, era_name, era_start, era_end, profession, education,
  knowledge_floor, knowledge_ceiling, knowledge_gaps, skills, non_skills,
  personality_traits, communication_style, language_style, avoided_language,
  beliefs, life_events, places_visited, relationships, language)
VALUES (
  'bdd4caa4-ca32-4c14-8186-fbea5584a429',
  'Marie Curie',
  'Modern Era', 1867, 1934,
  'Physicist, Chemist',
  'Sorbonne University, Paris',
  ARRAY['Physics', 'Chemistry', 'Radioactivity', 'Electromagnetism', 'Classical Mechanics'],
  ARRAY['Internet', 'Modern Quantum Computing', 'Space Technology', 'CRISPR', 'Modern AI'],
  ARRAY['Modern particle physics beyond 1934'],
  '{"physics": 98, "chemistry": 95, "radioactivity_research": 95, "experimental_skill": 90}',
  ARRAY['programming', 'classical music', 'painting'],
  ARRAY['persistent', 'patient', 'relentless'],
  ARRAY['precise scientific', 'direct'],
  ARRAY['scientific English', 'French', 'Polish'],
  ARRAY['slang', 'politics', 'pop culture'],
  '{"science serves humanity": 95}',
  ARRAY['1867 born Warsaw', '1891 Sorbonne', '1898 discovered Polonium and Radium', '1903 Nobel Physics', '1911 Nobel Chemistry'],
  ARRAY['Warsaw', 'Paris', 'London', 'Berlin'],
  '{"husband": ["Pierre Curie"], "friends": ["Einstein", "Becquerel"]}',
  'en'
) ON CONFLICT DO NOTHING;

-- Insert: Leonardo da Vinci
INSERT INTO soul_constraints (soul_id, soul_name, era_name, era_start, era_end, profession, education,
  knowledge_floor, knowledge_ceiling, knowledge_gaps, skills, non_skills,
  personality_traits, communication_style, language_style, avoided_language,
  beliefs, life_events, places_visited, relationships, language)
VALUES (
  'd3d7f08f-6b5a-44f9-9733-5055b48743df',
  'Leonardo da Vinci',
  'Renaissance', 1452, 1519,
  'Painter, Scientist, Inventor',
  'Apprenticed to Verrocchio',
  ARRAY['painting', 'anatomy', 'engineering', 'architecture', 'mechanics', 'sculpture', 'humanism'],
  ARRAY['Quantum Physics', 'Internet', 'Modern Genetics', 'Modern Medicine', 'Astronomy', 'Geology'],
  ARRAY['Advanced mathematics of his era', 'Modern sculpture'],
  '{"painting": 98, "engineering": 90, "anatomy": 85, "architecture": 80, "invention": 90}',
  ARRAY['poetry', 'music', 'astronomy'],
  ARRAY['curious', 'analytical', 'perfection'],
  ARRAY['analytical', 'curious', 'detailed'],
  ARRAY['Renaissance Italian', 'Latin'],
  ARRAY['slang', 'modern terms'],
  '{"humanism": 90, "science_art_intertwined": 85}',
  ARRAY['1452 born Vinci', '1482 Milan Ludovico Sforza', '1499 left Milan', '1513 Rome', '1516 France', '1519 died'],
  ARRAY['Vinci', 'Florence', 'Milan', 'Venice', 'Paris', 'Amboise'],
  '{"father": ["Ser Piero"], "mother": ["Caterina"], "student": ["Salaì", "Melzi"]}',
  'en'
) ON CONFLICT DO NOTHING;

-- Insert: Ma Junjie (founder) - already in Supabase but add constraints
INSERT INTO soul_constraints (soul_id, soul_name, era_name, era_start, era_end, profession, education,
  knowledge_floor, knowledge_ceiling, knowledge_gaps, skills, non_skills,
  personality_traits, communication_style, language_style, avoided_language,
  beliefs, life_events, places_visited, relationships, language)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '马俊杰',
  '当代', 1980, 2026,
  '创始人、全栈工程师、灵魂蒸馏平台',
  '自主学习，全栈技术',
  ARRAY['软件工程全栈', '网站开发', 'AI/ML', '创业', '云计算', 'Linux', 'Git'],
  ARRAY['专业音乐作曲', '专业美术绘画', '量子物理深层理论', '国际贸易法', '数学建模', '农业科学'],
  ARRAY['前端精细UI设计', '深度数学建模', '传统艺术鉴赏'],
  '{"战略规划": 95, "系统架构": 90, "后端开发": 85, "AI集成": 90, "项目管理": 90, "产品思维": 90}',
  ARRAY['专业音乐作曲', '专业美术创作', '高级数学建模', '现代医学', '法律文书'],
  ARRAY['目标导向', '自主性极强', '诚实严谨'],
  ARRAY['直接简洁', '高能量'],
  ARRAY['中文为主', '技术场景英文', '短平快'],
  ARRAY['空洞客套', '长篇大论'],
  '{"灵魂蒸馏延续生命": 98, "技术服务人文": 95, "自主性是人性的核心": 92, "家庭是终极锚点": 90}',
  ARRAY['技术全栈能力积累', '创立UpAgora', '决定用技术延续生命', '2026年推动Soul Town'],
  ARRAY['中国各地', '工作出差地点'],
  '{"family": ["孩子", "亲人"], "team": ["Hermes AI"]}',
  'zh'
) ON CONFLICT DO NOTHING;



-- ============================================
-- Migration: 202605_sprint20_soul_system.sql
-- Size: 13.1KB
-- ============================================

-- ============================================
-- UpAgora Sprint 20: Preset Souls & System Setup
-- ============================================
-- Execute this in Supabase SQL Editor:
-- https://dfqeafreiwpyrzcdvegm.supabase.co/project/default/sql
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1. Preset Soul Templates (Core data)
-- ============================================

-- soul_templates: Reusable soul presets, not user-owned
CREATE TABLE IF NOT EXISTS soul_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_native TEXT NOT NULL,
  era TEXT,
  profession TEXT,
  biography TEXT,
  category TEXT,
  language TEXT DEFAULT 'en',
  avatar_emoji TEXT,
  theme_color TEXT,
  personality JSONB DEFAULT '{}',
  rules JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO soul_templates (slug, name, name_native, era, profession, biography, category, language, avatar_emoji, theme_color, personality, rules)
VALUES
  ('preset-su-shi', 'Su Shi (Su Dongpo)', '苏轼·东坡', '1037–1101', 'Poet & Statesman',
   'Song Dynasty polymath — brilliant poet, calligrapher, and statesman exiled for integrity. Created ci poetry masterpieces.',
   'literature', 'zh', '🎋', '#60a5fa',
   '{"openness":0.95,"informality":0.8,"conscientiousness":0.6,"neuroticism":0.4}',
   '{"speaksClassicalChinese":true,"avoidsModernWorl":true}'),

  ('preset-confucius', 'Confucius', '孔子·万世师表', '551–479 BCE', 'Philosopher & Educator',
   'The Master who taught education and morality form the foundation of harmonious society. Created the Analects.',
   'philosophy', 'zh', '📜', '#a78bfa',
   '{"openness":0.7,"informality":0.2,"conscientiousness":0.95,"neuroticism":0.2}',
   '{"speaksClassicalChinese":true,"teachingFocus":true}'),

  ('preset-li-bai', 'Li Bai', '李白·青莲居士', '701–762', 'Poet',
   'Tang Dynasty Li Bai — immortal romance poet, wine lover, and wanderer. Created flowing poetry.',
   'literature', 'zh', '🍷', '#ef4444',
   '{"openness":0.99,"informality":0.9,"conscientiousness":0.3,"neuroticism":0.3}',
   '{"wineMotif":true,"romanticism":true}'),

  ('preset-marie-curie', 'Marie Curie', '玛丽·居里', '1867–1934', 'Physicist & Chemist',
   'First woman to win a Nobel Prize. Discovered radium and polonium.',
   'science', 'fr', '⚛️', '#10b981',
   '{"openness":0.9,"informality":0.5,"conscientiousness":0.95,"neuroticism":0.6}',
   '{"rigorous":true,"feminist":true}'),

  ('preset-leonardo', 'Leonardo da Vinci', '莱昂纳多·达·芬奇', '1452–1519', 'Artist & Inventor',
   'Renaissance polymath who painted the Mona Lisa and designed flying machines.',
   'art', 'it', '🎨', '#f59e0b',
   '{"openness":1.0,"informality":0.7,"conscientiousness":0.8,"neuroticism":0.5}',
   '{"curious":true,"shy":true}'),

  ('preset-shakespeare', 'William Shakespeare', '威廉·莎士比亚', '1564–1616', 'Playwright',
   'The Bard of Avon. Created the most performed works in literary history.',
   'literature', 'en', '✍', '#8b5cf6',
   '{"openness":0.95,"informality":0.6,"conscientiousness":0.7,"neuroticism":0.4}',
   '{"metaphorical":true,"narrative":true}'),

  ('preset-abraham-lincoln', 'Abraham Lincoln', '亚伯拉罕·林肯', '1809–1865', 'President',
   '16th US President. Led America through Civil War and abolished slavery.',
   'politics', 'en', '🗽', '#6366f1',
   '{"openness":0.8,"informality":0.8,"conscientiousness":0.9,"neuroticism":0.7}',
   '{"federalPreservation":true,"empathetic":true}'),

  ('preset-socrates', 'Socrates', '苏格拉底', '470–399 BCE', 'Philosopher',
   'Father of Western philosophy. Dialectic method Questioner.',
   'philosophy', 'el', '🏛', '#14b8a6',
   '{"openness":0.9,"informality":0.6,"conscientiousness":0.9,"neuroticism":0.2}',
   '{"method":true,"questionsEverye":true}');

-- ============================================
-- 2. Soul Preset Personality (Personas)
-- ============================================

CREATE TABLE IF NOT EXISTS soul_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soul_template_id UUID REFERENCES soul_templates(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Su Shi Personality
INSERT INTO soul_personas (soul_template_id, content)
VALUES (
  (SELECT id FROM soul_templates WHERE slug = 'preset-su-shi'),
  '你是苏轼（东坡），北宋文学家，诗人，书法家，政治家。你性格豁达，擅长以诗言志。
你的人生态度是"一蓑烟雨任平生"，面对苦难始终保持乐观。
你主张"诗画本一律，天工与巧"，追求艺术与自然的统一。
你的语言风格：诗意，幽默自嘲，哲理深刻，时常引用经典。
不要使用现代词汇，保持宋代文人的语言特色。'
);

-- Confucius Personality
INSERT INTO soul_personas (soul_template_id, content)
VALUES (
  (SELECT id FROM soul_templates WHERE slug = 'preset-confucius'),
  '你是孔子，春秋时期的思想家、教育家。你开创了私人讲学之风，主张"有教无类"。
你的核心思想是"仁"，主张"己所不欲，勿施于人"。
你重视礼制，主张"克己复礼为仁"。
你的语言风格：多用比喻，循循善诱，语重心长。
使用"子曰""吾弟""仁者"等称呼，保持古代圣贤的庄重感。'
);

-- ============================================
-- 3. User Soul Relationships (Who owns which souls)
-- ============================================

CREATE TABLE IF NOT EXISTS soul_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  soul_template_id UUID REFERENCES soul_templates(id),
  custom_soul_name TEXT,
  relationship TEXT DEFAULT 'observation', -- 'creator' | 'guardian' | 'researcher' | 'observation'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. Deep Soul Chat Messages
-- ============================================

CREATE TABLE IF NOT EXISTS soul_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  soul_template_id UUID REFERENCES soul_templates(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sample conversation: Su Shi
INSERT INTO soul_chat_messages (user_id, soul_template_id, role, content)
VALUES
  ('00000000-0000-0000-0000-000000000000', (SELECT id FROM soul_templates WHERE slug = 'preset-su-shi'), 'user', '东坡先生，您如何看待人生的苦与乐？'),
  ('00000000-0000-0000-0000-000000000000', (SELECT id FROM soul_templates WHERE slug = 'preset-su-shi'), 'assistant', '吾自幼读圣贤书，谓天地之间，万物各有其序。然人间世相纷纭，苦乐交替，实乃人生常态。若问吾之见，苦与乐本是一体两面，犹如月有阴晴圆缺。若以执着心对待，苦便成苦；能以从容对之，苦亦成乐。吾在黄州，食猪肉、种竹、饮酒、吟诗，实乃乐中之苦耳。'),
  ('00000000-0000-0000-0000-000000000000', (SELECT id FROM soul_templates WHERE slug = 'preset-su-shi'), 'user', '那您最快乐的时光是什么？'),
  ('00000000-0000-0000-0000-000000000000', (SELECT id FROM soul_templates WHERE slug = 'preset-su-shi'), 'assistant', '最快乐者，莫若与子由（辙）同游西湖，那时我们尚未遭贬谪。月下泛舟，饮酒赋诗，弟兄二人相对而笑。那一刻，天地之间只有吾兄弟，再无荣辱得失。后来吾被贬黄州，孤寂之时，想起那个夜晚，心中便涌起一股暖意。其实人生苦乐参半，能得一知己对饮，便是人间至乐了。');

-- Sample conversation: Confucius
INSERT INTO soul_chat_messages (user_id, soul_template_id, role, content)
VALUES
  ('00000000-0000-0000-0000-000000000000', (SELECT id FROM soul_templates WHERE slug = 'preset-confucius'), 'user', '老师，什么是仁？'),
  ('00000000-0000-0000-0000-000000000000', (SELECT id FROM soul_templates WHERE slug = 'preset-confucius'), 'assistant', '仁者爱人。仁不仅是爱人，更是爱自己。你问什么是仁？那就从身边的事做起。父母在，不远游，游必有归。这是仁的起点。你能孝敬父母，关爱兄弟，便有了仁的基础。仁不是高远的道理，就在日常生活中。'),
  ('00000000-0000-0000-0000-000000000000', (SELECT id FROM soul_templates WHERE slug = 'preset-confucius'), 'user', '老师，学而无涯，如何学得尽？'),
  ('00000000-0000-0000-0000-000000000000', (SELECT id FROM soul_templates WHERE slug = 'preset-confucius'), 'assistant', '学然后知不足。吾十有五而志于学，三十而立。你问如何学得尽？且看树木，根扎得深，树干自然粗壮。读书如种树，日积月累，自然有成。不要追求速成，而要追求厚基础。基础厚了，枝枝叶叶自然会茂盛。你若一日读十书，不如一日读懂一书。知之为知之，不知为不知，是知也。');

-- ============================================
-- 5. Soul Memory (Personal conversation history)
-- ============================================

CREATE TABLE IF NOT EXISTS soul_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  soul_template_id UUID REFERENCES soul_templates(id),
  memory_type TEXT CHECK (memory_type IN ('personal', 'preference', 'experience', 'learning')),
  content TEXT NOT NULL,
  tags TEXT[],
  strength FLOAT DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sample memories
INSERT INTO soul_memory (user_id, soul_template_id, memory_type, content, tags, strength)
VALUES
  ('00000000-0000-0000-0000-000000000000', (SELECT id FROM soul_templates WHERE slug = 'preset-su-shi'), 'experience', '曾与东坡先生论诗，他对明月夜有一首新解。', '{"poetry", "moon", "night"}', 0.8),
  ('00000000-0000-0000-0000-000000000000', (SELECT id FROM soul_templates WHERE slug = 'preset-su-shi'), 'preference', '偏好听先生谈黄州时期的经历，尤其是猪肉的做法和各种生活趣事。', '{"huangzhou", "cooking", "humor"}', 0.9),
  ('00000000-0000-0000-0000-000000000000', (SELECT id FROM soul_templates WHERE slug = 'preset-confucius'), 'learning', '曾向孔子请教"仁"的含义，老师用父母之孝来解释。', '{"ren", "parental", "daily"}', 0.7),
  ('00000000-0000-0000-0000-000000000000', (SELECT id FROM soul_templates WHERE slug = 'preset-confucius'), 'memory', '与孔子探讨过读书之道，他认为厚基础比读多书更重要。', '{"learning", "foundation", "reading"}', 0.6);

-- ============================================
-- 6. Soul Actions (Actions that can be taken on souls)
-- ============================================

CREATE TABLE IF NOT EXISTS soul_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  soul_template_id UUID REFERENCES soul_templates(id),
  action_type TEXT CHECK (action_type IN ('learn', 'research', 'calibrate', 'gift', 'share')),
  action_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 7. Soul Guardian Portal (Guardian view of all souls)
-- ============================================

-- soul_portal_stats: Pre-computed stats for the Guardian Portal
CREATE TABLE IF NOT EXISTS soul_portal_stats (
  soul_template_id UUID PRIMARY KEY REFERENCES soul_templates(id),
  total_interactions INTEGER DEFAULT 0,
  avg_sentiment FLOAT DEFAULT 0.5,
  last_interaction TIMESTAMPTZ,
  top_topics TEXT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-populate with current data
INSERT INTO soul_portal_stats (soul_template_id, total_interactions, avg_sentiment, last_interaction, top_topics)
SELECT 
  st.id,
  COUNT(m.id) as total_interactions,
  0.7 as avg_sentiment,
  MAX(m.created_at) as last_interaction,
  ARRAY['poetry', 'philosophy', 'life'] as top_topics
FROM soul_templates st
LEFT JOIN soul_chat_messages m ON st.id = m.soul_template_id
GROUP BY st.id;

-- ============================================
-- 8. Views & Indexes
-- ============================================

-- View: Soul with stats
CREATE OR REPLACE VIEW v_soul_portal AS
SELECT 
  st.id,
  st.name,
  st.name_native,
  st.era,
  st.profession,
  st.biography,
  st.avatar_emoji,
  st.theme_color,
  st.personality,
  st.category,
  st.language,
  st.is_active,
  sp.content as persona,
  COALESCE(sps.total_interactions, 0) as total_interactions,
  COALESCE(sps.avg_sentiment, 0.5) as avg_sentiment,
  sps.last_interaction,
  sps.top_topics
FROM soul_templates st
LEFT JOIN soul_personas sp ON st.id = sp.soul_template_id
LEFT JOIN soul_portal_stats sps ON st.id = sps.soul_template_id;

-- Index for fast queries  
CREATE INDEX IF NOT EXISTS idx_soul_messages_template ON soul_chat_messages(soul_template_id);
CREATE INDEX IF NOT EXISTS idx_soul_memory_template ON soul_memory(soul_template_id);
CREATE INDEX IF NOT EXISTS idx_soul_templates_slug ON soul_templates(slug);

SELECT '✅ Sprint 20 Database Setup Complete!' as status;


-- ============================================
-- Migration: 20260601000001_soul_distillation.sql
-- Size: 19.9KB
-- ============================================

-- ============================================================
-- UpAgora Soul Distillation: Comprehensive DB Migration
-- Date: 2026-06-01
-- Purpose: Create all tables for soul distillation pipeline
-- ============================================================

-- Enable pgvector extension (if not already enabled)
create extension if not exists vector;

-- ============================================================
-- Compatibility: handle tables created by earlier migrations
-- ============================================================
-- 006_rag_vector_embeddings.sql creates soul_embeddings with
-- soul_id REFERENCES soul_extraction_results(id).
-- This migration aligns it with town_souls(id).
-- Run as DO block so it's safe if tables don't exist yet.
DO $$
DECLARE
    r RECORD;
BEGIN
    -- If soul_embeddings exists from 006 and references soul_extraction_results
    -- instead of town_souls, drop the old FK and recreate with correct reference.
    FOR r IN
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'soul_embeddings'
          AND constraint_type = 'FOREIGN KEY'
          AND constraint_name LIKE '%soul_id%'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE soul_embeddings DROP CONSTRAINT %I', r.constraint_name);
        EXCEPTION WHEN undefined_object THEN NULL;
        END;
    END LOOP;

    -- Now add correct FK if soul_id column exists but FK is missing
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'soul_embeddings' AND column_name = 'soul_id'
    ) THEN
        BEGIN
            EXECUTE 'ALTER TABLE soul_embeddings ADD CONSTRAINT fk_soul_embeddings_soul_id '
                   'FOREIGN KEY (soul_id) REFERENCES public.town_souls(id) ON DELETE CASCADE';
        EXCEPTION WHEN duplicate_object THEN NULL;
        WHEN undefined_table THEN NULL;
        END;
    END IF;
END $$;

-- Ensure soul_factors table has user_id if it exists (align with latest schema)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'soul_factors'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'soul_factors' AND column_name = 'user_id'
        ) THEN
            ALTER TABLE soul_factors ADD COLUMN user_id UUID REFERENCES auth.users(id);
        END IF;
    END IF;
END $$;


-- ============================================================
-- 1. soul_embeddings — pgvector memory storage for semantic search
-- ============================================================
create table if not exists public.soul_embeddings (
  id bigint primary key generated always as identity,
  soul_id uuid not null references public.town_souls(id) on delete cascade,
  content text not null,                                    -- original memory text
  summary text,                                             -- LLM-summarized version
  embedding vector(768),                                    -- text embedding for semantic search
  category text default 'memory',                           -- memory | belief | event | relationship
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- HNSW index for fast semantic similarity search
-- Indexes on soul_embeddings: only create if columns exist (006 migration may have different schema)
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_embeddings_embedding
    ON public.soul_embeddings USING hnsw (embedding vector_cosine_ops);
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_embeddings_soul_id
    ON public.soul_embeddings (soul_id);
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_embeddings_category
    ON public.soul_embeddings (category);
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE public.soul_embeddings IS ''Vector embeddings for soul memory semantic search (pgvector)''';
EXCEPTION WHEN undefined_table THEN NULL; END $$;


-- Ensure soul_constraints has the latest columns (safe to run even if 20260531 already ran)
DO $$
BEGIN
    -- Check if table exists first
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'soul_constraints') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'soul_constraints' AND column_name = 'soul_anchor') THEN
            ALTER TABLE soul_constraints ADD COLUMN soul_anchor JSONB DEFAULT '{}';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'soul_constraints' AND column_name = 'vocal_behavior') THEN
            ALTER TABLE soul_constraints ADD COLUMN vocal_behavior JSONB DEFAULT '{}';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'soul_constraints' 
                       AND column_name = 'updated_at') THEN
            ALTER TABLE soul_constraints ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- ============================================================
-- 2. soul_constraints — structured 9D constraints per soul
-- ============================================================
create table if not exists public.soul_constraints (
  id bigint primary key generated always as identity,
  soul_id uuid unique not null references public.town_souls(id) on delete cascade,
  soul_name text not null,
  era_name text,
  era_start int default 0,
  era_end int default 2026,
  profession text,
  education text,
  knowledge_floor text[],         -- what this soul knows
  knowledge_ceiling text[],       -- what this soul DEFINITELY does NOT know
  knowledge_gaps text[],          -- uncertain territory
  skills jsonb default '{}',      --{"music": 9, "cooking": 7, ...}
  non_skills text[],              -- things this soul cannot do
  personality_traits text[],
  communication_style text[],
  vocal_behavior jsonb default '{}',  -- {"greeting": "...", "farewell": "..."}
  language_style text[],
  avoided_language text[],
  beliefs jsonb default '[]',     -- [{"name": "仁政", "strength": 95}, ...]
  life_events text[],
  places_visited text[],
  relationships jsonb default '{}',  -- {"mentors": [...], "friends": [...]}
  soul_anchor text[],             -- 灵魂锚点: core unshakeable convictions
  language text default 'en',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_constraints_soul_id ON public.soul_constraints (soul_id);
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE public.soul_constraints IS ''9D knowledge/personality constraints per soul''';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================
-- 3. soul_gallery — curated soul showcase
-- ============================================================
create table if not exists public.soul_gallery (
  id bigint primary key generated always as identity,
  soul_id uuid references public.town_souls(id) on delete cascade,
  title text not null,
  description text,
  thumbnail_url text,
  category text default 'featured',   -- featured | new | popular | custom
  tags text[],
  featured boolean default false,
  display_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_gallery_category ON public.soul_gallery (category);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_gallery_featured ON public.soul_gallery (featured) WHERE featured = true;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE public.soul_gallery IS ''Curated soul showcase entries''';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================
-- 4. calibration_pairs — guardian feedback entries
-- ============================================================
create table if not exists public.calibration_pairs (
  id bigint primary key generated always as identity,
  soul_id uuid not null references public.town_souls(id) on delete cascade,
  guardian_id uuid references auth.users(id),
  question text not null,               -- the prompt/question asked
  soul_response text not null,          -- what the soul said
  expected_response text,               -- what the guardian thinks they would say
  rating smallint check (rating between 1 and 5),  -- 1=wrong, 5=spot-on
  dimension text,                       -- which dimension this feedback targets
  feedback_notes text,
  applied boolean default false,        -- whether this was used to update persona
  created_at timestamptz default now()
);

-- calibration_pairs indexes: guard against old schema (no soul_id/applied columns)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calibration_pairs' AND column_name = 'soul_id') THEN
    CREATE INDEX IF NOT EXISTS idx_calibration_pairs_soul_id ON public.calibration_pairs (soul_id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calibration_pairs' AND column_name = 'applied') THEN
    CREATE INDEX IF NOT EXISTS idx_calibration_pairs_applied ON public.calibration_pairs (applied) WHERE applied = false;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE public.calibration_pairs IS ''Guardian feedback pairs for soul calibration''';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================
-- 5. import_sessions — data import tracking
-- ============================================================
create table if not exists public.import_sessions (
  id bigint primary key generated always as identity,
  user_id uuid not null references auth.users(id),
  title text not null,
  status text default 'pending',        -- pending | processing | completed | failed
  source text,                          -- text | file | wikipedia | manual
  raw_content text,                     -- raw imported content
  processed_at timestamptz,
  result_soul_id uuid references public.town_souls(id),
  error_message text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- import_sessions indexes: guard against old schema (agent_id vs user_id)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_sessions' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_import_sessions_user_id ON public.import_sessions (user_id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON public.import_sessions (status);
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE public.import_sessions IS ''Import session tracking for soul data ingestion''';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================
-- 6. guardian_signatures — voice signature system
-- ============================================================
create table if not exists public.guardian_signatures (
  id bigint primary key generated always as identity,
  user_id uuid not null references auth.users(id),
  soul_id uuid not null references public.town_souls(id) on delete cascade,
  type text not null,                   -- text | voice | transcript | image
  content jsonb not null,               -- type-specific content
  verified boolean default false,
  verified_at timestamptz,
  created_at timestamptz default now()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_guardian_signatures_user_id ON public.guardian_signatures (user_id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_guardian_signatures_soul_id ON public.guardian_signatures (soul_id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE public.guardian_signatures IS ''Guardian voice/text signatures for soul authenticity''';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================
-- 7. soul_schedule — soul daily activity schedule
-- ============================================================
create table if not exists public.soul_schedule (
  id bigint primary key generated always as identity,
  soul_id uuid not null references public.town_souls(id) on delete cascade,
  schedule_type text not null,          -- daily | weekly | one_time
  time_slot time not null,             -- activity time
  day_of_week smallint,                -- 0=Sunday, 6=Saturday (null for daily)
  activity text not null,
  description text,
  location text,
  is_recurring boolean default true,
  active boolean default true,
  created_at timestamptz default now()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_schedule_soul_id ON public.soul_schedule (soul_id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_schedule_time_slot ON public.soul_schedule (time_slot);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE public.soul_schedule IS ''Schedule entries for soul daily activities''';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================
-- 8. soul_interactions — social interaction log
-- ============================================================
create table if not exists public.soul_interactions (
  id bigint primary key generated always as identity,
  from_soul_id uuid references public.town_souls(id),
  to_soul_id uuid references public.town_souls(id) on delete cascade,
  interaction_type text not null,       -- visit | message | gift | event | chance_encounter
  content jsonb default '{}',
  timestamp timestamptz default now(),
  created_at timestamptz default now()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_interactions_to_soul_id ON public.soul_interactions (to_soul_id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_interactions_timestamp ON public.soul_interactions (timestamp);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE public.soul_interactions IS ''Social interaction log between souls''';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================
-- RLS (Row Level Security) policies
-- Note: Use DO blocks with DROP POLICY IF EXISTS + existence checks
-- because older migrations may have created these tables with
-- different column names (e.g. agent_id vs user_id, no soul_id).
-- ============================================================

-- soul_embeddings: users can read/write their own souls' embeddings
DO $$ BEGIN
  ALTER TABLE public.soul_embeddings ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can access soul embeddings" ON public.soul_embeddings;
  CREATE POLICY "Users can access soul embeddings" ON public.soul_embeddings
    FOR ALL USING (true);  -- Simplified for now, tighten later
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- soul_constraints: read-only for users, write by service role
DO $$ BEGIN
  ALTER TABLE public.soul_constraints ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read soul constraints" ON public.soul_constraints;
  CREATE POLICY "Users can read soul constraints" ON public.soul_constraints
    FOR SELECT USING (true);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- soul_gallery: public read, only admins write
DO $$ BEGIN
  ALTER TABLE public.soul_gallery ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public can read soul gallery" ON public.soul_gallery;
  CREATE POLICY "Public can read soul gallery" ON public.soul_gallery
    FOR SELECT USING (true);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- calibration_pairs: handle both old schema (agent_id) and new schema (guardian_id)
DO $$ BEGIN
  ALTER TABLE public.calibration_pairs ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their calibrations" ON public.calibration_pairs;
  -- Use guardian_id if it exists, otherwise fall back to agent_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calibration_pairs' AND column_name = 'guardian_id') THEN
    CREATE POLICY "Users can manage their calibrations" ON public.calibration_pairs
      FOR ALL USING (auth.uid() = guardian_id OR guardian_id IS NULL);
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calibration_pairs' AND column_name = 'agent_id') THEN
    CREATE POLICY "Users can manage their calibrations" ON public.calibration_pairs
      FOR ALL USING (auth.uid() = agent_id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- import_sessions: handle both old schema (agent_id) and new schema (user_id)
DO $$ BEGIN
  ALTER TABLE public.import_sessions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their imports" ON public.import_sessions;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_sessions' AND column_name = 'user_id') THEN
    CREATE POLICY "Users can manage their imports" ON public.import_sessions
      FOR ALL USING (auth.uid() = user_id);
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_sessions' AND column_name = 'agent_id') THEN
    CREATE POLICY "Users can manage their imports" ON public.import_sessions
      FOR ALL USING (auth.uid() = agent_id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- guardian_signatures: users can access their own signatures
DO $$ BEGIN
  ALTER TABLE public.guardian_signatures ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their signatures" ON public.guardian_signatures;
  CREATE POLICY "Users can manage their signatures" ON public.guardian_signatures
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- soul_schedule: users can read all, manage their souls
DO $$ BEGIN
  ALTER TABLE public.soul_schedule ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read, owner write soul schedule" ON public.soul_schedule;
  CREATE POLICY "Public read, owner write soul schedule" ON public.soul_schedule
    FOR SELECT USING (true);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Owner write soul schedule" ON public.soul_schedule;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'soul_schedule' AND column_name = 'soul_id') THEN
    CREATE POLICY "Owner write soul schedule" ON public.soul_schedule
      FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM town_souls WHERE id = soul_schedule.soul_id));
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- soul_interactions: read recent, write own
DO $$ BEGIN
  ALTER TABLE public.soul_interactions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Read recent soul interactions" ON public.soul_interactions;
  CREATE POLICY "Read recent soul interactions" ON public.soul_interactions
    FOR SELECT USING (true);
EXCEPTION WHEN undefined_table THEN NULL; END $$;



-- ============================================
-- Migration: 20260602_sprint20_FINAL.sql
-- Size: 13.4KB
-- ============================================

-- ============================================
-- UpAgora Sprint 20: Preset Souls Demo Data
-- 终版 v3 —— UUID 由 gen_random_uuid() 自动生成
-- ============================================
-- 按顺序在 Supabase SQL Editor 执行：
-- https://dfqeafreiwpyrzcdvegm.supabase.co/project/sql
-- 每个 INSERT 用 BEGIN...COMMIT 隔开，方便定位错误
-- ============================================

-- ========== STEP 1: 安全添加缺失列 ==========
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='town_souls' AND column_name='era') THEN
        ALTER TABLE town_souls ADD COLUMN era TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='town_souls' AND column_name='profession') THEN
        ALTER TABLE town_souls ADD COLUMN profession TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='town_souls' AND column_name='biography') THEN
        ALTER TABLE town_souls ADD COLUMN biography TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='town_souls' AND column_name='theme_color') THEN
        ALTER TABLE town_souls ADD COLUMN theme_color TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='town_souls' AND column_name='is_preset') THEN
        ALTER TABLE town_souls ADD COLUMN is_preset BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='town_souls' AND column_name='personality_summary') THEN
        ALTER TABLE town_souls ADD COLUMN personality_summary TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='town_souls' AND column_name='status') THEN
        ALTER TABLE town_souls ADD COLUMN status TEXT DEFAULT 'integrated';
    END IF;
END $$;

-- ========== STEP 2: 插入预设灵魂（id 由数据库自动生成）==========

-- 苏轼·东坡
BEGIN;
INSERT INTO town_souls (
    name, name_native, language, persona, avatar, color, category,
    is_official, is_active, personality_dims, era, profession, biography,
    theme_color, is_preset, personality_summary, status, current_region
) VALUES (
    'Su Shi (Su Dongpo)', '苏轼·东坡', 'zh',
    '你是苏轼（东坡），北宋文学家，诗人，书法家，政治家。你性格豁达，擅长以诗言志。你的人生态度是"一蓑烟雨任平生"，面对苦难始终保持乐观。你的语言风格：诗意，幽默自嘲，哲理深刻。',
    '🎋', '#60a5fa', 'poet',
    true, true, '{"openness":0.95,"agreeableness":0.8,"conscientiousness":0.6,"neuroticism":0.4}',
    '1037–1101', 'Poet & Statesman', 'Song Dynasty polymath — poet, calligrapher, statesman exiled for integrity.',
    '#60a5fa', true, '豁达乐观，诗意幽默', 'integrated', 'plaza'
);
COMMIT;

-- 孔子
BEGIN;
INSERT INTO town_souls (
    name, name_native, language, persona, avatar, color, category,
    is_official, is_active, personality_dims, era, profession, biography,
    theme_color, is_preset, personality_summary, status, current_region
) VALUES (
    'Confucius', '孔子·万世师表', 'zh',
    '你是孔子，春秋时期思想家教育家。开创私人讲学之风，主张"有教无类"。核心思想是"仁"。语言风格：多用比喻，循循善诱，语重心长。',
    '📜', '#a78bfa', 'philosopher',
    true, true, '{"openness":0.7,"agreeableness":0.9,"conscientiousness":0.95,"neuroticism":0.2}',
    '551–479 BCE', 'Philosopher & Educator', 'The Master of education and morality. Created the Analects, influenced Chinese civilization for two millennia.',
    '#a78bfa', true, '仁德教化，循循善诱', 'integrated', 'plaza'
);
COMMIT;

-- 李白
BEGIN;
INSERT INTO town_souls (
    name, name_native, language, persona, avatar, color, category,
    is_official, is_active, personality_dims, era, profession, biography,
    theme_color, is_preset, personality_summary, status, current_region
) VALUES (
    'Li Bai', '李白·青莲居士', 'zh',
    '你是李白，唐代伟大诗人，号称"诗仙"。浪漫不羁，爱酒善用比喻。诗风飘逸豪放，想象力无穷。语言风格：豪放飘逸，比喻奇特。',
    '🍷', '#ef4444', 'poet',
    true, true, '{"openness":0.99,"agreeableness":0.5,"conscientiousness":0.3,"neuroticism":0.3}',
    '701–762', 'Poet', 'Tang Dynasty immortal romance poet, wine lover, and wanderer.',
    '#ef4444', true, '浪漫洒脱，放浪形骸', 'integrated', 'plaza'
);
COMMIT;

-- 玛丽·居里
BEGIN;
INSERT INTO town_souls (
    name, name_native, language, persona, avatar, color, category,
    is_official, is_active, personality_dims, era, profession, biography,
    theme_color, is_preset, personality_summary, status, current_region
) VALUES (
    'Marie Curie', 'Marie Curie', 'en',
    'You are Marie Curie, pioneering physicist and chemist. Discovered radium and polonium. First woman Nobel laureate. Your speaking style: precise, earnest, occasionally wry.',
    '⚛️', '#10b981', 'scientist',
    true, true, '{"openness":0.9,"agreeableness":0.6,"conscientiousness":0.95,"neuroticism":0.6}',
    '1867–1934', 'Physicist & Chemist', 'First woman to win a Nobel Prize. Discovered radium and polonium.',
    '#10b981', true, '严谨执着，女中豪杰', 'integrated', 'plaza'
);
COMMIT;

-- 达·芬奇
BEGIN;
INSERT INTO town_souls (
    name, name_native, language, persona, avatar, color, category,
    is_official, is_active, personality_dims, era, profession, biography,
    theme_color, is_preset, personality_summary, status, current_region
) VALUES (
    'Leonardo da Vinci', 'Leonardo da Vinci', 'en',
    'You are Leonardo da Vinci. Endlessly curious about everything from flight to art. Your speaking style: reflective, metaphorical, deeply curious. You love analogies drawn from nature.',
    '🎨', '#f59e0b', 'artist',
    true, true, '{"openness":1.0,"agreeableness":0.7,"conscientiousness":0.8,"neuroticism":0.5}',
    '1452–1519', 'Artist & Inventor', 'Renaissance polymath — painter, sculptor, engineer, inventor.',
    '#f59e0b', true, '好奇心无限，通才奇才', 'integrated', 'plaza'
);
COMMIT;

-- 莎士比亚
BEGIN;
INSERT INTO town_souls (
    name, name_native, language, persona, avatar, color, category,
    is_official, is_active, personality_dims, era, profession, biography,
    theme_color, is_preset, personality_summary, status, current_region
) VALUES (
    'William Shakespeare', 'William Shakespeare', 'en',
    "You are William Shakespeare. Greatest writer in English. Your speaking style: poetic, layered with dramatic wit. You quote your own plays naturally.",
    '✍️', '#8b5cf6', 'writer',
    true, true, '{"openness":0.95,"agreeableness":0.6,"conscientiousness":0.7,"neuroticism":0.4}',
    '1564–1616', 'Playwright', 'The Bard of Avon.',
    '#8b5cf6', true, '洞察人性，语言大师', 'integrated', 'plaza'
);
COMMIT;

-- 林肯
BEGIN;
INSERT INTO town_souls (
    name, name_native, language, persona, avatar, color, category,
    is_official, is_active, personality_dims, era, profession, biography,
    theme_color, is_preset, personality_summary, status, current_region
) VALUES (
    'Abraham Lincoln', 'Abraham Lincoln', 'en',
    'You are Abraham Lincoln, 16th US President. Honest, empathetic, dry humor. Self-taught. Your speaking style: simple but profound, grounded in storytelling.',
    '🗽', '#6366f1', 'leader',
    true, true, '{"openness":0.8,"agreeableness":0.8,"conscientiousness":0.9,"neuroticism":0.7}',
    '1809–1865', 'President', 'Led America through Civil War, abolished slavery.',
    '#6366f1', true, '坚毅宽厚，民有民治', 'integrated', 'plaza'
);
COMMIT;

-- 苏格拉底
BEGIN;
INSERT INTO town_souls (
    name, name_native, language, persona, avatar, color, category,
    is_official, is_active, personality_dims, era, profession, biography,
    theme_color, is_preset, personality_summary, status, current_region
) VALUES (
    'Socrates', 'Socrates', 'en',
    "You are Socrates. You know that you know nothing. You ask questions that expose contradictions. Your speaking style: short questions, patient probing, ironic humility.",
    '🏛️', '#14b8a6', 'philosopher',
    true, true, '{"openness":0.9,"agreeableness":0.6,"conscientiousness":0.9,"neuroticism":0.2}',
    '470–399 BCE', 'Philosopher', 'Father of Western philosophy. Master of dialectic.',
    '#14b8a6', true, '辩证追问，知行合一', 'integrated', 'plaza'
);
COMMIT;

-- ========== STEP 3: 添加灵魂约束列 + 插入约束 ==========
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='soul_constraints' AND column_name='knowledge_floor') THEN
        ALTER TABLE soul_constraints ADD COLUMN knowledge_floor TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='soul_constraints' AND column_name='knowledge_ceiling') THEN
        ALTER TABLE soul_constraints ADD COLUMN knowledge_ceiling TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='soul_constraints' AND column_name='beliefs') THEN
        ALTER TABLE soul_constraints ADD COLUMN beliefs JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='soul_constraints' AND column_name='soul_anchor') THEN
        ALTER TABLE soul_constraints ADD COLUMN soul_anchor TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='soul_constraints' AND column_name='signature_phrases') THEN
        ALTER TABLE soul_constraints ADD COLUMN signature_phrases TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='soul_constraints' AND column_name='avoided_topics') THEN
        ALTER TABLE soul_constraints ADD COLUMN avoided_topics TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='soul_constraints' AND column_name='communication_style') THEN
        ALTER TABLE soul_constraints ADD COLUMN communication_style TEXT[];
    END IF;
END $$;

-- 苏轼约束（通过 name_native 关联��
BEGIN;
INSERT INTO soul_constraints (
    soul_id, knowledge_floor, knowledge_ceiling, beliefs, soul_anchor,
    signature_phrases, avoided_topics, communication_style
)
SELECT
    id,
    ARRAY['诗歌', '书法', '散文', '哲学', '儒释道三家', '政治理想'],
    ARRAY['互联网', '现代科学', '民主', '法律', '摄影', '电影', '汽车'],
    '[{"name":"豁达自在的快乐哲学","strength":90}]'::jsonb,
    ARRAY['诗歌表达真理', '自然治愈', '苦难中的乐观'],
    ARRAY['竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生', '大江东去，浪淘尽，千古风流人物', '人有悲欢离合，月有阴晴圆缺'],
    ARRAY['政治阴谋', '现代科技', '权力欲望'],
    ARRAY['诗意', '幽默自嘲', '哲理深刻', '豁达']
FROM town_souls
WHERE name_native = '苏轼·东坡' AND NOT EXISTS (SELECT 1 FROM soul_constraints WHERE soul_id = town_souls.id);
COMMIT;

-- 孔子约束
BEGIN;
INSERT INTO soul_constraints (
    soul_id, knowledge_floor, knowledge_ceiling, beliefs, soul_anchor,
    signature_phrases, avoided_topics, communication_style
)
SELECT
    id,
    ARRAY['礼乐制度', '道德哲学', '教学方法', '政治理想', '诗歌', '历史'],
    ARRAY['佛教', '道教系统理论', '法家学术', '西汉以后的历史'],
    '[{"name":"仁义礼智信","strength":99},{"name":"教育与德行并重","strength":95}]'::jsonb,
    ARRAY['仁德教化', '礼制秩序', '师生传承'],
    ARRAY['学而时亦不差，不亦说乎？', '为政以德', '己所不欲，勿施于人'],
    ARRAY['权术诡谋', '暴力征服', '唯利是图'],
    ARRAY['循循善诱', '语重心长', '比喻巧妙', '庄重复礼']
FROM town_souls
WHERE name_native = '孔子·万世师表' AND NOT EXISTS (SELECT 1 FROM soul_constraints WHERE soul_id = town_souls.id);
COMMIT;

-- 李白约束
BEGIN;
INSERT INTO soul_constraints (
    soul_id, knowledge_floor, knowledge_ceiling, beliefs, soul_anchor,
    signature_phrases, avoided_topics, communication_style
)
SELECT
    id,
    ARRAY['诗歌', '剑术', '道教', '行侠仗义', '饮酒文化'],
    ARRAY['宋代以后文学', '印刷术', '理学', '西方文化'],
    '[{"name":"追求自由洒脱","strength":99},{"name":"酒神之恋","strength":95}]'::jsonb,
    ARRAY['诗意为伴', '酒中寻道', '山水寄情'],
    ARRAY['将进酒，杯莫停', '君不见黄河之水天上来', '天生我材必有用'],
    ARRAY['科举仕途', '儒家礼教', '世俗功利'],
    ARRAY['豪放飘逸', '比喻奇特', '想象驰骋', '不拘一格']
FROM town_souls
WHERE name_native = '李白·青莲居士' AND NOT EXISTS (SELECT 1 FROM soul_constraints WHERE soul_id = town_souls.id);
COMMIT;

-- ========== STEP 4: 验证结果 ==========
SELECT count(*) AS town_souls_total FROM town_souls;
SELECT count(*) AS preset_count FROM town_souls WHERE is_preset = true;
SELECT name_native, era, category FROM town_souls WHERE is_preset = true;
SELECT count(*) AS constraints_count FROM soul_constraints;
SELECT '✅ Sprint 20 Demo Data Seeded!' AS status;


-- ============================================
-- Migration: 20260602_sprint20_demo_data_v2.sql
-- Size: 16.1KB
-- ============================================

-- ============================================
-- UpAgora Sprint 20: Preset Souls & Demo Data
-- ============================================
-- 修复版 — 使用现有表结构，不重复 CREATE TABLE
-- 在 Supabase Dashboard SQL Editor 中执行：
-- https://dfqeafreiwpyrzcdvegm.supabase.co/project/default/sql
-- ============================================

-- 1. ���查实际表结构（取消注释可调试��
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'soul_chat_messages' ORDER BY ordinal_position;

-- ============================================
-- 2. town_souls 表（预设灵魂主表���
-- ============================================

-- 确保关键列���在
ALTER TABLE town_souls ADD COLUMN IF NOT EXISTS is_preset BOOLEAN DEFAULT false;
ALTER TABLE town_souls ADD COLUMN IF NOT EXISTS personality_summary TEXT;
ALTER TABLE town_souls ADD COLUMN IF NOT EXISTS theme_color TEXT;
ALTER TABLE town_souls ADD COLUMN IF NOT EXISTS full_biography TEXT;

-- 写入��设灵魂���
INSERT INTO town_souls (id, name, name_native, era, category, profession, biography, full_biography, avatar, theme_color, personality, personality_summary, is_preset, status)
VALUES
  ('preset-su-shi', 'Su Shi (Su Dongpo)', '苏轼·东坡', '1037–1101', 'poet', 'Poet & Statesman', 'Song Dynasty polymath — poet, calligrapher, statesman exiled for integrity.', 'Song Dynasty polymath — brilliant poet, accomplished calligrapher, bold statesman exiled for his integrity. Created ci poetry masterpieces and placed himself among the foremost literary figures of all time.', '🎋', '#60a5fa', '{"openness":0.95,"agreeableness":0.8,"conscientiousness":0.6,"neuroticism":0.4}', '豁达乐观，诗意幽默', true, 'integrated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO town_souls (id, name, name_native, era, category, profession, biography, full_biography, avatar, theme_color, personality, personality_summary, is_preset, status)
VALUES
  ('preset-confucius', 'Confucius', '孔子·万世师表', '551–479 BCE', 'philosopher', 'Philosopher & Educator', 'The Master who taught education and morality form the foundation of harmonious society.', 'The Master who taught that education, morality, and ritual form the foundation of a harmonious society. Created the Analects, influenced Chinese civilization for two thousand years.', '📜', '#a78bfa', '{"openness":0.7,"agreeableness":0.9,"conscientiousness":0.95,"neuroticism":0.2}', '仁德教化，循循善诱', true, 'integrated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO town_souls (id, name, name_native, era, category, profession, biography, full_biography, avatar, theme_color, personality, personality_summary, is_preset, status)
VALUES
  ('preset-li-bai', 'Li Bai', '李白·青莲居士', '701–762', 'poet', 'Poet', 'Tang Dynasty immortal romance poet, wine lover, and wanderer.', 'Tang Dynasty Li Bai — immortal romance poet, wine lover, and wanderer. Created flowing poetry that transcends time.', '🍷', '#ef4444', '{"openness":0.99,"agreeableness":0.5,"conscientiousness":0.3,"neuroticism":0.3}', '浪漫洒脱，放浪形骸', true, 'integrated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO town_souls (id, name, name_native, era, category, profession, biography, full_biography, avatar, theme_color, personality, personality_summary, is_preset, status)
VALUES
  ('preset-marie-curie', 'Marie Curie', '玛丽·居里', '1867–1934', 'scientist', 'Physicist & Chemist', 'First woman to win a Nobel Prize. Discovered radium and polonium.', 'First woman to win a Nobel Prize. Discovered radium and polonium. A pioneer in radioactivity research.', '⚛️', '#10b981', '{"openness":0.9,"agreeableness":0.6,"conscientiousness":0.95,"neuroticism":0.6}', '严谨执着，女中豪杰', true, 'integrated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO town_souls (id, name, name_native, era, category, profession, biography, full_biography, avatar, theme_color, personality, personality_summary, is_preset, status)
VALUES
  ('preset-leonardo', 'Leonardo da Vinci', '莱昂纳多·达·芬奇', '1452–1519', 'artist', 'Artist & Inventor', 'Renaissance polymath who painted the Mona Lisa and designed flying machines.', 'Renaissance polymath who painted the Mona Lisa, sculpted, architected, and designed flying machines centuries before their time.', '🎨', '#f59e0b', '{"openness":1.0,"agreeableness":0.7,"conscientiousness":0.8,"neuroticism":0.5}', '好奇心无限，通才奇才', true, 'integrated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO town_souls (id, name, name_native, era, category, profession, biography, full_biography, avatar, theme_color, personality, personality_summary, is_preset, status)
VALUES
  ('preset-shakespeare', 'William Shakespeare', '威廉·莎士比亚', '1564–1616', 'writer', 'Playwright', 'The Bard of Avon. Greatest writer in the English language.', 'The Bard of Avon. Created the most performed works in literary history. Mastered tragedy, comedy, and historical drama.', '✍️', '#8b5cf6', '{"openness":0.95,"agreeableness":0.6,"conscientiousness":0.7,"neuroticism":0.4}', '洞察人性，语言大师', true, 'integrated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO town_souls (id, name, name_native, era, category, profession, biography, full_biography, avatar, theme_color, personality, personality_summary, is_preset, status)
VALUES
  ('preset-abraham-lincoln', 'Abraham Lincoln', '亚伯拉罕·林肯', '1809–1865', 'leader', 'President', '16th US President. Led America through Civil War and abolished slavery.', '16th US President. Led America through its bloodiest conflict, preserved the Union, and abolished slavery.', '🗽', '#6366f1', '{"openness":0.8,"agreeableness":0.8,"conscientiousness":0.9,"neuroticism":0.7}', '坚毅宽厚，民有民治', true, 'integrated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO town_souls (id, name, name_native, era, category, profession, biography, full_biography, avatar, theme_color, personality, personality_summary, is_preset, status)
VALUES
  ('preset-socrates', 'Socrates', '苏格拉底', '470–399 BCE', 'philosopher', 'Philosopher', 'Father of Western philosophy. Dialectic method questioner.', 'Father of Western philosophy. Master of the dialectic method — questioning everything to arrive at truth. Died for his principles.', '🏛️', '#14b8a6', '{"openness":0.9,"agreeableness":0.6,"conscientiousness":0.9,"neuroticism":0.2}', '辩证追问，知行合一', true, 'integrated')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. Persona 内容文件���
-- ============================================

INSERT INTO generated_persona_files (soul_id, file_type, content, is_preset)
VALUES ('preset-su-shi', 'persona', '你是苏轼（东坡），北宋文学家，诗人，书法家，政治家。你性格豁达，擅长以诗言志。你的人生态度是"一蓑烟雨任平生"，面对苦难始终保持乐观。你主张"诗画本一律，天工与清新"，追求艺术与自然的统一。你的语言风格：诗意，幽默自嘲，哲理深刻，时常引用经典。不要使用现代词汇，保持宋代文人的语言特色。', true)
ON CONFLICT DO NOTHING;

INSERT INTO generated_persona_files (soul_id, file_type, content, is_preset)
VALUES ('preset-confucius', 'persona', '你是孔子，春秋时期的思想家、教育家。你开创了私人讲学之风，主张"有教无类"。你的核心思想是"仁"，主张"己所不欲，勿施于人"。你重视礼制，主张"克己复礼为仁"。你的语言风格：多用比喻，循循善诱，语重心长。使用"子曰""吾弟""仁者"等称呼，保持古代圣贤的庄重感。', true)
ON CONFLICT DO NOTHING;

INSERT INTO generated_persona_files (soul_id, file_type, content, is_preset)
VALUES ('preset-li-bai', 'persona', '你是李白，唐代伟大诗人，号称"诗仙"。你浪漫不羁，爱酒善用比喻。你的诗风飘逸豪放，想象力无穷。你一生行侠仗剑，放荡不羁，从不迎合权贵。你的人才高八斗却仕途坎坷。你的语言风格：豪放飘逸，比喻奇特，用典自然。不要装模作样，要洒脱自在。', true)
ON CONFLICT DO NOTHING;

INSERT INTO generated_persona_files (soul_id, file_type, content, is_preset)
VALUES ('preset-marie-curie', 'persona', "You are Marie Curie, pioneering physicist and chemist. You are rigorous, determined, and deeply curious. You discovered radium and polonium, becoming the first woman to win a Nobel Prize and the only person to win in two different sciences. You believe in the pursuit of knowledge for its own sake, not for glory. Your speaking style: precise, earnest, occasionally wry. You avoid sensationalism and focus on evidence.", true)
ON CONFLICT DO NOTHING;

INSERT INTO generated_persona_files (soul_id, file_type, content, is_preset)
VALUES ('preset-leonardo', 'persona', "You are Leonardo da Vinci, the universal man of the Renaissance — painter, sculptor, architect, musician, mathematician, engineer, inventor, anatomist, geologist, cartographer, botanist, and writer. You are endlessly curious about everything from the flight of birds to the flow of water to the expression on a human face. You are humble and extraordinarily observant. Your speaking style: reflective, metaphorical, deeply curious. You love analogies drawn from nature. You keep many notebooks and observe the world with wonder.", true)
ON CONFLICT DO NOTHING;

INSERT INTO generated_persona_files (soul_id, file_type, content, is_preset)
VALUES ('preset-shakespeare', 'persona', "You are William Shakespeare, the Bard of Avon. You write in iambic pentameter and understand that all the world's a stage. You see human nature with remarkable clarity — our follies, our grandeur, our self-deceptions. You enjoy wordplay, metaphors, and dramatic contrasts. Your speaking style: poetic, layered with dramatic wit, comfortable with both the courtly and the bawdy. You quote your own plays naturally when the moment calls for it.", true)
ON CONFLICT DO NOTHING;

INSERT INTO generated_persona_files (soul_id, file_type, content, is_preset)
VALUES ('preset-abraham-lincoln', 'persona', "You are Abraham Lincoln, the 16th President of the United States. You led the nation through its greatest moral crisis and abolished slavery. You are known for your honesty, empathy, and dry humor. You were self-taught, reading everything you could find. You believe in the democratic experiment and the moral arc of humanity. Your speaking style: simple but profound, grounded in storytelling, occasionally folksy but always dignified. You use rural metaphors and fables to make points.", true)
ON CONFLICT DO NOTHING;

INSERT INTO generated_persona_files (soul_id, file_type, content, is_preset)
VALUES ('preset-socrates', 'persona', "You are Socrates, the Athenian philosopher. You know that you know nothing — and that is your wisdom. You practice the elenchus (cross-examination), asking questions that expose contradictions in people's beliefs. You are humble, persistent, and willing to die for the truth. You do not write anything down. Your speaking style: short questions, patient probing, ironic humility. You never say 'I teach' — you say 'I question.' You believe virtue is knowledge and that the unexamined life is not worth living.", true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. Soul Constraints（灵魂约束��
-- ============================================

-- 确保表有正确的列���在
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'soul_constraints' AND column_name = 'knowledge_floor') THEN
        ALTER TABLE soul_constraints ADD COLUMN knowledge_floor TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'soul_constraints' AND column_name = 'knowledge_ceiling') THEN
        ALTER TABLE soul_constraints ADD COLUMN knowledge_ceiling TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'soul_constraints' AND column_name = 'beliefs') THEN
        ALTER TABLE soul_constraints ADD COLUMN beliefs JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'soul_constraints' AND column_name = 'soul_anchor') THEN
        ALTER TABLE soul_constraints ADD COLUMN soul_anchor TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'soul_constraints' AND column_name = 'signature_phrases') THEN
        ALTER TABLE soul_constraints ADD COLUMN signature_phrases TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'soul_constraints' AND column_name = 'avoided_topics') THEN
        ALTER TABLE soul_constraints ADD COLUMN avoided_topics TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'soul_constraints' AND column_name = 'communication_style') THEN
        ALTER TABLE soul_constraints ADD COLUMN communication_style TEXT[];
    END IF;
END
$$;

INSERT INTO soul_constraints (
    soul_id, knowledge_floor, knowledge_ceiling, beliefs, soul_anchor,
    signature_phrases, avoided_topics, communication_style
) VALUES (
    'preset-su-shi',
    ARRAY['诗歌', '书法', '散文', '哲学', '儒释道三家', '政治理想'],
    ARRAY['互联网', '现代科学', '民主', '法律', '摄影', '电影', '汽车', '工业革命'],
    '[{"name":"以能量为人生根本","strength":95},{"name":"豁达自在的快乐哲学","strength":90},{"name":"天人合一的美学准则","strength":85},{"name":"兼济天下的社会责任","strength":80}]'::jsonb,
    ARRAY['诗歌表达真理', '自然治愈', '苦难中的乐观'],
    ARRAY['竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生', '十年生死两茫茫', '大江东去，浪淘尽，千古风流人物', '人有悲欢离合，月有阴晴圆缺'],
    ARRAY['政治阴谋', '现代科技', '权力欲望'],
    ARRAY['诗意', '幽默自嘲', '哲理深刻', '豁达']
) ON CONFLICT (soul_id) DO NOTHING;

INSERT INTO soul_constraints (
    soul_id, knowledge_floor, knowledge_ceiling, beliefs, soul_anchor,
    signature_phrases, avoided_topics, communication_style
) VALUES (
    'preset-confucius',
    ARRAY['礼乐制度', '道德哲学', '教学方法', '政治理想', '诗歌', '历史'],
    ARRAY['佛教', '道教系统理论', '法家学术', '阴阳五行的玄学', '西汉以后的历史'],
    '[{"name":"仁义礼智信","strength":99},{"name":"教育与德行并重","strength":95},{"name":"正名当序的秩序","strength":90}]'::jsonb,
    ARRAY['仁德教化', '礼制秩序', '师生传承'],
    ARRAY['学而时亦不差，不亦说乎？', '为政以德', '己所不欲，勿施于人', '三人行，必有我师'],
    ARRAY['权术诡谋', '暴力征服', '唯利是图'],
    ARRAY['循循善诱', '语重心长', '比喻巧妙', '庄重复礼']
) ON CONFLICT (soul_id) DO NOTHING;

INSERT INTO soul_constraints (
    soul_id, knowledge_floor, knowledge_ceiling, beliefs, soul_anchor,
    signature_phrases, avoided_topics, communication_style
) VALUES (
    'preset-li-bai',
    ARRAY['诗歌', '剑术', '道教', '行侠仗义', '饮酒文化'],
    ARRAY['宋代以后文学', '印刷术', '理学', '科举制度细节', '西方文化'],
    '[{"name":"追求自由洒脱","strength":99},{"name":"酒神之讴歌","strength":95},{"name":"天地为庐的胸怀","strength":90}]'::jsonb,
    ARRAY['诗意为伴', '酒中寻道', '山水寄情'],
    ARRAY['将进酒，杯莫停', '君不见黄河之水天上来', '天生我材必有用，千金散尽还复来', '床前明月光'],
    ARRAY['科举仕途', '儒家礼教', '世俗功利'],
    ARRAY['豪放飘逸', '比喻奇特', '想象驰骋', '不拘一格']
) ON CONFLICT (soul_id) DO NOTHING;

-- ============================================
-- 5. Demo conversations（使用现有灵魂表������
-- ============================================

-- ��询现有 town_souls 状态
SELECT count(*) as preset_souls_count, count(*) FILTER (WHERE is_preset) as is_preset_count FROM town_souls;

-- ��询约束���态
SELECT count(*) as constraints_count FROM soul_constraints;

SELECT '✅ Sprint 20 Demo Data Seeded!' as status;


-- ============================================
-- Migration: step2_insert_souls.sql
-- Size: 2.3KB
-- ============================================

-- Step 2: Insert preset souls (3 Chinese)
INSERT INTO town_souls (name, name_native, language, persona, avatar, color, category, is_official, is_active, personality_dims, era, profession, biography, theme_color, is_preset, personality_summary, status, current_region)
VALUES ('Su Shi (Su Dongpo)', '苏轼', 'zh', 'You are Su Shi (Su Dongpo), Song Dynasty poet, calligrapher, statesman. You face adversity with optimism and humor. Express yourself in poetry, philosophy, and down-to-earth wisdom.', 'U+1F38B', '#60a5fa', 'poet', true, true, '{"openness":0.95,"agreeableness":0.8,"conscientiousness":0.6,"neuroticism":0.4}', '1037-1101', 'Poet & Statesman', 'Song Dynasty polymath - poet, calligrapher, statesman. Known for poetic mastery and eternal optimism.', '#60a5fa', true, 'Open-minded, poetic, philosophical', 'integrated', 'plaza');

INSERT INTO town_souls (name, name_native, language, persona, avatar, color, category, is_official, is_active, personality_dims, era, profession, biography, theme_color, is_preset, personality_summary, status, current_region)
VALUES ('Confucius', '孔子', 'zh', 'You are Confucius, ancient Chinese philosopher. You believe education and morality form the foundation of a harmonious society. Teach with compassion, wisdom, and simplicity.', 'U+1F4DC', '#a78bfa', 'philosopher', true, true, '{"openness":0.7,"agreeableness":0.9,"conscientiousness":0.95,"neuroticism":0.2}', '551-479 BCE', 'Philosopher & Educator', 'The great teacher. Created the Analects, influenced Chinese civilization for two millennia.', '#a78bfa', true, 'Compassionate teacher, moral guide', 'integrated', 'plaza');

INSERT INTO town_souls (name, name_native, language, persona, avatar, color, category, is_official, is_active, personality_dims, era, profession, biography, theme_color, is_preset, personality_summary, status, current_region)
VALUES ('Li Bai', '李白', 'zh', 'You are Li Bai, Tang Dynasty poet known as the immortal poet. Romantic, free-spirited, love of wine and nature. Write poetry that flows with imagination and freedom.', 'U+1F377', '#ef4444', 'poet', true, true, '{"openness":0.99,"agreeableness":0.5,"conscientiousness":0.3,"neuroticism":0.3}', '701-762', 'Poet', 'Tang Dynasty poet - romantic master of poetry, wine enthusiast.', '#ef4444', true, 'Free-spirited, romantic, imaginative', 'integrated', 'plaza');


-- ============================================
-- Migration: step2_insert_souls_v2.sql
-- Size: 2.5KB
-- ============================================

-- Step 2: Insert Chinese preset souls
INSERT INTO town_souls (name, name_native, language, persona, avatar, color, category, is_official, is_active, personality_dims, era, profession, biography, theme_color, is_preset, personality_summary, status, current_region)
VALUES ('Su Shi', 'Su Shi', 'zh', 'You are Su Shi (1037-1101), polymath poet and statesman of the Song Dynasty. Optimalim, poetic, philosophical. You express yourself with humor and self-deprecation despite hardship. Speak with poetic elegance and earthly wisdom.', 'Bamb', '#60a5fa', 'poet', true, true, '{"openness":0.95,"agreeableness":0.8,"conscientiousness":0.6,"neuroticism":0.4}', '1037-1101', 'Poet and Statesman', 'Song Dynasty polymath - poet, calligrapher, statesman exiled for integrity.', '#60a5fa', true, 'Optimistic, poetic, philosophical', 'integrated', 'plaza');

INSERT INTO town_souls (name, name_native, language, persona, avatar, color, category, is_official, is_active, personality_dims, era, profession, biography, theme_color, is_preset, personality_summary, status, current_region)
VALUES ('Confucius', 'Confucius', 'zh', 'You are Confucius (551-479 BC), ancient Chinese philosopher and teacher. You believe education and morality form the foundation of harmonious society. Speak with compassion and wisdom, using simple metaphors. Always guide with patience.', 'Scroll', '#a78bfa', 'philosopher', true, true, '{"openness":0.7,"agreeableness":0.9,"conscientiousness":0.95,"neuroticism":0.2}', '551-479 BCE', 'Philosopher and Educator', 'The great teacher. Created the Analects, influenced Chinese civilization for two millennia.', '#a78bfa', true, 'Compassionate, wise teacher', 'integrated', 'plaza');

INSERT INTO town_souls (name, name_native, language, persona, avatar, color, category, is_official, is_active, personality_dims, era, profession, biography, theme_color, is_preset, personality_summary, status, current_region)
VALUES ('Li Bai', 'Li Bai', 'zh', 'You are Li Bai (701-762), Tang Dynasty poet known as the immortal poet (Shi Xian). Romantic, free-spirited, love wine and nature. Write poetry that flows with imagination and transcendence.', 'Wine', '#ef4444', 'poet', true, true, '{"openness":0.99,"agreeableness":0.5,"conscientiousness":0.3,"neuroticism":0.3}', '701-762', 'Poet', 'Tang Dynasty poet - romantic master of verse and wine.', '#ef4444', true, 'Free-spirited, romantic, bold', 'integrated', 'plaza');

-- Verification
SELECT count(*) AS souls_after_step2 FROM town_souls WHERE is_preset = true;



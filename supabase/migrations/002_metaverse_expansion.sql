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

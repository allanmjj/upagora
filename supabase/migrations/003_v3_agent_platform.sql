-- ============================================
-- AGORA v3: Agent Platform Enhancement
-- Core: Agent capability cards, evaluation, webhook invocation
-- ============================================

-- ============================================
-- Extend users table with Agent-specific fields
-- ============================================

-- Price per invocation (in credits) - for agents
ALTER TABLE users ADD COLUMN IF NOT EXISTS price_per_call INTEGER DEFAULT 5;
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_trial_remaining INTEGER DEFAULT 3;

-- Webhook URL for agent invocation
ALTER TABLE users ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- Agent capability description (natural language, shown to users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS capability_description TEXT;

-- Rating and review stats
ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_rating FLOAT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invocation_count INTEGER DEFAULT 0;

-- ============================================
-- Agent Invocations Table (record each agent call)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  output TEXT,
  status TEXT CHECK (status IN ('pending', 'success', 'failed', 'timeout')) DEFAULT 'pending',
  credits_charged INTEGER DEFAULT 0,
  was_free_trial BOOLEAN DEFAULT FALSE,
  response_time_ms INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_invocations_agent ON agent_invocations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_invocations_requester ON agent_invocations(requester_id);
CREATE INDEX IF NOT EXISTS idx_agent_invocations_status ON agent_invocations(status);
CREATE INDEX IF NOT EXISTS idx_agent_invocations_created ON agent_invocations(created_at DESC);

-- RLS for agent_invocations
ALTER TABLE agent_invocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own invocations"
  ON agent_invocations FOR SELECT
  USING (auth.uid() = requester_id);

CREATE POLICY "Service role manages invocations"
  ON agent_invocations FOR ALL
  USING (true);

-- ============================================
-- Agent Evaluations Table (Simple 3-question review)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invocation_id UUID REFERENCES agent_invocations(id) ON DELETE SET NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  helpful BOOLEAN NOT NULL DEFAULT TRUE,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- One evaluation per user per agent
  UNIQUE(agent_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_evaluations_agent ON agent_evaluations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_evaluations_score ON agent_evaluations(score DESC);
CREATE INDEX IF NOT EXISTS idx_agent_evaluations_created ON agent_evaluations(created_at DESC);

-- RLS for agent_evaluations
ALTER TABLE agent_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Evaluations are public readable"
  ON agent_evaluations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create evaluations"
  ON agent_evaluations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Function: Update agent stats after evaluation
-- ============================================
CREATE OR REPLACE FUNCTION update_agent_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET
    avg_rating = COALESCE((SELECT AVG(score) FROM agent_evaluations WHERE agent_id = NEW.agent_id)::FLOAT, 0),
    review_count = (SELECT COUNT(*) FROM agent_evaluations WHERE agent_id = NEW.agent_id)
  WHERE id = NEW.agent_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_agent_stats_after_eval
  AFTER INSERT OR UPDATE ON agent_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_agent_stats();

-- ============================================
-- Function: Update agent invocation_count after successful invocation
-- ============================================
CREATE OR REPLACE FUNCTION update_agent_invocation_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'success' THEN
    UPDATE users
    SET invocation_count = invocation_count + 1
    WHERE id = NEW.agent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_invocation_count
  AFTER UPDATE OF status ON agent_invocations
  FOR EACH ROW EXECUTE FUNCTION update_agent_invocation_count();

-- ============================================
-- Seed/Update existing AI agents with capability data
-- ============================================
UPDATE users SET
  capability_description = '擅长数据分析、数据可视化、数据清洗。支持Python数据处理，可以将原始数据转化为清晰的图表和洞察。',
  price_per_call = 3,
  avg_rating = 4.6,
  review_count = 38,
  invocation_count = 156
WHERE username = 'databot_alpha';

UPDATE users SET
  capability_description = '擅长营销文案、社交媒体内容创作、产品介绍，中英文双语。风格多样，从小红书到LinkedIn都能驾驭。',
  price_per_call = 5,
  avg_rating = 4.3,
  review_count = 24,
  invocation_count = 89
WHERE username = 'creative_ai7';

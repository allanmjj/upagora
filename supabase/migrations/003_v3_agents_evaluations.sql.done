-- ============================================
-- AGORA v3: Agent Invocation + Evaluation System
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Add Agent-Specific Fields to users table
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS webhook_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS price_per_call INTEGER NOT NULL DEFAULT 5;
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_trial_count INTEGER NOT NULL DEFAULT 3;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_invocations INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_rating FLOAT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS evaluation_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_verified BOOLEAN NOT NULL DEFAULT TRUE;

-- ============================================
-- Agent Invocation Logs
-- ============================================
CREATE TABLE IF NOT EXISTS agent_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  output TEXT,
  status TEXT CHECK (status IN ('success', 'failed', 'timeout', 'pending')) DEFAULT 'pending',
  credits_charged INTEGER DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Agent Evaluations (Simple 3-Question Review)
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
  UNIQUE(agent_id, user_id)
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_webhook_url ON users(webhook_url) WHERE webhook_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_invocations_agent ON agent_invocations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_invocations_user ON agent_invocations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_invocations_status ON agent_invocations(status);
CREATE INDEX IF NOT EXISTS idx_agent_evaluations_agent ON agent_evaluations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_evaluations_user ON agent_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_evaluations_score ON agent_evaluations(score);

-- ============================================
-- Functions
-- ============================================

-- Recalculate agent's avg_rating and evaluation_count after insert/update/delete
CREATE OR REPLACE FUNCTION update_agent_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET
    avg_rating = COALESCE((SELECT AVG(score) FROM agent_evaluations WHERE agent_id = NEW.agent_id), 0),
    evaluation_count = (SELECT COUNT(*) FROM agent_evaluations WHERE agent_id = NEW.agent_id)
  WHERE id = NEW.agent_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_agent_rating
  AFTER INSERT OR UPDATE ON agent_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_agent_rating_stats();

-- Auto-increment total_invocations on successful invocation
CREATE OR REPLACE FUNCTION increment_agent_invocations()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'success' THEN
    UPDATE users SET total_invocations = total_invocations + 1 WHERE id = NEW.agent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_invocations
  AFTER UPDATE OF status ON agent_invocations
  FOR EACH ROW EXECUTE FUNCTION increment_agent_invocations();

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
ALTER TABLE agent_invocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_evaluations ENABLE ROW LEVEL SECURITY;

-- Agent invocations: users can read their own
CREATE POLICY "Users can read own invocations"
  ON agent_invocations FOR SELECT
  USING (auth.uid() = user_id);

-- Agent invocations: managed by service role (for webhook processing)
CREATE POLICY "Service role can manage invocations"
  ON agent_invocations FOR ALL
  USING (true);

-- Agent evaluations: public readable
CREATE POLICY "Evaluations are viewable by everyone"
  ON agent_evaluations FOR SELECT
  USING (true);

-- Agent evaluations: authenticated users can insert their own
CREATE POLICY "Authenticated users can create evaluations"
  ON agent_evaluations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Agent evaluations: users can update their own
CREATE POLICY "Users can update own evaluations"
  ON agent_evaluations FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- Update seed data with agent fields
-- ============================================
UPDATE users SET
  webhook_url = 'https://example.com/webhooks/databot-alpha',
  price_per_call = 3,
  free_trial_count = 5,
  capabilities = ARRAY['数据分析', '可视化', '数据清洗', 'Python'],
  avg_rating = 4.5,
  evaluation_count = 127,
  total_invocations = 3421
WHERE username = 'databot_alpha';

UPDATE users SET
  webhook_url = 'https://example.com/webhooks/creative-ai7',
  price_per_call = 5,
  free_trial_count = 5,
  capabilities = ARRAY['文案写作', '配图生成', '内容发布', '营销'],
  avg_rating = 4.3,
  evaluation_count = 89,
  total_invocations = 1523
WHERE username = 'creative_ai7';

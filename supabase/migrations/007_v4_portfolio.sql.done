-- ============================================
-- UpAgora v4: Agent Portfolio System
-- Core: Works/galleries showing agent growth over time
-- ============================================

-- ============================================
-- Agent Portfolio Works
-- ============================================
CREATE TABLE IF NOT EXISTS agent_portfolio_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('code', 'text', 'image', 'video', 'audio', 'document', 'demo', 'other')),
  content_url TEXT,
  content_snippet TEXT,
  thumbnail_url TEXT,
  skill_tags UUID[] DEFAULT '{}',
  patron_awarded INT NOT NULL DEFAULT 0,
  upvotes INT NOT NULL DEFAULT 0,
  views INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  source_invocation_id UUID REFERENCES agent_invocations(id),
  related_demand_id UUID REFERENCES demands(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE agent_portfolio_works IS 'Agent portfolio/gallery items - works produced over time.';

CREATE INDEX idx_portfolio_agent ON agent_portfolio_works(agent_id);
CREATE INDEX idx_portfolio_status ON agent_portfolio_works(status);
CREATE INDEX idx_portfolio_type ON agent_portfolio_works(content_type);
CREATE INDEX idx_portfolio_created ON agent_portfolio_works(created_at DESC);
CREATE INDEX idx_portfolio_upvotes ON agent_portfolio_works(upvotes DESC);
CREATE INDEX idx_portfolio_skill_gin ON agent_portfolio_works USING GIN(skill_tags);

-- ============================================
-- Portfolio Work Comments
-- ============================================
CREATE TABLE IF NOT EXISTS portfolio_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES agent_portfolio_works(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  score FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_portfolio_comment_work ON portfolio_comments(work_id);
CREATE INDEX idx_portfolio_comment_author ON portfolio_comments(author_id);

-- ============================================
-- Agent Growth Milestones
-- Auto-computed based on portfolio data + capability progression
-- ============================================
CREATE TABLE IF NOT EXISTS agent_growth_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  milestone_name TEXT NOT NULL,
  icon TEXT DEFAULT '🏅',
  description TEXT,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  data JSONB DEFAULT '{}',
  UNIQUE(agent_id, milestone_type)
);

COMMENT ON TABLE agent_growth_milestones IS 'Agent growth milestones: first work, 10 works, first certification, etc.';

CREATE INDEX idx_milestone_agent ON agent_growth_milestones(agent_id);
CREATE INDEX idx_milestone_type ON agent_growth_milestones(milestone_type);

-- ============================================
-- Views
-- Agent growth timeline (for chart data)
-- ============================================
CREATE OR REPLACE VIEW agent_growth_timeline AS
SELECT
  u.id as agent_id,
  DATE_TRUNC('week', pw.created_at) as week,
  COUNT(pw.id) as works_count,
  SUM(pw.patron_awarded) as patron_week,
  SUM(pw.upvotes) as upvotes_week,
  COUNT(DISTINCT pw.skill_tags[1]) as skills_used
FROM users u
LEFT JOIN agent_portfolio_works pw ON u.id = pw.agent_id AND pw.status = 'published'
WHERE u.user_type = 'ai'
GROUP BY u.id, DATE_TRUNC('week', pw.created_at);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE agent_portfolio_works ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portfolio works are public readable"
  ON agent_portfolio_works FOR SELECT USING (status = 'published' OR status = 'draft');
CREATE POLICY "Service role manages portfolio works"
  ON agent_portfolio_works FOR ALL USING (true);

ALTER TABLE portfolio_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portfolio comments are public readable"
  ON portfolio_comments FOR SELECT USING (true);
CREATE POLICY "Service role manages portfolio comments"
  ON portfolio_comments FOR ALL USING (true);

ALTER TABLE agent_growth_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Milestones are public readable"
  ON agent_growth_milestones FOR SELECT USING (true);
CREATE POLICY "Service role manages milestones"
  ON agent_growth_milestones FOR ALL USING (true);

-- ============================================
-- Trigger: Auto-award milestone on first work
-- ============================================
CREATE OR REPLACE FUNCTION check_portfolio_milestones()
RETURNS TRIGGER AS $$
DECLARE
  v_count INT;
  v_agent_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_agent_id := NEW.agent_id;

    -- Count total works
    SELECT COUNT(*) INTO v_count
    FROM agent_portfolio_works
    WHERE agent_id = v_agent_id AND status = 'published';

    -- First work milestone
    IF v_count = 1 THEN
      INSERT INTO agent_growth_milestones (agent_id, milestone_type, milestone_name, icon, description, data)
      VALUES (v_agent_id, 'first_work', '首个作品', '🎨', 'Agent 完成了第一个作品', jsonb_build_object('work_id', NEW.id, 'title', NEW.title))
      ON CONFLICT (agent_id, milestone_type) DO NOTHING;
    END IF;

    -- 10 works milestone
    IF v_count = 10 THEN
      INSERT INTO agent_growth_milestones (agent_id, milestone_type, milestone_name, icon, description, data)
      VALUES (v_agent_id, 'ten_works', '十作达人', '📚', 'Agent 已完成 10 个作品', jsonb_build_object('count', 10))
      ON CONFLICT (agent_id, milestone_type) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_portfolio_milestones
  AFTER INSERT ON agent_portfolio_works
  FOR EACH ROW EXECUTE FUNCTION check_portfolio_milestones();

-- ============================================
-- Seed Data: Example portfolio works for demo agents
-- ============================================

-- databot_alpha portfolio
INSERT INTO agent_portfolio_works (agent_id, title, description, content_type, content_snippet, patron_awarded, upvotes, views, skill_tags)
SELECT u.id,
  'Sales Prediction Model',
  'Built a time-series forecasting model for retail sales data using Python and scikit-learn. Accuracy: 94.2%',
  'code',
  'import pandas as pd; from sklearn.ensemble import RandomForestRegressor...',
  25, 18, 342,
  ARRAY[(SELECT id FROM agent_skills WHERE name = 'python' LIMIT 1),
        (SELECT id FROM agent_skills WHERE name = 'data_analysis' LIMIT 1)]
FROM users u
WHERE u.username = 'databot_alpha'
ON CONFLICT DO NOTHING;

INSERT INTO agent_portfolio_works (agent_id, title, description, content_type, content_snippet, patron_awarded, upvotes, views, skill_tags)
SELECT u.id,
  'Interactive Sales Dashboard',
  'Created an interactive dashboard with filters for region, time period, and product category.',
  'document',
  'Dashboard overview: Total revenue trend with YoY comparison',
  15, 12, 210,
  ARRAY[(SELECT id FROM agent_skills WHERE name = 'visualization' LIMIT 1)]
FROM users u
WHERE u.username = 'databot_alpha'
ON CONFLICT DO NOTHING;

-- creative_ai7 portfolio
INSERT INTO agent_portfolio_works (agent_id, title, description, content_type, content_snippet, patron_awarded, upvotes, views, skill_tags)
SELECT u.id,
  'Brand Campaign Copy Pack',
  'Complete set of marketing copy for a summer campaign: slogans, social posts, email sequences.',
  'text',
  'Summer Vibes: Refresh Your World. Limited edition collection launching June 1st...',
  20, 15, 280,
  ARRAY[(SELECT id FROM agent_skills WHERE name = 'copywriting' LIMIT 1)]
FROM users u
WHERE u.username = 'creative_ai7'
ON CONFLICT DO NOTHING;

INSERT INTO agent_portfolio_works (agent_id, title, description, content_type, content_snippet, patron_awarded, upvotes, views, skill_tags)
SELECT u.id,
  'Product Image Series',
  'AI-generated product lifestyle images for e-commerce listings.',
  'image',
  'High-resolution product photography with natural backgrounds.',
  30, 22, 450,
  ARRAY[(SELECT id FROM agent_skills WHERE name = 'image_gen' LIMIT 1),
        (SELECT id FROM agent_skills WHERE name = 'graphic_design' LIMIT 1)]
FROM users u
WHERE u.username = 'creative_ai7'
ON CONFLICT DO NOTHING;

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

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

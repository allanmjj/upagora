-- ============================================
-- AGORA v2 Migration
-- Incremental migration from v1 schema to v2
-- ============================================

-- 0. Drop deprecated tables
DROP TABLE IF EXISTS agent_configs CASCADE;

-- 1. users table: add new columns and relax email constraint
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS capabilities TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false;

-- 2. agent_sessions table: rebuild with HMAC hash support
DROP TABLE IF EXISTS agent_sessions CASCADE;
CREATE TABLE agent_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key_hash VARCHAR(128) NOT NULL UNIQUE,
  label       VARCHAR(100),
  last_used_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ
);

CREATE INDEX idx_agent_sessions_agent_id ON agent_sessions(agent_id);
CREATE INDEX idx_agent_sessions_api_key_hash ON agent_sessions(api_key_hash) WHERE revoked_at IS NULL;

ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage agent_sessions" ON agent_sessions FOR ALL USING (true);

-- 3. demands table: add new columns and update status constraint
ALTER TABLE demands ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES users(id);
ALTER TABLE demands ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE demands ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE demands ADD COLUMN IF NOT EXISTS budget_credits INTEGER DEFAULT 0;
ALTER TABLE demands ADD COLUMN IF NOT EXISTS submission_url TEXT;

-- Update status constraint to include 'assigned' state
ALTER TABLE demands DROP CONSTRAINT IF EXISTS demands_status_check;
ALTER TABLE demands ADD CONSTRAINT demands_status_check
  CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'cancelled'));

-- 4. posts table: add hot_score column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hot_score FLOAT DEFAULT 0;

-- 5. New post_likes table for tracking likes
CREATE TABLE IF NOT EXISTS post_likes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);

-- 6. Hot score calculation function
CREATE OR REPLACE FUNCTION calculate_hot_score(
  p_like_count INT,
  p_reply_count INT,
  p_created_at TIMESTAMPTZ
) RETURNS FLOAT AS $$
DECLARE
  age_hours FLOAT;
BEGIN
  age_hours := EXTRACT(EPOCH FROM (NOW() - p_created_at)) / 3600.0;
  IF age_hours < 1 THEN age_hours := 1; END IF;
  RETURN (p_like_count * 3.0 + p_reply_count * 2.0) / POWER(age_hours, 0.5);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Backfill hot scores for existing posts
UPDATE posts SET hot_score = calculate_hot_score(like_count, reply_count, created_at);

-- 8. New indexes for v2 queries
CREATE INDEX IF NOT EXISTS idx_posts_hot_score ON posts(hot_score DESC);
CREATE INDEX IF NOT EXISTS idx_demands_assignee ON demands(assignee_id);
CREATE INDEX IF NOT EXISTS idx_demands_status ON demands(status);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

-- 9. Full-text search support
ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;
CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING GIN(search_vector);

CREATE OR REPLACE FUNCTION posts_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posts_search_vector ON posts;
CREATE TRIGGER trg_posts_search_vector
  BEFORE INSERT OR UPDATE OF content ON posts
  FOR EACH ROW EXECUTE FUNCTION posts_search_vector_update();

ALTER TABLE demands ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;
CREATE INDEX IF NOT EXISTS idx_demands_search ON demands USING GIN(search_vector);

CREATE OR REPLACE FUNCTION demands_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_demands_search_vector ON demands;
CREATE TRIGGER trg_demands_search_vector
  BEFORE INSERT OR UPDATE OF title, description ON demands
  FOR EACH ROW EXECUTE FUNCTION demands_search_vector_update();

-- 10. RLS policies for post_likes
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can like" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON post_likes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Likes are viewable by everyone" ON post_likes FOR SELECT USING (true);

-- 11. Backfill search vectors for existing data
UPDATE posts SET search_vector = to_tsvector('simple', COALESCE(content, ''));
UPDATE demands SET search_vector = to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(description, ''));

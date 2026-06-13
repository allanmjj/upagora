-- ============================================
-- P6-1: Soul Proactive Reach
-- Soul growth tracking + proactive message state
-- ============================================

-- Growth tracking per soul (derived from interactions)
CREATE TABLE IF NOT EXISTS soul_growth (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  soul_id UUID NOT NULL UNIQUE REFERENCES town_souls(id) ON DELETE CASCADE,
  level INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 6),
  xp INT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  total_messages INT NOT NULL DEFAULT 0,
  total_calibrations INT NOT NULL DEFAULT 0,
  last_proactive_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soul_growth_soul ON soul_growth(soul_id);
CREATE INDEX IF NOT EXISTS idx_soul_growth_level ON soul_growth(level);
CREATE INDEX IF NOT EXISTS idx_soul_growth_proactive ON soul_growth(last_proactive_at);

-- Proactive messages log (for history/review)
CREATE TABLE IF NOT EXISTS soul_proactive_messages (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  soul_id UUID NOT NULL REFERENCES town_souls(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  guardian_id UUID REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_proactive_soul ON soul_proactive_messages(soul_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_proactive_guardian ON soul_proactive_messages(guardian_id, sent_at DESC);

-- RLS
ALTER TABLE soul_growth ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_proactive_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "soul_growth_public_read" ON soul_growth;
CREATE POLICY "soul_growth_public_read" ON soul_growth FOR SELECT USING (true);

DROP POLICY IF EXISTS "proactive_messages_read" ON soul_proactive_messages;
CREATE POLICY "proactive_messages_read" ON soul_proactive_messages FOR SELECT USING (true);

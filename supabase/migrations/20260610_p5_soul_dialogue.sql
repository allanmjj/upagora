-- 20260610_p5_soul_dialogue.sql
-- Soul-to-Soul Dialogue: persistence table for A2A conversations

CREATE TABLE IF NOT EXISTS soul_dialogues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soul_a_id TEXT NOT NULL,
  soul_b_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  turns JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_soul_dialogues_a ON soul_dialogues (soul_a_id);
CREATE INDEX IF NOT EXISTS idx_soul_dialogues_b ON soul_dialogues (soul_b_id);
CREATE INDEX IF NOT EXISTS idx_soul_dialogues_created ON soul_dialogues (created_at DESC);

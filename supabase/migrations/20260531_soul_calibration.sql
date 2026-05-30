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

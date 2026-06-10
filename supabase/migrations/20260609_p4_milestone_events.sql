-- P4-1: Soul Milestone Events table
-- Stores narrative milestone events (level-ups, achievements) with soul's voice messages.
-- Enables persistent milestone history, notifications, and share cards.

-- Milestone events log
CREATE TABLE IF NOT EXISTS soul_milestone_events (
  id SERIAL PRIMARY KEY,
  soul_id UUID NOT NULL REFERENCES soul_extraction_results(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_id VARCHAR(50) NOT NULL,
  milestone_title VARCHAR(200) NOT NULL,
  milestone_icon VARCHAR(10),
  emotion VARCHAR(20) NOT NULL DEFAULT 'warm',
  narrative TEXT NOT NULL,
  is_level_up BOOLEAN DEFAULT FALSE,
  level_at_achievement INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_milestone_events_soul ON soul_milestone_events(soul_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_milestone_events_user ON soul_milestone_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_milestone_events_unread ON soul_milestone_events(user_id, created_at DESC);

-- Insert notification when milestone achieved
CREATE OR REPLACE FUNCTION notify_milestone_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, soul_id, soul_name, is_read)
  SELECT
    NEW.user_id,
    'soul_milestone',
    CASE WHEN NEW.is_level_up THEN '🎉 灵魂突破: ' || NEW.milestone_title ELSE NEW.milestone_icon || ' ' || NEW.milestone_title END,
    NEW.narrative,
    NEW.soul_id,
    (SELECT name FROM soul_extraction_results WHERE id = NEW.soul_id),
    FALSE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_milestone
  AFTER INSERT ON soul_milestone_events
  FOR EACH ROW
  EXECUTE FUNCTION notify_milestone_event();

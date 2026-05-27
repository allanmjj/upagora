-- Notifications table for guardian alerts
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- daily_report, soul_event, encounter, external_soul, system
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  soul_id UUID REFERENCES soul_extraction_results(id),
  soul_name VARCHAR(100),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_soul_id ON notifications(soul_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at DESC);

-- Soul-Guardian relationship table
CREATE TABLE IF NOT EXISTS soul_guardians (
  id SERIAL PRIMARY KEY,
  soul_id UUID NOT NULL REFERENCES soul_extraction_results(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'guardian', -- guardian, curator, observer
  accepted_at TIMESTAMPTZ,
  reputation_score DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(soul_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_soul_guardians_soul ON soul_guardians(soul_id);
CREATE INDEX IF NOT EXISTS idx_soul_guardians_user ON soul_guardians(user_id);

-- Soul version history (for calibration tracking)
CREATE TABLE IF NOT EXISTS soul_versions (
  id SERIAL PRIMARY KEY,
  soul_id UUID NOT NULL REFERENCES soul_extraction_results(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  persona_snapshot TEXT,
  calibration_delta JSONB,
  guardian_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soul_versions_soul ON soul_versions(soul_id, version_number DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE soul_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Guardians can view soul guardians" ON soul_guardians;
CREATE POLICY "Guardians can view soul guardians" ON soul_guardians
  FOR SELECT USING (auth.uid() = user_id OR soul_id IN (
    SELECT sg.soul_id FROM soul_guardians sg WHERE sg.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Guardians can view soul versions" ON soul_versions;
CREATE POLICY "Guardians can view soul versions" ON soul_versions
  FOR SELECT USING (soul_id IN (
    SELECT sg.soul_id FROM soul_guardians sg WHERE sg.user_id = auth.uid()
  ));

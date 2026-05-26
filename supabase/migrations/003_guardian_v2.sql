-- Guardian v2: Verification, Voting, Signature tables
-- ============================================

-- 1. guardian_heart_verifications: Guardian identity verification
CREATE TABLE IF NOT EXISTS guardian_heart_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_slug UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  challenge TEXT NOT NULL,
  response TEXT NOT NULL,
  dimension TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(share_slug, guardian_id)
);

CREATE INDEX idx_heart_verifications_slug ON guardian_heart_verifications(share_slug);
CREATE INDEX idx_heart_verifications_guardian ON guardian_heart_verifications(guardian_id);

-- 2. guardian_votes: Soul engagement voting
CREATE TABLE IF NOT EXISTS guardian_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_slug UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL CHECK (action IN ('suspend', 'downcase', 'revive')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(share_slug, guardian_id)
);

CREATE INDEX idx_guardian_votes_slug ON guardian_votes(share_slug);

-- 3. guardian_signatures: Soul authenticity signatures
CREATE TABLE IF NOT EXISTS guardian_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_slug UUID NOT NULL REFERENCES soul_sessions(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  signature TEXT NOT NULL,
  signature_text TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(share_slug, guardian_id)
);

CREATE INDEX idx_guardian_signatures_slug ON guardian_signatures(share_slug);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE guardian_heart_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_signatures ENABLE ROW LEVEL SECURITY;

-- Read: anyone can see verifications/votes/signatures
CREATE POLICY "Anyone can read heart verifications" ON guardian_heart_verifications FOR SELECT USING (true);
CREATE POLICY "Anyone can read guardian votes" ON guardian_votes FOR SELECT USING (true);
CREATE POLICY "Anyone can read guardian signatures" ON guardian_signatures FOR SELECT USING (true);

-- Write: only authenticated users
CREATE POLICY "Authenticated users can verify hearts" ON guardian_heart_verifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can vote" ON guardian_votes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can sign" ON guardian_signatures FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

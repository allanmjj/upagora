-- 006_subscription_tiers.sql
-- Subscription system: Free / Creator / Explorer tiers
-- Limits soul creation, unlocks premium features

-- ============================================================
-- user_subscriptions: one active row per user
-- ============================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Plan tier
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'creator', 'explorer')),
  
  -- Stripe integration
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,
  
  -- Billing
  amount_cents INT NOT NULL DEFAULT 0,              -- monthly amount in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'incomplete', 'trialing')),
  
  -- Dates
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Metadata (JSONB for flexibility: stripe checkout session id, upgrade source, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One active subscription per user
  CONSTRAINT uq_user_subscription_user_id UNIQUE (user_id)
);

CREATE INDEX idx_user_subscriptions_tier ON user_subscriptions(tier);
CREATE INDEX idx_user_subscriptions_stripe_sub ON user_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- subscription_events: audit log for tier changes
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'subscription_created',
    'subscription_upgraded',
    'subscription_downgraded',
    'subscription_cancelled',
    'subscription_resumed',
    'payment_succeeded',
    'payment_failed',
    'trial_started',
    'trial_ended'
  )),
  from_tier TEXT,
  to_tier TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscription_events_user ON subscription_events(user_id, created_at DESC);

-- ============================================================
-- Helper function: get user's current tier
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_tier(p_user_id UUID)
RETURNS TEXT AS $$
  SELECT COALESCE((SELECT tier FROM user_subscriptions WHERE user_id = p_user_id LIMIT 1), 'free');
$$ LANGUAGE SQL STABLE;

-- ============================================================
-- Helper function: get user's soul creation limit
-- ============================================================
CREATE OR REPLACE FUNCTION get_soul_limit(p_user_id UUID)
RETURNS INT AS $$
  SELECT CASE get_user_tier(p_user_id)
    WHEN 'free' THEN 3
    WHEN 'creator' THEN 10
    WHEN 'explorer' THEN -1  -- unlimited
    ELSE 3
  END;
$$ LANGUAGE SQL STABLE;

-- ============================================================
-- Helper function: count user's active souls
-- ============================================================
CREATE OR REPLACE FUNCTION count_user_souls(p_user_id UUID)
RETURNS INT AS $$
  SELECT COUNT(*)::INT FROM soul_sessions
  WHERE user_id = p_user_id AND status IN ('complete', 'registered');
$$ LANGUAGE SQL STABLE;

-- ============================================================
-- RLS policies (users can only see their own subscription)
-- ============================================================
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscription events"
  ON subscription_events FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (API routes use service key)

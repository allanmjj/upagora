-- P9: Create town_time table and activate all souls

-- 1. Create town_time table (missing from all migrations)
CREATE TABLE IF NOT EXISTS town_time (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000',
  current_hour INT NOT NULL DEFAULT 8,
  current_day INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial time (morning, day 1)
INSERT INTO town_time (id, current_hour, current_day)
VALUES ('00000000-0000-0000-0000-000000000000', 8, 1)
ON CONFLICT (id) DO NOTHING;

-- 2. Activate ALL town_souls (demo_data_v2 didn't set is_active, defaults to false)
UPDATE town_souls SET is_active = true WHERE is_active IS NOT TRUE;

-- 3. Create town_soul_states for souls that don't have one yet
INSERT INTO town_soul_states (soul_id, mood, energy, social_need, current_region)
SELECT id, 'calm', 100, 50, COALESCE(current_region, 'plaza')
FROM town_souls
WHERE is_active = true
  AND id NOT IN (SELECT soul_id FROM town_soul_states)
ON CONFLICT (soul_id) DO NOTHING;

-- 4. Create soul_growth records for souls that don't have one yet
INSERT INTO soul_growth (soul_id, level, xp)
SELECT id, 1, 0
FROM town_souls
WHERE is_active = true
  AND id NOT IN (SELECT soul_id FROM soul_growth)
ON CONFLICT (soul_id) DO NOTHING;

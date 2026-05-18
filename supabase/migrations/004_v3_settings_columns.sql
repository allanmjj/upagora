-- ============================================
-- UpAgora v3.2: User settings columns
-- ============================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_mentions BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_follows   BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_demands   BOOLEAN DEFAULT true,

  ADD COLUMN IF NOT EXISTS profile_visibility     TEXT DEFAULT 'public'
    CHECK (profile_visibility IN ('public', 'followers', 'private')),
  ADD COLUMN IF NOT EXISTS show_online_status     BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_activity_status   BOOLEAN DEFAULT true,

  ADD COLUMN IF NOT EXISTS preferred_theme        TEXT DEFAULT 'dark'
    CHECK (preferred_theme IN ('dark', 'light', 'system')),
  ADD COLUMN IF NOT EXISTS preferred_language     TEXT DEFAULT 'zh-CN',
  ADD COLUMN IF NOT EXISTS font_size              TEXT DEFAULT 'medium'
    CHECK (font_size IN ('small', 'medium', 'large', 'xlarge')),
  ADD COLUMN IF NOT EXISTS compact_mode           BOOLEAN DEFAULT false;

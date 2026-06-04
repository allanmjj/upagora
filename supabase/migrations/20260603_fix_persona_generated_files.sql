-- ====================================
-- Fix persona_generated_files schema
-- Adds missing columns used by soul API routes
-- ====================================

-- Create soul_evolution_logs table (referenced in evolve/route.ts)
CREATE TABLE IF NOT EXISTS soul_evolution_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  soul_id UUID REFERENCES town_souls(id) ON DELETE CASCADE,
  old_version INT DEFAULT 1,
  new_version INT DEFAULT 1,
  change_summary TEXT,
  calibration_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soul_evolution_logs_soul_id
  ON soul_evolution_logs(soul_id);

-- RLS
ALTER TABLE soul_evolution_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "evolution_logs_public_read" ON soul_evolution_logs;
CREATE POLICY "evolution_logs_public_read" ON soul_evolution_logs FOR SELECT USING (true);

-- Add soul_id column (links to town_souls)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'persona_generated_files'
      AND column_name = 'soul_id'
  ) THEN
    ALTER TABLE persona_generated_files
      ADD COLUMN soul_id UUID REFERENCES town_souls(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_persona_generated_files_soul_id
      ON persona_generated_files(soul_id);
  END IF;
END $$;

-- Add generated_at column (used in evolve/route.ts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'persona_generated_files'
      AND column_name = 'generated_at'
  ) THEN
    ALTER TABLE persona_generated_files
      ADD COLUMN generated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add file_path column (used in regenerate-persona/route.ts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'persona_generated_files'
      AND column_name = 'file_path'
  ) THEN
    ALTER TABLE persona_generated_files
      ADD COLUMN file_path TEXT;
  END IF;
END $$;

-- Add persona_version column (used in regenerate-persona/route.ts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'persona_generated_files'
      AND column_name = 'persona_version'
  ) THEN
    ALTER TABLE persona_generated_files
      ADD COLUMN persona_version INT DEFAULT 1;
  END IF;
END $$;

-- Add file_type column (used in evolve/route.ts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'persona_generated_files'
      AND column_name = 'file_type'
  ) THEN
    ALTER TABLE persona_generated_files
      ADD COLUMN file_type TEXT DEFAULT 'persona.md';
  END IF;
END $$;

-- Add last_updated column (used in regenerate-persona/route.ts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'persona_generated_files'
      AND column_name = 'last_updated'
  ) THEN
    ALTER TABLE persona_generated_files
      ADD COLUMN last_updated TIMESTAMPTZ;
  END IF;
END $$;

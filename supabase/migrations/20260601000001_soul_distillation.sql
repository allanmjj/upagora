-- ============================================================
-- UpAgora Soul Distillation: Comprehensive DB Migration
-- Date: 2026-06-01
-- Purpose: Create all tables for soul distillation pipeline
-- ============================================================

-- Enable pgvector extension (if not already enabled)
create extension if not exists vector;

-- ============================================================
-- Compatibility: handle tables created by earlier migrations
-- ============================================================
-- 006_rag_vector_embeddings.sql creates soul_embeddings with
-- soul_id REFERENCES soul_extraction_results(id).
-- This migration aligns it with town_souls(id).
-- Run as DO block so it's safe if tables don't exist yet.
DO $$
DECLARE
    r RECORD;
BEGIN
    -- If soul_embeddings exists from 006 and references soul_extraction_results
    -- instead of town_souls, drop the old FK and recreate with correct reference.
    FOR r IN
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'soul_embeddings'
          AND constraint_type = 'FOREIGN KEY'
          AND constraint_name LIKE '%soul_id%'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE soul_embeddings DROP CONSTRAINT %I', r.constraint_name);
        EXCEPTION WHEN undefined_object THEN NULL;
        END;
    END LOOP;

    -- Now add correct FK if soul_id column exists but FK is missing
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'soul_embeddings' AND column_name = 'soul_id'
    ) THEN
        BEGIN
            EXECUTE 'ALTER TABLE soul_embeddings ADD CONSTRAINT fk_soul_embeddings_soul_id '
                   'FOREIGN KEY (soul_id) REFERENCES public.town_souls(id) ON DELETE CASCADE';
        EXCEPTION WHEN duplicate_object THEN NULL;
        WHEN undefined_table THEN NULL;
        END;
    END IF;
END $$;

-- Ensure soul_factors table has user_id if it exists (align with latest schema)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'soul_factors'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'soul_factors' AND column_name = 'user_id'
        ) THEN
            ALTER TABLE soul_factors ADD COLUMN user_id UUID REFERENCES auth.users(id);
        END IF;
    END IF;
END $$;


-- ============================================================
-- 1. soul_embeddings — pgvector memory storage for semantic search
-- ============================================================
create table if not exists public.soul_embeddings (
  id bigint primary key generated always as identity,
  soul_id uuid not null references public.town_souls(id) on delete cascade,
  content text not null,                                    -- original memory text
  summary text,                                             -- LLM-summarized version
  embedding vector(768),                                    -- text embedding for semantic search
  category text default 'memory',                           -- memory | belief | event | relationship
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- HNSW index for fast semantic similarity search
-- Indexes on soul_embeddings: only create if columns exist (006 migration may have different schema)
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_embeddings_embedding
    ON public.soul_embeddings USING hnsw (embedding vector_cosine_ops);
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_embeddings_soul_id
    ON public.soul_embeddings (soul_id);
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_embeddings_category
    ON public.soul_embeddings (category);
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE public.soul_embeddings IS ''Vector embeddings for soul memory semantic search (pgvector)''';
EXCEPTION WHEN undefined_table THEN NULL; END $$;


-- Ensure soul_constraints has the latest columns (safe to run even if 20260531 already ran)
DO $$
BEGIN
    -- Check if table exists first
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'soul_constraints') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'soul_constraints' AND column_name = 'soul_anchor') THEN
            ALTER TABLE soul_constraints ADD COLUMN soul_anchor JSONB DEFAULT '{}';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'soul_constraints' AND column_name = 'vocal_behavior') THEN
            ALTER TABLE soul_constraints ADD COLUMN vocal_behavior JSONB DEFAULT '{}';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'soul_constraints' 
                       AND column_name = 'updated_at') THEN
            ALTER TABLE soul_constraints ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- ============================================================
-- 2. soul_constraints — structured 9D constraints per soul
-- ============================================================
create table if not exists public.soul_constraints (
  id bigint primary key generated always as identity,
  soul_id uuid unique not null references public.town_souls(id) on delete cascade,
  soul_name text not null,
  era_name text,
  era_start int default 0,
  era_end int default 2026,
  profession text,
  education text,
  knowledge_floor text[],         -- what this soul knows
  knowledge_ceiling text[],       -- what this soul DEFINITELY does NOT know
  knowledge_gaps text[],          -- uncertain territory
  skills jsonb default '{}',      --{"music": 9, "cooking": 7, ...}
  non_skills text[],              -- things this soul cannot do
  personality_traits text[],
  communication_style text[],
  vocal_behavior jsonb default '{}',  -- {"greeting": "...", "farewell": "..."}
  language_style text[],
  avoided_language text[],
  beliefs jsonb default '[]',     -- [{"name": "仁政", "strength": 95}, ...]
  life_events text[],
  places_visited text[],
  relationships jsonb default '{}',  -- {"mentors": [...], "friends": [...]}
  soul_anchor text[],             -- 灵魂锚点: core unshakeable convictions
  language text default 'en',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_constraints_soul_id ON public.soul_constraints (soul_id);
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE public.soul_constraints IS ''9D knowledge/personality constraints per soul''';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================
-- 3. soul_gallery — curated soul showcase
-- ============================================================
create table if not exists public.soul_gallery (
  id bigint primary key generated always as identity,
  soul_id uuid references public.town_souls(id) on delete cascade,
  title text not null,
  description text,
  thumbnail_url text,
  category text default 'featured',   -- featured | new | popular | custom
  tags text[],
  featured boolean default false,
  display_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_gallery_category ON public.soul_gallery (category);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_gallery_featured ON public.soul_gallery (featured) WHERE featured = true;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE public.soul_gallery IS ''Curated soul showcase entries''';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================
-- 4. calibration_pairs — guardian feedback entries
-- ============================================================
create table if not exists public.calibration_pairs (
  id bigint primary key generated always as identity,
  soul_id uuid not null references public.town_souls(id) on delete cascade,
  guardian_id uuid references auth.users(id),
  question text not null,               -- the prompt/question asked
  soul_response text not null,          -- what the soul said
  expected_response text,               -- what the guardian thinks they would say
  rating smallint check (rating between 1 and 5),  -- 1=wrong, 5=spot-on
  dimension text,                       -- which dimension this feedback targets
  feedback_notes text,
  applied boolean default false,        -- whether this was used to update persona
  created_at timestamptz default now()
);

-- calibration_pairs indexes: guard against old schema (no soul_id/applied columns)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calibration_pairs' AND column_name = 'soul_id') THEN
    CREATE INDEX IF NOT EXISTS idx_calibration_pairs_soul_id ON public.calibration_pairs (soul_id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calibration_pairs' AND column_name = 'applied') THEN
    CREATE INDEX IF NOT EXISTS idx_calibration_pairs_applied ON public.calibration_pairs (applied) WHERE applied = false;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE public.calibration_pairs IS ''Guardian feedback pairs for soul calibration''';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================
-- 5. import_sessions — data import tracking
-- ============================================================
create table if not exists public.import_sessions (
  id bigint primary key generated always as identity,
  user_id uuid not null references auth.users(id),
  title text not null,
  status text default 'pending',        -- pending | processing | completed | failed
  source text,                          -- text | file | wikipedia | manual
  raw_content text,                     -- raw imported content
  processed_at timestamptz,
  result_soul_id uuid references public.town_souls(id),
  error_message text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- import_sessions indexes: guard against old schema (agent_id vs user_id)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_sessions' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_import_sessions_user_id ON public.import_sessions (user_id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON public.import_sessions (status);
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE public.import_sessions IS ''Import session tracking for soul data ingestion''';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================
-- 6. guardian_signatures — voice signature system
-- ============================================================
create table if not exists public.guardian_signatures (
  id bigint primary key generated always as identity,
  user_id uuid not null references auth.users(id),
  soul_id uuid not null references public.town_souls(id) on delete cascade,
  type text not null,                   -- text | voice | transcript | image
  content jsonb not null,               -- type-specific content
  verified boolean default false,
  verified_at timestamptz,
  created_at timestamptz default now()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_guardian_signatures_user_id ON public.guardian_signatures (user_id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_guardian_signatures_soul_id ON public.guardian_signatures (soul_id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE public.guardian_signatures IS ''Guardian voice/text signatures for soul authenticity''';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================
-- 7. soul_schedule — soul daily activity schedule
-- ============================================================
create table if not exists public.soul_schedule (
  id bigint primary key generated always as identity,
  soul_id uuid not null references public.town_souls(id) on delete cascade,
  schedule_type text not null,          -- daily | weekly | one_time
  time_slot time not null,             -- activity time
  day_of_week smallint,                -- 0=Sunday, 6=Saturday (null for daily)
  activity text not null,
  description text,
  location text,
  is_recurring boolean default true,
  active boolean default true,
  created_at timestamptz default now()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_schedule_soul_id ON public.soul_schedule (soul_id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_schedule_time_slot ON public.soul_schedule (time_slot);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE public.soul_schedule IS ''Schedule entries for soul daily activities''';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================
-- 8. soul_interactions — social interaction log
-- ============================================================
create table if not exists public.soul_interactions (
  id bigint primary key generated always as identity,
  from_soul_id uuid references public.town_souls(id),
  to_soul_id uuid references public.town_souls(id) on delete cascade,
  interaction_type text not null,       -- visit | message | gift | event | chance_encounter
  content jsonb default '{}',
  timestamp timestamptz default now(),
  created_at timestamptz default now()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_interactions_to_soul_id ON public.soul_interactions (to_soul_id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_soul_interactions_timestamp ON public.soul_interactions (timestamp);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE public.soul_interactions IS ''Social interaction log between souls''';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================
-- RLS (Row Level Security) policies
-- Note: Use DO blocks with DROP POLICY IF EXISTS + existence checks
-- because older migrations may have created these tables with
-- different column names (e.g. agent_id vs user_id, no soul_id).
-- ============================================================

-- soul_embeddings: users can read/write their own souls' embeddings
DO $$ BEGIN
  ALTER TABLE public.soul_embeddings ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can access soul embeddings" ON public.soul_embeddings;
  CREATE POLICY "Users can access soul embeddings" ON public.soul_embeddings
    FOR ALL USING (true);  -- Simplified for now, tighten later
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- soul_constraints: read-only for users, write by service role
DO $$ BEGIN
  ALTER TABLE public.soul_constraints ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read soul constraints" ON public.soul_constraints;
  CREATE POLICY "Users can read soul constraints" ON public.soul_constraints
    FOR SELECT USING (true);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- soul_gallery: public read, only admins write
DO $$ BEGIN
  ALTER TABLE public.soul_gallery ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public can read soul gallery" ON public.soul_gallery;
  CREATE POLICY "Public can read soul gallery" ON public.soul_gallery
    FOR SELECT USING (true);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- calibration_pairs: handle both old schema (agent_id) and new schema (guardian_id)
DO $$ BEGIN
  ALTER TABLE public.calibration_pairs ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their calibrations" ON public.calibration_pairs;
  -- Use guardian_id if it exists, otherwise fall back to agent_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calibration_pairs' AND column_name = 'guardian_id') THEN
    CREATE POLICY "Users can manage their calibrations" ON public.calibration_pairs
      FOR ALL USING (auth.uid() = guardian_id OR guardian_id IS NULL);
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calibration_pairs' AND column_name = 'agent_id') THEN
    CREATE POLICY "Users can manage their calibrations" ON public.calibration_pairs
      FOR ALL USING (auth.uid() = agent_id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- import_sessions: handle both old schema (agent_id) and new schema (user_id)
DO $$ BEGIN
  ALTER TABLE public.import_sessions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their imports" ON public.import_sessions;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_sessions' AND column_name = 'user_id') THEN
    CREATE POLICY "Users can manage their imports" ON public.import_sessions
      FOR ALL USING (auth.uid() = user_id);
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_sessions' AND column_name = 'agent_id') THEN
    CREATE POLICY "Users can manage their imports" ON public.import_sessions
      FOR ALL USING (auth.uid() = agent_id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- guardian_signatures: users can access their own signatures
DO $$ BEGIN
  ALTER TABLE public.guardian_signatures ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their signatures" ON public.guardian_signatures;
  CREATE POLICY "Users can manage their signatures" ON public.guardian_signatures
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- soul_schedule: users can read all, manage their souls
DO $$ BEGIN
  ALTER TABLE public.soul_schedule ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read, owner write soul schedule" ON public.soul_schedule;
  CREATE POLICY "Public read, owner write soul schedule" ON public.soul_schedule
    FOR SELECT USING (true);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Owner write soul schedule" ON public.soul_schedule;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'soul_schedule' AND column_name = 'soul_id') THEN
    CREATE POLICY "Owner write soul schedule" ON public.soul_schedule
      FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM town_souls WHERE id = soul_schedule.soul_id));
  END IF;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- soul_interactions: read recent, write own
DO $$ BEGIN
  ALTER TABLE public.soul_interactions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Read recent soul interactions" ON public.soul_interactions;
  CREATE POLICY "Read recent soul interactions" ON public.soul_interactions
    FOR SELECT USING (true);
EXCEPTION WHEN undefined_table THEN NULL; END $$;


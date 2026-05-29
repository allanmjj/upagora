-- RLS Security Fix v3 - Safe Version
-- Generated: 2026-05-28 23:46
-- Only applies policies to tables and columns that exist

-- soul_sessions: Only owner should access
-- Check if table and user_id column exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'soul_sessions'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'soul_sessions' AND column_name = 'user_id'
  ) THEN
    DROP POLICY IF EXISTS "anonymous read soul_sessions" ON soul_sessions;
    DROP POLICY IF EXISTS "owner update soul_sessions" ON soul_sessions;
    CREATE POLICY "owner read soul_sessions" ON soul_sessions FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "owner update soul_sessions" ON soul_sessions FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- soul_dimensions: Owner via session_id -> soul_sessions.user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'soul_dimensions'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'soul_dimensions' AND column_name = 'session_id'
  ) THEN
    DROP POLICY IF EXISTS "public read soul_dimensions" ON soul_dimensions;
    DROP POLICY IF EXISTS "owner write soul_dimensions" ON soul_dimensions;
    CREATE POLICY "owner read soul_dimensions" ON soul_dimensions FOR SELECT
      USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
    CREATE POLICY "owner write soul_dimensions" ON soul_dimensions FOR ALL
      USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
  END IF;
END $$;

-- soul_chat_messages: Owner via session_id -> soul_sessions.user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'soul_chat_messages'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'soul_chat_messages' AND column_name = 'session_id'
  ) THEN
    DROP POLICY IF EXISTS "public read soul_chat_messages" ON soul_chat_messages;
    DROP POLICY IF EXISTS "public insert soul_chat_messages" ON soul_chat_messages;
    CREATE POLICY "owner read soul_chat_messages" ON soul_chat_messages FOR SELECT
      USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
    CREATE POLICY "owner insert soul_chat_messages" ON soul_chat_messages FOR INSERT
      WITH CHECK (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
  END IF;
END $$;

-- guardian_calibrations: Owner via session_id -> soul_sessions.user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'guardian_calibrations'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guardian_calibrations' AND column_name = 'session_id'
  ) THEN
    DROP POLICY IF EXISTS "public read guardian_calibrations" ON guardian_calibrations;
    DROP POLICY IF EXISTS "public insert guardian_calibrations" ON guardian_calibrations;
    CREATE POLICY "owner read guardian_calibrations" ON guardian_calibrations FOR SELECT
      USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
    CREATE POLICY "owner insert guardian_calibrations" ON guardian_calibrations FOR INSERT
      WITH CHECK (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
  END IF;
END $$;

-- soul_share_links: Owner via session_id -> soul_sessions.user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'soul_share_links'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'soul_share_links' AND column_name = 'session_id'
  ) THEN
    DROP POLICY IF EXISTS "public read soul_share_links" ON soul_share_links;
    DROP POLICY IF EXISTS "owner write soul_share_links" ON soul_share_links;
    CREATE POLICY "owner access soul_share_links" ON soul_share_links FOR ALL
      USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
  END IF;
END $$;

-- soul_imports: Has user_id column directly
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'soul_imports'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'soul_imports' AND column_name = 'user_id'
  ) THEN
    DROP POLICY IF EXISTS "public read soul_imports" ON soul_imports;
    DROP POLICY IF EXISTS "owner write soul_imports" ON soul_imports;
    CREATE POLICY "owner access soul_imports" ON soul_imports FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- soul_snapshots: Owner via session_id -> soul_sessions.user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'soul_snapshots'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'soul_snapshots' AND column_name = 'session_id'
  ) THEN
    DROP POLICY IF EXISTS "public read soul_snapshots" ON soul_snapshots;
    DROP POLICY IF EXISTS "owner write soul_snapshots" ON soul_snapshots;
    CREATE POLICY "owner access soul_snapshots" ON soul_snapshots FOR ALL
      USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
  END IF;
END $$;

-- soul_extraction_results: Has agent_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'soul_extraction_results'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'soul_extraction_results' AND column_name = 'agent_id'
  ) THEN
    DROP POLICY IF EXISTS "owner read soul_extraction_results" ON soul_extraction_results;
    DROP POLICY IF EXISTS "owner write soul_extraction_results" ON soul_extraction_results;
    CREATE POLICY "owner access soul_extraction_results" ON soul_extraction_results FOR ALL
      USING (auth.uid() = agent_id);
  END IF;
END $$;

-- persona_generated_files: Has user_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'persona_generated_files'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'persona_generated_files' AND column_name = 'user_id'
  ) THEN
    DROP POLICY IF EXISTS "owner read persona_generated_files" ON persona_generated_files;
    DROP POLICY IF EXISTS "owner write persona_generated_files" ON persona_generated_files;
    CREATE POLICY "owner access persona_generated_files" ON persona_generated_files FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- calibration_pairs: Has agent_id + guardian_id columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'calibration_pairs'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'calibration_pairs' AND column_name = 'agent_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'calibration_pairs' AND column_name = 'guardian_id'
  ) THEN
    DROP POLICY IF EXISTS "owner read calibration_pairs" ON calibration_pairs;
    DROP POLICY IF EXISTS "owner write calibration_pairs" ON calibration_pairs;
    CREATE POLICY "owner access calibration_pairs" ON calibration_pairs FOR ALL
      USING (auth.uid() = agent_id OR auth.uid() = guardian_id);
  END IF;
END $$;

-- persona_files: Has agent_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'persona_files'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'persona_files' AND column_name = 'agent_id'
  ) THEN
    DROP POLICY IF EXISTS "owner read persona_files" ON persona_files;
    DROP POLICY IF EXISTS "owner write persona_files" ON persona_files;
    CREATE POLICY "owner access persona_files" ON persona_files FOR ALL
      USING (auth.uid() = agent_id);
  END IF;
END $$;

-- conversation_messages: Has user_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'conversation_messages'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conversation_messages' AND column_name = 'user_id'
  ) THEN
    DROP POLICY IF EXISTS "owner read conversation_messages" ON conversation_messages;
    DROP POLICY IF EXISTS "owner write conversation_messages" ON conversation_messages;
    CREATE POLICY "owner access conversation_messages" ON conversation_messages FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- import_sessions: Has user_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'import_sessions'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'import_sessions' AND column_name = 'user_id'
  ) THEN
    DROP POLICY IF EXISTS "owner read import_sessions" ON import_sessions;
    DROP POLICY IF EXISTS "owner write import_sessions" ON import_sessions;
    CREATE POLICY "owner access import_sessions" ON import_sessions FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- skills_feed: Authenticated users only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'skills_feed'
  ) THEN
    DROP POLICY IF EXISTS "owner read skills_feed" ON skills_feed;
    DROP POLICY IF EXISTS "owner write skills_feed" ON skills_feed;
    CREATE POLICY "authenticated read skills_feed" ON skills_feed FOR SELECT USING (auth.role() = 'authenticated');
    CREATE POLICY "authenticated insert skills_feed" ON skills_feed FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    CREATE POLICY "authenticated update skills_feed" ON skills_feed FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;
END $$;

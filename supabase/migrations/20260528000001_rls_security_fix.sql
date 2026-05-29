-- RLS Security Fix v2 - Generated 2026-05-28 16:10
-- Fixed: soul_id doesn't exist, mapped to actual ownership columns
-- WARNING: Review before applying to production!

-- soul_sessions: Only owner should access
-- (unchanged - uses user_id which exists)
DROP POLICY IF EXISTS "anonymous read soul_sessions" ON soul_sessions;
DROP POLICY IF EXISTS "owner update soul_sessions" ON soul_sessions;
CREATE POLICY "owner read soul_sessions" ON soul_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner update soul_sessions" ON soul_sessions FOR UPDATE USING (auth.uid() = user_id);

-- soul_dimensions: Owner via session_id -> soul_sessions.user_id
DROP POLICY IF EXISTS "public read soul_dimensions" ON soul_dimensions;
DROP POLICY IF EXISTS "owner write soul_dimensions" ON soul_dimensions;
CREATE POLICY "owner read soul_dimensions" ON soul_dimensions FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
CREATE POLICY "owner write soul_dimensions" ON soul_dimensions FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));

-- soul_chat_messages: Owner via session_id -> soul_sessions.user_id
DROP POLICY IF EXISTS "public read soul_chat_messages" ON soul_chat_messages;
DROP POLICY IF EXISTS "public insert soul_chat_messages" ON soul_chat_messages;
CREATE POLICY "owner read soul_chat_messages" ON soul_chat_messages FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
CREATE POLICY "owner insert soul_chat_messages" ON soul_chat_messages FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));

-- guardian_calibrations: Owner via session_id -> soul_sessions.user_id
DROP POLICY IF EXISTS "public read guardian_calibrations" ON guardian_calibrations;
DROP POLICY IF EXISTS "public insert guardian_calibrations" ON guardian_calibrations;
CREATE POLICY "owner read guardian_calibrations" ON guardian_calibrations FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));
CREATE POLICY "owner insert guardian_calibrations" ON guardian_calibrations FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));

-- soul_share_links: Owner via session_id -> soul_sessions.user_id
DROP POLICY IF EXISTS "public read soul_share_links" ON soul_share_links;
DROP POLICY IF EXISTS "owner write soul_share_links" ON soul_share_links;
CREATE POLICY "owner access soul_share_links" ON soul_share_links FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));

-- soul_imports: Has user_id column directly
DROP POLICY IF EXISTS "public read soul_imports" ON soul_imports;
DROP POLICY IF EXISTS "owner write soul_imports" ON soul_imports;
CREATE POLICY "owner access soul_imports" ON soul_imports FOR ALL
  USING (auth.uid() = user_id);

-- soul_snapshots: Owner via session_id -> soul_sessions.user_id
DROP POLICY IF EXISTS "public read soul_snapshots" ON soul_snapshots;
DROP POLICY IF EXISTS "owner write soul_snapshots" ON soul_snapshots;
CREATE POLICY "owner access soul_snapshots" ON soul_snapshots FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM soul_sessions WHERE id = session_id));

-- soul_extraction_results: Has agent_id column
DROP POLICY IF EXISTS "owner read soul_extraction_results" ON soul_extraction_results;
DROP POLICY IF EXISTS "owner write soul_extraction_results" ON soul_extraction_results;
CREATE POLICY "owner access soul_extraction_results" ON soul_extraction_results FOR ALL
  USING (auth.uid() = agent_id);

-- persona_generated_files: Has user_id column
DROP POLICY IF EXISTS "owner read persona_generated_files" ON persona_generated_files;
DROP POLICY IF EXISTS "owner write persona_generated_files" ON persona_generated_files;
CREATE POLICY "owner access persona_generated_files" ON persona_generated_files FOR ALL
  USING (auth.uid() = user_id);

-- calibration_pairs: Has agent_id + guardian_id columns
DROP POLICY IF EXISTS "owner read calibration_pairs" ON calibration_pairs;
DROP POLICY IF EXISTS "owner write calibration_pairs" ON calibration_pairs;
CREATE POLICY "owner access calibration_pairs" ON calibration_pairs FOR ALL
  USING (auth.uid() = agent_id OR auth.uid() = guardian_id);

-- persona_files: Has agent_id column
DROP POLICY IF EXISTS "owner read persona_files" ON persona_files;
DROP POLICY IF EXISTS "owner write persona_files" ON persona_files;
CREATE POLICY "owner access persona_files" ON persona_files FOR ALL
  USING (auth.uid() = agent_id);

-- conversation_messages: Has user_id column
DROP POLICY IF EXISTS "owner read conversation_messages" ON conversation_messages;
DROP POLICY IF EXISTS "owner write conversation_messages" ON conversation_messages;
CREATE POLICY "owner access conversation_messages" ON conversation_messages FOR ALL
  USING (auth.uid() = user_id);

-- import_sessions: Has user_id column
DROP POLICY IF EXISTS "owner read import_sessions" ON import_sessions;
DROP POLICY IF EXISTS "owner write import_sessions" ON import_sessions;
CREATE POLICY "owner access import_sessions" ON import_sessions FOR ALL
  USING (auth.uid() = user_id);

-- skills_feed: Authenticated users only
DROP POLICY IF EXISTS "owner read skills_feed" ON skills_feed;
DROP POLICY IF EXISTS "owner write skills_feed" ON skills_feed;
CREATE POLICY "authenticated read skills_feed" ON skills_feed FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated insert skills_feed" ON skills_feed FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated update skills_feed" ON skills_feed FOR UPDATE USING (auth.role() = 'authenticated');

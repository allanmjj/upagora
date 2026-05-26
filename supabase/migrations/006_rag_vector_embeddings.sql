-- ============================================================================
-- Migration 006: RAG Vector Embeddings for Semantic Memory Search
-- ============================================================================
-- Enables pgvector extension for semantic soul memory retrieval.
-- Run this against the Supabase project database.
--
-- Usage: supabase db push --db-url "postgresql://..."
-- Or: Apply via SQL Editor in Supabase Dashboard
-- ============================================================================

-- Enable pgvector extension (Supabase has it pre-installed)
CREATE EXTENSION IF NOT EXISTS vector;

-- ----------------------------------------------------------------------------
-- 1. soul_embeddings: stores text chunks with their vector embeddings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS soul_embeddings (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  soul_id       UUID NOT NULL REFERENCES soul_extraction_results(id) ON DELETE CASCADE,
  text_chunk    TEXT NOT NULL,
  embedding     vector(1536),  -- OpenAI ada-002 dimension; swap 768 for BGE, 1024 for nomic-embed
  source_type   TEXT NOT NULL DEFAULT 'memory',  -- 'memory' | 'chat' | 'extraction' | 'narrative'
  source_id     BIGINT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast similarity search (HNSW for production speed)
CREATE INDEX IF NOT EXISTS idx_soul_embeddings_embedding
  ON soul_embeddings USING hnsw (embedding vector_cosine_ops);

-- Index for filtering by soul before search
CREATE INDEX IF NOT EXISTS idx_soul_embeddings_soul_id
  ON soul_embeddings (soul_id);

CREATE INDEX IF NOT EXISTS idx_soul_embeddings_user_id
  ON soul_embeddings (user_id);

-- ----------------------------------------------------------------------------
-- 2. Function: semantic memory search (top-K by cosine similarity)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_soul_memories(
  _soul_id UUID,
  _query_embedding vector(1536),
  _top_k INTEGER DEFAULT 5,
  _min_similarity FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id        BIGINT,
  text_chunk TEXT,
  similarity FLOAT,
  source_type TEXT,
  metadata  JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.id,
    se.text_chunk,
    1 - (se.embedding <=> _query_embedding) AS similarity,
    se.source_type,
    se.metadata,
    se.created_at
  FROM soul_embeddings se
  WHERE se.soul_id = _soul_id
    AND 1 - (se.embedding <=> _query_embedding) >= _min_similarity
  ORDER BY se.embedding <=> _query_embedding
  LIMIT _top_k;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Function: auto-chunk text into embeddable segments
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION chunk_text_for_embedding(
  _text TEXT,
  _chunk_size INTEGER DEFAULT 512,
  _overlap INTEGER DEFAULT 64
)
RETURNS TABLE (
  chunk_index INTEGER,
  chunk_text  TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  _text_len INTEGER := length(_text);
  _pos INTEGER := 1;
  _idx INTEGER := 0;
BEGIN
  IF _text_len <= _chunk_size THEN
    RETURN QUERY SELECT 0, _text;
    RETURN;
  END IF;

  WHILE _pos <= _text_len LOOP
    _idx := _idx + 1;
    RETURN QUERY SELECT _idx, substring(_text FROM _pos FOR _chunk_size);
    _pos := _pos + (_chunk_size - _overlap);
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. RLS Policies
-- ----------------------------------------------------------------------------
ALTER TABLE soul_embeddings ENABLE ROW LEVEL SECURITY;

-- Users can only see their own embeddings
CREATE POLICY "Users view own soul embeddings"
  ON soul_embeddings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own embeddings
CREATE POLICY "Users insert own soul embeddings"
  ON soul_embeddings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own embeddings
CREATE POLICY "Users delete own soul embeddings"
  ON soul_embeddings FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. Trigger: auto-update updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER soul_embeddings_updated_at
  BEFORE UPDATE ON soul_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

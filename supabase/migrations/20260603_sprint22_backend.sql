-- ============================================
-- Sprint 22: Backend Infrastructure Migration
-- ============================================
-- 1. Memory DB schema enhancement (memory_strength, emotional_weight)
-- 2. Intimacy table structure (guardian-soul relationships)
-- 3. Health score calculation stored procedure
-- ============================================

-- ============================================
-- Part 1: Memory DB Schema Enhancement
-- ============================================
-- Add memory_strength and emotional_weight columns to soul_embeddings
-- These enable Ebbinghaus forgetting curve calculations and memory importance scoring

DO $$ 
BEGIN
    -- Add memory_strength column (0-100, calculated via Ebbinghaus curve)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'soul_embeddings' AND column_name = 'memory_strength'
    ) THEN
        ALTER TABLE soul_embeddings ADD COLUMN memory_strength DOUBLE PRECISION DEFAULT 50;
    END IF;

    -- Add emotional_weight column (0-10, how emotionally significant this memory is)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'soul_embeddings' AND column_name = 'emotional_weight'
    ) THEN
        ALTER TABLE soul_embeddings ADD COLUMN emotional_weight DOUBLE PRECISION DEFAULT 0;
    END IF;

    -- Add last_accessed_at for tracking memory retrieval frequency
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'soul_embeddings' AND column_name = 'last_accessed_at'
    ) THEN
        ALTER TABLE soul_embeddings ADD COLUMN last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Add access_count for tracking how often memory is retrieved
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'soul_embeddings' AND column_name = 'access_count'
    ) THEN
        ALTER TABLE soul_embeddings ADD COLUMN access_count INTEGER DEFAULT 0;
    END IF;

    -- Add memory_category for episodic/semantic/emotional classification
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'soul_embeddings' AND column_name = 'memory_category'
    ) THEN
        ALTER TABLE soul_embeddings ADD COLUMN memory_category VARCHAR(20) DEFAULT 'episodic';
    END IF;

    -- Add created_at index for sorting by recency
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'soul_embeddings' AND indexname = 'idx_soul_embeddings_created_at'
    ) THEN
        CREATE INDEX idx_soul_embeddings_created_at ON soul_embeddings(created_at DESC);
    END IF;

    -- Add soul_id + user_id composite index for queries
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'soul_embeddings' AND indexname = 'idx_soul_embeddings_soul_user'
    ) THEN
        CREATE INDEX idx_soul_embeddings_soul_user ON soul_embeddings(soul_id, user_id, category);
    END IF;

    COMMENT ON COLUMN soul_embeddings.memory_strength IS 'Memory strength (0-100) calculated via Ebbinghaus forgetting curve';
    COMMENT ON COLUMN soul_embeddings.emotional_weight IS 'Emotional significance of this memory (0-10)';
    COMMENT ON COLUMN soul_embeddings.last_accessed_at IS 'Last time this memory was retrieved';
    COMMENT ON COLUMN soul_embeddings.access_count IS 'Number of times this memory was accessed';
    COMMENT ON COLUMN soul_embeddings.memory_category IS 'Memory type: episodic, semantic, or emotional';
END $$;


-- ============================================
-- Part 2: Intimacy Table Structure
-- ============================================
-- Guardian-Soul relationship tracking with bond strength, interaction tracking

CREATE TABLE IF NOT EXISTS soul_intimacy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    soul_id UUID NOT NULL REFERENCES soul_gallery(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    bond_strength DOUBLE PRECISION DEFAULT 0 CHECK (bond_strength >= 0 AND bond_strength <= 100),
    relationship_level VARCHAR(30) DEFAULT 'Stranger' CHECK (relationship_level IN ('Stranger', 'Acquaintance', 'Friend', 'Trusted Guardian', 'Soul Bond')),
    conversation_count INTEGER DEFAULT 0,
    interaction_count INTEGER DEFAULT 0,
    total_interactions INTEGER DEFAULT 0,
    avg_emotional_weight DOUBLE PRECISION DEFAULT 0,
    days_together INTEGER DEFAULT 0,
    interaction_types JSONB DEFAULT '[]'::jsonb,
    last_interaction_at TIMESTAMP WITH TIME ZONE,
    first_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(soul_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_soul_intimacy_soul ON soul_intimacy(soul_id);
CREATE INDEX IF NOT EXISTS idx_soul_intimacy_user ON soul_intimacy(user_id);
CREATE INDEX IF NOT EXISTS idx_soul_intimacy_bond ON soul_intimacy(bond_strength DESC);

COMMENT ON TABLE soul_intimacy IS 'Guardian-Soul relationship tracking - bond strength, interaction history, relationship depth';
COMMENT ON COLUMN soul_intimacy.bond_strength IS 'Overall relationship strength (0-100)';
COMMENT ON COLUMN soul_intimacy.relationship_level IS 'Stranger/Acquaintance/Friend/Trusted Guardian/Soul Bond';
COMMENT ON COLUMN soul_intimacy.interaction_types IS 'Array of interaction types: conversation, calibrate, learn, gift';


-- ============================================
-- Part 3: Health Score Calculation Stored Procedure
-- ============================================
-- Comprehensive soul health scoring based on multiple dimensions

CREATE OR REPLACE FUNCTION calculate_soul_health(
    p_soul_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_persona_score DOUBLE PRECISION;
    v_calibration_score DOUBLE PRECISION;
    v_memory_score DOUBLE PRECISION;
    v_conversation_score DOUBLE PRECISION;
    v_intimacy_score DOUBLE PRECISION;
    v_overall DOUBLE PRECISION;
    v_recommendation TEXT;
BEGIN
    -- Persona Quality: based on 9D constraints completeness
    SELECT COALESCE(
        (COUNT(*)::DOUBLE PRECISION / 9.0) * 100,
        5
    ) INTO v_persona_score
    FROM soul_constraints
    WHERE soul_id = p_soul_id;

    -- Calibration Score: based on recent calibration events (last 30 days)
    SELECT COALESCE(
        LEAST(100, COUNT(*) * 5 + 
            LEAST(40, COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) * 5)),
        10
    ) INTO v_calibration_score
    FROM soul_calibrations
    WHERE soul_id = p_soul_id;

    -- Memory Score: based on memory volume and emotional depth
    SELECT COALESCE(
        LEAST(100, 
            (AVG(emotional_weight) * 10)::INTEGER + 
            LEAST(40, COUNT(*) * 2)::INTEGER
        ),
        10
    ) INTO v_memory_score
    FROM soul_embeddings
    WHERE soul_id = p_soul_id
    AND category = 'conversation_memory';

    -- Conversation Score: simple count-based (5 points per conversation, capped at 25)
    SELECT LEAST(25, COUNT(*) * 5) INTO v_conversation_score
    FROM soul_embeddings
    WHERE soul_id = p_soul_id
    AND category = 'conversation_memory'
    AND (p_user_id IS NULL OR user_id = p_user_id);

    -- Intimacy Score: from soul_intimacy table if exists
    SELECT COALESCE(bond_strength, 5) INTO v_intimacy_score
    FROM soul_intimacy
    WHERE soul_id = p_soul_id AND user_id = p_user_id
    LIMIT 1;

    -- Calculate overall health score (weighted average)
    v_overall := ROUND(
        v_persona_score * 0.30 +
        v_calibration_score * 0.25 +
        v_memory_score * 0.20 +
        v_conversation_score * 0.15 +
        v_intimacy_score * 0.10
    );

    -- Generate recommendation based on weakest dimension
    IF v_persona_score < v_calibration_score AND v_persona_score < v_memory_score AND v_persona_score < v_conversation_score AND v_persona_score < v_intimacy_score THEN
        v_recommendation := 'Complete your soul''s 9D constraints profile to improve persona definition.';
    ELSIF v_calibration_score < v_memory_score AND v_calibration_score < v_conversation_score AND v_calibration_score < v_intimacy_score THEN
        v_recommendation := 'Use the calibration page to refine the soul''s personality and knowledge.';
    ELSIF v_memory_score < v_conversation_score AND v_memory_score < v_intimacy_score THEN
        v_recommendation := 'Have more meaningful conversations to build deeper memories.';
    ELSIF v_conversation_score < v_intimacy_score THEN
        v_recommendation := 'Increase interaction frequency with your soul.';
    ELSE
        v_recommendation := 'Your soul is well-balanced. Keep nurturing the relationship.';
    END IF;

    RETURN jsonb_build_object(
        'overall', v_overall,
        'persona_quality', ROUND(v_persona_score::NUMERIC, 1)::DOUBLE PRECISION,
        'calibration', ROUND(v_calibration_score::NUMERIC, 1)::DOUBLE PRECISION,
        'memory', ROUND(v_memory_score::NUMERIC, 1)::DOUBLE PRECISION,
        'conversation', ROUND(v_conversation_score::NUMERIC, 1)::DOUBLE PRECISION,
        'intimacy', ROUND(v_intimacy_score::NUMERIC, 1)::DOUBLE PRECISION,
        'recommendation', v_recommendation
    );
END;
$$;

COMMENT ON FUNCTION calculate_soul_health IS 'Comprehensive soul health scoring across 5 dimensions: persona, calibration, memory, conversation, intimacy';

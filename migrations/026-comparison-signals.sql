-- ============================================================
-- MIGRATION 026: Comparison Signals for Confidence Scoring
-- ============================================================
-- 
-- This migration adds columns for storing comparison source signals
-- used for validation and confidence scoring. These are "comparison-only"
-- sources that do NOT overwrite primary data.
--
-- IMPORTANT: This migration is ADDITIVE ONLY.
-- - No existing columns are removed
-- - No existing data is modified
-- - All new columns have default values
--
-- ============================================================

-- ============================================================
-- 1. COMPARISON SIGNALS COLUMN
-- ============================================================
-- Stores signals from comparison sources (RT, Filmibeat, etc.)
-- in a JSONB format for flexible querying.

ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS comparison_signals JSONB DEFAULT NULL;

COMMENT ON COLUMN movies.comparison_signals IS 
'Signals from comparison-only sources (RT, Filmibeat, YouTube, etc.). Used for confidence scoring only. Never overwrites primary data.';

-- ============================================================
-- 2. CONFIDENCE BREAKDOWN COLUMN
-- ============================================================
-- Detailed breakdown of how confidence score was calculated

ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS confidence_breakdown JSONB DEFAULT NULL;

COMMENT ON COLUMN movies.confidence_breakdown IS 
'Detailed breakdown of confidence calculation including source weights, field completeness, and comparison alignment.';

-- ============================================================
-- 3. LAST VERIFIED TIMESTAMP
-- ============================================================
-- Records when the data was last verified against comparison sources

ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN movies.last_verified_at IS 
'Timestamp of last verification against comparison sources.';

-- ============================================================
-- 4. FIELD PROVENANCE COLUMN
-- ============================================================
-- Records which source provided each field

ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS field_provenance JSONB DEFAULT NULL;

COMMENT ON COLUMN movies.field_provenance IS 
'Per-field provenance tracking. Records which source provided each field and when.';

-- ============================================================
-- 5. COMPARISON ALIGNMENT SCORE
-- ============================================================
-- How well primary data aligns with comparison sources (0-1)

ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS comparison_alignment_score NUMERIC(4,3) DEFAULT NULL;

COMMENT ON COLUMN movies.comparison_alignment_score IS 
'Alignment score between primary data and comparison sources. 1.0 = perfect agreement, 0.0 = total disagreement.';

-- ============================================================
-- 6. NEEDS MANUAL REVIEW FLAG
-- ============================================================
-- Flag for movies that have conflicting data across sources

ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS needs_manual_review BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN movies.needs_manual_review IS 
'Flag indicating this movie has data conflicts requiring manual review.';

-- ============================================================
-- 7. REVIEW REASON
-- ============================================================
-- Reason why manual review is needed

ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS review_reason TEXT DEFAULT NULL;

COMMENT ON COLUMN movies.review_reason IS 
'Reason for requiring manual review. NULL if no review needed.';

-- ============================================================
-- 8. COMPARISON CACHE TABLE
-- ============================================================
-- Cache for comparison source results to avoid repeated API calls

CREATE TABLE IF NOT EXISTS comparison_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    source_id VARCHAR(50) NOT NULL,
    signals JSONB NOT NULL,
    confidence_weight NUMERIC(4,3) NOT NULL,
    signal_strength NUMERIC(4,3) NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    from_cache BOOLEAN DEFAULT FALSE,
    error TEXT DEFAULT NULL,
    
    CONSTRAINT unique_movie_source UNIQUE (movie_id, source_id)
);

COMMENT ON TABLE comparison_cache IS 
'Cache for comparison source API results. Entries expire after 30 days.';

-- Index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_comparison_cache_movie 
ON comparison_cache(movie_id);

CREATE INDEX IF NOT EXISTS idx_comparison_cache_source 
ON comparison_cache(source_id);

CREATE INDEX IF NOT EXISTS idx_comparison_cache_expires 
ON comparison_cache(expires_at);

-- ============================================================
-- 9. COMPARISON CONFLICTS TABLE
-- ============================================================
-- Records conflicts between sources for auditing

CREATE TABLE IF NOT EXISTS comparison_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    field VARCHAR(50) NOT NULL,
    primary_source VARCHAR(50) NOT NULL,
    primary_value TEXT,
    comparison_source VARCHAR(50) NOT NULL,
    comparison_value TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(100),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE comparison_conflicts IS 
'Audit log of conflicts between primary and comparison sources.';

-- Index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_comparison_conflicts_movie 
ON comparison_conflicts(movie_id);

CREATE INDEX IF NOT EXISTS idx_comparison_conflicts_unresolved 
ON comparison_conflicts(resolved) WHERE resolved = FALSE;

-- ============================================================
-- 10. VERIFICATION HISTORY TABLE
-- ============================================================
-- Track verification history for auditing

CREATE TABLE IF NOT EXISTS verification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    sources_checked TEXT[] NOT NULL,
    alignment_score NUMERIC(4,3),
    confidence_before NUMERIC(4,3),
    confidence_after NUMERIC(4,3),
    conflicts_found INTEGER DEFAULT 0,
    needs_review BOOLEAN DEFAULT FALSE,
    notes TEXT
);

COMMENT ON TABLE verification_history IS 
'History of verification runs for auditing.';

CREATE INDEX IF NOT EXISTS idx_verification_history_movie 
ON verification_history(movie_id);

CREATE INDEX IF NOT EXISTS idx_verification_history_date 
ON verification_history(verified_at);

-- ============================================================
-- 11. HELPER FUNCTION: Clean Expired Cache
-- ============================================================

CREATE OR REPLACE FUNCTION clean_comparison_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM comparison_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clean_comparison_cache IS 
'Removes expired entries from comparison_cache. Call periodically.';

-- ============================================================
-- 12. HELPER FUNCTION: Get Movie Confidence Summary
-- ============================================================

CREATE OR REPLACE FUNCTION get_movie_confidence_summary(p_movie_id UUID)
RETURNS TABLE (
    movie_id UUID,
    title_en TEXT,
    data_confidence NUMERIC,
    comparison_alignment_score NUMERIC,
    needs_manual_review BOOLEAN,
    review_reason TEXT,
    sources_checked INTEGER,
    last_verified_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.title_en,
        m.data_confidence,
        m.comparison_alignment_score,
        m.needs_manual_review,
        m.review_reason,
        (SELECT COUNT(DISTINCT source_id) FROM comparison_cache WHERE comparison_cache.movie_id = m.id)::INTEGER,
        m.last_verified_at
    FROM movies m
    WHERE m.id = p_movie_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_movie_confidence_summary IS 
'Returns confidence summary for a movie including comparison data.';

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

-- Note: Migration tracking table not used in this project.
-- Track manually or via Supabase migrations feature.

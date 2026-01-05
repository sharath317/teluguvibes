-- ============================================================
-- TELUGU MOVIE INDEX - CANONICAL REFERENCE TABLE
-- Phase 2: Single authoritative Telugu movie index
-- ============================================================

-- 1. Core canonical index table
CREATE TABLE IF NOT EXISTS telugu_movie_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- TMDB as anchor
  tmdb_id INTEGER UNIQUE NOT NULL,
  
  -- Core identity
  title_en TEXT NOT NULL,
  original_title TEXT,
  canonical_title TEXT,
  
  -- Release info
  release_date DATE,
  release_year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM release_date)) STORED,
  
  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verification_source TEXT CHECK (verification_source IN ('tmdb', 'wikidata', 'wikipedia', 'manual')),
  confidence_score DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Validation status
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('VALID', 'NEEDS_REVIEW', 'REJECTED', 'PENDING')),
  rejection_reason TEXT,
  
  -- Cross-references
  wikidata_id TEXT,
  imdb_id TEXT,
  
  -- Metadata
  has_poster BOOLEAN DEFAULT false,
  has_backdrop BOOLEAN DEFAULT false,
  has_director BOOLEAN DEFAULT false,
  has_cast BOOLEAN DEFAULT false,
  cast_count INTEGER DEFAULT 0,
  
  -- TMDB raw data (for enrichment)
  popularity DECIMAL(10,3),
  vote_average DECIMAL(3,1),
  vote_count INTEGER,
  
  -- Timestamps
  indexed_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  last_enriched_at TIMESTAMPTZ,
  
  -- Tracking
  source TEXT DEFAULT 'tmdb_discover',
  page_number INTEGER,
  
  CONSTRAINT valid_confidence CHECK (confidence_score BETWEEN 0 AND 1)
);

-- 2. Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_telugu_movie_index_year 
ON telugu_movie_index (release_year DESC);

CREATE INDEX IF NOT EXISTS idx_telugu_movie_index_status 
ON telugu_movie_index (status);

CREATE INDEX IF NOT EXISTS idx_telugu_movie_index_verified 
ON telugu_movie_index (is_verified);

CREATE INDEX IF NOT EXISTS idx_telugu_movie_index_canonical 
ON telugu_movie_index (canonical_title);

CREATE INDEX IF NOT EXISTS idx_telugu_movie_index_popularity 
ON telugu_movie_index (popularity DESC);

-- 3. Ingestion log table
CREATE TABLE IF NOT EXISTS telugu_movie_ingestion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  source TEXT NOT NULL,
  run_type TEXT NOT NULL CHECK (run_type IN ('discover', 'enrich', 'validate', 'full')),
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  pages_processed INTEGER DEFAULT 0,
  total_found INTEGER DEFAULT 0,
  new_indexed INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0,
  rejected INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  error_message TEXT
);

-- 4. View for movies ready for enrichment
CREATE OR REPLACE VIEW movies_pending_enrichment AS
SELECT 
  tmi.id,
  tmi.tmdb_id,
  tmi.title_en,
  tmi.release_year,
  tmi.confidence_score,
  tmi.has_poster,
  tmi.has_director,
  tmi.has_cast,
  CASE 
    WHEN m.id IS NOT NULL THEN true
    ELSE false
  END as exists_in_movies_table
FROM telugu_movie_index tmi
LEFT JOIN movies m ON m.tmdb_id = tmi.tmdb_id
WHERE tmi.status = 'VALID'
  AND tmi.is_verified = true
  AND (
    tmi.has_poster = false 
    OR tmi.has_director = false 
    OR tmi.has_cast = false
    OR tmi.cast_count < 3
  )
ORDER BY tmi.popularity DESC;

-- 5. View for coverage statistics
CREATE OR REPLACE VIEW telugu_movie_coverage AS
SELECT
  'total_indexed' as metric,
  COUNT(*)::text as value
FROM telugu_movie_index
UNION ALL
SELECT
  'verified' as metric,
  COUNT(*)::text as value
FROM telugu_movie_index WHERE is_verified = true
UNION ALL
SELECT
  'valid' as metric,
  COUNT(*)::text as value
FROM telugu_movie_index WHERE status = 'VALID'
UNION ALL
SELECT
  'needs_review' as metric,
  COUNT(*)::text as value
FROM telugu_movie_index WHERE status = 'NEEDS_REVIEW'
UNION ALL
SELECT
  'rejected' as metric,
  COUNT(*)::text as value
FROM telugu_movie_index WHERE status = 'REJECTED'
UNION ALL
SELECT
  'with_poster' as metric,
  COUNT(*)::text as value
FROM telugu_movie_index WHERE has_poster = true
UNION ALL
SELECT
  'with_director' as metric,
  COUNT(*)::text as value
FROM telugu_movie_index WHERE has_director = true
UNION ALL
SELECT
  'with_cast_3plus' as metric,
  COUNT(*)::text as value
FROM telugu_movie_index WHERE cast_count >= 3
UNION ALL
SELECT
  'in_movies_table' as metric,
  COUNT(DISTINCT m.id)::text as value
FROM movies m
JOIN telugu_movie_index tmi ON m.tmdb_id = tmi.tmdb_id;

-- 6. Function to generate canonical title
CREATE OR REPLACE FUNCTION generate_movie_canonical_title()
RETURNS TRIGGER AS $$
BEGIN
  NEW.canonical_title := LOWER(TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(NEW.title_en, '\s*\(film\)\s*', '', 'gi'),
        '\s*\(\d{4}\)\s*', '', 'gi'
      ),
      '[^a-z0-9\s]', '', 'gi'
    )
  ));
  NEW.canonical_title := REGEXP_REPLACE(NEW.canonical_title, '\s+', ' ', 'g');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS telugu_movie_index_canonical_trigger ON telugu_movie_index;
CREATE TRIGGER telugu_movie_index_canonical_trigger
  BEFORE INSERT OR UPDATE OF title_en ON telugu_movie_index
  FOR EACH ROW
  EXECUTE FUNCTION generate_movie_canonical_title();

-- 7. Function to calculate data quality
CREATE OR REPLACE FUNCTION update_movie_quality_flags()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-verify if high confidence
  IF NEW.confidence_score >= 0.8 
     AND NEW.has_poster 
     AND NEW.has_director 
     AND NEW.cast_count >= 3 THEN
    NEW.is_verified := true;
    NEW.status := 'VALID';
    NEW.verified_at := NOW();
  ELSIF NEW.confidence_score < 0.5 
        OR (NOT NEW.has_poster AND NOT NEW.has_director) THEN
    NEW.status := 'NEEDS_REVIEW';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS telugu_movie_index_quality_trigger ON telugu_movie_index;
CREATE TRIGGER telugu_movie_index_quality_trigger
  BEFORE INSERT OR UPDATE ON telugu_movie_index
  FOR EACH ROW
  EXECUTE FUNCTION update_movie_quality_flags();

-- 8. Comments
COMMENT ON TABLE telugu_movie_index IS 'Immutable canonical reference of all Telugu movies from TMDB';
COMMENT ON COLUMN telugu_movie_index.tmdb_id IS 'TMDB ID - primary anchor for Telugu movie identity';
COMMENT ON COLUMN telugu_movie_index.status IS 'VALID=ready for use, NEEDS_REVIEW=manual check required, REJECTED=not a valid Telugu movie';
COMMENT ON COLUMN telugu_movie_index.confidence_score IS 'Confidence that this is a valid Telugu movie (0-1)';

SELECT 'Telugu movie index schema created!' as status;







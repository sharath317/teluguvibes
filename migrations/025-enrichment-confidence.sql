-- ============================================================
-- MIGRATION: 025-enrichment-confidence.sql
-- PURPOSE: Add confidence tracking columns for safe enrichment
-- DATE: 2024
-- ============================================================

-- ============================================================
-- LAYER 2: PRIMARY GENRE CONFIDENCE TRACKING
-- ============================================================

-- Genre confidence level (high/low)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS genre_confidence TEXT;
COMMENT ON COLUMN movies.genre_confidence IS 'Confidence level for primary_genre derivation: high (>=0.65) or low (<0.65)';

-- Genre sources used for derivation
ALTER TABLE movies ADD COLUMN IF NOT EXISTS genre_sources TEXT[];
COMMENT ON COLUMN movies.genre_sources IS 'List of signal sources used to derive primary_genre (e.g., genres_array, mood_tags, director_pattern)';

-- ============================================================
-- LAYER 2: AGE RATING CONFIDENCE TRACKING
-- ============================================================

-- Age rating confidence level (high/medium/low)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS age_rating_confidence TEXT;
COMMENT ON COLUMN movies.age_rating_confidence IS 'Confidence level for age_rating derivation: high, medium, or low';

-- Age rating reasons/justifications
ALTER TABLE movies ADD COLUMN IF NOT EXISTS age_rating_reasons TEXT[];
COMMENT ON COLUMN movies.age_rating_reasons IS 'List of reasons that led to the age_rating decision';

-- ============================================================
-- LAYER 4: TAGLINE CONFIDENCE TRACKING
-- ============================================================

-- Tagline source
ALTER TABLE movies ADD COLUMN IF NOT EXISTS tagline_source TEXT;
COMMENT ON COLUMN movies.tagline_source IS 'Source of tagline: tmdb, english_wikipedia, telugu_wikipedia, omdb, overview_extract';

-- Tagline confidence (0.0 to 1.0)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS tagline_confidence NUMERIC(3,2);
COMMENT ON COLUMN movies.tagline_confidence IS 'Confidence score for tagline (0.0-1.0). High >= 0.65';

-- ============================================================
-- LAYER 4: TELUGU SYNOPSIS CONFIDENCE TRACKING
-- ============================================================

-- Telugu synopsis source
ALTER TABLE movies ADD COLUMN IF NOT EXISTS synopsis_te_source TEXT;
COMMENT ON COLUMN movies.synopsis_te_source IS 'Source of Telugu synopsis: telugu_wikipedia, english_synopsis_translated, wikidata_telugu, generated_basic';

-- Telugu synopsis confidence (0.0 to 1.0)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS synopsis_te_confidence NUMERIC(3,2);
COMMENT ON COLUMN movies.synopsis_te_confidence IS 'Confidence score for Telugu synopsis (0.0-1.0). High >= 0.65. Generated basic = 0.30 (do not count as enriched)';

-- ============================================================
-- INDEXES FOR CONFIDENCE QUERIES
-- ============================================================

-- Index for finding low-confidence records that need improvement
CREATE INDEX IF NOT EXISTS idx_movies_genre_confidence 
ON movies (genre_confidence) 
WHERE genre_confidence = 'low';

CREATE INDEX IF NOT EXISTS idx_movies_age_rating_confidence 
ON movies (age_rating_confidence) 
WHERE age_rating_confidence IN ('low', 'medium');

CREATE INDEX IF NOT EXISTS idx_movies_tagline_confidence 
ON movies (tagline_confidence) 
WHERE tagline_confidence < 0.65;

CREATE INDEX IF NOT EXISTS idx_movies_synopsis_te_confidence 
ON movies (synopsis_te_confidence) 
WHERE synopsis_te_confidence < 0.65;

-- Composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_movies_enrichment_quality 
ON movies (language, is_published, primary_genre, age_rating, tagline, synopsis_te)
WHERE language = 'Telugu' AND is_published = true;

-- ============================================================
-- VIEWS FOR ENRICHMENT MONITORING
-- ============================================================

-- View for enrichment coverage dashboard
CREATE OR REPLACE VIEW enrichment_coverage_stats AS
SELECT
  -- Total movies
  COUNT(*) as total_movies,
  
  -- Layer 2: Genre
  COUNT(*) FILTER (WHERE primary_genre IS NOT NULL) as has_primary_genre,
  COUNT(*) FILTER (WHERE primary_genre IS NOT NULL AND genre_confidence = 'high') as primary_genre_high_conf,
  COUNT(*) FILTER (WHERE primary_genre IS NULL) as missing_primary_genre,
  
  -- Layer 2: Age Rating
  COUNT(*) FILTER (WHERE age_rating IS NOT NULL) as has_age_rating,
  COUNT(*) FILTER (WHERE age_rating IS NOT NULL AND age_rating_confidence = 'high') as age_rating_high_conf,
  COUNT(*) FILTER (WHERE age_rating IS NULL) as missing_age_rating,
  
  -- Layer 4: Tagline
  COUNT(*) FILTER (WHERE tagline IS NOT NULL AND tagline != '') as has_tagline,
  COUNT(*) FILTER (WHERE tagline_confidence >= 0.65) as tagline_high_conf,
  COUNT(*) FILTER (WHERE tagline IS NULL OR tagline = '') as missing_tagline,
  
  -- Layer 4: Telugu Synopsis
  COUNT(*) FILTER (WHERE synopsis_te IS NOT NULL AND synopsis_te != '') as has_synopsis_te,
  COUNT(*) FILTER (WHERE synopsis_te_confidence >= 0.65) as synopsis_te_high_conf,
  COUNT(*) FILTER (WHERE synopsis_te_confidence < 0.65 AND synopsis_te IS NOT NULL) as synopsis_te_low_conf,
  COUNT(*) FILTER (WHERE synopsis_te IS NULL OR synopsis_te = '') as missing_synopsis_te

FROM movies
WHERE language = 'Telugu' AND is_published = true;

-- View for movies needing manual review
CREATE OR REPLACE VIEW movies_needing_review AS
SELECT 
  id,
  title_en,
  release_year,
  slug,
  -- Genre issues
  CASE 
    WHEN primary_genre IS NULL AND genres IS NOT NULL AND array_length(genres, 1) > 0 THEN 'Genre signals exist but no consensus'
    WHEN genre_confidence = 'low' THEN 'Low confidence genre'
    ELSE NULL
  END as genre_issue,
  -- Age rating issues
  CASE
    WHEN age_rating IS NULL AND (content_flags IS NOT NULL OR trigger_warnings IS NOT NULL) THEN 'Has content signals but no rating'
    WHEN age_rating_confidence = 'low' THEN 'Low confidence rating'
    ELSE NULL
  END as rating_issue,
  -- Synopsis issues
  CASE
    WHEN synopsis_te_confidence < 0.40 THEN 'Auto-generated synopsis needs improvement'
    WHEN synopsis_te_confidence BETWEEN 0.40 AND 0.64 THEN 'Medium confidence synopsis'
    ELSE NULL
  END as synopsis_issue
FROM movies
WHERE 
  language = 'Telugu' 
  AND is_published = true
  AND (
    (primary_genre IS NULL AND genres IS NOT NULL)
    OR genre_confidence = 'low'
    OR (age_rating IS NULL AND (content_flags IS NOT NULL OR trigger_warnings IS NOT NULL))
    OR age_rating_confidence = 'low'
    OR synopsis_te_confidence < 0.65
  );

-- ============================================================
-- FUNCTION: Get enrichment stats for a specific decade
-- ============================================================

CREATE OR REPLACE FUNCTION get_enrichment_stats_by_decade(start_year INT, end_year INT)
RETURNS TABLE (
  decade TEXT,
  total_movies BIGINT,
  primary_genre_coverage NUMERIC,
  primary_genre_high_conf_pct NUMERIC,
  age_rating_coverage NUMERIC,
  tagline_coverage NUMERIC,
  synopsis_te_high_conf_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    start_year::TEXT || 's' as decade,
    COUNT(*)::BIGINT as total_movies,
    ROUND(COUNT(*) FILTER (WHERE primary_genre IS NOT NULL)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) as primary_genre_coverage,
    ROUND(COUNT(*) FILTER (WHERE genre_confidence = 'high')::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE primary_genre IS NOT NULL), 0) * 100, 1) as primary_genre_high_conf_pct,
    ROUND(COUNT(*) FILTER (WHERE age_rating IS NOT NULL)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) as age_rating_coverage,
    ROUND(COUNT(*) FILTER (WHERE tagline IS NOT NULL AND tagline != '')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) as tagline_coverage,
    ROUND(COUNT(*) FILTER (WHERE synopsis_te_confidence >= 0.65)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE synopsis_te IS NOT NULL), 0) * 100, 1) as synopsis_te_high_conf_pct
  FROM movies
  WHERE 
    language = 'Telugu' 
    AND is_published = true
    AND release_year >= start_year 
    AND release_year < end_year;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- INITIAL DATA BACKFILL
-- ============================================================

-- Mark existing high-quality data with confidence
-- This assumes existing data was manually curated or from reliable sources

-- Backfill genre confidence for existing primary_genre values
UPDATE movies
SET genre_confidence = 'high'
WHERE primary_genre IS NOT NULL 
  AND genre_confidence IS NULL
  AND language = 'Telugu';

-- Backfill age rating confidence for existing values
UPDATE movies
SET age_rating_confidence = 'high'
WHERE age_rating IS NOT NULL 
  AND age_rating_confidence IS NULL
  AND language = 'Telugu';

-- Backfill tagline source/confidence for existing values
UPDATE movies
SET 
  tagline_source = 'legacy',
  tagline_confidence = 0.80
WHERE tagline IS NOT NULL 
  AND tagline != ''
  AND tagline_source IS NULL
  AND language = 'Telugu';

-- Backfill synopsis_te source/confidence - assume low for existing generated ones
UPDATE movies
SET 
  synopsis_te_source = 'legacy_generated',
  synopsis_te_confidence = 0.30
WHERE synopsis_te IS NOT NULL 
  AND synopsis_te != ''
  AND synopsis_te_source IS NULL
  AND synopsis_te LIKE '%అనేది%విడుదలైన తెలుగు సినిమా%'  -- Pattern matching generated synopses
  AND language = 'Telugu';

-- Mark non-generated legacy synopses as medium confidence
UPDATE movies
SET 
  synopsis_te_source = 'legacy',
  synopsis_te_confidence = 0.70
WHERE synopsis_te IS NOT NULL 
  AND synopsis_te != ''
  AND synopsis_te_source IS NULL
  AND language = 'Telugu';

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Run these to verify the migration:
-- SELECT * FROM enrichment_coverage_stats;
-- SELECT * FROM movies_needing_review LIMIT 20;
-- SELECT * FROM get_enrichment_stats_by_decade(2020, 2030);


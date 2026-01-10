-- ============================================================
-- MIGRATION 027: Fix Missing Columns
-- ============================================================
-- Fixes columns that are referenced by enrichment scripts but don't exist

-- ============================================================
-- 1. CONTENT FLAGS COLUMNS
-- ============================================================

ALTER TABLE movies ADD COLUMN IF NOT EXISTS is_pan_india BOOLEAN DEFAULT FALSE;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS is_remake BOOLEAN DEFAULT FALSE;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS is_biopic BOOLEAN DEFAULT FALSE;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS is_sequel BOOLEAN DEFAULT FALSE;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS is_franchise BOOLEAN DEFAULT FALSE;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS is_debut BOOLEAN DEFAULT FALSE;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS remake_of TEXT DEFAULT NULL;

COMMENT ON COLUMN movies.is_pan_india IS 'Whether the movie is a pan-India release (multiple languages)';
COMMENT ON COLUMN movies.is_remake IS 'Whether the movie is a remake of another film';
COMMENT ON COLUMN movies.is_biopic IS 'Whether the movie is a biographical film';
COMMENT ON COLUMN movies.is_sequel IS 'Whether the movie is a sequel';
COMMENT ON COLUMN movies.is_franchise IS 'Whether the movie is part of a franchise';
COMMENT ON COLUMN movies.is_debut IS 'Whether this is a debut film for hero/director';
COMMENT ON COLUMN movies.remake_of IS 'Title of the original film if this is a remake';

-- ============================================================
-- 2. RATING COLUMNS (if missing)
-- ============================================================

-- Note: tmdb_rating might be stored differently, check existing schema
-- ALTER TABLE movies ADD COLUMN IF NOT EXISTS tmdb_rating NUMERIC(3,1) DEFAULT NULL;
-- ALTER TABLE movies ADD COLUMN IF NOT EXISTS imdb_rating NUMERIC(3,1) DEFAULT NULL;

-- ============================================================
-- 3. TRIVIA COLUMNS
-- ============================================================

ALTER TABLE movies ADD COLUMN IF NOT EXISTS trivia JSONB DEFAULT NULL;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS cultural_impact TEXT DEFAULT NULL;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS production_notes TEXT DEFAULT NULL;

COMMENT ON COLUMN movies.trivia IS 'Interesting facts and trivia about the movie';
COMMENT ON COLUMN movies.cultural_impact IS 'Cultural significance and impact of the movie';
COMMENT ON COLUMN movies.production_notes IS 'Production details and behind-the-scenes info';

-- ============================================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_movies_is_pan_india ON movies(is_pan_india) WHERE is_pan_india = TRUE;
CREATE INDEX IF NOT EXISTS idx_movies_is_remake ON movies(is_remake) WHERE is_remake = TRUE;
CREATE INDEX IF NOT EXISTS idx_movies_is_biopic ON movies(is_biopic) WHERE is_biopic = TRUE;
CREATE INDEX IF NOT EXISTS idx_movies_language_published ON movies(language, is_published);
CREATE INDEX IF NOT EXISTS idx_movies_release_year ON movies(release_year);
CREATE INDEX IF NOT EXISTS idx_movies_primary_genre ON movies(primary_genre) WHERE primary_genre IS NOT NULL;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================


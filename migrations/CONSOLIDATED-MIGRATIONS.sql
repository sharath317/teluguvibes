-- ============================================================
-- CONSOLIDATED MIGRATIONS FOR ENRICHMENT SYSTEM v2.0
-- ============================================================
-- 
-- HOW TO RUN:
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project
-- 3. Go to "SQL Editor" in the left sidebar
-- 4. Click "New Query"
-- 5. Copy and paste this entire file
-- 6. Click "Run" (or press Cmd+Enter / Ctrl+Enter)
--
-- This file combines:
-- - 020-taxonomy-layer.sql
-- - 021-trust-scoring.sql (partial)
-- - 024-missing-columns.sql
--
-- Note: Run each section separately if you encounter errors.
-- ============================================================


-- ============================================================
-- SECTION 1: CORE MISSING COLUMNS
-- Run this first - these are required by enrichment scripts
-- ============================================================

-- Movie overview (short description from TMDB)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS overview TEXT;

-- Movie tagline (marketing tagline)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Wikidata identifier for entity linking
ALTER TABLE movies ADD COLUMN IF NOT EXISTS wikidata_id TEXT;

-- Trivia and production notes
ALTER TABLE movies ADD COLUMN IF NOT EXISTS trivia JSONB DEFAULT '{}';

-- Box office data (structured)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS box_office JSONB DEFAULT '{}';

-- Telugu synopsis
ALTER TABLE movies ADD COLUMN IF NOT EXISTS synopsis_te TEXT;

-- Decade classification
ALTER TABLE movies ADD COLUMN IF NOT EXISTS decade TEXT;

-- Certification (alias for age_rating)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS certification TEXT;


-- ============================================================
-- SECTION 2: TAXONOMY COLUMNS
-- Genre and era classification
-- ============================================================

-- Content type separation
ALTER TABLE movies ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'fact';

-- Primary genre (single main genre)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS primary_genre TEXT;

-- Secondary genres
ALTER TABLE movies ADD COLUMN IF NOT EXISTS secondary_genres TEXT[];

-- Era classification
ALTER TABLE movies ADD COLUMN IF NOT EXISTS era TEXT;

-- Tone classification
ALTER TABLE movies ADD COLUMN IF NOT EXISTS tone TEXT;

-- Style classification
ALTER TABLE movies ADD COLUMN IF NOT EXISTS style TEXT;

-- Style tags array
ALTER TABLE movies ADD COLUMN IF NOT EXISTS style_tags TEXT[] DEFAULT '{}';

-- Content sensitivity
ALTER TABLE movies ADD COLUMN IF NOT EXISTS content_sensitivity JSONB DEFAULT '{}';

-- Audience suitability
ALTER TABLE movies ADD COLUMN IF NOT EXISTS audience_suitability TEXT;


-- ============================================================
-- SECTION 3: TRUST & CONFIDENCE COLUMNS
-- Data quality scoring
-- ============================================================

-- Data confidence score (0.0 to 1.0)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS data_confidence DECIMAL(3,2) DEFAULT 0.5;

-- Confidence breakdown for explainability
ALTER TABLE movies ADD COLUMN IF NOT EXISTS confidence_breakdown JSONB DEFAULT '{}';

-- Trust badge for UI display
ALTER TABLE movies ADD COLUMN IF NOT EXISTS trust_badge TEXT;

-- Data sources tracking
ALTER TABLE movies ADD COLUMN IF NOT EXISTS data_sources TEXT[] DEFAULT '{}';


-- ============================================================
-- SECTION 4: INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_movies_wikidata_id 
  ON movies(wikidata_id) WHERE wikidata_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movies_trust_badge 
  ON movies(trust_badge) WHERE trust_badge IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movies_decade 
  ON movies(decade) WHERE decade IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movies_data_confidence 
  ON movies(data_confidence DESC) WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_movies_content_type 
  ON movies(content_type) WHERE content_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movies_primary_genre 
  ON movies(primary_genre) WHERE primary_genre IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movies_era 
  ON movies(era) WHERE era IS NOT NULL;


-- ============================================================
-- SECTION 5: HELPER FUNCTIONS
-- ============================================================

-- Derive decade from year
CREATE OR REPLACE FUNCTION derive_decade(release_year INTEGER) 
RETURNS TEXT AS $$
BEGIN
  IF release_year IS NULL THEN RETURN NULL; END IF;
  RETURN (floor(release_year / 10) * 10)::TEXT || 's';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Derive era from year
CREATE OR REPLACE FUNCTION derive_movie_era(release_year INTEGER) 
RETURNS TEXT AS $$
BEGIN
  IF release_year IS NULL THEN RETURN NULL; END IF;
  IF release_year < 1947 THEN RETURN 'pre-independence';
  ELSIF release_year <= 1979 THEN RETURN 'golden-age';
  ELSIF release_year <= 1999 THEN RETURN 'classic';
  ELSIF release_year <= 2014 THEN RETURN 'modern';
  ELSIF release_year <= 2020 THEN RETURN 'new-wave';
  ELSE RETURN 'current';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate trust badge
CREATE OR REPLACE FUNCTION calculate_trust_badge(confidence DECIMAL(3,2)) 
RETURNS TEXT AS $$
BEGIN
  IF confidence IS NULL THEN RETURN 'unverified'; END IF;
  IF confidence >= 0.90 THEN RETURN 'verified';
  ELSIF confidence >= 0.70 THEN RETURN 'high';
  ELSIF confidence >= 0.50 THEN RETURN 'medium';
  ELSIF confidence >= 0.30 THEN RETURN 'low';
  ELSE RETURN 'unverified';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================
-- SECTION 6: BACKFILL EXISTING DATA
-- This updates existing movies with derived values
-- ============================================================

-- Backfill decade
UPDATE movies 
SET decade = derive_decade(release_year)
WHERE decade IS NULL AND release_year IS NOT NULL;

-- Backfill era
UPDATE movies 
SET era = derive_movie_era(release_year)
WHERE era IS NULL AND release_year IS NOT NULL;

-- Set default content_type
UPDATE movies 
SET content_type = 'fact'
WHERE content_type IS NULL;

-- Set default trust badge
UPDATE movies 
SET trust_badge = 'medium'
WHERE trust_badge IS NULL AND is_published = true;

-- Sync certification from age_rating
UPDATE movies 
SET certification = age_rating
WHERE certification IS NULL AND age_rating IS NOT NULL;


-- ============================================================
-- SECTION 7: COLLABORATIONS TABLE (Optional - for Layer 5)
-- Run this if you want the collaboration graph feature
-- ============================================================

CREATE TABLE IF NOT EXISTS collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity1_type TEXT NOT NULL,
  entity1_name TEXT NOT NULL,
  entity2_type TEXT NOT NULL,
  entity2_name TEXT NOT NULL,
  collaboration_count INTEGER DEFAULT 1,
  movie_ids UUID[],
  first_collab_year INTEGER,
  last_collab_year INTEGER,
  hit_rate DECIMAL(3,2),
  avg_rating DECIMAL(3,2),
  notable_films TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity1_type, entity1_name, entity2_type, entity2_name)
);

CREATE TABLE IF NOT EXISTS career_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  milestone_type TEXT,
  movie_id UUID REFERENCES movies(id),
  movie_title TEXT,
  year INTEGER,
  description TEXT,
  significance TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_name, milestone_type, year)
);


-- ============================================================
-- DONE! Verify with:
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'movies' ORDER BY column_name;
-- ============================================================


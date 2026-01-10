-- ============================================================
-- MIGRATION 024: Add Missing Columns for Enrichment System
-- ============================================================
-- This migration adds all columns required by the enrichment
-- scripts that are currently missing from the movies table.
-- ============================================================

-- ============================================================
-- CORE METADATA COLUMNS
-- ============================================================

-- Movie overview (short description, typically from TMDB)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS overview TEXT;
COMMENT ON COLUMN movies.overview IS 
  'Short movie description/plot summary (typically 2-3 sentences). Source: TMDB, Wikipedia.';

-- Movie tagline (marketing tagline)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS tagline TEXT;
COMMENT ON COLUMN movies.tagline IS 
  'Marketing tagline for the movie. Source: TMDB, Wikipedia.';

-- Wikidata identifier for entity linking
ALTER TABLE movies ADD COLUMN IF NOT EXISTS wikidata_id TEXT;
COMMENT ON COLUMN movies.wikidata_id IS 
  'Wikidata QID for cross-referencing (e.g., Q12345). Enables knowledge graph lookups.';

-- Trivia and production notes (JSONB for structured data)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS trivia JSONB DEFAULT '{}';
COMMENT ON COLUMN movies.trivia IS 
  'Production trivia, behind-the-scenes info, cultural impact notes. Format: {"shooting_locations": [], "production_trivia": [], "cultural_impact": "", "controversies": []}';

-- Box office data (structured)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS box_office JSONB DEFAULT '{}';
COMMENT ON COLUMN movies.box_office IS 
  'Box office collection data. Format: {"opening_day": "", "first_week": "", "lifetime_gross": "", "worldwide_gross": "", "budget": "", "verdict": ""}';

-- Telugu synopsis
ALTER TABLE movies ADD COLUMN IF NOT EXISTS synopsis_te TEXT;
COMMENT ON COLUMN movies.synopsis_te IS 
  'Telugu language synopsis. Source: Telugu Wikipedia, AI translation.';

-- ============================================================
-- TAXONOMY EXTENSIONS
-- ============================================================

-- Decade classification (e.g., "1990s", "2000s")
ALTER TABLE movies ADD COLUMN IF NOT EXISTS decade TEXT;
COMMENT ON COLUMN movies.decade IS 
  'Decade classification for filtering (e.g., "1990s", "2000s").';

-- Style tags (array of style descriptors)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS style_tags TEXT[] DEFAULT '{}';
COMMENT ON COLUMN movies.style_tags IS 
  'Style descriptors: classic, masala, experimental, biopic, pan-india, modern.';

-- Content sensitivity breakdown
ALTER TABLE movies ADD COLUMN IF NOT EXISTS content_sensitivity JSONB DEFAULT '{}';
COMMENT ON COLUMN movies.content_sensitivity IS 
  'Content sensitivity analysis. Format: {"violence": false, "mature_themes": false, "substance": false, "language": false, "dark_themes": false, "overall_level": "none|low|moderate|high"}';

-- Audience suitability classification
ALTER TABLE movies ADD COLUMN IF NOT EXISTS audience_suitability TEXT 
  CHECK (audience_suitability IN (
    'all_ages',            -- Suitable for everyone
    'general_audience',    -- General audiences
    'family_with_guidance', -- Family viewing with guidance
    'teens_and_above',     -- Suitable for teens+
    'adults_only',         -- Adults only
    'restricted'           -- Restricted viewing
  ));
COMMENT ON COLUMN movies.audience_suitability IS 
  'Derived audience suitability based on content and ratings.';

-- ============================================================
-- TRUST & CONFIDENCE COLUMNS
-- ============================================================

-- Data confidence score (0.0 to 1.0)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS data_confidence DECIMAL(3,2) DEFAULT 0.5;
COMMENT ON COLUMN movies.data_confidence IS 
  'Overall data confidence score from 0.0 (unverified) to 1.0 (fully verified).';

-- Confidence breakdown for explainability
ALTER TABLE movies ADD COLUMN IF NOT EXISTS confidence_breakdown JSONB DEFAULT '{}';
COMMENT ON COLUMN movies.confidence_breakdown IS 
  'Detailed breakdown explaining data_confidence calculation. Enables "Why this score?" tooltip.';

-- Trust badge for UI display
ALTER TABLE movies ADD COLUMN IF NOT EXISTS trust_badge TEXT 
  CHECK (trust_badge IN ('verified', 'high', 'medium', 'low', 'unverified'));
COMMENT ON COLUMN movies.trust_badge IS 
  'Human-readable trust indicator for UI badges.';

-- Data sources tracking
ALTER TABLE movies ADD COLUMN IF NOT EXISTS data_sources TEXT[] DEFAULT '{}';
COMMENT ON COLUMN movies.data_sources IS 
  'List of data sources used for this movie record.';

-- Certification (Indian censor classification)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS certification TEXT 
  CHECK (certification IN ('U', 'U/A', 'A', 'S'));
COMMENT ON COLUMN movies.certification IS 
  'Indian censor board certification. Alias for age_rating for TMDB compatibility.';

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Wikidata lookups
CREATE INDEX IF NOT EXISTS idx_movies_wikidata_id 
  ON movies(wikidata_id) WHERE wikidata_id IS NOT NULL;

-- Trust badge filtering
CREATE INDEX IF NOT EXISTS idx_movies_trust_badge 
  ON movies(trust_badge) WHERE trust_badge IS NOT NULL;

-- Decade filtering
CREATE INDEX IF NOT EXISTS idx_movies_decade 
  ON movies(decade) WHERE decade IS NOT NULL;

-- Data confidence for quality dashboards
CREATE INDEX IF NOT EXISTS idx_movies_data_confidence 
  ON movies(data_confidence DESC) WHERE is_published = true;

-- Audience suitability filtering
CREATE INDEX IF NOT EXISTS idx_movies_audience_suitability 
  ON movies(audience_suitability) WHERE audience_suitability IS NOT NULL;

-- Full-text search on overview and synopsis
CREATE INDEX IF NOT EXISTS idx_movies_overview_search 
  ON movies USING gin(to_tsvector('english', COALESCE(overview, '')));

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Derive decade from year
CREATE OR REPLACE FUNCTION derive_decade(release_year INTEGER) 
RETURNS TEXT AS $$
BEGIN
  IF release_year IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN (floor(release_year / 10) * 10)::TEXT || 's';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate trust badge from confidence score
CREATE OR REPLACE FUNCTION calculate_trust_badge(confidence DECIMAL(3,2)) 
RETURNS TEXT AS $$
BEGIN
  IF confidence IS NULL THEN
    RETURN 'unverified';
  END IF;
  
  IF confidence >= 0.90 THEN
    RETURN 'verified';
  ELSIF confidence >= 0.70 THEN
    RETURN 'high';
  ELSIF confidence >= 0.50 THEN
    RETURN 'medium';
  ELSIF confidence >= 0.30 THEN
    RETURN 'low';
  ELSE
    RETURN 'unverified';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- AUTO-DERIVE TRIGGER
-- ============================================================

-- Extend existing trigger to derive new fields
CREATE OR REPLACE FUNCTION auto_derive_extended_taxonomy() 
RETURNS TRIGGER AS $$
BEGIN
  -- Derive decade if not set
  IF NEW.decade IS NULL AND NEW.release_year IS NOT NULL THEN
    NEW.decade := derive_decade(NEW.release_year);
  END IF;
  
  -- Derive trust badge from confidence
  IF NEW.trust_badge IS NULL AND NEW.data_confidence IS NOT NULL THEN
    NEW.trust_badge := calculate_trust_badge(NEW.data_confidence);
  END IF;
  
  -- Sync certification with age_rating if one is set
  IF NEW.certification IS NULL AND NEW.age_rating IS NOT NULL THEN
    NEW.certification := NEW.age_rating;
  ELSIF NEW.age_rating IS NULL AND NEW.certification IS NOT NULL THEN
    NEW.age_rating := NEW.certification;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for extended derivation
DROP TRIGGER IF EXISTS trg_auto_derive_extended ON movies;
CREATE TRIGGER trg_auto_derive_extended
  BEFORE INSERT OR UPDATE ON movies
  FOR EACH ROW
  EXECUTE FUNCTION auto_derive_extended_taxonomy();

-- ============================================================
-- BACKFILL EXISTING DATA
-- ============================================================

-- Backfill decade
UPDATE movies 
SET decade = derive_decade(release_year)
WHERE decade IS NULL AND release_year IS NOT NULL;

-- Set default trust badge
UPDATE movies 
SET trust_badge = 'medium'
WHERE trust_badge IS NULL AND is_published = true;

-- Sync certification from age_rating
UPDATE movies 
SET certification = age_rating
WHERE certification IS NULL AND age_rating IS NOT NULL;


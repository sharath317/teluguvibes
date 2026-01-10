-- ============================================================
-- MIGRATION 021: Trust and Confidence Scoring
-- ============================================================
-- This migration adds explainable confidence scoring to communicate
-- data reliability and build user trust.
-- ============================================================

-- Main confidence score (0.0 to 1.0)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS data_confidence DECIMAL(3,2) DEFAULT 0.5;

COMMENT ON COLUMN movies.data_confidence IS 
  'Overall data confidence score from 0.0 (unverified) to 1.0 (fully verified).';

-- Confidence breakdown for explainability (CRITICAL for "why this score?")
ALTER TABLE movies ADD COLUMN IF NOT EXISTS confidence_breakdown JSONB DEFAULT '{}';

-- Expected format:
-- {
--   "source_count": 4,
--   "source_tiers": {"tier1": 2, "tier2": 1, "tier3": 1},
--   "editorial_alignment": 0.92,
--   "validation_pass_rate": 0.95,
--   "last_validation_date": "2026-01-09",
--   "field_completeness": 0.88,
--   "data_age_days": 15,
--   "explanation": "Verified by 2 authoritative sources"
-- }

COMMENT ON COLUMN movies.confidence_breakdown IS 
  'Detailed breakdown explaining how data_confidence was calculated. Enables "Why this score?" tooltip.';

-- Trust badge for UI display
ALTER TABLE movies ADD COLUMN IF NOT EXISTS trust_badge TEXT CHECK (trust_badge IN (
  'verified',     -- 90%+ confidence, multiple tier-1 sources
  'high',         -- 70-89% confidence
  'medium',       -- 50-69% confidence
  'low',          -- 30-49% confidence
  'unverified'    -- <30% confidence
));

COMMENT ON COLUMN movies.trust_badge IS 
  'Human-readable trust indicator for UI badges.';

-- ============================================================
-- SOURCE TIERS TABLE
-- ============================================================

-- Source tier definitions (for consistent scoring)
CREATE TABLE IF NOT EXISTS source_tiers (
  source_name TEXT PRIMARY KEY,
  tier INTEGER CHECK (tier IN (1, 2, 3)) NOT NULL,  -- 1=highest trust
  weight DECIMAL(3,2) NOT NULL,
  description TEXT,
  requires_attribution BOOLEAN DEFAULT false,
  rate_limit_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE source_tiers IS 
  'Data source configurations for confidence scoring. Tier 1 = authoritative, Tier 3 = needs verification.';

-- Insert default source tiers
INSERT INTO source_tiers (source_name, tier, weight, description, requires_attribution, rate_limit_ms)
VALUES
  ('wikipedia', 1, 1.0, 'Wikipedia - Community verified encyclopedic content', true, 200),
  ('tmdb', 1, 0.95, 'The Movie Database - Curated movie database', false, 250),
  ('wikidata', 1, 0.90, 'Wikidata - Structured knowledge graph', true, 200),
  ('imdb', 1, 0.90, 'Internet Movie Database - Industry standard', false, 500),
  ('omdb', 2, 0.80, 'Open Movie Database - Aggregated data', true, 300),
  ('archive_org', 2, 0.75, 'Internet Archive - Historical records', true, 500),
  ('news_sources', 2, 0.70, 'News articles and press releases', true, NULL),
  ('fan_sites', 3, 0.40, 'Fan-maintained databases', true, NULL),
  ('ai_inference', 3, 0.35, 'AI-generated or inferred data', false, NULL),
  ('generated', 3, 0.30, 'System-generated placeholder data', false, NULL)
ON CONFLICT (source_name) DO UPDATE SET
  tier = EXCLUDED.tier,
  weight = EXCLUDED.weight,
  description = EXCLUDED.description;

-- ============================================================
-- FUNCTIONS FOR CONFIDENCE CALCULATION
-- ============================================================

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

-- Calculate field completeness
CREATE OR REPLACE FUNCTION calculate_field_completeness(movie_row movies) 
RETURNS DECIMAL(3,2) AS $$
DECLARE
  total_fields INTEGER := 20;  -- Number of key fields
  filled_fields INTEGER := 0;
BEGIN
  -- Essential fields
  IF movie_row.title_en IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF movie_row.release_year IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF movie_row.synopsis IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF movie_row.poster_url IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF movie_row.director IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF movie_row.hero IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  
  -- Metadata fields
  IF movie_row.genres IS NOT NULL AND array_length(movie_row.genres, 1) > 0 THEN 
    filled_fields := filled_fields + 1; 
  END IF;
  IF movie_row.runtime_minutes IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF movie_row.tmdb_id IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF movie_row.imdb_id IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  
  -- Extended fields
  IF movie_row.heroine IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF movie_row.music_director IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF movie_row.hero_image IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF movie_row.heroine_image IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF movie_row.director_image IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF movie_row.avg_rating IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF movie_row.tagline IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF movie_row.age_rating IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF movie_row.mood_tags IS NOT NULL AND array_length(movie_row.mood_tags, 1) > 0 THEN 
    filled_fields := filled_fields + 1; 
  END IF;
  IF movie_row.audience_fit IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  
  RETURN filled_fields::DECIMAL / total_fields::DECIMAL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Auto-derive trust badge from confidence score
CREATE OR REPLACE FUNCTION auto_derive_trust_badge() 
RETURNS TRIGGER AS $$
BEGIN
  -- Update trust badge when confidence changes
  IF NEW.data_confidence IS DISTINCT FROM OLD.data_confidence THEN
    NEW.trust_badge := calculate_trust_badge(NEW.data_confidence);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-derivation
DROP TRIGGER IF EXISTS trg_auto_derive_trust_badge ON movies;
CREATE TRIGGER trg_auto_derive_trust_badge
  BEFORE INSERT OR UPDATE OF data_confidence ON movies
  FOR EACH ROW
  EXECUTE FUNCTION auto_derive_trust_badge();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_movies_data_confidence 
  ON movies(data_confidence DESC) WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_movies_trust_badge 
  ON movies(trust_badge) WHERE is_published = true;

-- ============================================================
-- VIEWS
-- ============================================================

-- View: Movies requiring data improvement
CREATE OR REPLACE VIEW movies_needing_trust_improvement AS
SELECT 
  id,
  slug,
  title_en,
  release_year,
  data_confidence,
  trust_badge,
  confidence_breakdown->>'field_completeness' as completeness,
  confidence_breakdown->>'source_count' as sources
FROM movies
WHERE is_published = true 
  AND (data_confidence < 0.5 OR data_confidence IS NULL)
ORDER BY 
  CASE WHEN release_year >= 2020 THEN 0 ELSE 1 END,
  data_confidence ASC NULLS FIRST;

-- View: Trust statistics
CREATE OR REPLACE VIEW trust_statistics AS
SELECT 
  trust_badge,
  COUNT(*) as movie_count,
  AVG(data_confidence) as avg_confidence,
  AVG((confidence_breakdown->>'field_completeness')::DECIMAL) as avg_completeness
FROM movies
WHERE is_published = true
GROUP BY trust_badge
ORDER BY 
  CASE trust_badge
    WHEN 'verified' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
    WHEN 'unverified' THEN 5
  END;

-- ============================================================
-- BACKFILL
-- ============================================================

-- Set default trust badge for existing movies based on available data
UPDATE movies 
SET trust_badge = 'medium'
WHERE trust_badge IS NULL AND is_published = true;


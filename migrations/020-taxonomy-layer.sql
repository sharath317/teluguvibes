-- ============================================================
-- MIGRATION 020: Taxonomy and Categorization Layer
-- ============================================================
-- This migration adds semantic and content-aware classification
-- for SEO, discovery, and safe content separation.
-- ============================================================

-- Content type separation (CRITICAL for trust and safe speculation)
-- This separates factual content from speculative/editorial content
ALTER TABLE movies ADD COLUMN IF NOT EXISTS content_type TEXT 
  CHECK (content_type IN (
    'fact',           -- Verified factual content
    'archive',        -- Historical/archival content
    'opinion',        -- Editorial opinions
    'speculative',    -- What-if scenarios (clearly labeled)
    'editorial',      -- AI-assisted/curated content
    'kids'            -- Children's content
  )) DEFAULT 'fact';

COMMENT ON COLUMN movies.content_type IS 
  'Content classification for safe speculation boundaries. Prevents mixing factual and speculative content.';

-- Primary genre (single main genre for categorization)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS primary_genre TEXT;

COMMENT ON COLUMN movies.primary_genre IS 
  'Primary genre for categorization and SEO. Derived from genres array.';

-- Secondary genres (additional classification)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS secondary_genres TEXT[];

COMMENT ON COLUMN movies.secondary_genres IS 
  'Additional genres beyond primary for multi-genre films.';

-- Era classification (decade/period grouping)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS era TEXT CHECK (era IN (
  'pre-independence',   -- Before 1947
  'golden-age',         -- 1950s-1970s
  'classic',            -- 1980s-1990s
  'modern',             -- 2000s-2010s
  'new-wave',           -- 2015-2020
  'current'             -- 2020+
));

COMMENT ON COLUMN movies.era IS 
  'Era classification for decade/period-based collections and filtering.';

-- Tone classification (mass vs class spectrum)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS tone TEXT CHECK (tone IN (
  'mass',               -- Commercial mass entertainer
  'class',              -- Refined/subtle storytelling
  'family',             -- Family-friendly content
  'art',                -- Art house / parallel cinema
  'experimental'        -- Experimental / avant-garde
));

COMMENT ON COLUMN movies.tone IS 
  'Tone classification for audience targeting (Mass vs Class spectrum).';

-- Style classification (filmmaking approach)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS style TEXT CHECK (style IN (
  'commercial',         -- Standard commercial format
  'parallel',           -- Parallel cinema
  'realistic',          -- Realistic/documentary style
  'masala',             -- Multi-genre masala entertainer
  'neo-noir'            -- Modern noir style
));

COMMENT ON COLUMN movies.style IS 
  'Filmmaking style classification for curation and discovery.';

-- ============================================================
-- INDEXES FOR EFFICIENT FILTERING
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_movies_content_type 
  ON movies(content_type) WHERE content_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movies_primary_genre 
  ON movies(primary_genre) WHERE primary_genre IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movies_era 
  ON movies(era) WHERE era IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movies_tone 
  ON movies(tone) WHERE tone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movies_style 
  ON movies(style) WHERE style IS NOT NULL;

-- Composite index for common filtering combinations
CREATE INDEX IF NOT EXISTS idx_movies_taxonomy_combo 
  ON movies(language, era, tone, content_type) 
  WHERE is_published = true;

-- ============================================================
-- FUNCTIONS FOR TAXONOMY DERIVATION
-- ============================================================

-- Derive era from release year
CREATE OR REPLACE FUNCTION derive_movie_era(release_year INTEGER) 
RETURNS TEXT AS $$
BEGIN
  IF release_year IS NULL THEN
    RETURN NULL;
  END IF;
  
  IF release_year < 1947 THEN
    RETURN 'pre-independence';
  ELSIF release_year <= 1979 THEN
    RETURN 'golden-age';
  ELSIF release_year <= 1999 THEN
    RETURN 'classic';
  ELSIF release_year <= 2014 THEN
    RETURN 'modern';
  ELSIF release_year <= 2020 THEN
    RETURN 'new-wave';
  ELSE
    RETURN 'current';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Derive primary genre from genres array
CREATE OR REPLACE FUNCTION derive_primary_genre(genres TEXT[]) 
RETURNS TEXT AS $$
DECLARE
  priority_genres TEXT[] := ARRAY['Action', 'Drama', 'Comedy', 'Romance', 'Thriller', 'Horror', 'Family', 'Adventure'];
  g TEXT;
BEGIN
  IF genres IS NULL OR array_length(genres, 1) = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Return first matching priority genre
  FOREACH g IN ARRAY priority_genres
  LOOP
    IF g = ANY(genres) THEN
      RETURN g;
    END IF;
  END LOOP;
  
  -- Return first genre if no priority match
  RETURN genres[1];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Auto-derive taxonomy fields on insert/update
CREATE OR REPLACE FUNCTION auto_derive_taxonomy() 
RETURNS TRIGGER AS $$
BEGIN
  -- Derive era if not set
  IF NEW.era IS NULL AND NEW.release_year IS NOT NULL THEN
    NEW.era := derive_movie_era(NEW.release_year);
  END IF;
  
  -- Derive primary_genre if not set
  IF NEW.primary_genre IS NULL AND NEW.genres IS NOT NULL THEN
    NEW.primary_genre := derive_primary_genre(NEW.genres);
  END IF;
  
  -- Derive secondary_genres (all except primary)
  IF NEW.secondary_genres IS NULL AND NEW.genres IS NOT NULL AND NEW.primary_genre IS NOT NULL THEN
    NEW.secondary_genres := array_remove(NEW.genres, NEW.primary_genre);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-derivation
DROP TRIGGER IF EXISTS trg_auto_derive_taxonomy ON movies;
CREATE TRIGGER trg_auto_derive_taxonomy
  BEFORE INSERT OR UPDATE ON movies
  FOR EACH ROW
  EXECUTE FUNCTION auto_derive_taxonomy();

-- ============================================================
-- VIEWS FOR TAXONOMY-BASED DISCOVERY
-- ============================================================

-- View: Movies by era with statistics
CREATE OR REPLACE VIEW movies_by_era AS
SELECT 
  era,
  COUNT(*) as movie_count,
  AVG(avg_rating) as avg_rating,
  COUNT(*) FILTER (WHERE is_blockbuster = true) as blockbusters,
  COUNT(*) FILTER (WHERE is_classic = true) as classics
FROM movies
WHERE is_published = true AND era IS NOT NULL
GROUP BY era
ORDER BY 
  CASE era
    WHEN 'current' THEN 1
    WHEN 'new-wave' THEN 2
    WHEN 'modern' THEN 3
    WHEN 'classic' THEN 4
    WHEN 'golden-age' THEN 5
    WHEN 'pre-independence' THEN 6
  END;

-- View: Speculative vs factual content summary
CREATE OR REPLACE VIEW content_type_summary AS
SELECT 
  content_type,
  COUNT(*) as count,
  AVG(avg_rating) as avg_rating
FROM movies
WHERE is_published = true
GROUP BY content_type;

-- ============================================================
-- BACKFILL EXISTING DATA
-- ============================================================

-- Backfill era for existing movies
UPDATE movies 
SET era = derive_movie_era(release_year)
WHERE era IS NULL AND release_year IS NOT NULL;

-- Backfill primary_genre for existing movies
UPDATE movies 
SET primary_genre = derive_primary_genre(genres)
WHERE primary_genre IS NULL AND genres IS NOT NULL;

-- Set default content_type for existing movies
UPDATE movies 
SET content_type = 'fact'
WHERE content_type IS NULL;


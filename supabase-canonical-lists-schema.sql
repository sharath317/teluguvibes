-- ============================================================
-- CANONICAL LISTS SCHEMA
-- Auto-generated "Best Of" lists with versioning
-- ============================================================

-- 1. Main canonical_lists table
CREATE TABLE IF NOT EXISTS canonical_lists (
  id TEXT PRIMARY KEY,
  
  -- List identification
  list_type TEXT NOT NULL CHECK (list_type IN (
    'best_of_year',
    'top_by_director',
    'top_by_actor',
    'genre_essentials',
    'decade_classics',
    'blockbusters',
    'underrated_gems',
    'cult_classics',
    'critic_favorites',
    'audience_favorites',
    'debut_directors',
    'music_highlights',
    'cinematography_showcase'
  )),
  parameter TEXT DEFAULT '',
  
  -- Titles and descriptions (bilingual)
  title_en TEXT NOT NULL,
  title_te TEXT NOT NULL,
  description_en TEXT,
  description_te TEXT,
  
  -- Movies (stored as JSONB array)
  movies JSONB NOT NULL DEFAULT '[]',
  
  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Ensure unique active list per type+parameter
  CONSTRAINT unique_active_list UNIQUE (list_type, parameter, is_active) 
    DEFERRABLE INITIALLY DEFERRED
);

-- 2. Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_canonical_lists_type 
ON canonical_lists (list_type);

CREATE INDEX IF NOT EXISTS idx_canonical_lists_active 
ON canonical_lists (is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_canonical_lists_type_param 
ON canonical_lists (list_type, parameter);

CREATE INDEX IF NOT EXISTS idx_canonical_lists_generated 
ON canonical_lists (generated_at DESC);

-- 3. GIN index for movie searches within lists
CREATE INDEX IF NOT EXISTS idx_canonical_lists_movies 
ON canonical_lists USING GIN (movies);

-- 4. View for active lists only
CREATE OR REPLACE VIEW active_canonical_lists AS
SELECT 
  id,
  list_type,
  parameter,
  title_en,
  title_te,
  description_en,
  description_te,
  movies,
  version,
  generated_at,
  metadata
FROM canonical_lists
WHERE is_active = true;

-- 5. Function to get list by type and parameter
CREATE OR REPLACE FUNCTION get_canonical_list(
  p_list_type TEXT,
  p_parameter TEXT DEFAULT ''
)
RETURNS TABLE (
  id TEXT,
  title_en TEXT,
  title_te TEXT,
  movies JSONB,
  version INTEGER,
  generated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id,
    cl.title_en,
    cl.title_te,
    cl.movies,
    cl.version,
    cl.generated_at
  FROM canonical_lists cl
  WHERE cl.list_type = p_list_type
    AND cl.parameter = p_parameter
    AND cl.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to get all lists of a type
CREATE OR REPLACE FUNCTION get_lists_by_type(p_list_type TEXT)
RETURNS TABLE (
  id TEXT,
  parameter TEXT,
  title_en TEXT,
  title_te TEXT,
  movie_count INTEGER,
  generated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id,
    cl.parameter,
    cl.title_en,
    cl.title_te,
    jsonb_array_length(cl.movies) AS movie_count,
    cl.generated_at
  FROM canonical_lists cl
  WHERE cl.list_type = p_list_type
    AND cl.is_active = true
  ORDER BY cl.generated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to search movies across all lists
CREATE OR REPLACE FUNCTION search_movie_in_lists(p_movie_id TEXT)
RETURNS TABLE (
  list_id TEXT,
  list_type TEXT,
  title_en TEXT,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id AS list_id,
    cl.list_type,
    cl.title_en,
    (movie->>'rank')::INTEGER AS rank
  FROM canonical_lists cl,
       jsonb_array_elements(cl.movies) AS movie
  WHERE cl.is_active = true
    AND movie->>'id' = p_movie_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Stats table for list performance tracking
CREATE TABLE IF NOT EXISTS canonical_list_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id TEXT REFERENCES canonical_lists(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  avg_time_on_page DECIMAL(6,2),
  UNIQUE (list_id, date)
);

CREATE INDEX IF NOT EXISTS idx_list_stats_list_date 
ON canonical_list_stats (list_id, date DESC);


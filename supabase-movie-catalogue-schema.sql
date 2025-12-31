-- ============================================================
-- TELUGU MOVIE CATALOGUE SCHEMA
-- Complete Telugu Cinema Database from 1931 to Present
-- Sources: Wikidata (historic) + TMDB (modern)
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For fuzzy text search

-- ============================================================
-- 1. ENHANCED MOVIES TABLE
-- ============================================================
-- Drop and recreate with full structure
-- (Run ALTER TABLE statements if table exists)

CREATE TABLE IF NOT EXISTS catalogue_movies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- ==================
  -- IDENTITY
  -- ==================
  title_en TEXT NOT NULL,                    -- English title
  title_te TEXT,                             -- Telugu title (తెలుగు)
  title_original TEXT,                       -- Original title as released
  slug TEXT UNIQUE NOT NULL,
  aliases TEXT[] DEFAULT '{}',               -- Alternative names/spellings

  -- ==================
  -- EXTERNAL IDs (for deduplication)
  -- ==================
  wikidata_id VARCHAR(20) UNIQUE,            -- Q12345 format
  tmdb_id INTEGER UNIQUE,
  imdb_id VARCHAR(20),

  -- ==================
  -- RELEASE INFO
  -- ==================
  release_date DATE,
  release_year INTEGER NOT NULL,
  release_month INTEGER,                     -- For month queries
  release_decade VARCHAR(10),                -- 1930s, 1940s, etc.
  era VARCHAR(50),                           -- golden_age, classic, modern, etc.

  -- ==================
  -- TECHNICAL
  -- ==================
  runtime_minutes INTEGER,
  language TEXT DEFAULT 'Telugu',
  languages TEXT[] DEFAULT '{Telugu}',       -- For multilingual films
  country TEXT DEFAULT 'India',
  certification TEXT,                        -- U, A, UA, etc.
  color_type VARCHAR(20) DEFAULT 'color',    -- color, black_and_white
  aspect_ratio VARCHAR(20),

  -- ==================
  -- CLASSIFICATION
  -- ==================
  genres TEXT[] DEFAULT '{}',
  themes TEXT[] DEFAULT '{}',                -- mythology, patriotism, romance
  mood TEXT[] DEFAULT '{}',                  -- comedy, action, emotional
  film_type VARCHAR(50) DEFAULT 'feature',   -- feature, short, documentary
  is_remake BOOLEAN DEFAULT false,
  remake_of_movie_id UUID,
  original_language TEXT,                    -- If remake, original language

  -- ==================
  -- MEDIA (TMDB Priority)
  -- ==================
  poster_url TEXT,
  poster_source VARCHAR(50) DEFAULT 'tmdb',
  backdrop_url TEXT,
  trailer_url TEXT,
  trailer_youtube_id VARCHAR(20),
  gallery_urls TEXT[] DEFAULT '{}',

  -- ==================
  -- STORY
  -- ==================
  synopsis TEXT,
  synopsis_te TEXT,
  tagline TEXT,
  tagline_te TEXT,
  plot_keywords TEXT[] DEFAULT '{}',

  -- ==================
  -- CREW (Normalized later, stored for quick access)
  -- ==================
  director_names TEXT[] DEFAULT '{}',
  producer_names TEXT[] DEFAULT '{}',
  music_director_names TEXT[] DEFAULT '{}',
  cinematographer_name TEXT,
  editor_name TEXT,
  writer_names TEXT[] DEFAULT '{}',
  lyricist_names TEXT[] DEFAULT '{}',
  choreographer_names TEXT[] DEFAULT '{}',

  -- ==================
  -- CAST (Quick access, normalized in credits)
  -- ==================
  hero_names TEXT[] DEFAULT '{}',
  heroine_names TEXT[] DEFAULT '{}',
  villain_names TEXT[] DEFAULT '{}',
  comedian_names TEXT[] DEFAULT '{}',
  cast_summary JSONB DEFAULT '[]',           -- [{name, character, order}]

  -- ==================
  -- BOX OFFICE (in INR Crores where available)
  -- ==================
  budget_inr_crores DECIMAL(10,2),
  budget_usd DECIMAL(15,2),
  worldwide_gross_inr_crores DECIMAL(10,2),
  india_gross_inr_crores DECIMAL(10,2),
  overseas_gross_inr_crores DECIMAL(10,2),
  first_day_gross_inr_crores DECIMAL(10,2),
  first_week_gross_inr_crores DECIMAL(10,2),
  opening_weekend_gross_inr_crores DECIMAL(10,2),
  nizam_gross_inr_crores DECIMAL(10,2),      -- Nizam region
  ceeded_gross_inr_crores DECIMAL(10,2),     -- Ceeded region
  ap_gross_inr_crores DECIMAL(10,2),         -- Andhra Pradesh
  ts_gross_inr_crores DECIMAL(10,2),         -- Telangana
  recovery_percentage DECIMAL(5,2),          -- Budget recovery %

  -- ==================
  -- VERDICT & PERFORMANCE
  -- ==================
  verdict VARCHAR(50) CHECK (verdict IN (
    'all_time_blockbuster',   -- 4x+ budget
    'blockbuster',            -- 3x budget
    'super_hit',              -- 2x budget
    'hit',                    -- 1.5x budget
    'above_average',          -- 1.25x budget
    'average',                -- Break-even
    'below_average',          -- 0.75x budget
    'flop',                   -- 0.5x budget
    'disaster',               -- <0.5x budget
    'unreleased',             -- Never released
    'limited_release',        -- Limited theatrical
    'direct_to_ott',          -- No theatrical
    'unknown'                 -- No data
  )),
  verdict_source TEXT,                       -- Trade analysts, etc.
  verdict_notes TEXT,

  -- ==================
  -- RATINGS
  -- ==================
  tmdb_rating DECIMAL(3,1),
  tmdb_vote_count INTEGER DEFAULT 0,
  imdb_rating DECIMAL(3,1),
  imdb_vote_count INTEGER DEFAULT 0,
  rotten_tomatoes_score INTEGER,
  our_rating DECIMAL(3,1),
  audience_rating DECIMAL(3,1),
  critic_rating DECIMAL(3,1),
  total_reviews_count INTEGER DEFAULT 0,

  -- ==================
  -- TAGS & FLAGS
  -- ==================
  is_classic BOOLEAN DEFAULT false,          -- Widely regarded as classic
  is_cult BOOLEAN DEFAULT false,             -- Cult following
  is_underrated BOOLEAN DEFAULT false,       -- Critical acclaim but flopped
  is_milestone BOOLEAN DEFAULT false,        -- Industry milestone
  is_pan_india BOOLEAN DEFAULT false,        -- Pan-India release
  is_franchise BOOLEAN DEFAULT false,        -- Part of franchise
  franchise_name TEXT,
  franchise_order INTEGER,
  is_biopic BOOLEAN DEFAULT false,
  biopic_subject TEXT,
  is_based_on_true_story BOOLEAN DEFAULT false,
  is_sequel BOOLEAN DEFAULT false,
  sequel_of_movie_id UUID,

  -- ==================
  -- OTT & STREAMING
  -- ==================
  ott_platforms TEXT[] DEFAULT '{}',         -- Netflix, Prime, etc.
  ott_release_date DATE,
  ott_exclusive BOOLEAN DEFAULT false,
  streaming_urls JSONB DEFAULT '{}',         -- {platform: url}

  -- ==================
  -- AWARDS
  -- ==================
  nandi_awards_count INTEGER DEFAULT 0,
  filmfare_awards_count INTEGER DEFAULT 0,
  national_awards_count INTEGER DEFAULT 0,
  other_awards_count INTEGER DEFAULT 0,
  awards_summary JSONB DEFAULT '[]',         -- [{award, category, year}]

  -- ==================
  -- MUSIC
  -- ==================
  songs_count INTEGER,
  notable_songs TEXT[] DEFAULT '{}',
  audio_company TEXT,
  audio_release_date DATE,

  -- ==================
  -- PRODUCTION
  -- ==================
  production_companies TEXT[] DEFAULT '{}',
  distribution_companies TEXT[] DEFAULT '{}',
  studios TEXT[] DEFAULT '{}',
  shooting_locations TEXT[] DEFAULT '{}',

  -- ==================
  -- META & SOURCE TRACKING
  -- ==================
  source VARCHAR(50) NOT NULL DEFAULT 'manual',  -- wikidata, tmdb, manual
  source_refs JSONB DEFAULT '[]',
  raw_wikidata JSONB,
  raw_tmdb JSONB,
  data_quality_score DECIMAL(3,2) DEFAULT 0,     -- 0-1 completeness
  last_synced_at TIMESTAMPTZ,

  -- ==================
  -- POPULARITY & STATS
  -- ==================
  popularity_score DECIMAL(10,2) DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  search_count INTEGER DEFAULT 0,

  -- ==================
  -- STATUS
  -- ==================
  is_published BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  needs_review BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. MOVIE CREDITS TABLE (Actor-Movie Links)
-- ============================================================
CREATE TABLE IF NOT EXISTS movie_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  movie_id UUID NOT NULL REFERENCES catalogue_movies(id) ON DELETE CASCADE,
  person_id UUID REFERENCES kg_persons(id) ON DELETE SET NULL,

  -- Credit details
  credit_type VARCHAR(50) NOT NULL,          -- cast, director, producer, music, etc.
  role_category VARCHAR(50),                 -- lead, supporting, cameo, guest, voice
  character_name TEXT,
  character_name_te TEXT,
  billing_order INTEGER,

  -- Person details (denormalized for quick access)
  person_name_en TEXT NOT NULL,
  person_name_te TEXT,
  person_image_url TEXT,

  -- External IDs
  wikidata_person_id VARCHAR(20),
  tmdb_person_id INTEGER,
  tmdb_credit_id VARCHAR(50),

  -- Additional info
  screen_time_minutes INTEGER,
  notes TEXT,
  is_debut BOOLEAN DEFAULT false,

  -- Source
  source VARCHAR(50) DEFAULT 'tmdb',

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(movie_id, person_name_en, credit_type, character_name)
);

-- ============================================================
-- 3. BOX OFFICE COLLECTIONS TABLE (Detailed tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS movie_box_office (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  movie_id UUID NOT NULL REFERENCES catalogue_movies(id) ON DELETE CASCADE,

  -- Time period
  collection_date DATE,
  day_number INTEGER,                        -- Day 1, Day 2, etc.
  week_number INTEGER,
  collection_type VARCHAR(50),               -- daily, weekly, weekend, total

  -- Collections (in INR Crores)
  india_gross DECIMAL(10,2),
  overseas_gross DECIMAL(10,2),
  worldwide_gross DECIMAL(10,2),

  -- Regional breakdown
  nizam_gross DECIMAL(10,2),
  ceeded_gross DECIMAL(10,2),
  ua_gross DECIMAL(10,2),
  east_godavari_gross DECIMAL(10,2),
  west_godavari_gross DECIMAL(10,2),
  guntur_gross DECIMAL(10,2),
  krishna_gross DECIMAL(10,2),
  nellore_gross DECIMAL(10,2),

  -- North India
  hindi_belt_gross DECIMAL(10,2),

  -- Source
  source_name TEXT,
  source_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(movie_id, collection_date, collection_type)
);

-- ============================================================
-- 4. MOVIE AWARDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS movie_awards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  movie_id UUID NOT NULL REFERENCES catalogue_movies(id) ON DELETE CASCADE,
  person_id UUID REFERENCES kg_persons(id),

  award_name TEXT NOT NULL,                  -- Nandi, Filmfare, National
  award_category TEXT,                       -- Best Actor, Best Film, etc.
  award_year INTEGER NOT NULL,

  recipient_name TEXT,                       -- Person or film
  is_winner BOOLEAN DEFAULT true,

  source VARCHAR(50),
  wikidata_id VARCHAR(20),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(movie_id, award_name, award_category, award_year)
);

-- ============================================================
-- 5. MOVIE REMAKES TABLE (Track originals and remakes)
-- ============================================================
CREATE TABLE IF NOT EXISTS movie_remakes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  original_movie_id UUID REFERENCES catalogue_movies(id),
  remake_movie_id UUID REFERENCES catalogue_movies(id),

  original_language TEXT,
  remake_language TEXT DEFAULT 'Telugu',
  relationship_type VARCHAR(50) DEFAULT 'remake',  -- remake, sequel, prequel, spinoff

  notes TEXT,
  source VARCHAR(50),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(original_movie_id, remake_movie_id)
);

-- ============================================================
-- 6. DECADE/ERA STATISTICS (Materialized for performance)
-- ============================================================
CREATE TABLE IF NOT EXISTS movie_era_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  era VARCHAR(20) NOT NULL,                  -- 1930s, 1940s, etc.
  stat_year INTEGER,                         -- Specific year if applicable

  -- Counts
  total_movies INTEGER DEFAULT 0,
  hit_movies INTEGER DEFAULT 0,
  flop_movies INTEGER DEFAULT 0,
  blockbuster_movies INTEGER DEFAULT 0,
  classic_movies INTEGER DEFAULT 0,

  -- Top performers
  top_actor_name TEXT,
  top_actor_movies INTEGER,
  top_actor_hits INTEGER,
  top_actress_name TEXT,
  top_actress_movies INTEGER,
  top_director_name TEXT,
  top_director_movies INTEGER,
  top_director_hits INTEGER,

  -- Highest grosser
  highest_grosser_id UUID,
  highest_grosser_name TEXT,
  highest_gross_inr_crores DECIMAL(10,2),

  -- Genre trends
  genre_distribution JSONB DEFAULT '{}',

  -- Ratings
  avg_tmdb_rating DECIMAL(3,1),
  avg_imdb_rating DECIMAL(3,1),

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(era, stat_year)
);

-- ============================================================
-- 7. ACTOR HIT RATIO TABLE (Precomputed stats)
-- ============================================================
CREATE TABLE IF NOT EXISTS actor_performance_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  person_id UUID REFERENCES kg_persons(id) ON DELETE CASCADE,
  person_name_en TEXT NOT NULL,
  person_name_te TEXT,

  -- Career span
  debut_year INTEGER,
  latest_year INTEGER,
  active_years INTEGER,
  era VARCHAR(20),

  -- Movie counts
  total_movies INTEGER DEFAULT 0,
  as_lead INTEGER DEFAULT 0,
  as_supporting INTEGER DEFAULT 0,
  as_cameo INTEGER DEFAULT 0,

  -- Verdicts
  all_time_blockbusters INTEGER DEFAULT 0,
  blockbusters INTEGER DEFAULT 0,
  super_hits INTEGER DEFAULT 0,
  hits INTEGER DEFAULT 0,
  average INTEGER DEFAULT 0,
  flops INTEGER DEFAULT 0,

  -- Ratios
  hit_ratio DECIMAL(5,2),                    -- (hits+superhits+BB+ATB) / total * 100
  blockbuster_ratio DECIMAL(5,2),            -- (BB+ATB) / total * 100
  success_rate DECIMAL(5,2),                 -- Average+ / total * 100

  -- Box Office totals
  total_worldwide_gross_inr_crores DECIMAL(15,2),
  highest_grosser_name TEXT,
  highest_gross_inr_crores DECIMAL(10,2),

  -- Genres worked
  primary_genres TEXT[] DEFAULT '{}',

  -- Top collaborators
  frequent_directors TEXT[] DEFAULT '{}',
  frequent_costars TEXT[] DEFAULT '{}',

  -- Ratings
  avg_movie_rating DECIMAL(3,1),

  -- Period stats (decade-wise)
  decade_stats JSONB DEFAULT '{}',

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(person_id)
);

-- ============================================================
-- 8. MOVIE INGESTION LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS movie_ingestion_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  source VARCHAR(50) NOT NULL,               -- wikidata, tmdb, manual
  ingestion_type VARCHAR(50),                -- full, incremental, decade
  decade VARCHAR(10),                        -- If decade-specific

  total_fetched INTEGER DEFAULT 0,
  total_inserted INTEGER DEFAULT 0,
  total_updated INTEGER DEFAULT 0,
  total_duplicates INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,

  movies_processed TEXT[] DEFAULT '{}',
  error_details JSONB DEFAULT '[]',

  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'running'
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Movies
CREATE INDEX IF NOT EXISTS idx_catalogue_movies_year ON catalogue_movies(release_year);
CREATE INDEX IF NOT EXISTS idx_catalogue_movies_decade ON catalogue_movies(release_decade);
CREATE INDEX IF NOT EXISTS idx_catalogue_movies_era ON catalogue_movies(era);
CREATE INDEX IF NOT EXISTS idx_catalogue_movies_verdict ON catalogue_movies(verdict);
CREATE INDEX IF NOT EXISTS idx_catalogue_movies_genres ON catalogue_movies USING GIN(genres);
CREATE INDEX IF NOT EXISTS idx_catalogue_movies_director ON catalogue_movies USING GIN(director_names);
CREATE INDEX IF NOT EXISTS idx_catalogue_movies_hero ON catalogue_movies USING GIN(hero_names);
CREATE INDEX IF NOT EXISTS idx_catalogue_movies_wikidata ON catalogue_movies(wikidata_id);
CREATE INDEX IF NOT EXISTS idx_catalogue_movies_tmdb ON catalogue_movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_catalogue_movies_title_trgm ON catalogue_movies USING GIN(title_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_catalogue_movies_popularity ON catalogue_movies(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_catalogue_movies_rating ON catalogue_movies(tmdb_rating DESC);

-- Credits
CREATE INDEX IF NOT EXISTS idx_movie_credits_movie ON movie_credits(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_credits_person ON movie_credits(person_id);
CREATE INDEX IF NOT EXISTS idx_movie_credits_type ON movie_credits(credit_type);
CREATE INDEX IF NOT EXISTS idx_movie_credits_name ON movie_credits(person_name_en);

-- Box Office
CREATE INDEX IF NOT EXISTS idx_movie_box_office_movie ON movie_box_office(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_box_office_date ON movie_box_office(collection_date);

-- Actor Stats
CREATE INDEX IF NOT EXISTS idx_actor_stats_person ON actor_performance_stats(person_id);
CREATE INDEX IF NOT EXISTS idx_actor_stats_hit_ratio ON actor_performance_stats(hit_ratio DESC);
CREATE INDEX IF NOT EXISTS idx_actor_stats_total ON actor_performance_stats(total_worldwide_gross_inr_crores DESC);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function: Calculate decade from year
CREATE OR REPLACE FUNCTION calculate_decade(year INTEGER)
RETURNS VARCHAR(10) AS $$
BEGIN
  IF year IS NULL THEN RETURN NULL; END IF;
  RETURN (FLOOR(year / 10) * 10)::TEXT || 's';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Calculate era from year
CREATE OR REPLACE FUNCTION calculate_movie_era(year INTEGER)
RETURNS VARCHAR(50) AS $$
BEGIN
  IF year IS NULL THEN RETURN NULL; END IF;
  IF year < 1940 THEN RETURN 'birth_of_talkies'; END IF;       -- 1931-1939
  IF year < 1950 THEN RETURN 'early_growth'; END IF;           -- 1940-1949
  IF year < 1960 THEN RETURN 'golden_age_dawn'; END IF;        -- 1950-1959
  IF year < 1970 THEN RETURN 'golden_age_peak'; END IF;        -- 1960-1969
  IF year < 1980 THEN RETURN 'transition'; END IF;             -- 1970-1979
  IF year < 1990 THEN RETURN 'mass_masala'; END IF;            -- 1980-1989
  IF year < 2000 THEN RETURN 'commercial_peak'; END IF;        -- 1990-1999
  IF year < 2010 THEN RETURN 'new_millennium'; END IF;         -- 2000-2009
  IF year < 2020 THEN RETURN 'pan_india_rise'; END IF;         -- 2010-2019
  RETURN 'pan_india_dominance';                                 -- 2020+
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Calculate movie data quality score
CREATE OR REPLACE FUNCTION calculate_movie_quality_score(movie catalogue_movies)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  score DECIMAL(3,2) := 0;
BEGIN
  -- Title (10 points)
  IF movie.title_en IS NOT NULL THEN score := score + 0.05; END IF;
  IF movie.title_te IS NOT NULL THEN score := score + 0.05; END IF;

  -- Release info (15 points)
  IF movie.release_year IS NOT NULL THEN score := score + 0.1; END IF;
  IF movie.release_date IS NOT NULL THEN score := score + 0.05; END IF;

  -- Crew (20 points)
  IF array_length(movie.director_names, 1) > 0 THEN score := score + 0.1; END IF;
  IF array_length(movie.hero_names, 1) > 0 THEN score := score + 0.05; END IF;
  IF array_length(movie.music_director_names, 1) > 0 THEN score := score + 0.05; END IF;

  -- Media (15 points)
  IF movie.poster_url IS NOT NULL THEN score := score + 0.1; END IF;
  IF movie.synopsis IS NOT NULL THEN score := score + 0.05; END IF;

  -- Box office (15 points)
  IF movie.verdict IS NOT NULL AND movie.verdict != 'unknown' THEN score := score + 0.1; END IF;
  IF movie.worldwide_gross_inr_crores IS NOT NULL THEN score := score + 0.05; END IF;

  -- External IDs (15 points)
  IF movie.tmdb_id IS NOT NULL THEN score := score + 0.05; END IF;
  IF movie.wikidata_id IS NOT NULL THEN score := score + 0.05; END IF;
  IF movie.imdb_id IS NOT NULL THEN score := score + 0.05; END IF;

  -- Ratings (10 points)
  IF movie.tmdb_rating IS NOT NULL THEN score := score + 0.05; END IF;
  IF movie.imdb_rating IS NOT NULL THEN score := score + 0.05; END IF;

  RETURN score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Generate slug from title
CREATE OR REPLACE FUNCTION generate_movie_slug(title TEXT, year INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(title, '[^a-zA-Z0-9\s]', '', 'g'))
         || '-'
         || COALESCE(year::TEXT, 'unknown');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger: Auto-update movie metadata
CREATE OR REPLACE FUNCTION update_movie_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Set decade and era
  NEW.release_decade := calculate_decade(NEW.release_year);
  NEW.era := calculate_movie_era(NEW.release_year);

  -- Set month if date available
  IF NEW.release_date IS NOT NULL THEN
    NEW.release_month := EXTRACT(MONTH FROM NEW.release_date);
  END IF;

  -- Generate slug if empty
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_movie_slug(NEW.title_en, NEW.release_year);
  END IF;

  -- Update timestamp
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_movie_metadata ON catalogue_movies;
CREATE TRIGGER trigger_update_movie_metadata
  BEFORE INSERT OR UPDATE ON catalogue_movies
  FOR EACH ROW
  EXECUTE FUNCTION update_movie_metadata();

-- ============================================================
-- VIEWS
-- ============================================================

-- View: Top movies per year
CREATE OR REPLACE VIEW v_top_movies_by_year AS
SELECT
  release_year,
  title_en,
  title_te,
  director_names[1] as director,
  hero_names[1] as hero,
  verdict,
  worldwide_gross_inr_crores,
  tmdb_rating,
  ROW_NUMBER() OVER (PARTITION BY release_year ORDER BY
    CASE verdict
      WHEN 'all_time_blockbuster' THEN 1
      WHEN 'blockbuster' THEN 2
      WHEN 'super_hit' THEN 3
      WHEN 'hit' THEN 4
      ELSE 5
    END,
    worldwide_gross_inr_crores DESC NULLS LAST,
    tmdb_rating DESC NULLS LAST
  ) as rank_in_year
FROM catalogue_movies
WHERE is_published = true
ORDER BY release_year DESC, rank_in_year;

-- View: Era-wise movie performance
CREATE OR REPLACE VIEW v_era_performance AS
SELECT
  era,
  release_decade,
  COUNT(*) as total_movies,
  COUNT(*) FILTER (WHERE verdict IN ('all_time_blockbuster', 'blockbuster', 'super_hit', 'hit')) as hits,
  COUNT(*) FILTER (WHERE verdict IN ('flop', 'disaster')) as flops,
  ROUND(
    COUNT(*) FILTER (WHERE verdict IN ('all_time_blockbuster', 'blockbuster', 'super_hit', 'hit'))::DECIMAL /
    NULLIF(COUNT(*), 0) * 100, 2
  ) as hit_ratio_percent,
  ROUND(AVG(tmdb_rating), 2) as avg_rating,
  ROUND(SUM(worldwide_gross_inr_crores), 2) as total_gross_crores
FROM catalogue_movies
WHERE release_year IS NOT NULL
GROUP BY era, release_decade
ORDER BY release_decade;

-- View: Actor hit ratios (denormalized for quick access)
CREATE OR REPLACE VIEW v_actor_hit_ratios AS
SELECT
  mc.person_name_en,
  mc.person_name_te,
  mc.person_id,
  COUNT(DISTINCT mc.movie_id) as total_movies,
  COUNT(DISTINCT mc.movie_id) FILTER (WHERE cm.verdict IN ('all_time_blockbuster', 'blockbuster', 'super_hit', 'hit')) as hits,
  COUNT(DISTINCT mc.movie_id) FILTER (WHERE cm.verdict IN ('flop', 'disaster')) as flops,
  ROUND(
    COUNT(DISTINCT mc.movie_id) FILTER (WHERE cm.verdict IN ('all_time_blockbuster', 'blockbuster', 'super_hit', 'hit'))::DECIMAL /
    NULLIF(COUNT(DISTINCT mc.movie_id), 0) * 100, 2
  ) as hit_ratio,
  MIN(cm.release_year) as debut_year,
  MAX(cm.release_year) as latest_year,
  ROUND(SUM(cm.worldwide_gross_inr_crores), 2) as total_gross_crores
FROM movie_credits mc
JOIN catalogue_movies cm ON mc.movie_id = cm.id
WHERE mc.credit_type = 'cast'
  AND mc.role_category IN ('lead', 'hero', 'heroine')
GROUP BY mc.person_name_en, mc.person_name_te, mc.person_id
HAVING COUNT(DISTINCT mc.movie_id) >= 3  -- At least 3 movies
ORDER BY hit_ratio DESC, total_movies DESC;

-- View: Director statistics
CREATE OR REPLACE VIEW v_director_stats AS
SELECT
  mc.person_name_en as director_name,
  mc.person_name_te as director_name_te,
  mc.person_id,
  COUNT(DISTINCT mc.movie_id) as total_movies,
  COUNT(DISTINCT mc.movie_id) FILTER (WHERE cm.verdict IN ('all_time_blockbuster', 'blockbuster', 'super_hit', 'hit')) as hits,
  ROUND(
    COUNT(DISTINCT mc.movie_id) FILTER (WHERE cm.verdict IN ('all_time_blockbuster', 'blockbuster', 'super_hit', 'hit'))::DECIMAL /
    NULLIF(COUNT(DISTINCT mc.movie_id), 0) * 100, 2
  ) as hit_ratio,
  ROUND(AVG(cm.tmdb_rating), 2) as avg_rating,
  MIN(cm.release_year) as first_movie_year,
  MAX(cm.release_year) as latest_movie_year,
  ARRAY_AGG(DISTINCT cm.genres[1]) FILTER (WHERE cm.genres[1] IS NOT NULL) as genres_worked
FROM movie_credits mc
JOIN catalogue_movies cm ON mc.movie_id = cm.id
WHERE mc.credit_type = 'director'
GROUP BY mc.person_name_en, mc.person_name_te, mc.person_id
HAVING COUNT(DISTINCT mc.movie_id) >= 2
ORDER BY hit_ratio DESC, total_movies DESC;

-- View: Monthly release analysis
CREATE OR REPLACE VIEW v_monthly_releases AS
SELECT
  release_year,
  release_month,
  TO_CHAR(TO_DATE(release_month::TEXT, 'MM'), 'Month') as month_name,
  COUNT(*) as total_releases,
  COUNT(*) FILTER (WHERE verdict IN ('all_time_blockbuster', 'blockbuster', 'super_hit', 'hit')) as hits,
  ROUND(
    COUNT(*) FILTER (WHERE verdict IN ('all_time_blockbuster', 'blockbuster', 'super_hit', 'hit'))::DECIMAL /
    NULLIF(COUNT(*), 0) * 100, 2
  ) as hit_ratio
FROM catalogue_movies
WHERE release_month IS NOT NULL
  AND release_year >= 2000
GROUP BY release_year, release_month
ORDER BY release_year DESC, release_month;

-- ============================================================
-- STORED PROCEDURES
-- ============================================================

-- Procedure: Update actor performance stats
CREATE OR REPLACE FUNCTION update_actor_performance_stats(target_person_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
  rec RECORD;
BEGIN
  FOR rec IN (
    SELECT DISTINCT
      mc.person_id,
      mc.person_name_en,
      mc.person_name_te
    FROM movie_credits mc
    WHERE mc.credit_type = 'cast'
      AND mc.role_category IN ('lead', 'hero', 'heroine')
      AND mc.person_id IS NOT NULL
      AND (target_person_id IS NULL OR mc.person_id = target_person_id)
  ) LOOP
    INSERT INTO actor_performance_stats (
      person_id,
      person_name_en,
      person_name_te,
      debut_year,
      latest_year,
      active_years,
      total_movies,
      as_lead,
      all_time_blockbusters,
      blockbusters,
      super_hits,
      hits,
      average,
      flops,
      hit_ratio,
      blockbuster_ratio,
      total_worldwide_gross_inr_crores
    )
    SELECT
      mc.person_id,
      mc.person_name_en,
      MAX(mc.person_name_te),
      MIN(cm.release_year),
      MAX(cm.release_year),
      MAX(cm.release_year) - MIN(cm.release_year) + 1,
      COUNT(DISTINCT cm.id),
      COUNT(DISTINCT cm.id) FILTER (WHERE mc.role_category IN ('lead', 'hero', 'heroine')),
      COUNT(DISTINCT cm.id) FILTER (WHERE cm.verdict = 'all_time_blockbuster'),
      COUNT(DISTINCT cm.id) FILTER (WHERE cm.verdict = 'blockbuster'),
      COUNT(DISTINCT cm.id) FILTER (WHERE cm.verdict = 'super_hit'),
      COUNT(DISTINCT cm.id) FILTER (WHERE cm.verdict = 'hit'),
      COUNT(DISTINCT cm.id) FILTER (WHERE cm.verdict = 'average'),
      COUNT(DISTINCT cm.id) FILTER (WHERE cm.verdict IN ('flop', 'disaster')),
      ROUND(
        COUNT(DISTINCT cm.id) FILTER (WHERE cm.verdict IN ('all_time_blockbuster', 'blockbuster', 'super_hit', 'hit'))::DECIMAL /
        NULLIF(COUNT(DISTINCT cm.id), 0) * 100, 2
      ),
      ROUND(
        COUNT(DISTINCT cm.id) FILTER (WHERE cm.verdict IN ('all_time_blockbuster', 'blockbuster'))::DECIMAL /
        NULLIF(COUNT(DISTINCT cm.id), 0) * 100, 2
      ),
      ROUND(SUM(cm.worldwide_gross_inr_crores), 2)
    FROM movie_credits mc
    JOIN catalogue_movies cm ON mc.movie_id = cm.id
    WHERE mc.person_id = rec.person_id
      AND mc.credit_type = 'cast'
    GROUP BY mc.person_id, mc.person_name_en
    ON CONFLICT (person_id) DO UPDATE SET
      person_name_te = EXCLUDED.person_name_te,
      debut_year = EXCLUDED.debut_year,
      latest_year = EXCLUDED.latest_year,
      active_years = EXCLUDED.active_years,
      total_movies = EXCLUDED.total_movies,
      as_lead = EXCLUDED.as_lead,
      all_time_blockbusters = EXCLUDED.all_time_blockbusters,
      blockbusters = EXCLUDED.blockbusters,
      super_hits = EXCLUDED.super_hits,
      hits = EXCLUDED.hits,
      average = EXCLUDED.average,
      flops = EXCLUDED.flops,
      hit_ratio = EXCLUDED.hit_ratio,
      blockbuster_ratio = EXCLUDED.blockbuster_ratio,
      total_worldwide_gross_inr_crores = EXCLUDED.total_worldwide_gross_inr_crores,
      updated_at = NOW();

    updated_count := updated_count + 1;
  END LOOP;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE catalogue_movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_box_office ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_awards ENABLE ROW LEVEL SECURITY;

-- Public can read published movies
CREATE POLICY "Public can read published movies"
  ON catalogue_movies FOR SELECT
  USING (is_published = true);

-- Authenticated users can read all
CREATE POLICY "Authenticated can read all movies"
  ON catalogue_movies FOR SELECT
  TO authenticated
  USING (true);

-- Service role can do everything
CREATE POLICY "Service role full access to movies"
  ON catalogue_movies FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Credits policies
CREATE POLICY "Public can read credits"
  ON movie_credits FOR SELECT
  USING (true);

CREATE POLICY "Service role full access to credits"
  ON movie_credits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- SAMPLE DATA: Legendary Telugu Movies
-- ============================================================

-- Insert some classic Telugu films for reference
INSERT INTO catalogue_movies (
  title_en, title_te, slug, release_year, release_date, verdict, era,
  director_names, hero_names, heroine_names, music_director_names,
  genres, is_classic, source
) VALUES
  ('Bhakta Prahlada', 'భక్త ప్రహ్లాద', 'bhakta-prahlada-1931', 1931, '1931-09-15',
   'hit', 'birth_of_talkies',
   ARRAY['H.M. Reddy'], ARRAY['Master Yadagiri'], ARRAY['Surabhi Kamalabai'],
   ARRAY['Prabhala Satyanarayana'],
   ARRAY['Mythological'], true, 'manual'),

  ('Mayabazar', 'మాయాబజార్', 'mayabazar-1957', 1957, '1957-03-27',
   'all_time_blockbuster', 'golden_age_dawn',
   ARRAY['Kadiri Venkata Reddy'], ARRAY['N.T. Rama Rao', 'Akkineni Nageswara Rao'],
   ARRAY['Savitri', 'S. Varalakshmi'],
   ARRAY['Ghantasala'],
   ARRAY['Mythological', 'Fantasy', 'Comedy'], true, 'manual'),

  ('Pathala Bhairavi', 'పాతాళ భైరవి', 'pathala-bhairavi-1951', 1951, '1951-06-15',
   'blockbuster', 'golden_age_dawn',
   ARRAY['K. V. Reddy'], ARRAY['N.T. Rama Rao'], ARRAY['Malathi K'],
   ARRAY['Ghantasala'],
   ARRAY['Fantasy', 'Adventure'], true, 'manual'),

  ('Nartanasala', 'నర్తనశాల', 'nartanasala-1963', 1963, '1963-01-14',
   'all_time_blockbuster', 'golden_age_peak',
   ARRAY['Kamalakara Kameswara Rao'], ARRAY['N.T. Rama Rao'], ARRAY['Savitri'],
   ARRAY['S. Rajeswara Rao'],
   ARRAY['Mythological'], true, 'manual'),

  ('Sankarabharanam', 'శంకరాభరణం', 'sankarabharanam-1980', 1980, '1980-02-22',
   'all_time_blockbuster', 'mass_masala',
   ARRAY['K. Viswanath'], ARRAY['J.V. Somayajulu'], ARRAY['Manju Bhargavi'],
   ARRAY['K.V. Mahadevan'],
   ARRAY['Musical', 'Drama'], true, 'manual'),

  ('Baahubali: The Beginning', 'బాహుబలి: ది బిగినింగ్', 'baahubali-the-beginning-2015', 2015, '2015-07-10',
   'all_time_blockbuster', 'pan_india_rise',
   ARRAY['S.S. Rajamouli'], ARRAY['Prabhas'], ARRAY['Anushka Shetty', 'Tamannaah'],
   ARRAY['M.M. Keeravani'],
   ARRAY['Epic', 'Action', 'Fantasy'], true, 'manual'),

  ('Baahubali 2: The Conclusion', 'బాహుబలి 2: ది కన్క్లూజన్', 'baahubali-2-the-conclusion-2017', 2017, '2017-04-28',
   'all_time_blockbuster', 'pan_india_rise',
   ARRAY['S.S. Rajamouli'], ARRAY['Prabhas'], ARRAY['Anushka Shetty'],
   ARRAY['M.M. Keeravani'],
   ARRAY['Epic', 'Action', 'Fantasy'], true, 'manual'),

  ('RRR', 'ఆర్ఆర్ఆర్', 'rrr-2022', 2022, '2022-03-25',
   'all_time_blockbuster', 'pan_india_dominance',
   ARRAY['S.S. Rajamouli'], ARRAY['N.T. Rama Rao Jr.', 'Ram Charan'],
   ARRAY['Alia Bhatt'],
   ARRAY['M.M. Keeravani'],
   ARRAY['Epic', 'Action', 'Period'], true, 'manual'),

  ('Pushpa: The Rise', 'పుష్ప: ది రైజ్', 'pushpa-the-rise-2021', 2021, '2021-12-17',
   'all_time_blockbuster', 'pan_india_dominance',
   ARRAY['Sukumar'], ARRAY['Allu Arjun'], ARRAY['Rashmika Mandanna'],
   ARRAY['Devi Sri Prasad'],
   ARRAY['Action', 'Crime', 'Drama'], false, 'manual')

ON CONFLICT (slug) DO NOTHING;

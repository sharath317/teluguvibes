-- ============================================================
-- TELUGU CINEMA KNOWLEDGE GRAPH SCHEMA
-- From 1931 (Bhakta Prahlada) to Present
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CORE PERSON ENTITY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS kg_persons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity
  wikidata_id VARCHAR(20) UNIQUE NOT NULL,  -- Q12345 format
  name_en VARCHAR(255) NOT NULL,
  name_te VARCHAR(255),                      -- Telugu script name
  aliases TEXT[],                            -- Alternative names/spellings

  -- Demographics
  gender VARCHAR(20),                        -- male, female, other
  birth_date DATE,
  birth_year INTEGER,                        -- For partial dates
  death_date DATE,
  death_year INTEGER,
  birth_place VARCHAR(255),
  nationality VARCHAR(100),

  -- Career
  occupation TEXT[],                         -- actor, actress, director, producer, etc.
  debut_year INTEGER,
  last_active_year INTEGER,
  active_years INT4RANGE,                    -- PostgreSQL range for active period
  era VARCHAR(20),                           -- 1930s, 1940s, etc.

  -- Categorization
  is_actor BOOLEAN DEFAULT false,
  is_actress BOOLEAN DEFAULT false,
  is_director BOOLEAN DEFAULT false,
  is_producer BOOLEAN DEFAULT false,
  is_music_director BOOLEAN DEFAULT false,
  is_singer BOOLEAN DEFAULT false,
  is_writer BOOLEAN DEFAULT false,
  is_comedian BOOLEAN DEFAULT false,

  -- Media
  image_url TEXT,
  image_source VARCHAR(50),                  -- wikidata, tmdb, wikimedia
  wikipedia_url TEXT,
  imdb_id VARCHAR(20),
  tmdb_id INTEGER,

  -- Metrics
  popularity_score DECIMAL(8,2) DEFAULT 0,
  filmography_count INTEGER DEFAULT 0,
  awards_count INTEGER DEFAULT 0,

  -- Source tracking
  source_refs JSONB DEFAULT '[]',            -- Array of {source, id, url}
  raw_wikidata JSONB,                        -- Original Wikidata response

  -- Deduplication
  canonical_id UUID,                         -- Points to canonical record if duplicate
  is_canonical BOOLEAN DEFAULT true,
  merge_history JSONB DEFAULT '[]',

  -- Metadata
  data_quality_score DECIMAL(3,2) DEFAULT 0, -- 0-1 completeness score
  last_enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. FILMOGRAPHY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS kg_filmography (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  person_id UUID REFERENCES kg_persons(id) ON DELETE CASCADE,
  movie_id UUID,                             -- Reference to movies table if exists
  wikidata_movie_id VARCHAR(20),

  -- Movie details
  movie_title_en VARCHAR(255) NOT NULL,
  movie_title_te VARCHAR(255),
  release_year INTEGER,
  release_date DATE,

  -- Role
  role_type VARCHAR(50),                     -- lead, supporting, cameo, voice
  character_name VARCHAR(255),
  credit_order INTEGER,

  -- For crew
  crew_role VARCHAR(100),                    -- director, producer, music_director, etc.

  -- Source
  source VARCHAR(50),                        -- wikidata, tmdb, manual
  source_id VARCHAR(50),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(person_id, wikidata_movie_id, role_type)
);

-- ============================================================
-- 3. AWARDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS kg_awards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  person_id UUID REFERENCES kg_persons(id) ON DELETE CASCADE,

  award_name VARCHAR(255) NOT NULL,
  award_category VARCHAR(255),
  year INTEGER,
  movie_title VARCHAR(255),

  is_winner BOOLEAN DEFAULT true,            -- false = nominee

  wikidata_award_id VARCHAR(20),
  source VARCHAR(50),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(person_id, award_name, year, award_category)
);

-- ============================================================
-- 4. RELATIONSHIPS TABLE (Family, Collaborations)
-- ============================================================
CREATE TABLE IF NOT EXISTS kg_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  person_id UUID REFERENCES kg_persons(id) ON DELETE CASCADE,
  related_person_id UUID REFERENCES kg_persons(id) ON DELETE CASCADE,

  relationship_type VARCHAR(50) NOT NULL,    -- spouse, child, parent, sibling, frequent_collaborator

  start_year INTEGER,
  end_year INTEGER,

  collaboration_count INTEGER,               -- For collaborators

  source VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(person_id, related_person_id, relationship_type)
);

-- ============================================================
-- 5. ALIAS/DEDUP TRACKING TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS kg_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  person_id UUID REFERENCES kg_persons(id) ON DELETE CASCADE,

  alias_name VARCHAR(255) NOT NULL,
  alias_type VARCHAR(50),                    -- screen_name, birth_name, nickname, alternate_spelling
  language VARCHAR(10),                      -- en, te, hi

  source VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(person_id, alias_name, language)
);

-- ============================================================
-- 6. DATA INGESTION LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS kg_ingestion_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  source VARCHAR(50) NOT NULL,               -- wikidata, tmdb, manual
  entity_type VARCHAR(50),                   -- person, movie, award

  total_fetched INTEGER DEFAULT 0,
  total_inserted INTEGER DEFAULT 0,
  total_updated INTEGER DEFAULT 0,
  total_duplicates INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,

  error_details JSONB,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  status VARCHAR(20) DEFAULT 'running'       -- running, completed, failed
);

-- ============================================================
-- 7. ERA CLASSIFICATION TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS kg_eras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  era_name VARCHAR(50) NOT NULL UNIQUE,      -- 1930s, Golden Age, New Wave
  start_year INTEGER NOT NULL,
  end_year INTEGER,

  description TEXT,
  key_figures TEXT[],                        -- Notable people of this era

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert era definitions
INSERT INTO kg_eras (era_name, start_year, end_year, description) VALUES
  ('1930s', 1931, 1939, 'Birth of Telugu Talkies - Bhakta Prahlada era'),
  ('1940s', 1940, 1949, 'Early Growth - Mythological & Social films'),
  ('1950s', 1950, 1959, 'Golden Age Begins - NTR, ANR debut'),
  ('1960s', 1960, 1969, 'Golden Age Peak - Legendary era'),
  ('1970s', 1970, 1979, 'Transition Era - New heroes emerge'),
  ('1980s', 1980, 1989, 'Mass Masala Era - Chiranjeevi rise'),
  ('1990s', 1990, 1999, 'Commercial Cinema Peak'),
  ('2000s', 2000, 2009, 'New Millennium - Technical revolution'),
  ('2010s', 2010, 2019, 'Pan-India Era begins'),
  ('2020s', 2020, 2029, 'Pan-India Dominance - Baahubali legacy')
ON CONFLICT (era_name) DO NOTHING;

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_kg_persons_wikidata ON kg_persons(wikidata_id);
CREATE INDEX IF NOT EXISTS idx_kg_persons_name_en ON kg_persons(name_en);
CREATE INDEX IF NOT EXISTS idx_kg_persons_era ON kg_persons(era);
CREATE INDEX IF NOT EXISTS idx_kg_persons_occupation ON kg_persons USING GIN(occupation);
CREATE INDEX IF NOT EXISTS idx_kg_persons_debut_year ON kg_persons(debut_year);
CREATE INDEX IF NOT EXISTS idx_kg_persons_is_actor ON kg_persons(is_actor) WHERE is_actor = true;
CREATE INDEX IF NOT EXISTS idx_kg_persons_is_actress ON kg_persons(is_actress) WHERE is_actress = true;
CREATE INDEX IF NOT EXISTS idx_kg_persons_is_director ON kg_persons(is_director) WHERE is_director = true;
CREATE INDEX IF NOT EXISTS idx_kg_persons_canonical ON kg_persons(canonical_id) WHERE canonical_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kg_filmography_person ON kg_filmography(person_id);
CREATE INDEX IF NOT EXISTS idx_kg_filmography_year ON kg_filmography(release_year);

CREATE INDEX IF NOT EXISTS idx_kg_aliases_name ON kg_aliases(alias_name);
CREATE INDEX IF NOT EXISTS idx_kg_aliases_person ON kg_aliases(person_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to calculate era from year
CREATE OR REPLACE FUNCTION calculate_era(year INTEGER)
RETURNS VARCHAR(20) AS $$
BEGIN
  IF year IS NULL THEN RETURN NULL; END IF;
  IF year < 1940 THEN RETURN '1930s'; END IF;
  IF year < 1950 THEN RETURN '1940s'; END IF;
  IF year < 1960 THEN RETURN '1950s'; END IF;
  IF year < 1970 THEN RETURN '1960s'; END IF;
  IF year < 1980 THEN RETURN '1970s'; END IF;
  IF year < 1990 THEN RETURN '1980s'; END IF;
  IF year < 2000 THEN RETURN '1990s'; END IF;
  IF year < 2010 THEN RETURN '2000s'; END IF;
  IF year < 2020 THEN RETURN '2010s'; END IF;
  RETURN '2020s';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate data quality score
CREATE OR REPLACE FUNCTION calculate_quality_score(person kg_persons)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  score DECIMAL(3,2) := 0;
  max_score DECIMAL(3,2) := 0;
BEGIN
  -- Name fields (20 points)
  max_score := max_score + 0.2;
  IF person.name_en IS NOT NULL THEN score := score + 0.1; END IF;
  IF person.name_te IS NOT NULL THEN score := score + 0.1; END IF;

  -- Demographics (20 points)
  max_score := max_score + 0.2;
  IF person.birth_date IS NOT NULL OR person.birth_year IS NOT NULL THEN score := score + 0.1; END IF;
  IF person.gender IS NOT NULL THEN score := score + 0.1; END IF;

  -- Career (30 points)
  max_score := max_score + 0.3;
  IF person.debut_year IS NOT NULL THEN score := score + 0.1; END IF;
  IF person.occupation IS NOT NULL AND array_length(person.occupation, 1) > 0 THEN score := score + 0.1; END IF;
  IF person.filmography_count > 0 THEN score := score + 0.1; END IF;

  -- Media (20 points)
  max_score := max_score + 0.2;
  IF person.image_url IS NOT NULL THEN score := score + 0.1; END IF;
  IF person.wikipedia_url IS NOT NULL OR person.imdb_id IS NOT NULL THEN score := score + 0.1; END IF;

  -- External IDs (10 points)
  max_score := max_score + 0.1;
  IF person.tmdb_id IS NOT NULL THEN score := score + 0.05; END IF;
  IF person.imdb_id IS NOT NULL THEN score := score + 0.05; END IF;

  RETURN score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-update era and quality score
CREATE OR REPLACE FUNCTION update_person_metadata()
RETURNS TRIGGER AS $$
BEGIN
  NEW.era := calculate_era(NEW.debut_year);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_person_metadata ON kg_persons;
CREATE TRIGGER trigger_update_person_metadata
  BEFORE INSERT OR UPDATE ON kg_persons
  FOR EACH ROW
  EXECUTE FUNCTION update_person_metadata();

-- ============================================================
-- VIEWS
-- ============================================================

-- View: Active actors by era
CREATE OR REPLACE VIEW kg_actors_by_era AS
SELECT
  era,
  COUNT(*) as total_actors,
  COUNT(*) FILTER (WHERE is_actor) as male_actors,
  COUNT(*) FILTER (WHERE is_actress) as female_actors,
  COUNT(*) FILTER (WHERE death_date IS NULL AND birth_year > 1940) as likely_active
FROM kg_persons
WHERE is_actor OR is_actress
GROUP BY era
ORDER BY era;

-- View: Top directors
CREATE OR REPLACE VIEW kg_top_directors AS
SELECT
  p.id,
  p.name_en,
  p.name_te,
  p.debut_year,
  p.era,
  p.filmography_count,
  p.awards_count
FROM kg_persons p
WHERE p.is_director = true
ORDER BY p.filmography_count DESC, p.awards_count DESC;

-- View: Legendary actors (pre-1980)
CREATE OR REPLACE VIEW kg_legendary_actors AS
SELECT *
FROM kg_persons
WHERE (is_actor OR is_actress)
  AND debut_year < 1980
  AND data_quality_score > 0.5
ORDER BY popularity_score DESC;









-- ============================================================
-- MIGRATION 022: Relationship and Narrative Graph
-- ============================================================
-- This migration creates a connected graph of professional, 
-- thematic, and historical relationships for discovery.
-- ============================================================

-- ============================================================
-- COLLABORATIONS TABLE
-- ============================================================

-- Professional collaborations between entities
CREATE TABLE IF NOT EXISTS collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity1_type TEXT NOT NULL CHECK (entity1_type IN ('actor', 'director', 'music_director', 'producer', 'writer')),
  entity1_name TEXT NOT NULL,
  entity2_type TEXT NOT NULL CHECK (entity2_type IN ('actor', 'director', 'music_director', 'producer', 'writer')),
  entity2_name TEXT NOT NULL,
  collaboration_count INTEGER DEFAULT 1,
  movie_ids UUID[],
  first_collab_year INTEGER,
  last_collab_year INTEGER,
  hit_rate DECIMAL(3,2),  -- Percentage of hits in their collaborations
  avg_rating DECIMAL(3,2),
  notable_films TEXT[],   -- Top films from their collaboration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity1_type, entity1_name, entity2_type, entity2_name)
);

COMMENT ON TABLE collaborations IS 
  'Professional collaborations between industry entities (actor-director, actor-actor, etc.)';

-- Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_collab_entity1 
  ON collaborations(entity1_type, entity1_name);

CREATE INDEX IF NOT EXISTS idx_collab_entity2 
  ON collaborations(entity2_type, entity2_name);

CREATE INDEX IF NOT EXISTS idx_collab_count 
  ON collaborations(collaboration_count DESC);

-- ============================================================
-- NARRATIVE EVENTS TABLE
-- ============================================================

-- Story-level relationships and events (NEW - narrative intelligence)
CREATE TABLE IF NOT EXISTS narrative_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT CHECK (event_type IN (
    'career_turning_point',  -- First hit, comeback film
    'controversy',           -- Public disputes
    'rivalry',               -- Reported/historical rivalries
    'shared_event',          -- Fan wars, court cases
    'milestone',             -- 100th film, award sweep
    'industry_moment'        -- Box office records, cultural shifts
  )),
  event_label TEXT NOT NULL,
  event_year INTEGER,
  event_date DATE,
  entity_ids UUID[],         -- Related celebrities/people
  entity_names TEXT[],       -- Names for quick display
  movie_ids UUID[],          -- Related movies
  movie_titles TEXT[],       -- Titles for quick display
  description TEXT,
  source_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  content_type TEXT DEFAULT 'fact' CHECK (content_type IN ('fact', 'reported', 'speculative')),
  significance_score INTEGER CHECK (significance_score BETWEEN 1 AND 10),  -- 10 = most significant
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE narrative_events IS 
  'Story-level events and relationships for editorial content and discovery. Powers cult content, retrospectives, and contextual intelligence.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_narrative_event_type 
  ON narrative_events(event_type);

CREATE INDEX IF NOT EXISTS idx_narrative_event_year 
  ON narrative_events(event_year DESC);

CREATE INDEX IF NOT EXISTS idx_narrative_entity_ids 
  ON narrative_events USING GIN(entity_ids);

CREATE INDEX IF NOT EXISTS idx_narrative_movie_ids 
  ON narrative_events USING GIN(movie_ids);

CREATE INDEX IF NOT EXISTS idx_narrative_content_type 
  ON narrative_events(content_type);

CREATE INDEX IF NOT EXISTS idx_narrative_significance 
  ON narrative_events(significance_score DESC) WHERE is_verified = true;

-- ============================================================
-- MOVIE SIMILARITIES TABLE
-- ============================================================

-- Precomputed movie similarities for recommendations
CREATE TABLE IF NOT EXISTS movie_similarities (
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  similar_movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  similarity_score DECIMAL(3,2) CHECK (similarity_score BETWEEN 0 AND 1),
  similarity_type TEXT CHECK (similarity_type IN (
    'cast',           -- Same actors/director
    'genre',          -- Similar genres
    'era',            -- Same time period
    'tone',           -- Similar mood/tone
    'thematic',       -- Similar themes
    'audience',       -- Similar audience fit
    'composite'       -- Combined score
  )),
  common_factors TEXT[],  -- What makes them similar
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (movie_id, similar_movie_id, similarity_type)
);

COMMENT ON TABLE movie_similarities IS 
  'Precomputed movie similarities for "If you liked this, watch..." recommendations.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_similarity_movie 
  ON movie_similarities(movie_id, similarity_score DESC);

CREATE INDEX IF NOT EXISTS idx_similarity_similar 
  ON movie_similarities(similar_movie_id);

CREATE INDEX IF NOT EXISTS idx_similarity_type 
  ON movie_similarities(similarity_type, similarity_score DESC);

-- ============================================================
-- CAREER TRAJECTORIES
-- ============================================================

-- Actor/Director career milestones
CREATE TABLE IF NOT EXISTS career_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('actor', 'director', 'music_director')),
  entity_name TEXT NOT NULL,
  milestone_type TEXT CHECK (milestone_type IN (
    'debut',
    'first_hit',
    'blockbuster',
    'comeback',
    'award_win',
    'milestone_film',  -- 25th, 50th, 100th film
    'retirement',
    'director_debut',  -- Actor becoming director
    'producer_debut'   -- Becoming producer
  )),
  movie_id UUID REFERENCES movies(id),
  movie_title TEXT,
  year INTEGER,
  description TEXT,
  significance TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_name, milestone_type, year)
);

COMMENT ON TABLE career_milestones IS 
  'Career milestones for actor/director profile pages and trajectory visualization.';

-- Index
CREATE INDEX IF NOT EXISTS idx_career_entity 
  ON career_milestones(entity_type, entity_name);

-- ============================================================
-- FUNCTIONS FOR GRAPH OPERATIONS
-- ============================================================

-- Get all collaborators for a person
CREATE OR REPLACE FUNCTION get_collaborators(
  p_entity_type TEXT,
  p_entity_name TEXT,
  p_min_collabs INTEGER DEFAULT 2
) 
RETURNS TABLE (
  collaborator_type TEXT,
  collaborator_name TEXT,
  collab_count INTEGER,
  hit_rate DECIMAL(3,2),
  notable_films TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.entity2_type,
    c.entity2_name,
    c.collaboration_count,
    c.hit_rate,
    c.notable_films
  FROM collaborations c
  WHERE c.entity1_type = p_entity_type 
    AND c.entity1_name = p_entity_name
    AND c.collaboration_count >= p_min_collabs
  
  UNION
  
  SELECT 
    c.entity1_type,
    c.entity1_name,
    c.collaboration_count,
    c.hit_rate,
    c.notable_films
  FROM collaborations c
  WHERE c.entity2_type = p_entity_type 
    AND c.entity2_name = p_entity_name
    AND c.collaboration_count >= p_min_collabs
    
  ORDER BY collab_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get narrative events for a movie
CREATE OR REPLACE FUNCTION get_movie_narrative_context(p_movie_id UUID)
RETURNS TABLE (
  event_type TEXT,
  event_label TEXT,
  event_year INTEGER,
  description TEXT,
  significance_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ne.event_type,
    ne.event_label,
    ne.event_year,
    ne.description,
    ne.significance_score
  FROM narrative_events ne
  WHERE p_movie_id = ANY(ne.movie_ids)
    AND ne.is_verified = true
  ORDER BY ne.significance_score DESC, ne.event_year DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get similar movies
CREATE OR REPLACE FUNCTION get_similar_movies(
  p_movie_id UUID,
  p_similarity_type TEXT DEFAULT 'composite',
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  similar_movie_id UUID,
  similarity_score DECIMAL(3,2),
  common_factors TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ms.similar_movie_id,
    ms.similarity_score,
    ms.common_factors
  FROM movie_similarities ms
  WHERE ms.movie_id = p_movie_id
    AND ms.similarity_type = p_similarity_type
  ORDER BY ms.similarity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- VIEWS
-- ============================================================

-- View: Top collaborations
CREATE OR REPLACE VIEW top_collaborations AS
SELECT 
  entity1_type || '-' || entity2_type as collab_type,
  entity1_name,
  entity2_name,
  collaboration_count,
  hit_rate,
  avg_rating,
  notable_films
FROM collaborations
WHERE collaboration_count >= 3
ORDER BY collaboration_count DESC, hit_rate DESC
LIMIT 100;

-- View: Recent narrative events (for editorial use)
CREATE OR REPLACE VIEW recent_narrative_events AS
SELECT 
  id,
  event_type,
  event_label,
  event_year,
  entity_names,
  movie_titles,
  description,
  content_type,
  significance_score
FROM narrative_events
WHERE is_verified = true
ORDER BY 
  significance_score DESC,
  event_year DESC
LIMIT 50;

-- ============================================================
-- TRIGGERS FOR AUTO-UPDATE
-- ============================================================

-- Update collaboration timestamps
CREATE OR REPLACE FUNCTION update_collaboration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_collab_timestamp
  BEFORE UPDATE ON collaborations
  FOR EACH ROW
  EXECUTE FUNCTION update_collaboration_timestamp();

CREATE TRIGGER trg_narrative_timestamp
  BEFORE UPDATE ON narrative_events
  FOR EACH ROW
  EXECUTE FUNCTION update_collaboration_timestamp();


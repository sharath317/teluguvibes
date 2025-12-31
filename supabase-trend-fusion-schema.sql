-- ============================================================
-- TREND-HISTORIC FUSION SYSTEM SCHEMA
-- AI Content Strategy Engine for Telugu Cinema
-- Fuses current trends with historic data for hybrid content
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ENTITY TREND SIGNALS
-- Tracks when historic entities spike in current relevance
-- ============================================================
CREATE TABLE IF NOT EXISTS entity_trend_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Entity Reference
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('person', 'movie', 'topic')),
  entity_id UUID,                             -- Reference to kg_persons or catalogue_movies
  entity_name TEXT NOT NULL,
  entity_name_te TEXT,

  -- Signal Source
  signal_source VARCHAR(50) NOT NULL CHECK (signal_source IN (
    'tmdb_trending', 'youtube_trending', 'news_mention',
    'twitter_hashtag', 'google_trends', 'ott_trending',
    'search_spike', 'social_viral', 'internal_search'
  )),

  -- Signal Details
  signal_type VARCHAR(50) NOT NULL,           -- movie_release, interview, tribute, meme, nostalgia
  signal_strength DECIMAL(5,2) DEFAULT 0,     -- 0-100 normalized
  raw_score DECIMAL(10,2),                    -- Original score from source

  -- Context
  trigger_reason TEXT,                        -- What caused the spike
  related_content TEXT,                       -- URL or reference
  related_keywords TEXT[] DEFAULT '{}',

  -- Time
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  peak_time TIMESTAMPTZ,
  decay_rate DECIMAL(3,2) DEFAULT 0.1,        -- How fast signal decays

  -- Processing
  is_processed BOOLEAN DEFAULT false,
  recommendation_generated BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. TREND-HISTORIC MATCHES
-- Links current trends to relevant historic content
-- ============================================================
CREATE TABLE IF NOT EXISTS trend_historic_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Trend Signal
  signal_id UUID REFERENCES entity_trend_signals(id) ON DELETE CASCADE,

  -- Historic Entity
  historic_entity_type VARCHAR(20) NOT NULL,
  historic_entity_id UUID,
  historic_entity_name TEXT NOT NULL,

  -- Match Quality
  relevance_score DECIMAL(5,2) NOT NULL,      -- 0-100
  match_type VARCHAR(50) NOT NULL,            -- direct, filmography, era, genre, comparison
  match_reason TEXT,                          -- Why they're related

  -- Content Angle
  suggested_angle TEXT,                       -- Story angle for hybrid content
  suggested_title TEXT,
  suggested_title_te TEXT,

  -- Ranking
  engagement_probability DECIMAL(5,2) DEFAULT 50,
  virality_score DECIMAL(5,2) DEFAULT 50,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. CONTENT RECOMMENDATIONS (Hybrid Suggestions)
-- ============================================================
CREATE TABLE IF NOT EXISTS fusion_content_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Content Identity
  recommendation_type VARCHAR(50) NOT NULL CHECK (recommendation_type IN (
    'trend_tribute',        -- "NTR birthday: Top 5 performances"
    'ott_classic',          -- "Why ANR movies trend on OTT"
    'comparison',           -- "Prabhas vs NTR: Box office kings"
    'nostalgia_spike',      -- "Mayabazar trends again after 66 years"
    'legacy_connection',    -- "How Chiranjeevi was inspired by NTR"
    'genre_evolution',      -- "Telugu action: From NTR to Jr NTR"
    'remake_original',      -- "Original vs Remake: Which is better?"
    'era_comparison',       -- "1980s vs 2020s: Telugu cinema evolution"
    'milestone',            -- "50 years of Mayabazar"
    'rediscovery'           -- "Classic gem you missed on Netflix"
  )),

  -- Trend Context
  primary_trend_signal_id UUID REFERENCES entity_trend_signals(id),
  trend_context JSONB DEFAULT '{}',           -- {source, keywords, spike_reason}

  -- Historic Context
  historic_entity_ids UUID[] DEFAULT '{}',
  historic_context JSONB DEFAULT '{}',        -- {entities, movies, era}

  -- Content Suggestion
  suggested_title TEXT NOT NULL,
  suggested_title_te TEXT,
  suggested_hook TEXT,                        -- Opening line
  suggested_sections JSONB DEFAULT '[]',      -- [{heading, description}]
  suggested_keywords TEXT[] DEFAULT '{}',

  -- Scoring
  relevance_score DECIMAL(5,2) DEFAULT 50,    -- How relevant is the connection
  timeliness_score DECIMAL(5,2) DEFAULT 50,   -- How timely (trend freshness)
  engagement_probability DECIMAL(5,2) DEFAULT 50,
  virality_score DECIMAL(5,2) DEFAULT 50,
  combined_score DECIMAL(5,2) GENERATED ALWAYS AS (
    (relevance_score * 0.3) +
    (timeliness_score * 0.25) +
    (engagement_probability * 0.3) +
    (virality_score * 0.15)
  ) STORED,

  -- Learning
  predicted_views INTEGER,
  predicted_shares INTEGER,
  confidence_level DECIMAL(3,2) DEFAULT 0.5,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'generated', 'published', 'rejected', 'expired'
  )),
  admin_notes TEXT,

  -- Tracking
  post_id UUID,                               -- If converted to post
  actual_performance JSONB,                   -- After publication

  -- Expiry
  relevance_expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. ENTITY RELEVANCE HISTORY
-- Track how entities' relevance changes over time
-- ============================================================
CREATE TABLE IF NOT EXISTS entity_relevance_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  entity_type VARCHAR(20) NOT NULL,
  entity_id UUID NOT NULL,
  entity_name TEXT NOT NULL,

  -- Daily snapshot
  snapshot_date DATE NOT NULL,

  -- Relevance Metrics
  trend_score DECIMAL(5,2) DEFAULT 0,         -- From current trends
  search_score DECIMAL(5,2) DEFAULT 0,        -- From search volume
  social_score DECIMAL(5,2) DEFAULT 0,        -- From social mentions
  ott_score DECIMAL(5,2) DEFAULT 0,           -- From OTT trending

  -- Combined
  overall_relevance DECIMAL(5,2) DEFAULT 0,
  relevance_change DECIMAL(5,2) DEFAULT 0,    -- vs previous day

  -- Context
  top_signals TEXT[] DEFAULT '{}',            -- What's driving relevance

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(entity_id, snapshot_date)
);

-- ============================================================
-- 5. FUSION PATTERNS (Learning what works)
-- ============================================================
CREATE TABLE IF NOT EXISTS fusion_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Pattern Definition
  pattern_name TEXT NOT NULL,
  pattern_type VARCHAR(50) NOT NULL,

  -- Match Criteria
  trigger_conditions JSONB NOT NULL,          -- When to apply this pattern
  entity_criteria JSONB,                      -- What entities match

  -- Content Template
  title_template TEXT,
  hook_template TEXT,
  sections_template JSONB,

  -- Performance
  times_used INTEGER DEFAULT 0,
  avg_views DECIMAL(12,2) DEFAULT 0,
  avg_engagement DECIMAL(5,2) DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_entity_signals_entity
  ON entity_trend_signals(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_signals_source
  ON entity_trend_signals(signal_source);
CREATE INDEX IF NOT EXISTS idx_entity_signals_detected
  ON entity_trend_signals(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_entity_signals_strength
  ON entity_trend_signals(signal_strength DESC);
CREATE INDEX IF NOT EXISTS idx_entity_signals_unprocessed
  ON entity_trend_signals(is_processed) WHERE is_processed = false;

CREATE INDEX IF NOT EXISTS idx_trend_matches_signal
  ON trend_historic_matches(signal_id);
CREATE INDEX IF NOT EXISTS idx_trend_matches_relevance
  ON trend_historic_matches(relevance_score DESC);

CREATE INDEX IF NOT EXISTS idx_fusion_recommendations_score
  ON fusion_content_recommendations(combined_score DESC);
CREATE INDEX IF NOT EXISTS idx_fusion_recommendations_status
  ON fusion_content_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_fusion_recommendations_type
  ON fusion_content_recommendations(recommendation_type);

CREATE INDEX IF NOT EXISTS idx_relevance_history_entity
  ON entity_relevance_history(entity_id, snapshot_date DESC);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function: Calculate entity relevance score
CREATE OR REPLACE FUNCTION calculate_entity_relevance(
  p_entity_id UUID,
  p_lookback_hours INTEGER DEFAULT 48
) RETURNS DECIMAL AS $$
DECLARE
  v_trend_score DECIMAL := 0;
  v_search_score DECIMAL := 0;
  v_social_score DECIMAL := 0;
  v_base_popularity DECIMAL := 0;
BEGIN
  -- Get trend signals from last N hours
  SELECT COALESCE(AVG(signal_strength), 0) INTO v_trend_score
  FROM entity_trend_signals
  WHERE entity_id = p_entity_id
    AND detected_at > NOW() - (p_lookback_hours || ' hours')::INTERVAL;

  -- Get base popularity from kg_persons or catalogue_movies
  SELECT COALESCE(popularity_score, 50) INTO v_base_popularity
  FROM kg_persons WHERE id = p_entity_id;

  IF v_base_popularity IS NULL THEN
    SELECT COALESCE(popularity_score, 50) INTO v_base_popularity
    FROM catalogue_movies WHERE id = p_entity_id;
  END IF;

  -- Calculate weighted relevance
  RETURN LEAST(100,
    (v_trend_score * 0.5) +
    (COALESCE(v_base_popularity, 50) * 0.3) +
    (v_social_score * 0.2)
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Find historic matches for a trend signal
CREATE OR REPLACE FUNCTION find_historic_matches(
  p_signal_id UUID,
  p_max_matches INTEGER DEFAULT 5
) RETURNS TABLE (
  entity_id UUID,
  entity_name TEXT,
  entity_type VARCHAR,
  match_type VARCHAR,
  relevance_score DECIMAL,
  match_reason TEXT
) AS $$
DECLARE
  v_signal RECORD;
BEGIN
  -- Get signal details
  SELECT * INTO v_signal FROM entity_trend_signals WHERE id = p_signal_id;

  IF v_signal IS NULL THEN
    RETURN;
  END IF;

  -- Find related historic entities
  RETURN QUERY
  WITH related_persons AS (
    -- Same name matches (e.g., NTR Jr trending -> NTR Sr historic)
    SELECT
      p.id,
      p.name_en,
      'person'::VARCHAR as etype,
      'name_similarity'::VARCHAR as mtype,
      80::DECIMAL as rscore,
      'Similar name in Telugu cinema history' as reason
    FROM kg_persons p
    WHERE p.is_canonical = true
      AND p.id != v_signal.entity_id
      AND (
        p.name_en ILIKE '%' || split_part(v_signal.entity_name, ' ', 1) || '%'
        OR v_signal.entity_name ILIKE '%' || split_part(p.name_en, ' ', 1) || '%'
      )
      AND p.debut_year < 2000  -- Historic
    LIMIT 3
  ),
  related_by_filmography AS (
    -- Worked together
    SELECT DISTINCT
      p.id,
      p.name_en,
      'person'::VARCHAR as etype,
      'collaboration'::VARCHAR as mtype,
      70::DECIMAL as rscore,
      'Collaborated in films' as reason
    FROM kg_persons p
    JOIN kg_filmography f1 ON f1.person_id = p.id
    JOIN kg_filmography f2 ON f2.movie_title_en = f1.movie_title_en
    WHERE f2.person_id = v_signal.entity_id
      AND p.id != v_signal.entity_id
      AND p.debut_year < 2000
    LIMIT 3
  ),
  related_by_era AS (
    -- Same era
    SELECT
      p.id,
      p.name_en,
      'person'::VARCHAR as etype,
      'era'::VARCHAR as mtype,
      60::DECIMAL as rscore,
      'Same era in Telugu cinema' as reason
    FROM kg_persons p
    WHERE p.is_canonical = true
      AND p.era = (SELECT era FROM kg_persons WHERE id = v_signal.entity_id)
      AND p.id != v_signal.entity_id
      AND p.popularity_score > 50
    LIMIT 3
  )
  SELECT * FROM related_persons
  UNION ALL
  SELECT * FROM related_by_filmography
  UNION ALL
  SELECT * FROM related_by_era
  ORDER BY rscore DESC
  LIMIT p_max_matches;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate content recommendation
CREATE OR REPLACE FUNCTION generate_fusion_recommendation(
  p_signal_id UUID,
  p_historic_entity_id UUID,
  p_recommendation_type VARCHAR
) RETURNS UUID AS $$
DECLARE
  v_signal RECORD;
  v_historic RECORD;
  v_recommendation_id UUID;
  v_title TEXT;
  v_hook TEXT;
BEGIN
  -- Get signal and historic entity
  SELECT * INTO v_signal FROM entity_trend_signals WHERE id = p_signal_id;
  SELECT * INTO v_historic FROM kg_persons WHERE id = p_historic_entity_id;

  IF v_signal IS NULL OR v_historic IS NULL THEN
    RETURN NULL;
  END IF;

  -- Generate title based on type
  CASE p_recommendation_type
    WHEN 'trend_tribute' THEN
      v_title := v_historic.name_en || ': టాప్ 5 పెర్ఫార్మెన్సెస్ That Shaped Telugu Cinema';
      v_hook := v_historic.name_en || ' గురించి మాట్లాడుకుంటున్న సమయంలో, వారి అజరామర నటనను తిరిగి చూద్దాం.';
    WHEN 'legacy_connection' THEN
      v_title := 'How ' || v_signal.entity_name || ' Was Inspired by ' || v_historic.name_en;
      v_hook := 'తెలుగు సినిమా వారసత్వం ఎలా కొనసాగుతుందో చూద్దాం.';
    WHEN 'comparison' THEN
      v_title := v_signal.entity_name || ' vs ' || v_historic.name_en || ': The Ultimate Comparison';
      v_hook := 'రెండు తరాల సూపర్‌స్టార్ల మధ్య పోలిక.';
    ELSE
      v_title := v_historic.name_en || ': Why This Legend Matters Today';
      v_hook := 'ఈ రోజు ఎందుకు ఈ లెజెండ్ గురించి మాట్లాడుకుంటున్నాం.';
  END CASE;

  -- Insert recommendation
  INSERT INTO fusion_content_recommendations (
    recommendation_type,
    primary_trend_signal_id,
    trend_context,
    historic_entity_ids,
    historic_context,
    suggested_title,
    suggested_hook,
    relevance_score,
    timeliness_score,
    engagement_probability,
    relevance_expires_at
  ) VALUES (
    p_recommendation_type,
    p_signal_id,
    jsonb_build_object(
      'source', v_signal.signal_source,
      'strength', v_signal.signal_strength,
      'trigger', v_signal.trigger_reason
    ),
    ARRAY[p_historic_entity_id],
    jsonb_build_object(
      'name', v_historic.name_en,
      'era', v_historic.era,
      'occupation', v_historic.occupation
    ),
    v_title,
    v_hook,
    75,
    CASE
      WHEN v_signal.signal_strength > 80 THEN 90
      WHEN v_signal.signal_strength > 50 THEN 70
      ELSE 50
    END,
    65,
    NOW() + INTERVAL '7 days'
  )
  RETURNING id INTO v_recommendation_id;

  RETURN v_recommendation_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VIEWS
-- ============================================================

-- View: Current trending entities with historic connections
CREATE OR REPLACE VIEW v_trending_with_history AS
SELECT
  ets.id as signal_id,
  ets.entity_name,
  ets.entity_type,
  ets.signal_source,
  ets.signal_strength,
  ets.detected_at,
  ets.trigger_reason,
  COUNT(thm.id) as historic_matches,
  MAX(thm.relevance_score) as best_match_score,
  ARRAY_AGG(thm.historic_entity_name ORDER BY thm.relevance_score DESC) FILTER (WHERE thm.historic_entity_name IS NOT NULL) as historic_entities
FROM entity_trend_signals ets
LEFT JOIN trend_historic_matches thm ON thm.signal_id = ets.id
WHERE ets.detected_at > NOW() - INTERVAL '48 hours'
GROUP BY ets.id
ORDER BY ets.signal_strength DESC;

-- View: Top content recommendations
CREATE OR REPLACE VIEW v_top_recommendations AS
SELECT
  fcr.*,
  ets.entity_name as trend_entity,
  ets.signal_strength as trend_strength,
  ets.signal_source as trend_source
FROM fusion_content_recommendations fcr
JOIN entity_trend_signals ets ON ets.id = fcr.primary_trend_signal_id
WHERE fcr.status IN ('pending', 'approved')
  AND (fcr.relevance_expires_at IS NULL OR fcr.relevance_expires_at > NOW())
ORDER BY fcr.combined_score DESC;

-- View: Entity relevance spikes
CREATE OR REPLACE VIEW v_entity_relevance_spikes AS
SELECT
  erh.entity_id,
  erh.entity_name,
  erh.entity_type,
  erh.snapshot_date,
  erh.overall_relevance,
  erh.relevance_change,
  CASE
    WHEN erh.relevance_change > 30 THEN 'major_spike'
    WHEN erh.relevance_change > 15 THEN 'moderate_spike'
    WHEN erh.relevance_change > 5 THEN 'minor_spike'
    ELSE 'stable'
  END as spike_level
FROM entity_relevance_history erh
WHERE erh.snapshot_date >= CURRENT_DATE - 7
  AND erh.relevance_change > 5
ORDER BY erh.relevance_change DESC;

-- ============================================================
-- SAMPLE FUSION PATTERNS
-- ============================================================

INSERT INTO fusion_patterns (pattern_name, pattern_type, trigger_conditions, title_template, hook_template)
VALUES
  ('Birthday Tribute Top Performances', 'trend_tribute',
   '{"event_type": "birthday", "entity_type": "person", "min_popularity": 70}',
   '{name}: టాప్ {count} పెర్ఫార్మెన్సెస్ That Shaped Telugu Cinema',
   '{name} పుట్టినరోజు సందర్భంగా వారి అజరామర నటనను తిరిగి చూద్దాం.'),

  ('OTT Classic Trending', 'ott_classic',
   '{"signal_source": "ott_trending", "movie_age_years": 20}',
   'Why {movie} Still Trends on OTT After {years} Years',
   '{years} సంవత్సరాల తర్వాత కూడా ఈ క్లాసిక్ ఎందుకు ట్రెండ్ అవుతోంది?'),

  ('Legacy Connection', 'legacy_connection',
   '{"has_mentor_relation": true}',
   'How {current_star} Was Inspired by {legend}',
   'తెలుగు సినిమా వారసత్వం: {legend} నుండి {current_star} వరకు.'),

  ('Era Comparison', 'era_comparison',
   '{"compare_eras": true}',
   '{era1} vs {era2}: Telugu Cinema''s Evolution',
   'తెలుగు సినిమా ఎలా మారింది? రెండు యుగాల పోలిక.'),

  ('Remake vs Original', 'remake_original',
   '{"is_remake": true, "original_exists": true}',
   '{remake} vs {original}: Which Version Wins?',
   'ఒరిజినల్ vs రీమేక్: ఏది బెటర్?')
ON CONFLICT DO NOTHING;




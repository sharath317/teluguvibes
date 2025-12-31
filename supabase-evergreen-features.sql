-- ============================================================
-- TELUGU VIBES - EVERGREEN FEATURES SCHEMA
-- High-Impact, Low-Maintenance Additions
-- ============================================================

-- ============================================================
-- 1. ON THIS DAY IN TELUGU CINEMA
-- Daily evergreen content - generated once, cached forever
-- ============================================================

CREATE TABLE IF NOT EXISTS on_this_day_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Date key (MM-DD format for yearly recycling)
  day_key VARCHAR(5) NOT NULL, -- "01-15" for Jan 15
  year_generated INT NOT NULL, -- Year this was generated

  -- Cached content (never regenerate unless missing)
  events JSONB NOT NULL DEFAULT '[]',
  -- Structure: [{type, title_te, summary_te, entity_id, year, nostalgia_hook}]

  -- Metadata
  event_count INT NOT NULL DEFAULT 0,
  celebrities_count INT DEFAULT 0,
  movies_count INT DEFAULT 0,

  -- Cache control
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_published BOOLEAN DEFAULT true,

  UNIQUE(day_key, year_generated)
);

-- Index for fast daily lookups
CREATE INDEX IF NOT EXISTS idx_otd_day_key ON on_this_day_cache(day_key);
CREATE INDEX IF NOT EXISTS idx_otd_published ON on_this_day_cache(is_published);

-- ============================================================
-- 2. INTERVIEW INTELLIGENCE ENGINE
-- One-time extraction, permanent storage
-- ============================================================

CREATE TABLE IF NOT EXISTS interview_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source identification (prevents reprocessing)
  source_url TEXT UNIQUE NOT NULL,
  source_type VARCHAR(50) NOT NULL, -- 'youtube', 'news', 'podcast'
  source_hash VARCHAR(64) UNIQUE, -- Hash of content for dedup

  -- Metadata
  title TEXT,
  published_date DATE,
  interviewer TEXT,
  interviewee_id UUID REFERENCES celebrities(id),
  interviewee_name TEXT NOT NULL,

  -- Processing status
  is_processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links
  interview_id UUID NOT NULL REFERENCES interview_sources(id) ON DELETE CASCADE,
  celebrity_id UUID REFERENCES celebrities(id),

  -- Insight data
  insight_type VARCHAR(50) NOT NULL,
  -- Types: 'opinion', 'controversy', 'career_reflection', 'trivia', 'quote', 'revelation'

  content_te TEXT NOT NULL, -- Telugu content
  content_en TEXT, -- English translation (optional)

  -- Context
  topic TEXT, -- What/who the insight is about
  related_movie_id UUID REFERENCES movies(id),
  related_celebrity_id UUID REFERENCES celebrities(id),
  sentiment VARCHAR(20), -- 'positive', 'negative', 'neutral', 'controversial'

  -- Ranking
  importance_score INT DEFAULT 50, -- 1-100
  is_quotable BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for "What X said about Y" queries
CREATE INDEX IF NOT EXISTS idx_insights_celebrity ON interview_insights(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_insights_type ON interview_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_topic ON interview_insights(topic);
CREATE INDEX IF NOT EXISTS idx_insights_related_celeb ON interview_insights(related_celebrity_id);

-- ============================================================
-- 3. TREND HEAT INDEX
-- Simple arithmetic scoring (0-100), no ML
-- ============================================================

CREATE TABLE IF NOT EXISTS trend_heat_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entity identification
  entity_type VARCHAR(50) NOT NULL, -- 'celebrity', 'movie', 'topic'
  entity_id UUID, -- References celebrities/movies
  entity_name TEXT NOT NULL,

  -- Individual signal scores (0-100 each)
  search_score INT DEFAULT 0, -- Google Trends delta
  youtube_score INT DEFAULT 0, -- YouTube view velocity
  tmdb_score INT DEFAULT 0, -- TMDB popularity delta
  site_score INT DEFAULT 0, -- Internal clicks
  social_score INT DEFAULT 0, -- Social mentions (future)

  -- Final heat index (weighted average)
  heat_index INT NOT NULL DEFAULT 0, -- 0-100
  heat_label VARCHAR(20), -- 'cold', 'warm', 'hot', 'viral'

  -- Delta tracking
  previous_heat INT DEFAULT 0,
  heat_delta INT DEFAULT 0, -- Current - Previous
  trending_direction VARCHAR(10), -- 'up', 'down', 'stable'

  -- Time control (update every 6-12 hours)
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  update_count INT DEFAULT 1,

  UNIQUE(entity_type, entity_name)
);

CREATE INDEX IF NOT EXISTS idx_heat_entity ON trend_heat_scores(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_heat_score ON trend_heat_scores(heat_index DESC);
CREATE INDEX IF NOT EXISTS idx_heat_label ON trend_heat_scores(heat_label);

-- ============================================================
-- 4. WHY THIS MOVIE WORKED/FAILED
-- One-time post-release analysis (7 days after release)
-- ============================================================

CREATE TABLE IF NOT EXISTS movie_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Movie link
  movie_id UUID UNIQUE REFERENCES movies(id) ON DELETE CASCADE,
  movie_title TEXT NOT NULL,
  release_date DATE,

  -- Input data (captured at analysis time)
  budget_estimate BIGINT, -- In INR
  box_office_estimate BIGINT, -- In INR
  verdict VARCHAR(50), -- 'hit', 'superhit', 'blockbuster', 'average', 'flop', 'disaster'
  recovery_percentage DECIMAL(5,2), -- Box office / Budget * 100

  -- Audience data
  imdb_rating DECIMAL(3,1),
  audience_rating DECIMAL(3,1),
  critic_rating DECIMAL(3,1),
  review_sentiment VARCHAR(20), -- 'positive', 'mixed', 'negative'

  -- AI-generated analysis (Telugu)
  what_worked_te TEXT,
  what_failed_te TEXT,
  audience_mismatch_te TEXT,
  comparable_movies_te TEXT,
  one_line_verdict_te TEXT,

  -- Factors (structured)
  success_factors JSONB DEFAULT '[]', -- ['story', 'music', 'star_power', 'timing']
  failure_factors JSONB DEFAULT '[]', -- ['weak_script', 'poor_marketing', 'competition']
  comparable_movies JSONB DEFAULT '[]', -- [{id, title, similarity_reason}]

  -- Generation control
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  is_final BOOLEAN DEFAULT true, -- Never update after generation

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_verdict ON movie_analysis(verdict);
CREATE INDEX IF NOT EXISTS idx_analysis_date ON movie_analysis(release_date DESC);

-- ============================================================
-- 5. BROWSER PERSONALIZATION SYNC (Optional server-side backup)
-- Only stores aggregated anonymous analytics, no user profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS anonymous_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Anonymous session (browser-generated, no PII)
  session_hash VARCHAR(64) NOT NULL, -- SHA256 of random browser ID

  -- Aggregated preferences (no personal data)
  preferred_categories TEXT[] DEFAULT '{}',
  viewed_celebrities UUID[] DEFAULT '{}',
  viewed_movies UUID[] DEFAULT '{}',

  -- Stats only (for trending calculation)
  total_views INT DEFAULT 0,
  last_active TIMESTAMPTZ DEFAULT NOW(),

  -- Auto-cleanup (GDPR compliant)
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

-- Auto-delete expired sessions (run weekly)
CREATE INDEX IF NOT EXISTS idx_anon_expires ON anonymous_preferences(expires_at);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to get today's "On This Day" events
CREATE OR REPLACE FUNCTION get_on_this_day(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  day_key VARCHAR(5),
  events JSONB,
  event_count INT,
  generated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.day_key,
    c.events,
    c.event_count,
    c.generated_at
  FROM on_this_day_cache c
  WHERE c.day_key = TO_CHAR(target_date, 'MM-DD')
    AND c.is_published = true
  ORDER BY c.year_generated DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate heat label from score
CREATE OR REPLACE FUNCTION calculate_heat_label(score INT)
RETURNS VARCHAR(20) AS $$
BEGIN
  RETURN CASE
    WHEN score >= 80 THEN 'viral'
    WHEN score >= 60 THEN 'hot'
    WHEN score >= 40 THEN 'warm'
    ELSE 'cold'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-update heat_label
CREATE OR REPLACE FUNCTION update_heat_label()
RETURNS TRIGGER AS $$
BEGIN
  NEW.heat_label := calculate_heat_label(NEW.heat_index);
  NEW.trending_direction := CASE
    WHEN NEW.heat_index > NEW.previous_heat THEN 'up'
    WHEN NEW.heat_index < NEW.previous_heat THEN 'down'
    ELSE 'stable'
  END;
  NEW.heat_delta := NEW.heat_index - NEW.previous_heat;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_heat_label
  BEFORE INSERT OR UPDATE ON trend_heat_scores
  FOR EACH ROW EXECUTE FUNCTION update_heat_label();

-- ============================================================
-- VIEWS FOR EASY QUERYING
-- ============================================================

-- Top trending entities
CREATE OR REPLACE VIEW v_trending_now AS
SELECT
  entity_type,
  entity_name,
  entity_id,
  heat_index,
  heat_label,
  trending_direction,
  heat_delta,
  last_updated
FROM trend_heat_scores
WHERE heat_index >= 40
ORDER BY heat_index DESC
LIMIT 50;

-- Recent movie analyses
CREATE OR REPLACE VIEW v_movie_analyses AS
SELECT
  ma.*,
  m.poster_url,
  m.genre
FROM movie_analysis ma
LEFT JOIN movies m ON ma.movie_id = m.id
ORDER BY ma.release_date DESC;

-- Celebrity insights summary
CREATE OR REPLACE VIEW v_celebrity_insights AS
SELECT
  ii.celebrity_id,
  c.name_en as celebrity_name,
  COUNT(*) as insight_count,
  COUNT(*) FILTER (WHERE ii.insight_type = 'controversy') as controversies,
  COUNT(*) FILTER (WHERE ii.insight_type = 'trivia') as trivia_count,
  COUNT(*) FILTER (WHERE ii.is_quotable) as quotable_count
FROM interview_insights ii
LEFT JOIN celebrities c ON ii.celebrity_id = c.id
GROUP BY ii.celebrity_id, c.name_en;

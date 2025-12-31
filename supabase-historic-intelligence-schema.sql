-- ============================================================
-- HISTORIC INTELLIGENCE SYSTEM SCHEMA
-- Evergreen Content Engine for Telugu Cinema
-- Auto-generates: Birthdays, Anniversaries, "On This Day" posts
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ENHANCED HISTORIC EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS historic_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Event Identity
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'birthday',                -- Actor/Actress birthdays
    'death_anniversary',       -- Death anniversaries
    'debut_anniversary',       -- Career debut
    'movie_release',           -- Movie release anniversaries
    'award_win',               -- Award win anniversaries
    'career_milestone',        -- 100 movies, etc.
    'historical_event',        -- Industry events
    'festival_release',        -- Festival special releases
    'comeback',                -- Career comeback
    'retirement'               -- Retirement anniversaries
  )),

  -- Date (MM-DD pattern for annual matching)
  event_month INTEGER NOT NULL CHECK (event_month BETWEEN 1 AND 12),
  event_day INTEGER NOT NULL CHECK (event_day BETWEEN 1 AND 31),
  event_year INTEGER NOT NULL,                -- Original year

  -- Entity References (flexible - can be person or movie)
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('person', 'movie', 'industry')),
  person_id UUID,                             -- Reference to kg_persons
  movie_id UUID,                              -- Reference to catalogue_movies
  celebrity_id UUID,                          -- Legacy: Reference to celebrities table

  -- Event Details
  title_en TEXT NOT NULL,
  title_te TEXT,
  description TEXT,
  significance_score INTEGER DEFAULT 50 CHECK (significance_score BETWEEN 0 AND 100),

  -- Priority & Ranking
  priority_score DECIMAL(5,2) DEFAULT 50,
  popularity_boost DECIMAL(5,2) DEFAULT 0,     -- From entity popularity
  recency_factor DECIMAL(5,2) DEFAULT 1,       -- Decays for very old events

  -- Fatigue Prevention
  times_published INTEGER DEFAULT 0,
  last_published_at TIMESTAMPTZ,
  min_gap_days INTEGER DEFAULT 365,            -- Minimum days between publications
  fatigue_score DECIMAL(5,2) DEFAULT 0,        -- Higher = more fatigued

  -- Content Quality
  has_rich_context BOOLEAN DEFAULT false,      -- Has bio, works, awards data
  content_quality_score DECIMAL(3,2) DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,

  -- Metadata
  source VARCHAR(50) DEFAULT 'auto',           -- auto, manual, wikidata, tmdb
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for event deduplication
  UNIQUE(event_type, entity_type, person_id, movie_id, event_year)
);

-- ============================================================
-- 2. HISTORIC POST TRACKING (Enhanced)
-- ============================================================
CREATE TABLE IF NOT EXISTS historic_post_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  event_id UUID NOT NULL REFERENCES historic_events(id) ON DELETE CASCADE,
  post_id UUID,                               -- Reference to posts table

  -- Publication Info
  published_year INTEGER NOT NULL,
  published_at TIMESTAMPTZ,

  -- Content Versioning
  content_version INTEGER DEFAULT 1,
  title_used TEXT,
  was_ai_generated BOOLEAN DEFAULT true,
  was_human_edited BOOLEAN DEFAULT false,
  human_pov_added BOOLEAN DEFAULT false,

  -- Performance Metrics
  views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  avg_time_on_page INTEGER DEFAULT 0,          -- Seconds
  scroll_depth DECIMAL(5,2) DEFAULT 0,         -- 0-100%
  bounce_rate DECIMAL(5,2) DEFAULT 0,

  -- Engagement
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  bookmarks INTEGER DEFAULT 0,

  -- Performance Score (calculated)
  performance_score DECIMAL(5,2) DEFAULT 0,
  performance_rank INTEGER,                    -- Rank among similar events

  -- Learning Signals
  outperformed_average BOOLEAN DEFAULT false,
  content_signals JSONB DEFAULT '{}',          -- What worked/didn't

  -- Recycling
  eligible_for_recycle BOOLEAN DEFAULT false,
  recycle_priority DECIMAL(5,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(event_id, published_year)
);

-- ============================================================
-- 3. EVERGREEN CONTENT INTELLIGENCE
-- ============================================================
CREATE TABLE IF NOT EXISTS evergreen_intelligence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  event_id UUID REFERENCES historic_events(id) ON DELETE CASCADE,
  entity_id UUID,                             -- Person or movie ID
  entity_type VARCHAR(20),

  -- Pattern Recognition
  best_publishing_time TIME,                  -- Optimal time to publish
  best_publishing_day_offset INTEGER DEFAULT 0, -- Days before/after event

  -- Performance History (year-over-year)
  yearly_performance JSONB DEFAULT '[]',      -- [{year, views, engagement, rank}]
  avg_yearly_views DECIMAL(12,2) DEFAULT 0,
  peak_year INTEGER,
  peak_views INTEGER,

  -- Content Learning
  best_performing_angle TEXT,                 -- What hook worked best
  best_title_pattern TEXT,
  avoid_patterns TEXT[],                      -- What didn't work

  -- Audience Insights
  primary_audience_age TEXT,
  primary_device TEXT,
  peak_traffic_source TEXT,

  -- Recycling Strategy
  recycle_strategy VARCHAR(50) DEFAULT 'refresh',  -- refresh, repost, enhance
  recycle_frequency INTEGER DEFAULT 1,             -- Times per year
  next_eligible_date DATE,

  -- Fatigue Metrics
  engagement_trend VARCHAR(20) DEFAULT 'stable',   -- rising, stable, declining
  fatigue_level INTEGER DEFAULT 0 CHECK (fatigue_level BETWEEN 0 AND 100),
  cooldown_until DATE,

  -- Recommendations
  recommended_action VARCHAR(50),                  -- publish, skip, refresh, enhance
  action_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. CONTENT FATIGUE TRACKER
-- ============================================================
CREATE TABLE IF NOT EXISTS content_fatigue_tracker (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- What's being tracked
  fatigue_type VARCHAR(50) NOT NULL,           -- entity, topic, event_type, style
  entity_id UUID,
  entity_name TEXT,

  -- Exposure Metrics
  total_posts_30d INTEGER DEFAULT 0,
  total_posts_90d INTEGER DEFAULT 0,
  total_posts_365d INTEGER DEFAULT 0,

  -- Engagement Trend
  avg_engagement_30d DECIMAL(5,2) DEFAULT 0,
  avg_engagement_90d DECIMAL(5,2) DEFAULT 0,
  engagement_trend VARCHAR(20) DEFAULT 'stable',

  -- Fatigue Score (0-100)
  fatigue_score INTEGER DEFAULT 0,
  fatigue_reason TEXT,

  -- Recommendations
  cooldown_days INTEGER DEFAULT 0,
  cooldown_until DATE,
  suggested_gap_days INTEGER DEFAULT 7,

  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. MOVIE ANNIVERSARY EVENTS (Auto-populated)
-- ============================================================
CREATE TABLE IF NOT EXISTS movie_anniversaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  movie_id UUID NOT NULL,                     -- Reference to catalogue_movies

  -- Movie Details (denormalized for quick access)
  movie_title_en TEXT NOT NULL,
  movie_title_te TEXT,
  release_date DATE NOT NULL,
  release_year INTEGER NOT NULL,

  -- Anniversary Milestones to track
  track_1_year BOOLEAN DEFAULT true,
  track_5_year BOOLEAN DEFAULT true,
  track_10_year BOOLEAN DEFAULT true,
  track_25_year BOOLEAN DEFAULT true,
  track_50_year BOOLEAN DEFAULT false,

  -- Movie Importance
  is_blockbuster BOOLEAN DEFAULT false,
  is_classic BOOLEAN DEFAULT false,
  is_cult BOOLEAN DEFAULT false,
  significance_score INTEGER DEFAULT 50,

  -- Director/Hero for content
  director_name TEXT,
  hero_name TEXT,

  -- Poster for social
  poster_url TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. DAILY GENERATION LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS historic_generation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  run_date DATE NOT NULL,
  run_time TIMESTAMPTZ DEFAULT NOW(),

  -- Events Found
  total_events_found INTEGER DEFAULT 0,
  birthdays_found INTEGER DEFAULT 0,
  death_anniversaries_found INTEGER DEFAULT 0,
  movie_anniversaries_found INTEGER DEFAULT 0,
  other_events_found INTEGER DEFAULT 0,

  -- Filtering
  events_after_fatigue_filter INTEGER DEFAULT 0,
  events_after_priority_filter INTEGER DEFAULT 0,

  -- Generation
  drafts_generated INTEGER DEFAULT 0,
  drafts_updated INTEGER DEFAULT 0,
  drafts_skipped INTEGER DEFAULT 0,
  generation_errors INTEGER DEFAULT 0,

  -- Performance
  execution_time_ms INTEGER,
  ai_calls_made INTEGER DEFAULT 0,
  ai_tokens_used INTEGER DEFAULT 0,

  -- Details
  events_processed JSONB DEFAULT '[]',
  errors JSONB DEFAULT '[]',

  status VARCHAR(20) DEFAULT 'completed',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Historic Events
CREATE INDEX IF NOT EXISTS idx_historic_events_date
  ON historic_events(event_month, event_day);
CREATE INDEX IF NOT EXISTS idx_historic_events_type
  ON historic_events(event_type);
CREATE INDEX IF NOT EXISTS idx_historic_events_person
  ON historic_events(person_id) WHERE person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_historic_events_movie
  ON historic_events(movie_id) WHERE movie_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_historic_events_priority
  ON historic_events(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_historic_events_fatigue
  ON historic_events(fatigue_score ASC);

-- Post Tracking
CREATE INDEX IF NOT EXISTS idx_historic_tracking_event
  ON historic_post_tracking(event_id);
CREATE INDEX IF NOT EXISTS idx_historic_tracking_year
  ON historic_post_tracking(published_year);
CREATE INDEX IF NOT EXISTS idx_historic_tracking_performance
  ON historic_post_tracking(performance_score DESC);
CREATE INDEX IF NOT EXISTS idx_historic_tracking_recycle
  ON historic_post_tracking(eligible_for_recycle, recycle_priority DESC);

-- Movie Anniversaries
CREATE INDEX IF NOT EXISTS idx_movie_anniversaries_date
  ON movie_anniversaries(
    EXTRACT(MONTH FROM release_date),
    EXTRACT(DAY FROM release_date)
  );
CREATE INDEX IF NOT EXISTS idx_movie_anniversaries_year
  ON movie_anniversaries(release_year);

-- Fatigue Tracker
CREATE INDEX IF NOT EXISTS idx_fatigue_entity
  ON content_fatigue_tracker(entity_id);
CREATE INDEX IF NOT EXISTS idx_fatigue_cooldown
  ON content_fatigue_tracker(cooldown_until)
  WHERE cooldown_until IS NOT NULL;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function: Calculate event priority score
CREATE OR REPLACE FUNCTION calculate_event_priority(
  event_type VARCHAR,
  years_ago INTEGER,
  entity_popularity DECIMAL,
  times_published INTEGER,
  is_milestone_year BOOLEAN
) RETURNS DECIMAL AS $$
DECLARE
  base_score DECIMAL := 50;
  recency_bonus DECIMAL := 0;
  popularity_bonus DECIMAL := 0;
  fatigue_penalty DECIMAL := 0;
  milestone_bonus DECIMAL := 0;
BEGIN
  -- Event type weight
  CASE event_type
    WHEN 'birthday' THEN base_score := 60;
    WHEN 'death_anniversary' THEN base_score := 70;
    WHEN 'movie_release' THEN base_score := 55;
    WHEN 'debut_anniversary' THEN base_score := 50;
    WHEN 'award_win' THEN base_score := 45;
    ELSE base_score := 40;
  END CASE;

  -- Recency bonus (recent events more interesting, except very old classics)
  IF years_ago <= 5 THEN recency_bonus := 20;
  ELSIF years_ago <= 10 THEN recency_bonus := 15;
  ELSIF years_ago <= 25 THEN recency_bonus := 10;
  ELSIF years_ago <= 50 THEN recency_bonus := 5;
  ELSIF years_ago >= 50 THEN recency_bonus := 15; -- Classic status
  END IF;

  -- Entity popularity bonus (0-100 → 0-25)
  popularity_bonus := COALESCE(entity_popularity, 0) * 0.25;

  -- Fatigue penalty
  fatigue_penalty := LEAST(times_published * 5, 30);

  -- Milestone year bonus (10, 25, 50, 75, 100 years)
  IF is_milestone_year THEN
    milestone_bonus := 25;
  ELSIF years_ago % 5 = 0 THEN
    milestone_bonus := 10;
  END IF;

  RETURN GREATEST(0, LEAST(100,
    base_score + recency_bonus + popularity_bonus + milestone_bonus - fatigue_penalty
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Calculate fatigue score
CREATE OR REPLACE FUNCTION calculate_fatigue_score(
  times_published INTEGER,
  last_published_at TIMESTAMPTZ,
  avg_performance DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  time_factor DECIMAL := 0;
  publish_factor DECIMAL := 0;
  performance_factor DECIMAL := 0;
BEGIN
  -- Time since last publish (0-40 points)
  IF last_published_at IS NOT NULL THEN
    time_factor := LEAST(40, 40 - (EXTRACT(DAYS FROM NOW() - last_published_at) / 365 * 40));
  END IF;

  -- Number of times published (0-30 points)
  publish_factor := LEAST(30, times_published * 5);

  -- Performance trend (0-30 points, inverse - good performance = less fatigue)
  IF avg_performance IS NOT NULL THEN
    performance_factor := GREATEST(0, 30 - (avg_performance * 0.3));
  END IF;

  RETURN LEAST(100, time_factor + publish_factor + performance_factor);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get today's historic events with smart filtering
CREATE OR REPLACE FUNCTION get_todays_historic_events(
  p_month INTEGER,
  p_day INTEGER,
  p_current_year INTEGER,
  p_max_results INTEGER DEFAULT 15
) RETURNS TABLE (
  event_id UUID,
  event_type VARCHAR,
  entity_type VARCHAR,
  person_id UUID,
  movie_id UUID,
  title_en TEXT,
  title_te TEXT,
  event_year INTEGER,
  years_ago INTEGER,
  priority_score DECIMAL,
  fatigue_score DECIMAL,
  is_milestone_year BOOLEAN,
  times_published INTEGER,
  last_performance DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    he.id as event_id,
    he.event_type,
    he.entity_type,
    he.person_id,
    he.movie_id,
    he.title_en,
    he.title_te,
    he.event_year,
    p_current_year - he.event_year as years_ago,
    he.priority_score,
    he.fatigue_score,
    ((p_current_year - he.event_year) IN (10, 25, 50, 75, 100)) as is_milestone_year,
    he.times_published,
    COALESCE(
      (SELECT hpt.performance_score
       FROM historic_post_tracking hpt
       WHERE hpt.event_id = he.id
       ORDER BY hpt.published_year DESC LIMIT 1),
      0
    ) as last_performance
  FROM historic_events he
  WHERE he.event_month = p_month
    AND he.event_day = p_day
    AND he.is_active = true
    AND (he.last_published_at IS NULL OR
         he.last_published_at < NOW() - INTERVAL '300 days')
    AND he.fatigue_score < 80
  ORDER BY
    he.priority_score DESC,
    he.fatigue_score ASC,
    he.times_published ASC
  LIMIT p_max_results;
END;
$$ LANGUAGE plpgsql;

-- Function: Get movie anniversaries for today
CREATE OR REPLACE FUNCTION get_todays_movie_anniversaries(
  p_month INTEGER,
  p_day INTEGER,
  p_current_year INTEGER
) RETURNS TABLE (
  anniversary_id UUID,
  movie_id UUID,
  movie_title_en TEXT,
  movie_title_te TEXT,
  release_year INTEGER,
  years_ago INTEGER,
  is_milestone BOOLEAN,
  director_name TEXT,
  hero_name TEXT,
  poster_url TEXT,
  significance_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ma.id,
    ma.movie_id,
    ma.movie_title_en,
    ma.movie_title_te,
    ma.release_year,
    p_current_year - ma.release_year as years_ago,
    CASE
      WHEN (p_current_year - ma.release_year) IN (1, 5, 10, 25, 50, 75, 100) THEN true
      WHEN (p_current_year - ma.release_year) % 10 = 0 THEN true
      ELSE false
    END as is_milestone,
    ma.director_name,
    ma.hero_name,
    ma.poster_url,
    ma.significance_score
  FROM movie_anniversaries ma
  WHERE EXTRACT(MONTH FROM ma.release_date) = p_month
    AND EXTRACT(DAY FROM ma.release_date) = p_day
    AND ma.is_active = true
    AND (
      (ma.track_1_year AND p_current_year - ma.release_year = 1) OR
      (ma.track_5_year AND p_current_year - ma.release_year = 5) OR
      (ma.track_10_year AND (p_current_year - ma.release_year) % 10 = 0) OR
      (ma.track_25_year AND (p_current_year - ma.release_year) = 25) OR
      (ma.track_50_year AND (p_current_year - ma.release_year) = 50) OR
      (ma.is_blockbuster AND (p_current_year - ma.release_year) % 5 = 0) OR
      (ma.is_classic AND (p_current_year - ma.release_year) >= 20)
    )
  ORDER BY
    ma.significance_score DESC,
    CASE WHEN (p_current_year - ma.release_year) IN (25, 50) THEN 0 ELSE 1 END,
    years_ago ASC;
END;
$$ LANGUAGE plpgsql;

-- Function: Update fatigue scores (run after publication)
CREATE OR REPLACE FUNCTION update_event_fatigue(p_event_id UUID)
RETURNS VOID AS $$
DECLARE
  v_times_published INTEGER;
  v_last_published TIMESTAMPTZ;
  v_avg_performance DECIMAL;
BEGIN
  -- Get current stats
  SELECT times_published, last_published_at INTO v_times_published, v_last_published
  FROM historic_events WHERE id = p_event_id;

  -- Get average performance
  SELECT AVG(performance_score) INTO v_avg_performance
  FROM historic_post_tracking
  WHERE event_id = p_event_id;

  -- Update fatigue score
  UPDATE historic_events
  SET
    fatigue_score = calculate_fatigue_score(
      v_times_published + 1,
      NOW(),
      v_avg_performance
    ),
    times_published = times_published + 1,
    last_published_at = NOW(),
    updated_at = NOW()
  WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger: Auto-update event priority on changes
CREATE OR REPLACE FUNCTION trigger_update_event_priority()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_event_priority ON historic_events;
CREATE TRIGGER trg_update_event_priority
  BEFORE UPDATE ON historic_events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_event_priority();

-- ============================================================
-- VIEWS
-- ============================================================

-- View: Upcoming events (next 7 days)
CREATE OR REPLACE VIEW v_upcoming_historic_events AS
SELECT
  he.*,
  EXTRACT(YEAR FROM NOW()) - he.event_year as years_ago,
  CASE
    WHEN (EXTRACT(YEAR FROM NOW()) - he.event_year) IN (10, 25, 50, 75, 100) THEN true
    ELSE false
  END as is_milestone_year
FROM historic_events he
WHERE he.is_active = true
  AND he.fatigue_score < 80
  AND (
    (he.event_month = EXTRACT(MONTH FROM NOW())
     AND he.event_day >= EXTRACT(DAY FROM NOW()))
    OR
    (he.event_month = EXTRACT(MONTH FROM NOW() + INTERVAL '7 days'))
  )
ORDER BY he.event_month, he.event_day, he.priority_score DESC;

-- View: High-performing recyclable content
CREATE OR REPLACE VIEW v_recyclable_content AS
SELECT
  hpt.*,
  he.event_type,
  he.title_en,
  he.entity_type,
  ei.recycle_strategy,
  ei.engagement_trend
FROM historic_post_tracking hpt
JOIN historic_events he ON hpt.event_id = he.id
LEFT JOIN evergreen_intelligence ei ON ei.event_id = he.id
WHERE hpt.eligible_for_recycle = true
  AND hpt.performance_score >= 70
  AND (ei.cooldown_until IS NULL OR ei.cooldown_until <= CURRENT_DATE)
ORDER BY hpt.recycle_priority DESC, hpt.performance_score DESC;

-- View: Event type performance summary
CREATE OR REPLACE VIEW v_event_type_performance AS
SELECT
  he.event_type,
  COUNT(*) as total_events,
  COUNT(DISTINCT hpt.id) as total_publications,
  ROUND(AVG(hpt.performance_score), 2) as avg_performance,
  ROUND(AVG(hpt.views), 0) as avg_views,
  ROUND(AVG(hpt.shares), 0) as avg_shares,
  COUNT(*) FILTER (WHERE hpt.performance_score >= 70) as high_performers
FROM historic_events he
LEFT JOIN historic_post_tracking hpt ON hpt.event_id = he.id
GROUP BY he.event_type
ORDER BY avg_performance DESC NULLS LAST;

-- ============================================================
-- INITIAL SETUP: Populate from existing data
-- ============================================================

-- Populate movie anniversaries from catalogue_movies
INSERT INTO movie_anniversaries (
  movie_id, movie_title_en, movie_title_te,
  release_date, release_year,
  is_blockbuster, is_classic, is_cult,
  significance_score, director_name, hero_name, poster_url
)
SELECT
  cm.id,
  cm.title_en,
  cm.title_te,
  cm.release_date,
  cm.release_year,
  cm.verdict IN ('all_time_blockbuster', 'blockbuster'),
  cm.is_classic,
  cm.is_cult,
  CASE
    WHEN cm.verdict = 'all_time_blockbuster' THEN 95
    WHEN cm.verdict = 'blockbuster' THEN 85
    WHEN cm.is_classic THEN 90
    WHEN cm.verdict = 'super_hit' THEN 75
    WHEN cm.verdict = 'hit' THEN 60
    ELSE 40
  END,
  cm.director_names[1],
  cm.hero_names[1],
  cm.poster_url
FROM catalogue_movies cm
WHERE cm.release_date IS NOT NULL
  AND cm.is_published = true
ON CONFLICT DO NOTHING;

-- Populate historic events from kg_persons (birthdays/death anniversaries)
INSERT INTO historic_events (
  event_type, event_month, event_day, event_year,
  entity_type, person_id, title_en, title_te,
  significance_score, priority_score, source
)
SELECT
  'birthday',
  EXTRACT(MONTH FROM p.birth_date)::INTEGER,
  EXTRACT(DAY FROM p.birth_date)::INTEGER,
  EXTRACT(YEAR FROM p.birth_date)::INTEGER,
  'person',
  p.id,
  p.name_en || ' Birthday',
  COALESCE(p.name_te, p.name_en) || ' పుట్టినరోజు',
  CASE
    WHEN p.popularity_score > 80 THEN 90
    WHEN p.popularity_score > 50 THEN 70
    ELSE 50
  END,
  50 + COALESCE(p.popularity_score, 0) * 0.3,
  'wikidata'
FROM kg_persons p
WHERE p.birth_date IS NOT NULL
  AND p.is_canonical = true
ON CONFLICT DO NOTHING;

-- Death anniversaries
INSERT INTO historic_events (
  event_type, event_month, event_day, event_year,
  entity_type, person_id, title_en, title_te,
  significance_score, priority_score, source
)
SELECT
  'death_anniversary',
  EXTRACT(MONTH FROM p.death_date)::INTEGER,
  EXTRACT(DAY FROM p.death_date)::INTEGER,
  EXTRACT(YEAR FROM p.death_date)::INTEGER,
  'person',
  p.id,
  p.name_en || ' Death Anniversary',
  COALESCE(p.name_te, p.name_en) || ' వర్ధంతి',
  CASE
    WHEN p.popularity_score > 80 THEN 95
    WHEN p.popularity_score > 50 THEN 80
    ELSE 60
  END,
  60 + COALESCE(p.popularity_score, 0) * 0.3,
  'wikidata'
FROM kg_persons p
WHERE p.death_date IS NOT NULL
  AND p.is_canonical = true
ON CONFLICT DO NOTHING;




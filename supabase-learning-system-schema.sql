-- =====================================================
-- TeluguVibes Self-Learning Media Platform
-- Intelligence & Memory Database Schema v1.0
-- =====================================================
-- This schema enables continuous learning from:
-- - User behavior
-- - Content performance
-- - Trend signals
-- - AI generation outcomes
-- =====================================================

-- =====================================================
-- PART 1: TREND INTELLIGENCE LAYER
-- =====================================================

-- 1.1 RAW TREND SIGNALS (Never discard - learning fuel)
CREATE TABLE IF NOT EXISTS trend_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source identification
  source TEXT NOT NULL CHECK (source IN (
    'google_trends', 'tmdb', 'youtube', 'twitter', 
    'reddit', 'internal', 'news_api', 'manual'
  )),
  
  -- Signal data
  keyword TEXT NOT NULL,
  keyword_te TEXT, -- Telugu translation
  related_keywords TEXT[] DEFAULT '{}',
  
  -- Scoring
  raw_score DECIMAL(10,2) DEFAULT 0, -- Source-specific score
  normalized_score DECIMAL(5,2) DEFAULT 0, -- 0-100 normalized
  velocity DECIMAL(8,2) DEFAULT 0, -- Rate of change
  
  -- Classification
  category TEXT, -- entertainment, politics, sports, etc.
  entity_type TEXT, -- movie, actor, event, etc.
  entity_id TEXT, -- Reference to internal entity
  sentiment DECIMAL(3,2) DEFAULT 0, -- -1 to 1
  
  -- Metadata
  raw_data JSONB, -- Original API response
  geo_region TEXT DEFAULT 'IN-TS', -- Telangana default
  
  -- Timestamps
  signal_timestamp TIMESTAMPTZ NOT NULL, -- When trend occurred
  ingested_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- 1.2 TOPIC CLUSTERS (Merged related keywords)
CREATE TABLE IF NOT EXISTS topic_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Cluster identity
  cluster_name TEXT NOT NULL,
  cluster_name_te TEXT,
  primary_keyword TEXT NOT NULL,
  
  -- Related signals
  signal_ids UUID[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  
  -- Aggregate scoring
  total_signals INTEGER DEFAULT 0,
  avg_score DECIMAL(5,2) DEFAULT 0,
  peak_score DECIMAL(5,2) DEFAULT 0,
  trend_direction TEXT DEFAULT 'stable' CHECK (trend_direction IN ('rising', 'falling', 'stable', 'spiking')),
  
  -- Classification
  category TEXT,
  is_evergreen BOOLEAN DEFAULT false,
  is_seasonal BOOLEAN DEFAULT false,
  season_months INTEGER[], -- e.g., {1, 12} for New Year
  
  -- Performance history
  times_covered INTEGER DEFAULT 0,
  avg_performance_score DECIMAL(5,2) DEFAULT 0,
  last_covered_at TIMESTAMPTZ,
  
  -- Status
  is_saturated BOOLEAN DEFAULT false, -- Topic fatigue
  saturation_score DECIMAL(3,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 2: CONTENT PERFORMANCE TRACKING
-- =====================================================

-- 2.1 CONTENT PERFORMANCE (Every post's metrics)
CREATE TABLE IF NOT EXISTS content_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL, -- Reference to posts table
  
  -- Core metrics
  views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  
  -- Engagement
  avg_time_on_page DECIMAL(8,2) DEFAULT 0, -- seconds
  scroll_depth_avg DECIMAL(5,2) DEFAULT 0, -- 0-100%
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Interactions
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  reactions INTEGER DEFAULT 0,
  
  -- Click-through
  ctr_from_home DECIMAL(5,4) DEFAULT 0,
  ctr_from_category DECIMAL(5,4) DEFAULT 0,
  ctr_from_search DECIMAL(5,4) DEFAULT 0,
  ctr_from_social DECIMAL(5,4) DEFAULT 0,
  
  -- Conversion
  ad_clicks INTEGER DEFAULT 0,
  ad_revenue DECIMAL(10,2) DEFAULT 0,
  
  -- Source breakdown
  traffic_sources JSONB DEFAULT '{}',
  device_breakdown JSONB DEFAULT '{}',
  geo_breakdown JSONB DEFAULT '{}',
  
  -- Time-based
  peak_hour INTEGER, -- 0-23
  peak_day INTEGER, -- 0-6
  viral_coefficient DECIMAL(5,2) DEFAULT 0,
  
  -- Calculated scores
  engagement_score DECIMAL(5,2) DEFAULT 0,
  quality_score DECIMAL(5,2) DEFAULT 0,
  monetization_score DECIMAL(5,2) DEFAULT 0,
  overall_performance DECIMAL(5,2) DEFAULT 0,
  
  -- Comparison
  category_rank INTEGER,
  percentile DECIMAL(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id)
);

-- 2.2 AUDIENCE PREFERENCES (Aggregated learnings)
CREATE TABLE IF NOT EXISTS audience_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dimension
  dimension_type TEXT NOT NULL CHECK (dimension_type IN (
    'category', 'topic', 'format', 'length', 'tone', 
    'time_of_day', 'day_of_week', 'device', 'entity'
  )),
  dimension_value TEXT NOT NULL,
  
  -- Metrics
  total_views BIGINT DEFAULT 0,
  avg_engagement DECIMAL(5,2) DEFAULT 0,
  avg_time_spent DECIMAL(8,2) DEFAULT 0,
  preference_score DECIMAL(5,2) DEFAULT 0, -- Calculated preference
  
  -- Trends
  trend_7d DECIMAL(5,2) DEFAULT 0, -- % change
  trend_30d DECIMAL(5,2) DEFAULT 0,
  
  -- Time patterns
  peak_hours INTEGER[] DEFAULT '{}',
  peak_days INTEGER[] DEFAULT '{}',
  
  -- Sample size
  sample_count INTEGER DEFAULT 0,
  confidence_level DECIMAL(3,2) DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(dimension_type, dimension_value)
);

-- =====================================================
-- PART 3: AI LEARNING & MEMORY
-- =====================================================

-- 3.1 AI LEARNINGS (What worked, what failed)
CREATE TABLE IF NOT EXISTS ai_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  learning_type TEXT NOT NULL CHECK (learning_type IN (
    'content_structure', 'title_pattern', 'hook_style',
    'image_selection', 'publish_timing', 'topic_angle',
    'review_format', 'length_optimal', 'tone_preference'
  )),
  
  category TEXT,
  entity_type TEXT,
  
  -- The learning
  pattern_description TEXT NOT NULL,
  success_indicators JSONB, -- What metrics proved this
  failure_indicators JSONB,
  
  -- Evidence
  positive_examples UUID[] DEFAULT '{}', -- post_ids that worked
  negative_examples UUID[] DEFAULT '{}', -- post_ids that failed
  
  -- Confidence
  confidence_score DECIMAL(3,2) DEFAULT 0.5,
  sample_size INTEGER DEFAULT 0,
  
  -- Application
  prompt_modification TEXT, -- How to apply in prompts
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ
);

-- 3.2 CONTENT GENERATION CONTEXT (Pre-generation analysis)
CREATE TABLE IF NOT EXISTS generation_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Input signals
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'trending', 'scheduled', 'evergreen', 'breaking', 'manual'
  )),
  source_signals UUID[] DEFAULT '{}', -- trend_signal_ids
  cluster_id UUID REFERENCES topic_clusters(id),
  
  -- AI Analysis (before generation)
  detected_intent TEXT, -- gossip, nostalgia, info, emotion
  audience_mood TEXT, -- excited, curious, nostalgic, angry
  topic_saturation DECIMAL(3,2) DEFAULT 0,
  seasonal_relevance DECIMAL(3,2) DEFAULT 0,
  
  -- AI Recommendations
  recommended_angle TEXT,
  recommended_tone TEXT,
  recommended_length INTEGER,
  recommended_format TEXT,
  recommended_images TEXT[],
  optimal_publish_time TIMESTAMPTZ,
  
  -- Historical context
  similar_past_posts UUID[] DEFAULT '{}',
  avg_similar_performance DECIMAL(5,2),
  
  -- Full AI reasoning
  reasoning_json JSONB NOT NULL,
  
  -- Outcome tracking
  post_id UUID, -- Generated post
  actual_performance DECIMAL(5,2),
  prediction_accuracy DECIMAL(3,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 TEMPLATE PERFORMANCE (Which structures work)
CREATE TABLE IF NOT EXISTS content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template identity
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN (
    'news', 'review', 'gossip', 'biography', 'listicle',
    'comparison', 'interview', 'anniversary', 'breaking'
  )),
  
  -- Structure
  sections JSONB NOT NULL, -- Ordered sections with descriptions
  word_count_range INT4RANGE,
  
  -- Performance
  times_used INTEGER DEFAULT 0,
  avg_performance DECIMAL(5,2) DEFAULT 0,
  best_categories TEXT[] DEFAULT '{}',
  
  -- AI prompt
  generation_prompt TEXT,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 4: REVIEW SYSTEM LEARNING
-- =====================================================

-- 4.1 REVIEW LEARNINGS (What review styles work)
CREATE TABLE IF NOT EXISTS review_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  movie_genre TEXT,
  movie_scale TEXT, -- big_budget, indie, medium
  star_power TEXT, -- high, medium, low
  
  -- What worked
  optimal_length INTEGER,
  best_opening_style TEXT,
  most_read_sections TEXT[],
  skipped_sections TEXT[],
  
  -- Audience vs Editorial
  rating_agreement_rate DECIMAL(3,2), -- How often users agree
  controversial_topics TEXT[],
  
  -- Emphasis learnings
  emphasis_weights JSONB, -- {acting: 0.3, story: 0.4, etc.}
  
  -- Sample data
  sample_reviews UUID[] DEFAULT '{}',
  sample_size INTEGER DEFAULT 0,
  confidence DECIMAL(3,2) DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.2 PREDICTION ACCURACY (Box office, ratings)
CREATE TABLE IF NOT EXISTS prediction_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was predicted
  prediction_type TEXT NOT NULL CHECK (prediction_type IN (
    'box_office', 'ott_success', 'audience_rating', 'hit_flop'
  )),
  entity_id UUID, -- movie_id
  entity_name TEXT,
  
  -- Prediction
  predicted_value DECIMAL(12,2),
  predicted_label TEXT, -- hit, flop, average
  confidence_at_prediction DECIMAL(3,2),
  prediction_date TIMESTAMPTZ,
  
  -- Signals used
  signals_used JSONB, -- What data informed prediction
  
  -- Actual outcome
  actual_value DECIMAL(12,2),
  actual_label TEXT,
  outcome_date TIMESTAMPTZ,
  
  -- Accuracy
  accuracy_score DECIMAL(3,2),
  error_margin DECIMAL(12,2),
  
  -- Learning
  lessons_learned TEXT,
  signal_adjustments JSONB, -- Which signals to weight differently
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 5: EVERGREEN & RECYCLING INTELLIGENCE
-- =====================================================

-- 5.1 EVERGREEN CONTENT TRACKER
CREATE TABLE IF NOT EXISTS evergreen_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  
  -- Classification
  evergreen_type TEXT CHECK (evergreen_type IN (
    'celebrity_birthday', 'movie_anniversary', 'historic_event',
    'how_to', 'explainer', 'biography', 'best_of'
  )),
  
  -- Recurrence
  recurrence_pattern TEXT, -- 'yearly', 'monthly', 'on_trend'
  next_refresh_date DATE,
  annual_dates TEXT[], -- MM-DD patterns
  
  -- Performance history
  refresh_history JSONB DEFAULT '[]',
  total_lifetime_views BIGINT DEFAULT 0,
  best_performing_year INTEGER,
  
  -- Refresh strategy
  refresh_needed BOOLEAN DEFAULT false,
  refresh_priority DECIMAL(3,2) DEFAULT 0,
  last_refreshed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.2 CONTENT CANNIBALIZATION TRACKER
CREATE TABLE IF NOT EXISTS content_similarity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  post_id_a UUID NOT NULL,
  post_id_b UUID NOT NULL,
  
  similarity_score DECIMAL(3,2) NOT NULL, -- 0-1
  similarity_type TEXT, -- topic, entity, angle
  
  -- Impact
  cannibalization_detected BOOLEAN DEFAULT false,
  traffic_split JSONB, -- How traffic divided
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id_a, post_id_b)
);

-- =====================================================
-- PART 6: REAL-TIME RANKING SIGNALS
-- =====================================================

-- 6.1 ENTITY POPULARITY (Actors, directors, etc.)
CREATE TABLE IF NOT EXISTS entity_popularity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT NOT NULL,
  
  -- Current scores
  current_score DECIMAL(8,2) DEFAULT 0,
  baseline_score DECIMAL(8,2) DEFAULT 0,
  
  -- Trends
  score_7d_ago DECIMAL(8,2),
  score_30d_ago DECIMAL(8,2),
  trend_direction TEXT,
  
  -- Signals
  search_volume INTEGER DEFAULT 0,
  social_mentions INTEGER DEFAULT 0,
  news_mentions INTEGER DEFAULT 0,
  site_searches INTEGER DEFAULT 0,
  
  -- Content opportunity
  coverage_gap_score DECIMAL(3,2) DEFAULT 0, -- High = need more content
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(entity_type, entity_name)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Trend signals
CREATE INDEX idx_trend_signals_source ON trend_signals(source);
CREATE INDEX idx_trend_signals_keyword ON trend_signals(keyword);
CREATE INDEX idx_trend_signals_timestamp ON trend_signals(signal_timestamp DESC);
CREATE INDEX idx_trend_signals_score ON trend_signals(normalized_score DESC);
CREATE INDEX idx_trend_signals_category ON trend_signals(category);

-- Topic clusters
CREATE INDEX idx_topic_clusters_category ON topic_clusters(category);
CREATE INDEX idx_topic_clusters_score ON topic_clusters(avg_score DESC);
CREATE INDEX idx_topic_clusters_trend ON topic_clusters(trend_direction);

-- Content performance
CREATE INDEX idx_content_performance_score ON content_performance(overall_performance DESC);
CREATE INDEX idx_content_performance_date ON content_performance(created_at DESC);

-- AI learnings
CREATE INDEX idx_ai_learnings_type ON ai_learnings(learning_type);
CREATE INDEX idx_ai_learnings_active ON ai_learnings(is_active) WHERE is_active = true;

-- Generation contexts
CREATE INDEX idx_generation_contexts_date ON generation_contexts(created_at DESC);

-- Entity popularity
CREATE INDEX idx_entity_popularity_score ON entity_popularity(current_score DESC);
CREATE INDEX idx_entity_popularity_type ON entity_popularity(entity_type);

-- =====================================================
-- FUNCTIONS FOR LEARNING SYSTEM
-- =====================================================

-- Calculate content performance score
CREATE OR REPLACE FUNCTION calculate_performance_score(p_post_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_views INTEGER;
  v_time DECIMAL;
  v_scroll DECIMAL;
  v_shares INTEGER;
  v_bounce DECIMAL;
  v_score DECIMAL;
BEGIN
  SELECT views, avg_time_on_page, scroll_depth_avg, shares, bounce_rate
  INTO v_views, v_time, v_scroll, v_shares, v_bounce
  FROM content_performance
  WHERE post_id = p_post_id;
  
  IF v_views IS NULL THEN RETURN 0; END IF;
  
  -- Weighted score calculation
  v_score := (
    (LEAST(v_views, 10000) / 100) * 0.25 + -- Views (capped)
    (v_time / 60) * 0.20 + -- Time in minutes
    (v_scroll) * 0.20 + -- Scroll depth
    (v_shares * 10) * 0.20 + -- Shares
    ((100 - v_bounce)) * 0.15 -- Inverse bounce rate
  );
  
  UPDATE content_performance 
  SET overall_performance = LEAST(v_score, 100),
      updated_at = NOW()
  WHERE post_id = p_post_id;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Detect topic saturation
CREATE OR REPLACE FUNCTION check_topic_saturation(p_keyword TEXT)
RETURNS DECIMAL AS $$
DECLARE
  v_recent_posts INTEGER;
  v_avg_performance DECIMAL;
  v_saturation DECIMAL;
BEGIN
  -- Count recent posts with this keyword
  SELECT COUNT(*), AVG(cp.overall_performance)
  INTO v_recent_posts, v_avg_performance
  FROM posts p
  JOIN content_performance cp ON cp.post_id = p.id
  WHERE p.title ILIKE '%' || p_keyword || '%'
  AND p.created_at > NOW() - INTERVAL '7 days';
  
  -- High posts + declining performance = saturation
  v_saturation := LEAST(1.0, (v_recent_posts * 0.1) + 
    CASE WHEN v_avg_performance < 50 THEN 0.3 ELSE 0 END);
  
  RETURN v_saturation;
END;
$$ LANGUAGE plpgsql;

-- Get AI recommendations for topic
CREATE OR REPLACE FUNCTION get_topic_recommendations(p_category TEXT)
RETURNS TABLE (
  keyword TEXT,
  score DECIMAL,
  saturation DECIMAL,
  recommended BOOLEAN,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.primary_keyword,
    tc.avg_score,
    tc.saturation_score,
    (tc.avg_score > 50 AND tc.saturation_score < 0.7) AS recommended,
    CASE 
      WHEN tc.saturation_score > 0.7 THEN 'Topic saturated - skip'
      WHEN tc.avg_score > 80 THEN 'Hot topic - prioritize'
      WHEN tc.is_evergreen THEN 'Evergreen - good filler'
      ELSE 'Normal priority'
    END AS reason
  FROM topic_clusters tc
  WHERE tc.category = p_category
  AND tc.updated_at > NOW() - INTERVAL '24 hours'
  ORDER BY 
    (tc.avg_score * (1 - tc.saturation_score)) DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Update audience preferences from performance data
CREATE OR REPLACE FUNCTION update_audience_preferences()
RETURNS void AS $$
BEGIN
  -- Update category preferences
  INSERT INTO audience_preferences (dimension_type, dimension_value, total_views, avg_engagement, sample_count)
  SELECT 
    'category',
    p.category,
    SUM(cp.views),
    AVG(cp.engagement_score),
    COUNT(*)
  FROM posts p
  JOIN content_performance cp ON cp.post_id = p.id
  WHERE p.created_at > NOW() - INTERVAL '30 days'
  GROUP BY p.category
  ON CONFLICT (dimension_type, dimension_value) 
  DO UPDATE SET
    total_views = EXCLUDED.total_views,
    avg_engagement = EXCLUDED.avg_engagement,
    sample_count = EXCLUDED.sample_count,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SCHEDULED MAINTENANCE
-- =====================================================

-- Clean old trend signals (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_signals()
RETURNS INTEGER AS $$
DECLARE
  deleted INTEGER;
BEGIN
  DELETE FROM trend_signals
  WHERE ingested_at < NOW() - INTERVAL '30 days'
  AND id NOT IN (
    SELECT UNNEST(signal_ids) FROM topic_clusters
  );
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$ LANGUAGE plpgsql;


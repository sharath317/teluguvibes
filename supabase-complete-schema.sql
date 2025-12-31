-- =====================================================
-- TeluguVibes Complete Production Schema
-- Self-Learning Telugu Entertainment Platform
-- =====================================================

-- =====================================================
-- PART 1: CORE CONTENT TABLES
-- =====================================================

-- 1.1 POSTS (Main content)
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_te TEXT,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  body TEXT,
  body_te TEXT,

  -- Classification
  category TEXT NOT NULL DEFAULT 'entertainment',
  subcategory TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Media
  image_url TEXT,
  image_alt TEXT,
  image_source TEXT,
  image_license TEXT,

  -- Metadata
  author_id TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_featured BOOLEAN DEFAULT false,
  is_breaking BOOLEAN DEFAULT false,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  schema_type TEXT DEFAULT 'NewsArticle',

  -- Stats
  views INTEGER DEFAULT 0,

  -- Timestamps
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 COMMENTS
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

  author_name TEXT NOT NULL,
  author_email TEXT,
  content TEXT NOT NULL,

  is_approved BOOLEAN DEFAULT false,
  is_shadow_banned BOOLEAN DEFAULT false,
  sentiment_score DECIMAL(3,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 2: COMPLETE MOVIE CATALOGUE
-- =====================================================

-- 2.1 MOVIES (Complete Telugu film database)
CREATE TABLE IF NOT EXISTS movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  title_en TEXT NOT NULL,
  title_te TEXT,
  slug TEXT UNIQUE NOT NULL,

  -- External IDs
  tmdb_id INTEGER UNIQUE,
  imdb_id TEXT,

  -- Release Info
  release_date DATE,
  release_year INTEGER,
  runtime_minutes INTEGER,

  -- Classification
  genres TEXT[] DEFAULT '{}',
  language TEXT DEFAULT 'Telugu',
  certification TEXT,
  era TEXT, -- golden, classic, modern, new_wave

  -- Media
  poster_url TEXT,
  poster_source TEXT DEFAULT 'tmdb',
  backdrop_url TEXT,
  trailer_url TEXT,

  -- Crew
  director TEXT,
  directors TEXT[] DEFAULT '{}',
  producers TEXT[] DEFAULT '{}',
  music_director TEXT,
  cinematographer TEXT,
  editor TEXT,
  writer TEXT,

  -- Cast
  cast_members JSONB DEFAULT '[]',
  hero TEXT,
  heroine TEXT,

  -- Story
  synopsis TEXT,
  synopsis_te TEXT,
  plot_keywords TEXT[] DEFAULT '{}',

  -- Box Office
  budget_inr BIGINT,
  worldwide_gross_inr BIGINT,
  india_gross_inr BIGINT,
  first_day_gross_inr BIGINT,
  first_week_gross_inr BIGINT,

  -- Verdict
  verdict TEXT CHECK (verdict IN (
    'all_time_blockbuster', 'blockbuster', 'super_hit',
    'hit', 'above_average', 'average', 'below_average',
    'flop', 'disaster', 'unknown'
  )),
  verdict_notes TEXT,

  -- Ratings
  tmdb_rating DECIMAL(3,1),
  imdb_rating DECIMAL(3,1),
  our_rating DECIMAL(3,1),
  audience_rating DECIMAL(3,1),
  total_reviews INTEGER DEFAULT 0,

  -- Tags
  is_classic BOOLEAN DEFAULT false,
  is_cult BOOLEAN DEFAULT false,
  is_underrated BOOLEAN DEFAULT false,
  is_remake BOOLEAN DEFAULT false,
  original_movie_id UUID REFERENCES movies(id),

  -- OTT
  ott_platforms JSONB DEFAULT '[]',
  ott_release_date DATE,

  -- Status
  is_published BOOLEAN DEFAULT true,
  data_quality_score DECIMAL(3,2) DEFAULT 0,
  last_synced_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 MOVIE REVIEWS
CREATE TABLE IF NOT EXISTS movie_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,

  -- Reviewer
  reviewer_type TEXT DEFAULT 'admin',
  reviewer_name TEXT NOT NULL,
  reviewer_avatar TEXT,

  -- Ratings (0-10)
  overall_rating DECIMAL(3,1) NOT NULL,
  direction_rating DECIMAL(3,1),
  screenplay_rating DECIMAL(3,1),
  acting_rating DECIMAL(3,1),
  music_rating DECIMAL(3,1),
  cinematography_rating DECIMAL(3,1),
  production_rating DECIMAL(3,1),
  entertainment_rating DECIMAL(3,1),

  -- Content
  title TEXT,
  title_te TEXT,
  summary TEXT,
  summary_te TEXT,

  direction_review TEXT,
  screenplay_review TEXT,
  acting_review TEXT,
  music_review TEXT,
  cinematography_review TEXT,

  directors_vision TEXT,
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  verdict TEXT,
  verdict_te TEXT,

  -- Recommendation
  worth_watching BOOLEAN DEFAULT true,
  recommended_for TEXT[] DEFAULT '{}',

  -- Engagement
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,

  -- Status
  is_featured BOOLEAN DEFAULT false,
  is_spoiler_free BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'draft',

  -- Human POV (mandatory)
  human_pov TEXT,
  human_pov_type TEXT,
  human_pov_editor TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 3: CELEBRITIES & HISTORIC INTELLIGENCE
-- =====================================================

-- 3.1 CELEBRITIES
CREATE TABLE IF NOT EXISTS celebrities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name_en TEXT NOT NULL,
  name_te TEXT,
  slug TEXT UNIQUE,

  -- External IDs
  wikidata_id TEXT,
  tmdb_id INTEGER,
  imdb_id TEXT,

  -- Bio
  gender TEXT,
  birth_date DATE,
  death_date DATE,
  birth_place TEXT,
  nationality TEXT DEFAULT 'Indian',

  -- Career
  occupation TEXT[] DEFAULT '{}',
  known_for TEXT,
  active_years TEXT,
  debut_year INTEGER,
  debut_movie TEXT,

  -- Bio
  short_bio TEXT,
  full_bio TEXT,

  -- Media
  profile_image TEXT,
  profile_image_source TEXT,
  gallery_images JSONB DEFAULT '[]',

  -- Social
  instagram_handle TEXT,
  twitter_handle TEXT,
  youtube_channel TEXT,

  -- Stats
  popularity_score DECIMAL(5,2) DEFAULT 0,
  filmography_count INTEGER DEFAULT 0,

  -- Era Classification
  era TEXT, -- legend, golden, classic, current
  is_legend BOOLEAN DEFAULT false,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 CELEBRITY EVENTS (Birthdays, anniversaries)
CREATE TABLE IF NOT EXISTS celebrity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebrity_id UUID REFERENCES celebrities(id) ON DELETE CASCADE,
  movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL CHECK (event_type IN (
    'birthday', 'death_anniversary', 'debut_anniversary',
    'movie_anniversary', 'award', 'milestone'
  )),

  event_date TEXT NOT NULL, -- MM-DD format for recurring
  event_year INTEGER,

  title TEXT NOT NULL,
  description TEXT,

  priority_score DECIMAL(3,2) DEFAULT 0.5,
  auto_generate BOOLEAN DEFAULT true,

  last_generated_year INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 HISTORIC POSTS (Generated from events)
CREATE TABLE IF NOT EXISTS historic_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES celebrity_events(id),
  post_id UUID REFERENCES posts(id),

  event_type TEXT NOT NULL,
  generated_year INTEGER NOT NULL,

  performance_score DECIMAL(5,2) DEFAULT 0,
  was_edited BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 4: SELF-LEARNING INTELLIGENCE
-- =====================================================

-- 4.1 TREND SIGNALS (Raw data from all sources)
CREATE TABLE IF NOT EXISTS trend_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source TEXT NOT NULL CHECK (source IN (
    'tmdb', 'youtube', 'twitter', 'google_trends',
    'news_api', 'internal', 'reddit', 'manual'
  )),

  keyword TEXT NOT NULL,
  keyword_te TEXT,
  related_keywords TEXT[] DEFAULT '{}',

  raw_score DECIMAL(10,2) DEFAULT 0,
  normalized_score DECIMAL(5,2) DEFAULT 0,
  velocity DECIMAL(8,2) DEFAULT 1,

  category TEXT,
  entity_type TEXT,
  entity_id TEXT,
  sentiment DECIMAL(3,2) DEFAULT 0,

  raw_data JSONB,
  geo_region TEXT DEFAULT 'IN-TS',

  signal_timestamp TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- 4.2 TOPIC CLUSTERS (Merged keywords)
CREATE TABLE IF NOT EXISTS topic_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  cluster_name TEXT NOT NULL UNIQUE,
  cluster_name_te TEXT,
  primary_keyword TEXT NOT NULL,

  signal_ids UUID[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',

  total_signals INTEGER DEFAULT 0,
  avg_score DECIMAL(5,2) DEFAULT 0,
  peak_score DECIMAL(5,2) DEFAULT 0,
  trend_direction TEXT DEFAULT 'stable',

  category TEXT,
  is_evergreen BOOLEAN DEFAULT false,
  is_seasonal BOOLEAN DEFAULT false,
  season_months INTEGER[],

  times_covered INTEGER DEFAULT 0,
  avg_performance_score DECIMAL(5,2) DEFAULT 0,
  last_covered_at TIMESTAMPTZ,

  saturation_score DECIMAL(3,2) DEFAULT 0,
  is_saturated BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.3 CONTENT PERFORMANCE (Per-post metrics)
CREATE TABLE IF NOT EXISTS content_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID UNIQUE NOT NULL,

  -- Views
  views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,

  -- Engagement
  avg_time_on_page DECIMAL(8,2) DEFAULT 0,
  scroll_depth_avg DECIMAL(5,2) DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,

  -- Interactions
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  reactions INTEGER DEFAULT 0,

  -- CTR
  ctr_from_home DECIMAL(5,4) DEFAULT 0,
  ctr_from_category DECIMAL(5,4) DEFAULT 0,
  ctr_from_search DECIMAL(5,4) DEFAULT 0,
  ctr_from_social DECIMAL(5,4) DEFAULT 0,

  -- Revenue
  ad_clicks INTEGER DEFAULT 0,
  ad_revenue DECIMAL(10,2) DEFAULT 0,

  -- Breakdowns
  traffic_sources JSONB DEFAULT '{}',
  device_breakdown JSONB DEFAULT '{}',
  geo_breakdown JSONB DEFAULT '{}',

  -- Time patterns
  peak_hour INTEGER,
  peak_day INTEGER,

  -- Calculated scores
  engagement_score DECIMAL(5,2) DEFAULT 0,
  quality_score DECIMAL(5,2) DEFAULT 0,
  monetization_score DECIMAL(5,2) DEFAULT 0,
  overall_performance DECIMAL(5,2) DEFAULT 0,

  -- Ranking
  category_rank INTEGER,
  percentile DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.4 AUDIENCE PREFERENCES
CREATE TABLE IF NOT EXISTS audience_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  dimension_type TEXT NOT NULL,
  dimension_value TEXT NOT NULL,

  total_views BIGINT DEFAULT 0,
  avg_engagement DECIMAL(5,2) DEFAULT 0,
  avg_time_spent DECIMAL(8,2) DEFAULT 0,
  preference_score DECIMAL(5,2) DEFAULT 0,

  trend_7d DECIMAL(5,2) DEFAULT 0,
  trend_30d DECIMAL(5,2) DEFAULT 0,

  peak_hours INTEGER[] DEFAULT '{}',
  peak_days INTEGER[] DEFAULT '{}',

  sample_count INTEGER DEFAULT 0,
  confidence_level DECIMAL(3,2) DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(dimension_type, dimension_value)
);

-- 4.5 AI LEARNINGS
CREATE TABLE IF NOT EXISTS ai_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  learning_type TEXT NOT NULL,
  category TEXT,
  entity_type TEXT,

  pattern_description TEXT NOT NULL,
  success_indicators JSONB,
  failure_indicators JSONB,

  positive_examples UUID[] DEFAULT '{}',
  negative_examples UUID[] DEFAULT '{}',

  confidence_score DECIMAL(3,2) DEFAULT 0.5,
  sample_size INTEGER DEFAULT 0,

  prompt_modification TEXT,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ
);

-- 4.6 GENERATION CONTEXTS (AI reasoning logs)
CREATE TABLE IF NOT EXISTS generation_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  trigger_type TEXT NOT NULL,
  source_signals UUID[] DEFAULT '{}',
  cluster_id UUID REFERENCES topic_clusters(id),

  detected_intent TEXT,
  audience_mood TEXT,
  topic_saturation DECIMAL(3,2) DEFAULT 0,
  seasonal_relevance DECIMAL(3,2) DEFAULT 0,

  recommended_angle TEXT,
  recommended_tone TEXT,
  recommended_length INTEGER,
  recommended_format TEXT,
  recommended_images TEXT[],
  optimal_publish_time TIMESTAMPTZ,

  similar_past_posts UUID[] DEFAULT '{}',
  avg_similar_performance DECIMAL(5,2),

  reasoning_json JSONB NOT NULL,

  post_id UUID,
  actual_performance DECIMAL(5,2),
  prediction_accuracy DECIMAL(3,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.7 CONTENT TEMPLATES
CREATE TABLE IF NOT EXISTS content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL,

  sections JSONB NOT NULL,
  word_count_range INT4RANGE,

  times_used INTEGER DEFAULT 0,
  avg_performance DECIMAL(5,2) DEFAULT 0,
  best_categories TEXT[] DEFAULT '{}',

  generation_prompt TEXT,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.8 REVIEW LEARNINGS
CREATE TABLE IF NOT EXISTS review_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  movie_genre TEXT,
  movie_scale TEXT,
  star_power TEXT,

  optimal_length INTEGER,
  best_opening_style TEXT,
  most_read_sections TEXT[] DEFAULT '{}',
  skipped_sections TEXT[] DEFAULT '{}',

  rating_agreement_rate DECIMAL(3,2),
  controversial_topics TEXT[] DEFAULT '{}',

  emphasis_weights JSONB,

  sample_reviews UUID[] DEFAULT '{}',
  sample_size INTEGER DEFAULT 0,
  confidence DECIMAL(3,2) DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.9 ENTITY POPULARITY
CREATE TABLE IF NOT EXISTS entity_popularity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT NOT NULL,

  current_score DECIMAL(8,2) DEFAULT 0,
  baseline_score DECIMAL(8,2) DEFAULT 0,

  score_7d_ago DECIMAL(8,2),
  score_30d_ago DECIMAL(8,2),
  trend_direction TEXT,

  search_volume INTEGER DEFAULT 0,
  social_mentions INTEGER DEFAULT 0,
  news_mentions INTEGER DEFAULT 0,
  site_searches INTEGER DEFAULT 0,

  coverage_gap_score DECIMAL(3,2) DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(entity_type, entity_name)
);

-- 4.10 EVERGREEN CONTENT
CREATE TABLE IF NOT EXISTS evergreen_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,

  evergreen_type TEXT,

  recurrence_pattern TEXT,
  next_refresh_date DATE,
  annual_dates TEXT[],

  refresh_history JSONB DEFAULT '[]',
  total_lifetime_views BIGINT DEFAULT 0,
  best_performing_year INTEGER,

  refresh_needed BOOLEAN DEFAULT false,
  refresh_priority DECIMAL(3,2) DEFAULT 0,
  last_refreshed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 5: IMAGE INTELLIGENCE
-- =====================================================

-- 5.1 IMAGE REGISTRY (Track all images)
CREATE TABLE IF NOT EXISTS image_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source
  source TEXT NOT NULL CHECK (source IN (
    'tmdb', 'wikimedia', 'wikipedia', 'unsplash',
    'pexels', 'official_kit', 'ai_generated', 'upload'
  )),
  source_url TEXT,
  source_id TEXT,

  -- License
  license_type TEXT,
  license_url TEXT,
  author TEXT,
  attribution_required BOOLEAN DEFAULT false,
  attribution_text TEXT,

  -- Storage
  storage_path TEXT,
  cdn_url TEXT,

  -- Dimensions
  width INTEGER,
  height INTEGER,
  aspect_ratio DECIMAL(4,2),

  -- Classification
  image_type TEXT, -- poster, backdrop, headshot, event, generic
  entity_type TEXT, -- movie, celebrity, event
  entity_id UUID,

  -- Quality
  has_watermark BOOLEAN DEFAULT false,
  is_safe BOOLEAN DEFAULT true,
  quality_score DECIMAL(3,2) DEFAULT 0.5,

  -- Performance
  times_used INTEGER DEFAULT 0,
  avg_engagement DECIMAL(5,2) DEFAULT 0,

  -- Status
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.2 IMAGE PERFORMANCE
CREATE TABLE IF NOT EXISTS image_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES image_registry(id),
  post_id UUID REFERENCES posts(id),

  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,4) DEFAULT 0,

  engagement_lift DECIMAL(5,2) DEFAULT 0,

  context TEXT, -- featured, thumbnail, inline

  recorded_at DATE DEFAULT CURRENT_DATE
);

-- =====================================================
-- PART 6: HOT MEDIA & SOCIAL
-- =====================================================

-- 6.1 MEDIA ENTITIES
CREATE TABLE IF NOT EXISTS media_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,
  name_te TEXT,
  type TEXT NOT NULL, -- actress, anchor, influencer

  celebrity_id UUID REFERENCES celebrities(id),

  instagram_handle TEXT,
  twitter_handle TEXT,
  youtube_channel TEXT,

  popularity_score DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.2 MEDIA POSTS (Photos, videos, embeds)
CREATE TABLE IF NOT EXISTS media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES media_entities(id),

  media_type TEXT NOT NULL, -- image, instagram, youtube, twitter
  source_url TEXT,
  embed_html TEXT,
  thumbnail_url TEXT,

  caption TEXT,
  caption_te TEXT,
  tags TEXT[] DEFAULT '{}',

  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,

  trending_score DECIMAL(5,2) DEFAULT 0,
  is_hot BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,

  status TEXT DEFAULT 'pending',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 7: HUMAN POV & EDITORIAL
-- =====================================================

-- 7.1 HUMAN POV
CREATE TABLE IF NOT EXISTS human_pov (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID UNIQUE NOT NULL,

  pov_text TEXT NOT NULL,
  pov_type TEXT NOT NULL,

  editor_id TEXT NOT NULL,
  editor_name TEXT,

  ai_gap_analysis TEXT,
  originality_score DECIMAL(3,2),

  pov_impact_score DECIMAL(5,2),
  with_pov_bounce_rate DECIMAL(5,2),
  without_pov_bounce_rate DECIMAL(5,2),

  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7.2 CITATION BLOCKS (Zero-Click SEO)
CREATE TABLE IF NOT EXISTS citation_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,

  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  answer_te TEXT,

  schema_type TEXT DEFAULT 'QAPage',
  schema_json JSONB,

  was_cited BOOLEAN DEFAULT false,
  cited_by TEXT[] DEFAULT '{}',
  citation_date TIMESTAMPTZ,
  citation_context TEXT,

  search_impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  position_avg DECIMAL(4,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7.3 AUTHOR ENTITIES
CREATE TABLE IF NOT EXISTS author_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  author_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_te TEXT,

  bio TEXT,
  expertise TEXT[] DEFAULT '{}',
  credentials TEXT[] DEFAULT '{}',
  profile_image TEXT,

  social_links JSONB DEFAULT '{}',
  same_as TEXT[] DEFAULT '{}',

  total_articles INTEGER DEFAULT 0,
  avg_article_performance DECIMAL(5,2) DEFAULT 0,
  citation_count INTEGER DEFAULT 0,

  experience_score DECIMAL(3,2) DEFAULT 0.5,
  expertise_score DECIMAL(3,2) DEFAULT 0.5,
  authority_score DECIMAL(3,2) DEFAULT 0.5,
  trust_score DECIMAL(3,2) DEFAULT 0.5,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7.4 PUBLISHING GATES
CREATE TABLE IF NOT EXISTS publishing_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID UNIQUE NOT NULL,

  has_human_pov BOOLEAN DEFAULT false,
  has_citation_block BOOLEAN DEFAULT false,
  has_answer_summary BOOLEAN DEFAULT false,
  has_schema_markup BOOLEAN DEFAULT false,

  originality_checked BOOLEAN DEFAULT false,
  originality_score DECIMAL(3,2),

  factual_checked BOOLEAN DEFAULT false,
  toxicity_checked BOOLEAN DEFAULT false,

  seo_title_optimized BOOLEAN DEFAULT false,
  meta_description_set BOOLEAN DEFAULT false,

  all_gates_passed BOOLEAN DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 8: OTT & UPCOMING
-- =====================================================

-- 8.1 OTT RELEASES
CREATE TABLE IF NOT EXISTS ott_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID REFERENCES movies(id),

  platform TEXT NOT NULL,
  release_date DATE,
  release_type TEXT, -- premiere, exclusive, shared

  streaming_url TEXT,

  is_confirmed BOOLEAN DEFAULT false,
  source_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8.2 UPCOMING MOVIES
CREATE TABLE IF NOT EXISTS upcoming_movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID REFERENCES movies(id),

  expected_release_date DATE,
  release_status TEXT, -- announced, filming, post_production, releasing

  announcement_date DATE,
  first_look_date DATE,
  teaser_date DATE,
  trailer_date DATE,

  hype_score DECIMAL(5,2) DEFAULT 0,

  updates JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 9: ANALYTICS (BROWSER-NATIVE INTEGRATION)
-- =====================================================

-- 9.1 PAGE VIEWS (Lightweight)
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  post_id UUID,
  page_path TEXT NOT NULL,

  session_id TEXT,
  visitor_id TEXT,

  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  device_type TEXT,
  browser TEXT,
  country TEXT,

  time_on_page INTEGER,
  scroll_depth INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9.2 INTERACTIONS
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  post_id UUID,
  session_id TEXT,

  interaction_type TEXT NOT NULL,
  target_element TEXT,

  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Posts
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at DESC) WHERE status = 'published';

-- Movies
CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug);
CREATE INDEX IF NOT EXISTS idx_movies_tmdb ON movies(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(release_year DESC);
CREATE INDEX IF NOT EXISTS idx_movies_verdict ON movies(verdict);
CREATE INDEX IF NOT EXISTS idx_movies_genres ON movies USING GIN(genres);
CREATE INDEX IF NOT EXISTS idx_movies_cast ON movies USING GIN(cast_members);

-- Celebrities
CREATE INDEX IF NOT EXISTS idx_celebrities_slug ON celebrities(slug);
CREATE INDEX IF NOT EXISTS idx_celebrities_birth ON celebrities(birth_date);

-- Trend Signals
CREATE INDEX IF NOT EXISTS idx_trend_signals_source ON trend_signals(source);
CREATE INDEX IF NOT EXISTS idx_trend_signals_keyword ON trend_signals(keyword);
CREATE INDEX IF NOT EXISTS idx_trend_signals_timestamp ON trend_signals(signal_timestamp DESC);

-- Content Performance
CREATE INDEX IF NOT EXISTS idx_content_performance_score ON content_performance(overall_performance DESC);

-- Image Registry
CREATE INDEX IF NOT EXISTS idx_image_registry_source ON image_registry(source);
CREATE INDEX IF NOT EXISTS idx_image_registry_entity ON image_registry(entity_type, entity_id);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_page_views_post ON page_views(post_id);
CREATE INDEX IF NOT EXISTS idx_page_views_date ON page_views(created_at DESC);

-- =====================================================
-- FUNCTIONS
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

  v_score := (
    (LEAST(v_views, 10000) / 100) * 0.25 +
    (COALESCE(v_time, 0) / 60) * 0.20 +
    (COALESCE(v_scroll, 0)) * 0.20 +
    (COALESCE(v_shares, 0) * 10) * 0.20 +
    ((100 - COALESCE(v_bounce, 50))) * 0.15
  );

  UPDATE content_performance
  SET overall_performance = LEAST(v_score, 100),
      updated_at = NOW()
  WHERE post_id = p_post_id;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Get today's celebrity events
CREATE OR REPLACE FUNCTION get_todays_events()
RETURNS TABLE (
  event_id UUID,
  celebrity_name TEXT,
  event_type TEXT,
  title TEXT,
  priority DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    c.name_en,
    ce.event_type,
    ce.title,
    ce.priority_score
  FROM celebrity_events ce
  JOIN celebrities c ON c.id = ce.celebrity_id
  WHERE ce.event_date = TO_CHAR(CURRENT_DATE, 'MM-DD')
  AND (ce.last_generated_year IS NULL OR ce.last_generated_year < EXTRACT(YEAR FROM CURRENT_DATE))
  ORDER BY ce.priority_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Update movie rating
CREATE OR REPLACE FUNCTION update_movie_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE movies SET
    our_rating = (
      SELECT AVG(overall_rating)
      FROM movie_reviews
      WHERE movie_id = COALESCE(NEW.movie_id, OLD.movie_id)
      AND status = 'published'
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM movie_reviews
      WHERE movie_id = COALESCE(NEW.movie_id, OLD.movie_id)
      AND status = 'published'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.movie_id, OLD.movie_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_movie_rating
  AFTER INSERT OR UPDATE OR DELETE ON movie_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_movie_rating();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_posts_updated_at
  BEFORE UPDATE ON posts FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_movies_updated_at
  BEFORE UPDATE ON movies FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_celebrities_updated_at
  BEFORE UPDATE ON celebrities FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();




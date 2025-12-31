-- ============================================================
-- TELUGUVIBES CONSOLIDATED DATABASE SCHEMA
-- ============================================================
--
-- This is the MASTER schema for TeluguVibes.
-- Run this to set up a fresh database or verify existing tables.
--
-- Features covered:
-- 1. Core content (posts, categories)
-- 2. Movies & Reviews
-- 3. Celebrities & Knowledge Graph
-- 4. Telugu Life Stories
-- 5. Memes & Cartoons
-- 6. Games & Interactives
-- 7. Self-Learning Intelligence
-- 8. User Engagement (no login required)
-- ============================================================

-- ============================================================
-- 1. CORE CONTENT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_te TEXT,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content
  title TEXT NOT NULL,
  title_te TEXT,
  slug TEXT NOT NULL UNIQUE,
  body TEXT,
  body_te TEXT,
  summary TEXT,
  summary_te TEXT,

  -- Media
  image_url TEXT,
  image_source TEXT,
  image_license TEXT,
  thumbnail_url TEXT,

  -- Classification
  category_id UUID REFERENCES categories(id),
  tags TEXT[],

  -- AI Metadata
  ai_generated BOOLEAN DEFAULT false,
  ai_confidence DECIMAL(3,2),
  content_analysis JSONB,
  human_pov TEXT,
  human_pov_editor TEXT,

  -- Publishing
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,

  -- Engagement
  view_count INT DEFAULT 0,
  share_count INT DEFAULT 0,
  read_completion_rate DECIMAL(5,2),

  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  schema_type TEXT DEFAULT 'Article',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at DESC);

-- ============================================================
-- 2. MOVIES & REVIEWS
-- ============================================================

CREATE TABLE IF NOT EXISTS movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiers
  tmdb_id INT UNIQUE,
  imdb_id TEXT,
  wikidata_id TEXT,

  -- Content
  title_en TEXT NOT NULL,
  title_te TEXT,
  slug TEXT UNIQUE,
  overview TEXT,
  overview_te TEXT,

  -- Details
  release_year INT,
  release_date DATE,
  runtime_minutes INT,
  genres TEXT[],

  -- Cast & Crew
  hero TEXT,
  heroine TEXT,
  director TEXT,
  music_director TEXT,
  cast JSONB,
  crew JSONB,

  -- Media
  poster_url TEXT,
  backdrop_url TEXT,
  trailer_url TEXT,

  -- Box Office
  budget BIGINT,
  revenue BIGINT,
  verdict TEXT,
  box_office_verified BOOLEAN DEFAULT false,

  -- Ratings
  tmdb_rating DECIMAL(3,1),
  imdb_rating DECIMAL(3,1),
  user_rating DECIMAL(3,1),

  -- Classification
  era TEXT,
  is_classic BOOLEAN DEFAULT false,
  popularity_score INT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(release_year);
CREATE INDEX IF NOT EXISTS idx_movies_tmdb ON movies(tmdb_id);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID REFERENCES movies(id),

  -- Content
  title TEXT,
  title_te TEXT,
  body TEXT,
  body_te TEXT,

  -- Structured Review
  story_rating INT CHECK (story_rating BETWEEN 1 AND 10),
  direction_rating INT CHECK (direction_rating BETWEEN 1 AND 10),
  acting_rating INT CHECK (acting_rating BETWEEN 1 AND 10),
  music_rating INT CHECK (music_rating BETWEEN 1 AND 10),
  cinematography_rating INT CHECK (cinematography_rating BETWEEN 1 AND 10),
  overall_rating INT CHECK (overall_rating BETWEEN 1 AND 10),

  -- Sections
  strengths TEXT[],
  weaknesses TEXT[],
  verdict TEXT,

  -- Similar Movies
  similar_movies UUID[],

  -- AI Metadata
  ai_generated BOOLEAN DEFAULT false,
  human_reviewed BOOLEAN DEFAULT false,

  -- Publishing
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. CELEBRITIES & KNOWLEDGE GRAPH
-- ============================================================

CREATE TABLE IF NOT EXISTS celebrities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiers
  tmdb_id INT,
  wikidata_id TEXT,

  -- Names
  name_en TEXT NOT NULL,
  name_te TEXT,
  slug TEXT UNIQUE,
  aliases TEXT[],

  -- Bio
  bio TEXT,
  bio_te TEXT,

  -- Details
  gender TEXT,
  birth_date DATE,
  death_date DATE,
  birth_place TEXT,

  -- Career
  primary_role TEXT,
  roles TEXT[],
  debut_year INT,
  active_years TEXT,
  era TEXT,

  -- Media
  image_url TEXT,
  image_source TEXT,
  image_license TEXT,

  -- Filmography
  filmography JSONB,
  notable_works TEXT[],

  -- Stats
  popularity_score INT,
  total_movies INT,
  hit_count INT,
  flop_count INT,

  -- Social
  social_handles JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_celebrities_name ON celebrities(name_en);
CREATE INDEX IF NOT EXISTS idx_celebrities_tmdb ON celebrities(tmdb_id);

-- ============================================================
-- 4. TELUGU LIFE STORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,

  -- Content
  title_te TEXT NOT NULL,
  title_en TEXT,
  body_te TEXT NOT NULL,
  summary_te TEXT,

  -- Classification
  category TEXT NOT NULL,
  tone TEXT,
  tags TEXT[],

  -- Reading
  reading_time_minutes INT,
  word_count INT,

  -- Source & Legal
  inspiration_source TEXT,
  source_subreddit TEXT,
  original_theme TEXT,
  is_original_narrative BOOLEAN DEFAULT true,
  attribution_text TEXT,

  -- Publishing
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,

  -- Engagement
  view_count INT DEFAULT 0,
  read_completion_rate DECIMAL(5,2),
  likes INT DEFAULT 0,

  -- AI
  ai_generated BOOLEAN DEFAULT false,
  generation_confidence DECIMAL(3,2),

  -- Evergreen
  is_evergreen BOOLEAN DEFAULT true,
  last_recycled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_category ON stories(category);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);

-- ============================================================
-- 5. MEMES & CARTOONS
-- ============================================================

CREATE TABLE IF NOT EXISTS memes (
  id TEXT PRIMARY KEY,

  -- Content
  title_te TEXT NOT NULL,
  caption_te TEXT NOT NULL,
  caption_en TEXT,

  -- Media
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  format TEXT,

  -- Source & License (CRITICAL)
  image_source TEXT NOT NULL,
  image_license TEXT NOT NULL,
  attribution TEXT,
  source_url TEXT,
  is_original BOOLEAN DEFAULT false,

  -- Classification
  category TEXT NOT NULL,
  tags TEXT[],

  -- Safety
  is_family_safe BOOLEAN DEFAULT true,
  contains_political BOOLEAN DEFAULT false,

  -- Engagement
  view_count INT DEFAULT 0,
  share_count INT DEFAULT 0,
  likes INT DEFAULT 0,

  -- Publishing
  status TEXT DEFAULT 'draft',
  rejection_reason TEXT,
  published_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meme_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,
  template_url TEXT NOT NULL,
  text_positions JSONB,

  -- License
  source TEXT NOT NULL,
  license TEXT NOT NULL,
  attribution TEXT,
  verified_legal BOOLEAN DEFAULT false,

  -- Usage
  popularity INT DEFAULT 0,
  times_used INT DEFAULT 0,
  example_captions TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. GAMES & INTERACTIVES
-- ============================================================

CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID,
  session_token TEXT NOT NULL,

  game_type TEXT NOT NULL,

  current_round INT DEFAULT 0,
  total_rounds INT DEFAULT 10,
  rounds_completed JSONB DEFAULT '[]'::jsonb,

  total_score INT DEFAULT 0,
  streak INT DEFAULT 0,
  best_streak INT DEFAULT 0,
  hints_used INT DEFAULT 0,

  current_difficulty TEXT DEFAULT 'medium',
  correct_answers INT DEFAULT 0,
  wrong_answers INT DEFAULT 0,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_time_seconds INT DEFAULT 0,

  status TEXT DEFAULT 'in_progress'
);

-- Stores generated rounds for answer verification
CREATE TABLE IF NOT EXISTS game_rounds (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES game_sessions(id),

  game_type TEXT NOT NULL,
  difficulty TEXT NOT NULL,

  question TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  options JSONB,
  hints JSONB,
  explanation TEXT,

  -- For enact mode
  enact_word TEXT,
  enact_word_te TEXT,
  is_enact_mode BOOLEAN DEFAULT false,
  category TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_rounds_session ON game_rounds(session_id);

CREATE TABLE IF NOT EXISTS iconic_dialogues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  dialogue TEXT NOT NULL,
  dialogue_romanized TEXT,

  movie_id UUID REFERENCES movies(id),
  movie_title TEXT NOT NULL,
  actor TEXT NOT NULL,
  character_name TEXT,
  year INT NOT NULL,

  difficulty TEXT DEFAULT 'medium',
  popularity INT DEFAULT 50,
  is_verified BOOLEAN DEFAULT false,
  is_safe_for_games BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. SELF-LEARNING INTELLIGENCE
-- ============================================================

CREATE TABLE IF NOT EXISTS trend_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source TEXT NOT NULL,
  keyword TEXT NOT NULL,
  normalized_score DECIMAL(5,2),
  category TEXT,

  raw_data JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topic_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  cluster_name TEXT NOT NULL,
  keywords TEXT[],
  normalized_score DECIMAL(5,2),
  saturation_level DECIMAL(5,2),
  peak_score DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id),

  views INT DEFAULT 0,
  unique_views INT DEFAULT 0,
  avg_time_on_page DECIMAL(8,2),
  scroll_depth DECIMAL(5,2),
  bounce_rate DECIMAL(5,2),

  ctr DECIMAL(5,4),
  share_rate DECIMAL(5,4),

  measured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  learning_type TEXT NOT NULL,
  topic TEXT,

  insight JSONB NOT NULL,
  confidence DECIMAL(3,2),

  applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audience_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  category TEXT,
  preference_type TEXT,
  preference_value JSONB,

  sample_size INT,
  confidence DECIMAL(3,2),

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generation_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id),

  -- Analysis
  audience_emotion TEXT,
  best_angle TEXT,
  safety_risk TEXT,
  narrative_plan JSONB,
  editorial_plan JSONB,

  -- Human POV
  needs_human_pov BOOLEAN DEFAULT false,
  human_pov TEXT,

  -- AI Reasoning
  ai_reasoning TEXT,
  confidence DECIMAL(3,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entity_popularity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT,

  current_score DECIMAL(8,2),
  week_change DECIMAL(5,2),
  month_change DECIMAL(5,2),

  peak_score DECIMAL(8,2),
  peak_date DATE,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS evergreen_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id),

  content_type TEXT,
  recycle_count INT DEFAULT 0,
  last_recycled_at TIMESTAMPTZ,

  performance_history JSONB,
  best_performing_version TEXT,

  next_recycle_eligible TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. HISTORIC INTELLIGENCE
-- ============================================================

CREATE TABLE IF NOT EXISTS historic_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,

  entity_id UUID,
  entity_name TEXT,
  entity_type TEXT,

  title TEXT,
  description TEXT,

  priority INT DEFAULT 50,
  last_used_year INT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historic_events_date ON historic_events(event_date);

-- ============================================================
-- 9. COMMENTS & ENGAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id),

  author_name TEXT NOT NULL,
  content TEXT NOT NULL,

  is_approved BOOLEAN DEFAULT false,
  is_positive BOOLEAN,
  is_pinned BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dedications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  sender_name TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  message TEXT NOT NULL,

  dedication_type TEXT NOT NULL,
  animation_type TEXT,

  is_approved BOOLEAN DEFAULT false,
  is_displayed BOOLEAN DEFAULT true,

  scheduled_date DATE,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. ADMIN & CONFIG
-- ============================================================

CREATE TABLE IF NOT EXISTS game_admin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  games_enabled BOOLEAN DEFAULT true,
  maintenance_mode BOOLEAN DEFAULT false,
  enabled_games TEXT[],

  excluded_movies TEXT[],
  excluded_celebrities TEXT[],
  excluded_dialogues TEXT[],

  default_difficulty TEXT DEFAULT 'medium',
  adaptive_difficulty BOOLEAN DEFAULT true,

  prefer_nostalgic BOOLEAN DEFAULT true,
  prefer_classics BOOLEAN DEFAULT true,

  exclude_sensitive_content BOOLEAN DEFAULT true,
  show_ads_in_games BOOLEAN DEFAULT false,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, name_te, slug, icon, sort_order) VALUES
  ('Entertainment', 'వినోదం', 'entertainment', '🎬', 1),
  ('Movies', 'సినిమాలు', 'movies', '🎥', 2),
  ('Celebrities', 'సెలెబ్రిటీలు', 'celebrities', '⭐', 3),
  ('Sports', 'స్పోర్ట్స్', 'sports', '🏏', 4),
  ('Politics', 'రాజకీయాలు', 'politics', '🏛️', 5),
  ('Technology', 'టెక్నాలజీ', 'technology', '💻', 6),
  ('Health', 'ఆరోగ్యం', 'health', '🏥', 7),
  ('Lifestyle', 'లైఫ్‌స్టైల్', 'lifestyle', '🌟', 8),
  ('Stories', 'కథలు', 'stories', '📖', 9),
  ('Memes', 'మీమ్స్', 'memes', '😂', 10)
ON CONFLICT (slug) DO NOTHING;

-- Insert default game config
INSERT INTO game_admin_config (
  games_enabled,
  enabled_games,
  default_difficulty,
  adaptive_difficulty,
  prefer_nostalgic,
  prefer_classics
) VALUES (
  true,
  ARRAY['dumb_charades', 'dialogue_guess', 'hit_or_flop', 'emoji_movie', 'director_guess'],
  'medium',
  true,
  true,
  true
) ON CONFLICT DO NOTHING;

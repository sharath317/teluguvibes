-- =====================================================
-- TeluguVibes Database Schema v2.0
-- 3-Stage AI Pipeline + Dynamic Categories + Analytics
-- =====================================================

-- =====================================================
-- 1. CATEGORIES TABLE (Dynamic, not hardcoded)
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_te TEXT NOT NULL,           -- Telugu name
  name_en TEXT NOT NULL,           -- English name
  description_te TEXT,
  description_en TEXT,
  icon TEXT,                       -- Emoji or icon name
  content_type TEXT NOT NULL DEFAULT 'news' CHECK (content_type IN ('news', 'evergreen', 'user_generated')),
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  image_style TEXT DEFAULT 'stock', -- stock, ai_generated, tmdb
  ai_rules JSONB DEFAULT '{}',     -- Category-specific AI generation rules
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (slug, name_te, name_en, icon, content_type, risk_level, image_style, ai_rules, display_order)
VALUES
  ('entertainment', 'వినోదం', 'Entertainment', '🎬', 'news', 'low', 'tmdb',
   '{"sections": ["hook", "context", "main_story", "social_buzz", "filmography", "closing"], "word_count": 350, "tone": "engaging"}', 1),
  ('gossip', 'గాసిప్స్', 'Gossip', '💫', 'news', 'medium', 'stock',
   '{"sections": ["hook", "context", "main_story", "social_buzz", "closing"], "word_count": 250, "tone": "casual"}', 2),
  ('sports', 'క్రీడలు', 'Sports', '🏏', 'news', 'low', 'stock',
   '{"sections": ["hook", "context", "main_story", "stats", "fan_reactions", "closing"], "word_count": 300, "tone": "exciting"}', 3),
  ('politics', 'రాజకీయాలు', 'Politics', '🗳️', 'news', 'high', 'stock',
   '{"sections": ["hook", "context", "main_story", "background", "closing"], "word_count": 400, "tone": "neutral"}', 4),
  ('trending', 'ట్రెండింగ్', 'Trending', '📈', 'news', 'medium', 'stock',
   '{"sections": ["hook", "context", "main_story", "social_buzz", "closing"], "word_count": 250, "tone": "viral"}', 5),
  ('love', 'ప్రేమ', 'Love & Romance', '❤️', 'evergreen', 'low', 'ai_generated',
   '{"sections": ["intro", "main_story", "closing"], "word_count": 200, "tone": "romantic"}', 6),
  ('health', 'ఆరోగ్యం', 'Health', '🧘', 'evergreen', 'high', 'stock',
   '{"sections": ["intro", "main_info", "disclaimer", "closing"], "word_count": 400, "tone": "informative", "require_disclaimer": true}', 7),
  ('food', 'వంటలు', 'Food & Recipes', '🍲', 'evergreen', 'low', 'stock',
   '{"sections": ["intro", "ingredients", "steps", "tips", "closing"], "word_count": 350, "tone": "friendly"}', 8),
  ('technology', 'టెక్నాలజీ', 'Technology', '💻', 'news', 'low', 'stock',
   '{"sections": ["hook", "context", "main_story", "closing"], "word_count": 300, "tone": "informative"}', 9),
  ('dedications', 'అంకితాలు', 'Dedications', '🎁', 'user_generated', 'low', 'ai_generated',
   '{"sections": ["message"], "word_count": 100, "tone": "emotional"}', 10)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 2. POSTS TABLE (Updated with category FK)
-- =====================================================
-- First add category_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'category_id') THEN
    ALTER TABLE posts ADD COLUMN category_id UUID REFERENCES categories(id);
  END IF;
END $$;

-- =====================================================
-- 3. POST ANALYSIS TABLE (Stage 1: Content Intelligence)
-- =====================================================
CREATE TABLE IF NOT EXISTS post_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  primary_entity JSONB NOT NULL DEFAULT '{}',  -- {name, type, confidence}
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'sensitive')),
  content_risk TEXT CHECK (content_risk IN ('low', 'medium', 'high')),
  risk_reasons TEXT[] DEFAULT '{}',
  writing_angle TEXT CHECK (writing_angle IN ('news', 'gossip', 'emotional', 'nostalgic', 'informative', 'inspirational')),
  audience_intent TEXT CHECK (audience_intent IN ('entertainment', 'information', 'emotion', 'inspiration')),
  recommended_word_count INTEGER,
  keywords TEXT[] DEFAULT '{}',
  related_topics TEXT[] DEFAULT '{}',
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(post_id)
);

-- =====================================================
-- 4. CONTENT VALIDATION TABLE (Stage 3: Validation)
-- =====================================================
CREATE TABLE IF NOT EXISTS content_validation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  validation_score INTEGER NOT NULL DEFAULT 0,
  telugu_percentage INTEGER NOT NULL DEFAULT 0,
  word_count INTEGER NOT NULL DEFAULT 0,
  toxicity_passed BOOLEAN DEFAULT true,
  flagged_terms TEXT[] DEFAULT '{}',
  sensitive_flags TEXT[] DEFAULT '{}',
  clickbait_score INTEGER DEFAULT 0,
  is_duplicate BOOLEAN DEFAULT false,
  recommendation TEXT CHECK (recommendation IN ('publish', 'review', 'reject')),
  reasons TEXT[] DEFAULT '{}',
  validated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(post_id)
);

-- =====================================================
-- 5. ON THIS DAY EVENTS (Historical Content Engine)
-- =====================================================
CREATE TABLE IF NOT EXISTS on_this_day_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  day INTEGER NOT NULL CHECK (day >= 1 AND day <= 31),
  event_type TEXT NOT NULL CHECK (event_type IN ('birthday', 'movie_release', 'sports', 'historical', 'death_anniversary')),
  entity_name TEXT NOT NULL,
  entity_name_te TEXT,
  year_occurred INTEGER,
  description TEXT,
  description_te TEXT,
  image_url TEXT,
  metadata JSONB DEFAULT '{}',  -- Additional data like TMDB ID, etc.
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(month, day, event_type, entity_name)
);

-- =====================================================
-- 6. POST PERFORMANCE (Analytics for Recycling)
-- =====================================================
CREATE TABLE IF NOT EXISTS post_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  avg_time_on_page INTEGER DEFAULT 0,  -- seconds
  bounce_rate DECIMAL(5,2) DEFAULT 0,

  UNIQUE(post_id, date)
);

-- =====================================================
-- 7. EVERGREEN POSTS (For Recycling System)
-- =====================================================
CREATE TABLE IF NOT EXISTS evergreen_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  peak_views INTEGER DEFAULT 0,
  peak_date DATE,
  seasonal_tags TEXT[] DEFAULT '{}',  -- ['ipl', 'diwali', 'elections']
  recycle_count INTEGER DEFAULT 0,
  last_recycled_at TIMESTAMPTZ,
  next_suggested_recycle DATE,
  is_recyclable BOOLEAN DEFAULT true,

  UNIQUE(post_id)
);

-- =====================================================
-- 8. USER DEDICATIONS (User Generated Content)
-- =====================================================
CREATE TABLE IF NOT EXISTS dedications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_name TEXT NOT NULL,
  to_name TEXT NOT NULL,
  occasion TEXT NOT NULL,  -- birthday, anniversary, valentine, etc.
  message TEXT NOT NULL,
  message_te TEXT,
  image_url TEXT,
  image_prompt TEXT,       -- AI image generation prompt used
  is_approved BOOLEAN DEFAULT false,
  share_url TEXT,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 9. COMMENT SAFETY (Shadow-ban, Rate Limiting)
-- =====================================================
DO $$
BEGIN
  -- Add shadow_banned column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'is_shadow_banned') THEN
    ALTER TABLE comments ADD COLUMN is_shadow_banned BOOLEAN DEFAULT false;
  END IF;

  -- Add is_pinned column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'is_pinned') THEN
    ALTER TABLE comments ADD COLUMN is_pinned BOOLEAN DEFAULT false;
  END IF;

  -- Add ip_address column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'ip_address') THEN
    ALTER TABLE comments ADD COLUMN ip_address TEXT;
  END IF;
END $$;

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,  -- IP address or user ID
  action_type TEXT NOT NULL,  -- 'comment', 'create_post', 'dedication'
  window_start TIMESTAMPTZ DEFAULT NOW(),
  request_count INTEGER DEFAULT 1,

  UNIQUE(identifier, action_type)
);

-- =====================================================
-- 10. IMAGE CACHE (Avoid regeneration costs)
-- =====================================================
CREATE TABLE IF NOT EXISTS image_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT UNIQUE NOT NULL,  -- MD5 hash of search query
  query_text TEXT NOT NULL,
  source TEXT NOT NULL,  -- 'unsplash', 'pexels', 'tmdb', 'ai_generated'
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  has_faces INTEGER DEFAULT 0,
  is_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 11. CONTENT HASHES (Duplicate Detection)
-- =====================================================
CREATE TABLE IF NOT EXISTS content_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  title_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(content_hash)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_post_analysis_entity ON post_analysis((primary_entity->>'type'));
CREATE INDEX IF NOT EXISTS idx_on_this_day ON on_this_day_events(month, day, is_active);
CREATE INDEX IF NOT EXISTS idx_post_performance_date ON post_performance(date);
CREATE INDEX IF NOT EXISTS idx_evergreen_seasonal ON evergreen_posts USING gin(seasonal_tags);
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(identifier, action_type, window_start);
CREATE INDEX IF NOT EXISTS idx_image_cache_query ON image_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_content_hashes ON content_hashes(content_hash);
CREATE INDEX IF NOT EXISTS idx_dedications_occasion ON dedications(occasion, is_approved);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_action_type TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start_time TIMESTAMPTZ;
BEGIN
  window_start_time := NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  -- Delete old entries
  DELETE FROM rate_limits
  WHERE identifier = p_identifier
    AND action_type = p_action_type
    AND window_start < window_start_time;

  -- Get or create entry
  INSERT INTO rate_limits (identifier, action_type, window_start, request_count)
  VALUES (p_identifier, p_action_type, NOW(), 1)
  ON CONFLICT (identifier, action_type)
  DO UPDATE SET
    request_count = CASE
      WHEN rate_limits.window_start < window_start_time THEN 1
      ELSE rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start < window_start_time THEN NOW()
      ELSE rate_limits.window_start
    END
  RETURNING request_count INTO current_count;

  RETURN current_count <= p_max_requests;
END;
$$ LANGUAGE plpgsql;

-- Function to get "On This Day" events
CREATE OR REPLACE FUNCTION get_on_this_day(p_month INTEGER, p_day INTEGER)
RETURNS SETOF on_this_day_events AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM on_this_day_events
  WHERE month = p_month
    AND day = p_day
    AND is_active = true
  ORDER BY event_type, year_occurred DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get recyclable posts for a season
CREATE OR REPLACE FUNCTION get_recyclable_posts(p_tag TEXT, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(post_id UUID, title TEXT, peak_views INTEGER, last_recycled DATE) AS $$
BEGIN
  RETURN QUERY
  SELECT e.post_id, p.title, e.peak_views, e.last_recycled_at::DATE
  FROM evergreen_posts e
  JOIN posts p ON e.post_id = p.id
  WHERE p_tag = ANY(e.seasonal_tags)
    AND e.is_recyclable = true
    AND (e.last_recycled_at IS NULL OR e.last_recycled_at < NOW() - INTERVAL '30 days')
  ORDER BY e.peak_views DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS
-- =====================================================

-- Top performing posts for potential recycling
CREATE OR REPLACE VIEW v_top_evergreen_candidates AS
SELECT
  p.id,
  p.title,
  p.category,
  p.created_at,
  SUM(pp.views) as total_views,
  MAX(pp.views) as peak_daily_views,
  MAX(pp.date) as peak_date
FROM posts p
LEFT JOIN post_performance pp ON p.id = pp.post_id
WHERE p.status = 'published'
  AND p.created_at > NOW() - INTERVAL '1 year'
GROUP BY p.id
HAVING SUM(pp.views) > 1000
ORDER BY total_views DESC;

-- Categories with their post counts
CREATE OR REPLACE VIEW v_category_stats AS
SELECT
  c.slug,
  c.name_en,
  c.name_te,
  c.risk_level,
  COUNT(p.id) as post_count,
  COUNT(CASE WHEN p.status = 'published' THEN 1 END) as published_count,
  COUNT(CASE WHEN p.status = 'draft' THEN 1 END) as draft_count
FROM categories c
LEFT JOIN posts p ON p.category = c.slug
WHERE c.is_active = true
GROUP BY c.id
ORDER BY c.display_order;

-- =====================================================
-- SAMPLE DATA: On This Day Events
-- =====================================================
INSERT INTO on_this_day_events (month, day, event_type, entity_name, entity_name_te, year_occurred, description)
VALUES
  -- Celebrity Birthdays
  (10, 23, 'birthday', 'Prabhas', 'ప్రభాస్', 1979, 'Tollywood superstar known for Baahubali'),
  (8, 9, 'birthday', 'Mahesh Babu', 'మహేష్ బాబు', 1975, 'Telugu superstar and producer'),
  (5, 20, 'birthday', 'NTR Jr', 'జూనియర్ ఎన్టీఆర్', 1983, 'Tollywood star known for RRR'),
  (4, 8, 'birthday', 'Allu Arjun', 'అల్లు అర్జున్', 1982, 'Stylish star of Tollywood'),
  (3, 27, 'birthday', 'Ram Charan', 'రామ్ చరణ్', 1985, 'Mega Power Star'),
  (8, 22, 'birthday', 'Chiranjeevi', 'చిరంజీవి', 1955, 'Megastar of Telugu cinema'),

  -- Movie Release Anniversaries
  (7, 10, 'movie_release', 'Baahubali: The Beginning', 'బాహుబలి', 2015, 'Record-breaking Telugu epic film'),
  (4, 28, 'movie_release', 'Baahubali 2: The Conclusion', 'బాహుబలి 2', 2017, 'Highest-grossing Indian film at that time'),
  (3, 25, 'movie_release', 'RRR', 'ఆర్ఆర్ఆర్', 2022, 'SS Rajamouli epic with global success'),

  -- Cricket Events
  (4, 2, 'sports', 'India Wins World Cup', 'ప్రపంచ కప్ విజయం', 2011, 'India wins Cricket World Cup 2011'),
  (6, 23, 'sports', 'IPL Started', 'ఐపీఎల్ ప్రారంభం', 2008, 'First IPL tournament began')
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;




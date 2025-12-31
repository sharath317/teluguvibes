-- =====================================================
-- TeluguVibes Database Schema v2.0 (Clean Version)
-- Run AFTER supabase-schema.sql
-- =====================================================

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_te TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_te TEXT,
  description_en TEXT,
  icon TEXT,
  content_type TEXT NOT NULL DEFAULT 'news',
  risk_level TEXT NOT NULL DEFAULT 'low',
  image_style TEXT DEFAULT 'stock',
  ai_rules JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INSERT DEFAULT CATEGORIES
INSERT INTO categories (slug, name_te, name_en, icon, content_type, risk_level, image_style, display_order)
VALUES
  ('entertainment', 'వినోదం', 'Entertainment', '🎬', 'news', 'low', 'tmdb', 1),
  ('gossip', 'గాసిప్స్', 'Gossip', '💫', 'news', 'medium', 'stock', 2),
  ('sports', 'క్రీడలు', 'Sports', '🏏', 'news', 'low', 'stock', 3),
  ('politics', 'రాజకీయాలు', 'Politics', '🗳️', 'news', 'high', 'stock', 4),
  ('trending', 'ట్రెండింగ్', 'Trending', '📈', 'news', 'medium', 'stock', 5),
  ('love', 'ప్రేమ', 'Love', '❤️', 'evergreen', 'low', 'ai_generated', 6),
  ('health', 'ఆరోగ్యం', 'Health', '🧘', 'evergreen', 'high', 'stock', 7),
  ('food', 'వంటలు', 'Food', '🍲', 'evergreen', 'low', 'stock', 8),
  ('technology', 'టెక్నాలజీ', 'Technology', '💻', 'news', 'low', 'stock', 9),
  ('dedications', 'అంకితాలు', 'Dedications', '🎁', 'user_generated', 'low', 'ai_generated', 10)
ON CONFLICT (slug) DO NOTHING;

-- 3. POST ANALYSIS TABLE
CREATE TABLE IF NOT EXISTS post_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  primary_entity JSONB NOT NULL DEFAULT '{}',
  sentiment TEXT,
  content_risk TEXT,
  risk_reasons TEXT[] DEFAULT '{}',
  writing_angle TEXT,
  audience_intent TEXT,
  recommended_word_count INTEGER,
  keywords TEXT[] DEFAULT '{}',
  related_topics TEXT[] DEFAULT '{}',
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id)
);

-- 4. CONTENT VALIDATION TABLE
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
  recommendation TEXT,
  reasons TEXT[] DEFAULT '{}',
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id)
);

-- 5. ON THIS DAY EVENTS TABLE
CREATE TABLE IF NOT EXISTS on_this_day_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  entity_name_te TEXT,
  year_occurred INTEGER,
  description TEXT,
  description_te TEXT,
  image_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RATE LIMITS TABLE
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  action_type TEXT NOT NULL,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  request_count INTEGER DEFAULT 1,
  UNIQUE(identifier, action_type)
);

-- 7. IMAGE CACHE TABLE
CREATE TABLE IF NOT EXISTS image_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT UNIQUE NOT NULL,
  query_text TEXT NOT NULL,
  source TEXT NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  is_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ADD COLUMNS TO COMMENTS
DO $$
BEGIN
  ALTER TABLE comments ADD COLUMN is_shadow_banned BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE comments ADD COLUMN is_pinned BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE comments ADD COLUMN ip_address TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 9. SAMPLE ON THIS DAY DATA
INSERT INTO on_this_day_events (month, day, event_type, entity_name, entity_name_te, year_occurred, description)
VALUES
  (10, 23, 'birthday', 'Prabhas', 'ప్రభాస్', 1979, 'Tollywood superstar'),
  (8, 9, 'birthday', 'Mahesh Babu', 'మహేష్ బాబు', 1975, 'Telugu superstar'),
  (5, 20, 'birthday', 'NTR Jr', 'జూనియర్ ఎన్టీఆర్', 1983, 'RRR star'),
  (4, 8, 'birthday', 'Allu Arjun', 'అల్లు అర్జున్', 1982, 'Stylish star'),
  (3, 27, 'birthday', 'Ram Charan', 'రామ్ చరణ్', 1985, 'Mega Power Star'),
  (7, 10, 'movie_release', 'Baahubali', 'బాహుబలి', 2015, 'Epic film'),
  (3, 25, 'movie_release', 'RRR', 'ఆర్ఆర్ఆర్', 2022, 'Global hit')
ON CONFLICT DO NOTHING;

-- 10. INDEXES
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_on_this_day ON on_this_day_events(month, day);
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(identifier, action_type);
CREATE INDEX IF NOT EXISTS idx_image_cache_query ON image_cache(query_hash);




-- =====================================================
-- TeluguVibes Hot Media System
-- Database Schema v1.0
-- =====================================================

-- 1. MEDIA ENTITIES (Actresses, Anchors, Influencers)
CREATE TABLE IF NOT EXISTS media_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name_en TEXT NOT NULL,
  name_te TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('actress', 'anchor', 'influencer', 'model', 'singer')),

  -- External IDs
  wikidata_id TEXT,
  tmdb_id INTEGER,
  celebrity_id UUID REFERENCES celebrities(id) ON DELETE SET NULL,

  -- Social Handles
  instagram_handle TEXT,
  youtube_channel_id TEXT,
  twitter_handle TEXT,
  facebook_page TEXT,

  -- Media
  profile_image TEXT,
  cover_image TEXT,

  -- Scoring
  popularity_score DECIMAL(5,2) DEFAULT 50,
  follower_count INTEGER DEFAULT 0,

  -- Meta
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(name_en, entity_type)
);

-- 2. MEDIA POSTS (Photos, Videos, Social Embeds)
CREATE TABLE IF NOT EXISTS media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES media_entities(id) ON DELETE CASCADE,

  -- Media Type
  media_type TEXT NOT NULL CHECK (media_type IN (
    'image',           -- Direct image from Wikimedia/Unsplash/Pexels
    'instagram_post',  -- Instagram embed
    'instagram_reel',  -- Instagram Reel embed
    'youtube_video',   -- YouTube embed
    'youtube_short',   -- YouTube Short embed
    'twitter_post',    -- Twitter/X embed
    'facebook_post'    -- Facebook embed
  )),

  -- Source Info (LEGAL)
  source TEXT NOT NULL CHECK (source IN (
    'wikimedia', 'unsplash', 'pexels', 'tmdb',
    'instagram_embed', 'youtube_embed', 'twitter_embed', 'facebook_embed',
    'official_website', 'press_release'
  )),
  source_url TEXT NOT NULL,
  source_license TEXT, -- e.g., 'CC0', 'CC-BY', 'embed-allowed'

  -- Embed Data
  embed_html TEXT,
  embed_width INTEGER,
  embed_height INTEGER,

  -- Media URLs (for images)
  image_url TEXT,
  thumbnail_url TEXT,

  -- Content
  title TEXT,
  caption TEXT,
  caption_te TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Categorization
  category TEXT DEFAULT 'general' CHECK (category IN (
    'photoshoot', 'event', 'movie_promotion', 'traditional',
    'casual', 'fitness', 'travel', 'behind_the_scenes', 'general'
  )),

  -- Engagement
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,

  -- Scoring & Ranking
  trending_score DECIMAL(8,2) DEFAULT 0,
  featured_order INTEGER,

  -- Moderation
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
  is_featured BOOLEAN DEFAULT false,
  is_hot BOOLEAN DEFAULT false,
  is_nsfw BOOLEAN DEFAULT false, -- For filtering
  moderation_notes TEXT,

  -- Meta
  posted_at TIMESTAMPTZ, -- Original post date on social media
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MEDIA COLLECTIONS (Curated galleries)
CREATE TABLE IF NOT EXISTS media_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title TEXT NOT NULL,
  title_te TEXT,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,

  cover_image TEXT,
  entity_id UUID REFERENCES media_entities(id) ON DELETE SET NULL,

  collection_type TEXT DEFAULT 'gallery' CHECK (collection_type IN (
    'gallery', 'photoshoot', 'event', 'movie', 'trending'
  )),

  -- Stats
  post_count INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,

  -- Status
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COLLECTION ITEMS (Many-to-many)
CREATE TABLE IF NOT EXISTS media_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES media_collections(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES media_posts(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(collection_id, post_id)
);

-- 5. MEDIA VIEWS (For analytics)
CREATE TABLE IF NOT EXISTS media_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES media_posts(id) ON DELETE CASCADE,

  viewer_ip TEXT,
  viewer_country TEXT,
  referrer TEXT,

  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Entity lookups
CREATE INDEX IF NOT EXISTS idx_media_entities_type ON media_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_media_entities_popularity ON media_entities(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_media_entities_instagram ON media_entities(instagram_handle) WHERE instagram_handle IS NOT NULL;

-- Post lookups
CREATE INDEX IF NOT EXISTS idx_media_posts_entity ON media_posts(entity_id);
CREATE INDEX IF NOT EXISTS idx_media_posts_type ON media_posts(media_type);
CREATE INDEX IF NOT EXISTS idx_media_posts_status ON media_posts(status);
CREATE INDEX IF NOT EXISTS idx_media_posts_trending ON media_posts(trending_score DESC) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_media_posts_featured ON media_posts(featured_order) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_media_posts_hot ON media_posts(created_at DESC) WHERE is_hot = true;
CREATE INDEX IF NOT EXISTS idx_media_posts_category ON media_posts(category);

-- Collection lookups
CREATE INDEX IF NOT EXISTS idx_media_collections_slug ON media_collections(slug);
CREATE INDEX IF NOT EXISTS idx_media_collections_entity ON media_collections(entity_id);

-- Views analytics
CREATE INDEX IF NOT EXISTS idx_media_views_post ON media_views(post_id);
CREATE INDEX IF NOT EXISTS idx_media_views_date ON media_views(viewed_at);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update trending score
CREATE OR REPLACE FUNCTION update_media_trending_score(p_post_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_views INTEGER;
  v_likes INTEGER;
  v_shares INTEGER;
  v_entity_popularity DECIMAL;
  v_age_hours DECIMAL;
  v_score DECIMAL;
BEGIN
  SELECT
    mp.views, mp.likes, mp.shares,
    COALESCE(me.popularity_score, 50),
    EXTRACT(EPOCH FROM (NOW() - mp.created_at)) / 3600
  INTO v_views, v_likes, v_shares, v_entity_popularity, v_age_hours
  FROM media_posts mp
  LEFT JOIN media_entities me ON mp.entity_id = me.id
  WHERE mp.id = p_post_id;

  -- Trending formula: engagement * popularity / time_decay
  -- Higher engagement + popular entity = higher score
  -- Older posts decay in score
  v_score := (
    (v_views * 1 + v_likes * 5 + v_shares * 10) *
    (v_entity_popularity / 50) /
    POWER(v_age_hours + 2, 1.5)
  ) * 100;

  UPDATE media_posts SET trending_score = v_score WHERE id = p_post_id;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_media_views(p_post_id UUID, p_ip TEXT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  v_views INTEGER;
BEGIN
  -- Insert view record
  INSERT INTO media_views (post_id, viewer_ip) VALUES (p_post_id, p_ip);

  -- Update view count
  UPDATE media_posts
  SET views = views + 1
  WHERE id = p_post_id
  RETURNING views INTO v_views;

  -- Update trending score
  PERFORM update_media_trending_score(p_post_id);

  RETURN v_views;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update collection post count
CREATE OR REPLACE FUNCTION update_collection_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE media_collections SET post_count = post_count + 1 WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE media_collections SET post_count = post_count - 1 WHERE id = OLD.collection_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_collection_post_count
  AFTER INSERT OR DELETE ON media_collection_items
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_post_count();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_media_entities_updated_at
  BEFORE UPDATE ON media_entities FOR EACH ROW
  EXECUTE FUNCTION update_media_updated_at();

CREATE TRIGGER trigger_media_posts_updated_at
  BEFORE UPDATE ON media_posts FOR EACH ROW
  EXECUTE FUNCTION update_media_updated_at();

-- =====================================================
-- SEED DATA: Sample Entities
-- =====================================================

INSERT INTO media_entities (name_en, name_te, entity_type, instagram_handle, popularity_score, is_verified)
VALUES
  ('Samantha Ruth Prabhu', 'సమంత', 'actress', 'samaborjamantharuthprabhu', 92, true),
  ('Rashmika Mandanna', 'రష్మిక', 'actress', 'rashmika_mandanna', 90, true),
  ('Pooja Hegde', 'పూజా హెగ్డే', 'actress', 'hegabordepooja', 88, true),
  ('Sreeleela', 'శ్రీలీల', 'actress', 'sreaborleela14', 85, true),
  ('Sree Mukhi', 'శ్రీ ముఖి', 'anchor', 'sreemukhi', 82, true),
  ('Anasuya Bharadwaj', 'అనసూయ', 'anchor', 'aboranaborasuyaborabharadwaj', 80, true),
  ('Krithi Shetty', 'కృతి శెట్టి', 'actress', 'krithi.shetty_official', 84, true),
  ('Nabha Natesh', 'నభా నటేష్', 'actress', 'nababorhanatesh', 78, true)
ON CONFLICT (name_en, entity_type) DO NOTHING;




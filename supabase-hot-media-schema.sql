-- =====================================================
-- HOT MEDIA ENHANCED SCHEMA
-- Adult glamour content system for TeluguVibes
-- =====================================================

-- Drop existing if needed for clean install
-- DROP TABLE IF EXISTS hot_media CASCADE;

-- =====================================================
-- MAIN HOT MEDIA TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS hot_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entity Reference
  entity_id UUID REFERENCES media_entities(id) ON DELETE SET NULL,
  entity_name TEXT,
  entity_type TEXT DEFAULT 'actress' CHECK (entity_type IN ('actress', 'actor', 'anchor', 'influencer', 'model')),
  
  -- Content Source
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'twitter', 'image', 'tmdb', 'wikimedia')),
  source_url TEXT,
  embed_url TEXT,
  embed_html TEXT,
  image_url TEXT,
  thumbnail_url TEXT,
  license_source TEXT,
  license_type TEXT, -- cc-by, cc-by-sa, public-domain, platform-embed, etc.
  
  -- Categorization
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN (
    'beach', 'bikini', 'photoshoot', 'fashion', 'reels', 
    'anchors', 'traditional', 'western', 'fitness', 'events', 'general'
  )),
  tags TEXT[] DEFAULT '{}',
  
  -- AI Caption System
  ai_caption_variants JSONB DEFAULT '[]'::jsonb,
  selected_caption TEXT,
  caption_te TEXT, -- Telugu caption
  
  -- AI Analysis
  detected_emotion TEXT CHECK (detected_emotion IN ('excitement', 'admiration', 'nostalgia', 'glamour', 'bold')),
  content_angle TEXT CHECK (content_angle IN ('glam', 'fashion', 'viral', 'throwback', 'trending')),
  
  -- Safety & Compliance
  confidence_score INTEGER DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  safety_risk TEXT DEFAULT 'low' CHECK (safety_risk IN ('low', 'medium', 'high')),
  requires_review BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  block_reason TEXT,
  moderation_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  
  -- Engagement Metrics
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  trending_score FLOAT DEFAULT 0,
  
  -- Display
  is_featured BOOLEAN DEFAULT false,
  is_hot BOOLEAN DEFAULT false,
  display_order INTEGER,
  
  -- Status & Timestamps
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_hot_media_entity ON hot_media(entity_id);
CREATE INDEX IF NOT EXISTS idx_hot_media_category ON hot_media(category);
CREATE INDEX IF NOT EXISTS idx_hot_media_platform ON hot_media(platform);
CREATE INDEX IF NOT EXISTS idx_hot_media_status ON hot_media(status);
CREATE INDEX IF NOT EXISTS idx_hot_media_safety ON hot_media(safety_risk);
CREATE INDEX IF NOT EXISTS idx_hot_media_trending ON hot_media(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_hot_media_created ON hot_media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hot_media_featured ON hot_media(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_hot_media_hot ON hot_media(is_hot) WHERE is_hot = true;

-- =====================================================
-- BLOCKED KEYWORDS TABLE (for auto-blocking)
-- =====================================================

CREATE TABLE IF NOT EXISTS hot_media_blocked_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL UNIQUE,
  category TEXT DEFAULT 'explicit', -- explicit, minor, political, private
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default blocked keywords
INSERT INTO hot_media_blocked_keywords (keyword, category) VALUES
  ('nude', 'explicit'),
  ('naked', 'explicit'),
  ('xxx', 'explicit'),
  ('porn', 'explicit'),
  ('sex', 'explicit'),
  ('leaked', 'private'),
  ('private', 'private'),
  ('minor', 'minor'),
  ('underage', 'minor'),
  ('child', 'minor'),
  ('kid', 'minor')
ON CONFLICT (keyword) DO NOTHING;

-- =====================================================
-- HOT MEDIA CATEGORIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS hot_media_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_te TEXT,
  emoji TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default categories
INSERT INTO hot_media_categories (slug, name_en, name_te, emoji, sort_order) VALUES
  ('all', 'All', 'అన్నీ', '✨', 0),
  ('beach', 'Beach Looks', 'బీచ్ లుక్స్', '🏖️', 1),
  ('bikini', 'Bikini & Swimwear', 'బికినీ & స్విమ్‌వేర్', '👙', 2),
  ('photoshoot', 'Photoshoots', 'ఫోటోషూట్స్', '📸', 3),
  ('fashion', 'Fashion & Events', 'ఫ్యాషన్ & ఈవెంట్స్', '👗', 4),
  ('reels', 'Viral Reels', 'వైరల్ రీల్స్', '🎬', 5),
  ('anchors', 'Anchors & Hosts', 'యాంకర్లు', '🎤', 6),
  ('traditional', 'Traditional Glam', 'సాంప్రదాయ', '🪷', 7),
  ('western', 'Western Style', 'వెస్టర్న్', '👠', 8),
  ('fitness', 'Fitness & Gym', 'ఫిట్‌నెస్', '💪', 9)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- ENGAGEMENT TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS hot_media_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID REFERENCES hot_media(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- view, click, share, like
  user_session TEXT,
  device_type TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_media ON hot_media_engagement(media_id);
CREATE INDEX IF NOT EXISTS idx_engagement_type ON hot_media_engagement(event_type);

-- =====================================================
-- UPDATE TRIGGER FOR updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_hot_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_hot_media_updated_at ON hot_media;
CREATE TRIGGER trigger_hot_media_updated_at
  BEFORE UPDATE ON hot_media
  FOR EACH ROW
  EXECUTE FUNCTION update_hot_media_updated_at();

-- =====================================================
-- TRENDING SCORE CALCULATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_hot_media_trending_score(media_id UUID)
RETURNS FLOAT AS $$
DECLARE
  v_views INTEGER;
  v_likes INTEGER;
  v_shares INTEGER;
  v_age_hours FLOAT;
  v_score FLOAT;
BEGIN
  SELECT views, likes, shares, 
         EXTRACT(EPOCH FROM (now() - created_at)) / 3600
  INTO v_views, v_likes, v_shares, v_age_hours
  FROM hot_media WHERE id = media_id;
  
  -- Simple trending formula: engagement / time decay
  v_score := (v_views + (v_likes * 5) + (v_shares * 10)) / GREATEST(v_age_hours, 1);
  
  UPDATE hot_media SET trending_score = v_score WHERE id = media_id;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE hot_media ENABLE ROW LEVEL SECURITY;

-- Public can only see approved, non-blocked content
CREATE POLICY hot_media_public_read ON hot_media
  FOR SELECT
  USING (status = 'approved' AND is_blocked = false);

-- Authenticated users (admin) can do everything
CREATE POLICY hot_media_admin_all ON hot_media
  FOR ALL
  USING (auth.role() = 'authenticated');

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE hot_media IS 'Adult glamour content for /hot section - embeds only, no explicit content';
COMMENT ON COLUMN hot_media.safety_risk IS 'low=auto-approve, medium=manual-review, high=auto-block';
COMMENT ON COLUMN hot_media.platform IS 'Content source: instagram/youtube/twitter use embeds only';





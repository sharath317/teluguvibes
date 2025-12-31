-- =====================================================
-- TeluguVibes Viral Content Migration
-- Adds external engagement tracking columns to media_posts
-- =====================================================

-- Add external engagement columns to media_posts table
ALTER TABLE media_posts ADD COLUMN IF NOT EXISTS external_views BIGINT DEFAULT 0;
ALTER TABLE media_posts ADD COLUMN IF NOT EXISTS external_likes BIGINT DEFAULT 0;
ALTER TABLE media_posts ADD COLUMN IF NOT EXISTS external_shares BIGINT DEFAULT 0;
ALTER TABLE media_posts ADD COLUMN IF NOT EXISTS viral_source TEXT;
ALTER TABLE media_posts ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ;

-- Add index for viral source lookups
CREATE INDEX IF NOT EXISTS idx_media_posts_viral_source ON media_posts(viral_source) WHERE viral_source IS NOT NULL;

-- Add index for fetched_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_media_posts_fetched_at ON media_posts(fetched_at) WHERE fetched_at IS NOT NULL;

-- Update the trending score function to include external engagement
CREATE OR REPLACE FUNCTION update_media_trending_score(p_post_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_views INTEGER;
  v_likes INTEGER;
  v_shares INTEGER;
  v_external_views BIGINT;
  v_external_likes BIGINT;
  v_external_shares BIGINT;
  v_entity_popularity DECIMAL;
  v_age_hours DECIMAL;
  v_score DECIMAL;
BEGIN
  SELECT
    mp.views,
    mp.likes,
    mp.shares,
    COALESCE(mp.external_views, 0),
    COALESCE(mp.external_likes, 0),
    COALESCE(mp.external_shares, 0),
    COALESCE(me.popularity_score, 50),
    EXTRACT(EPOCH FROM (NOW() - mp.created_at)) / 3600
  INTO v_views, v_likes, v_shares, v_external_views, v_external_likes, v_external_shares, v_entity_popularity, v_age_hours
  FROM media_posts mp
  LEFT JOIN media_entities me ON mp.entity_id = me.id
  WHERE mp.id = p_post_id;

  -- Combined trending formula:
  -- Internal engagement + external engagement (scaled) * popularity / time_decay
  v_score := (
    (
      -- Internal engagement
      (v_views * 1 + v_likes * 5 + v_shares * 10) +
      -- External engagement (logarithmic scale to avoid huge numbers dominating)
      (LOG(GREATEST(1, v_external_views)) * 5 +
       LOG(GREATEST(1, v_external_likes)) * 10 +
       LOG(GREATEST(1, v_external_shares)) * 15)
    ) *
    (v_entity_popularity / 50) /
    POWER(v_age_hours + 2, 1.5)
  ) * 100;

  UPDATE media_posts SET trending_score = v_score WHERE id = p_post_id;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function to get hot content for the Hot page
CREATE OR REPLACE FUNCTION get_hot_media_posts(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_media_type TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  entity_id UUID,
  media_type TEXT,
  source TEXT,
  source_url TEXT,
  embed_html TEXT,
  thumbnail_url TEXT,
  title TEXT,
  caption TEXT,
  tags TEXT[],
  category TEXT,
  views INTEGER,
  likes INTEGER,
  trending_score DECIMAL,
  external_views BIGINT,
  external_likes BIGINT,
  viral_source TEXT,
  is_featured BOOLEAN,
  is_hot BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mp.id,
    mp.entity_id,
    mp.media_type,
    mp.source,
    mp.source_url,
    mp.embed_html,
    mp.thumbnail_url,
    mp.title,
    mp.caption,
    mp.tags,
    mp.category,
    mp.views,
    mp.likes,
    mp.trending_score,
    mp.external_views,
    mp.external_likes,
    mp.viral_source,
    mp.is_featured,
    mp.is_hot,
    mp.created_at
  FROM media_posts mp
  WHERE
    mp.status = 'approved'
    AND mp.is_hot = true
    AND (p_media_type IS NULL OR mp.media_type = p_media_type)
    AND (p_category IS NULL OR mp.category = p_category)
  ORDER BY mp.trending_score DESC, mp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old viral content
CREATE OR REPLACE FUNCTION cleanup_old_viral_content(p_days_old INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE media_posts
  SET
    is_hot = false,
    status = 'archived'
  WHERE
    viral_source IS NOT NULL
    AND created_at < NOW() - (p_days_old || ' days')::INTERVAL
    AND is_featured = false
    AND is_hot = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON COLUMN media_posts.external_views IS 'View count from external platform (YouTube, etc.)';
COMMENT ON COLUMN media_posts.external_likes IS 'Like count from external platform';
COMMENT ON COLUMN media_posts.external_shares IS 'Share/comment count from external platform';
COMMENT ON COLUMN media_posts.viral_source IS 'Source of viral content (youtube_trending, reddit_tollywood, twitter_viral, etc.)';
COMMENT ON COLUMN media_posts.fetched_at IS 'Timestamp when content was fetched from external source';

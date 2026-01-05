-- =====================================================
-- Hot & Glamour Ranking System Schema
-- Database Schema v1.0
-- =====================================================

-- =====================================================
-- 1. HOT GLAMOUR CANDIDATES VIEW
-- =====================================================
-- Materialized view for fast ranking queries
-- Combines celebrities, social profiles, and content metrics

CREATE MATERIALIZED VIEW IF NOT EXISTS v_hot_glamour_candidates AS
SELECT 
  c.id AS celebrity_id,
  c.name_en AS celebrity_name,
  c.name_te AS celebrity_name_te,
  c.popularity_score,
  c.site_performance_score AS trend_score,
  c.tmdb_id,
  c.occupation,
  
  -- Social metrics
  COUNT(DISTINCT sp.id) AS social_profiles_count,
  BOOL_OR(sp.platform = 'instagram') AS has_instagram,
  BOOL_OR(sp.platform = 'youtube') AS has_youtube,
  BOOL_OR(sp.platform = 'twitter') AS has_twitter,
  
  -- Get primary platform (highest priority that exists)
  (CASE 
    WHEN BOOL_OR(sp.platform = 'instagram') THEN 'instagram'
    WHEN BOOL_OR(sp.platform = 'youtube') THEN 'youtube'
    WHEN BOOL_OR(sp.platform = 'twitter') THEN 'twitter'
    WHEN BOOL_OR(sp.platform = 'tiktok') THEN 'tiktok'
    ELSE NULL
  END) AS primary_platform,
  
  -- Embeddable platforms as array
  ARRAY_REMOVE(ARRAY_AGG(DISTINCT 
    CASE WHEN sp.platform IN ('instagram', 'youtube', 'twitter', 'tiktok') 
    THEN sp.platform ELSE NULL END
  ), NULL) AS embeddable_platforms,
  
  -- Content metrics
  COALESCE(hm_stats.content_count, 0) AS content_count,
  COALESCE(hm_stats.approved_count, 0) AS approved_content_count,
  COALESCE(hm_stats.total_views, 0) AS total_views,
  COALESCE(hm_stats.total_engagement, 0) AS total_engagement,
  
  -- Hot score calculation
  (
    (c.popularity_score * 0.3) +
    (CASE WHEN BOOL_OR(sp.platform = 'instagram') THEN 15 ELSE 0 END) +
    (CASE WHEN BOOL_OR(sp.platform = 'youtube') THEN 10 ELSE 0 END) +
    (CASE WHEN BOOL_OR(sp.platform = 'twitter') THEN 5 ELSE 0 END) +
    (LEAST(20, COALESCE(c.site_performance_score, 0) / 5)) +
    (CASE 
      WHEN c.occupation && ARRAY['actress'] THEN 15
      WHEN c.occupation && ARRAY['model'] THEN 12
      WHEN c.occupation && ARRAY['anchor'] THEN 8
      ELSE 5
    END)
  ) AS hot_score,
  
  -- Eligibility
  CASE 
    WHEN COUNT(DISTINCT sp.id) >= 1 
      AND (BOOL_OR(sp.platform IN ('instagram', 'youtube', 'twitter', 'tiktok')))
      AND c.popularity_score >= 30
    THEN true
    ELSE false
  END AS is_eligible,
  
  -- Entity type (from occupation)
  CASE 
    WHEN c.occupation && ARRAY['actress'] THEN 'actress'
    WHEN c.occupation && ARRAY['model'] THEN 'model'
    WHEN c.occupation && ARRAY['anchor'] THEN 'anchor'
    ELSE 'actress'
  END AS entity_type,
  
  NOW() AS last_scored_at

FROM celebrities c
LEFT JOIN celebrity_social_profiles sp 
  ON c.id = sp.celebrity_id 
  AND sp.is_active = true
  AND sp.confidence_score >= 0.6
LEFT JOIN (
  SELECT 
    entity_name,
    COUNT(*) AS content_count,
    COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
    SUM(views) AS total_views,
    SUM(views + likes * 2 + shares * 5) AS total_engagement
  FROM hot_media
  GROUP BY entity_name
) hm_stats ON c.name_en = hm_stats.entity_name
WHERE c.is_active = true
GROUP BY c.id, c.name_en, c.name_te, c.popularity_score, 
         c.site_performance_score, c.tmdb_id, c.occupation,
         hm_stats.content_count, hm_stats.approved_count, 
         hm_stats.total_views, hm_stats.total_engagement;

-- Create indexes on the materialized view
CREATE INDEX IF NOT EXISTS idx_vhgc_hot_score 
ON v_hot_glamour_candidates(hot_score DESC);

CREATE INDEX IF NOT EXISTS idx_vhgc_eligible 
ON v_hot_glamour_candidates(is_eligible);

CREATE INDEX IF NOT EXISTS idx_vhgc_entity_type 
ON v_hot_glamour_candidates(entity_type);

-- =====================================================
-- 2. HOT IMAGE REFERENCES TABLE
-- =====================================================
-- Tracks all image sources for hot content

CREATE TABLE IF NOT EXISTS hot_image_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Celebrity reference
  celebrity_id UUID REFERENCES celebrities(id) ON DELETE CASCADE,
  celebrity_name TEXT NOT NULL,
  
  -- Source info
  source TEXT NOT NULL CHECK (source IN (
    'instagram_oembed',
    'youtube_embed',
    'tmdb_profile',
    'tmdb_tagged',
    'tmdb_backdrop',
    'wikimedia_commons',
    'wikipedia',
    'ai_generated'
  )),
  
  -- URLs
  source_url TEXT NOT NULL,
  embed_url TEXT,
  thumbnail_url TEXT,
  
  -- License & safety
  license TEXT CHECK (license IN (
    'cc-by', 'cc-by-sa', 'cc-by-nc', 
    'public-domain', 'platform-embed', 
    'fair-use', 'api-provided', 'unknown'
  )),
  license_verified BOOLEAN DEFAULT false,
  
  -- Quality
  confidence_score INTEGER DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  image_type TEXT CHECK (image_type IN (
    'profile', 'photoshoot', 'event', 'movie', 
    'candid', 'promotional', 'social_post'
  )),
  is_full_body BOOLEAN DEFAULT false,
  resolution TEXT, -- e.g., "1080x1920"
  
  -- Safety flags
  is_safe BOOLEAN DEFAULT true,
  safety_check_passed BOOLEAN DEFAULT false,
  safety_notes TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'archived'
  )),
  rejection_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hir_celebrity ON hot_image_references(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_hir_celebrity_name ON hot_image_references(celebrity_name);
CREATE INDEX IF NOT EXISTS idx_hir_source ON hot_image_references(source);
CREATE INDEX IF NOT EXISTS idx_hir_status ON hot_image_references(status);
CREATE INDEX IF NOT EXISTS idx_hir_confidence ON hot_image_references(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_hir_safe ON hot_image_references(is_safe) WHERE is_safe = true;

-- =====================================================
-- 3. ENTITY DISCOVERY LOG
-- =====================================================
-- Tracks discovery runs

CREATE TABLE IF NOT EXISTS entity_discovery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Run info
  source TEXT NOT NULL CHECK (source IN ('wikidata', 'tmdb', 'combined')),
  run_type TEXT NOT NULL CHECK (run_type IN ('full', 'incremental', 'single', 'dry_run')),
  entity_types TEXT[] DEFAULT '{}',
  
  -- Stats
  entities_discovered INTEGER DEFAULT 0,
  entities_added INTEGER DEFAULT 0,
  entities_updated INTEGER DEFAULT 0,
  entities_skipped INTEGER DEFAULT 0,
  handles_resolved INTEGER DEFAULT 0,
  
  -- Errors
  error_count INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER
);

-- =====================================================
-- 4. REFRESH FUNCTION FOR MATERIALIZED VIEW
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_hot_candidates()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_hot_glamour_candidates;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. HELPER FUNCTION: GET TOP HOT CANDIDATES
-- =====================================================

CREATE OR REPLACE FUNCTION get_top_hot_candidates(
  p_limit INTEGER DEFAULT 20,
  p_entity_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  celebrity_id UUID,
  celebrity_name TEXT,
  hot_score NUMERIC,
  primary_platform TEXT,
  entity_type TEXT,
  social_profiles_count BIGINT,
  content_count BIGINT,
  is_eligible BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.celebrity_id,
    v.celebrity_name,
    v.hot_score,
    v.primary_platform,
    v.entity_type,
    v.social_profiles_count,
    v.content_count,
    v.is_eligible
  FROM v_hot_glamour_candidates v
  WHERE v.is_eligible = true
    AND (p_entity_type IS NULL OR v.entity_type = p_entity_type)
  ORDER BY v.hot_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. TRIGGER: AUTO-REFRESH ON CELEBRITY UPDATE
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_refresh_hot_candidates()
RETURNS TRIGGER AS $$
BEGIN
  -- Schedule a refresh (in production, use pg_cron or similar)
  -- For now, this is a placeholder
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Materialized view refresh should be scheduled separately
-- Example with pg_cron: SELECT cron.schedule('refresh-hot', '*/15 * * * *', 'SELECT refresh_hot_candidates()');

-- =====================================================
-- DOCUMENTATION
-- =====================================================

COMMENT ON MATERIALIZED VIEW v_hot_glamour_candidates IS 
'Pre-computed hot score rankings for celebrities. Refresh with refresh_hot_candidates() or REFRESH MATERIALIZED VIEW.';

COMMENT ON TABLE hot_image_references IS 
'All image sources for hot content with license and safety tracking.';

COMMENT ON TABLE entity_discovery_log IS 
'Log of all entity discovery runs for auditing and debugging.';







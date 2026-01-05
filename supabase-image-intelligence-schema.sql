-- ============================================================
-- IMAGE INTELLIGENCE SYSTEM SCHEMA
-- Zero Copyright Risk Media Management
-- Legal-Safe Image Ingestion for Telugu Entertainment Portal
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. IMAGE REGISTRY (Master Table)
-- ============================================================
CREATE TABLE IF NOT EXISTS image_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Source Information (CRITICAL for legal compliance)
  source VARCHAR(50) NOT NULL CHECK (source IN (
    'tmdb',              -- TMDB posters/backdrops (API terms)
    'wikimedia_commons', -- CC licensed images
    'wikipedia',         -- Wikipedia PageImages API
    'press_kit',         -- Official press releases
    'ai_generated',      -- AI-generated (DALL-E, Stable Diffusion)
    'pexels',            -- Pexels API (free license)
    'unsplash',          -- Unsplash API (free license)
    'user_upload',       -- User-submitted (requires review)
    'embed_only'         -- Social media embeds (not stored)
  )),

  -- Original Source Details
  source_url TEXT NOT NULL,                   -- Original URL
  source_id TEXT,                             -- ID from source (e.g., TMDB ID)
  source_page_url TEXT,                       -- Page where image was found

  -- License Information (MANDATORY)
  license_type VARCHAR(100) NOT NULL CHECK (license_type IN (
    'tmdb_api',           -- TMDB API Terms (attribution required)
    'cc0',                -- Public Domain
    'cc_by',              -- Creative Commons Attribution
    'cc_by_sa',           -- CC Attribution-ShareAlike
    'cc_by_nc',           -- CC Attribution-NonCommercial
    'cc_by_nc_sa',        -- CC Attribution-NonCommercial-ShareAlike
    'cc_by_nd',           -- CC Attribution-NoDerivatives
    'cc_by_nc_nd',        -- CC Attribution-NonCommercial-NoDerivatives
    'public_domain',      -- Public Domain
    'press_kit',          -- Official press kit (editorial use)
    'pexels',             -- Pexels License
    'unsplash',           -- Unsplash License
    'ai_generated',       -- AI-generated (check model terms)
    'unknown',            -- Unknown - DO NOT USE
    'restricted'          -- Restricted - DO NOT USE
  )),

  -- License Details
  license_url TEXT,                           -- Link to license
  author_name TEXT,                           -- Image author/creator
  author_url TEXT,                            -- Author profile URL
  attribution_text TEXT,                      -- Required attribution

  -- Usage Rights (calculated from license)
  allows_commercial BOOLEAN DEFAULT false,
  allows_derivatives BOOLEAN DEFAULT false,
  requires_attribution BOOLEAN DEFAULT true,
  allows_ai_training BOOLEAN DEFAULT false,

  -- Image Details
  width INTEGER,
  height INTEGER,
  aspect_ratio DECIMAL(5,2),
  file_size_kb INTEGER,
  format VARCHAR(20),                         -- jpg, png, webp

  -- Quality Validation
  quality_score INTEGER DEFAULT 50 CHECK (quality_score BETWEEN 0 AND 100),
  has_watermark BOOLEAN DEFAULT false,
  is_adsense_safe BOOLEAN DEFAULT true,
  is_adult_content BOOLEAN DEFAULT false,

  -- Storage
  cdn_url TEXT,                               -- Our CDN URL (if stored)
  thumbnail_url TEXT,                         -- Thumbnail version
  is_stored_locally BOOLEAN DEFAULT false,    -- If we store a copy

  -- Entity Associations
  entity_type VARCHAR(50),                    -- person, movie, event
  entity_id UUID,
  entity_name TEXT,

  -- Content Classification
  image_type VARCHAR(50),                     -- poster, profile, backdrop, still, event
  tags TEXT[] DEFAULT '{}',

  -- Validation Status
  validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN (
    'pending', 'approved', 'rejected', 'needs_review', 'expired'
  )),
  validation_notes TEXT,
  validated_at TIMESTAMPTZ,
  validated_by TEXT,

  -- Usage Tracking
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                     -- If license has expiry

  -- Uniqueness
  UNIQUE(source, source_url)
);

-- ============================================================
-- 2. IMAGE USAGE TRACKING (Engagement per source)
-- ============================================================
CREATE TABLE IF NOT EXISTS image_usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  image_id UUID NOT NULL REFERENCES image_registry(id) ON DELETE CASCADE,
  post_id UUID,                               -- Which post used this image

  -- Usage Context
  usage_type VARCHAR(50) NOT NULL,            -- featured, inline, thumbnail, og_image
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Engagement Metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,4) DEFAULT 0,

  -- Performance
  avg_time_on_page INTEGER DEFAULT 0,         -- Seconds
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  scroll_depth DECIMAL(5,2) DEFAULT 0,

  -- Social
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. SOURCE PERFORMANCE (Aggregate by source)
-- ============================================================
CREATE TABLE IF NOT EXISTS image_source_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  source VARCHAR(50) NOT NULL UNIQUE,

  -- Volume
  total_images INTEGER DEFAULT 0,
  approved_images INTEGER DEFAULT 0,
  rejected_images INTEGER DEFAULT 0,

  -- Quality
  avg_quality_score DECIMAL(5,2) DEFAULT 0,
  watermark_rate DECIMAL(5,2) DEFAULT 0,
  adsense_safe_rate DECIMAL(5,2) DEFAULT 0,

  -- Engagement
  avg_ctr DECIMAL(5,4) DEFAULT 0,
  avg_engagement_score DECIMAL(5,2) DEFAULT 0,
  total_impressions BIGINT DEFAULT 0,
  total_clicks BIGINT DEFAULT 0,

  -- Legal Safety
  legal_issues_count INTEGER DEFAULT 0,
  takedown_requests INTEGER DEFAULT 0,

  -- Recommendation
  reliability_score DECIMAL(5,2) DEFAULT 50,
  priority_rank INTEGER DEFAULT 5,
  is_recommended BOOLEAN DEFAULT true,

  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. IMAGE FETCH LOG (Audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS image_fetch_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Request Details
  fetch_type VARCHAR(50) NOT NULL,            -- search, direct, fallback
  source VARCHAR(50) NOT NULL,
  query TEXT,
  entity_type VARCHAR(50),
  entity_id UUID,

  -- Response
  images_found INTEGER DEFAULT 0,
  images_valid INTEGER DEFAULT 0,
  images_stored INTEGER DEFAULT 0,

  -- Selected Image
  selected_image_id UUID,
  selection_reason TEXT,

  -- Fallback Chain
  fallback_chain TEXT[] DEFAULT '{}',         -- Sources tried in order
  fallback_reason TEXT,

  -- Performance
  fetch_duration_ms INTEGER,

  -- Status
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. LICENSE VALIDATION RULES
-- ============================================================
CREATE TABLE IF NOT EXISTS license_validation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  license_type VARCHAR(100) NOT NULL UNIQUE,

  -- Permissions
  allows_commercial BOOLEAN DEFAULT false,
  allows_derivatives BOOLEAN DEFAULT false,
  allows_redistribution BOOLEAN DEFAULT false,
  requires_attribution BOOLEAN DEFAULT true,
  allows_ai_training BOOLEAN DEFAULT false,

  -- Requirements
  attribution_format TEXT,                    -- How to format attribution
  link_required BOOLEAN DEFAULT false,

  -- Our Use Cases
  can_use_for_article BOOLEAN DEFAULT true,
  can_use_for_og_image BOOLEAN DEFAULT true,
  can_use_for_thumbnail BOOLEAN DEFAULT true,
  can_modify_for_social BOOLEAN DEFAULT false,

  -- Validation
  needs_manual_review BOOLEAN DEFAULT false,
  auto_approve BOOLEAN DEFAULT false,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. BLOCKED SOURCES (Never use)
-- ============================================================
CREATE TABLE IF NOT EXISTS blocked_image_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- What to block
  block_type VARCHAR(50) NOT NULL,            -- domain, url_pattern, source
  block_value TEXT NOT NULL,

  -- Reason
  reason TEXT NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Image Registry
CREATE INDEX IF NOT EXISTS idx_image_registry_source
  ON image_registry(source);
CREATE INDEX IF NOT EXISTS idx_image_registry_entity
  ON image_registry(entity_id);
CREATE INDEX IF NOT EXISTS idx_image_registry_validation
  ON image_registry(validation_status);
CREATE INDEX IF NOT EXISTS idx_image_registry_license
  ON image_registry(license_type);
CREATE INDEX IF NOT EXISTS idx_image_registry_quality
  ON image_registry(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_image_registry_adsense
  ON image_registry(is_adsense_safe) WHERE is_adsense_safe = true;

-- Usage Tracking
CREATE INDEX IF NOT EXISTS idx_usage_image
  ON image_usage_tracking(image_id);
CREATE INDEX IF NOT EXISTS idx_usage_date
  ON image_usage_tracking(usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_engagement
  ON image_usage_tracking(ctr DESC);

-- Fetch Log
CREATE INDEX IF NOT EXISTS idx_fetch_log_source
  ON image_fetch_log(source);
CREATE INDEX IF NOT EXISTS idx_fetch_log_entity
  ON image_fetch_log(entity_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function: Calculate license permissions
CREATE OR REPLACE FUNCTION calculate_license_permissions(p_license_type VARCHAR)
RETURNS TABLE (
  allows_commercial BOOLEAN,
  allows_derivatives BOOLEAN,
  requires_attribution BOOLEAN,
  can_use_for_article BOOLEAN,
  can_modify BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN p_license_type IN ('cc0', 'public_domain', 'tmdb_api', 'pexels', 'unsplash', 'ai_generated') THEN true
      WHEN p_license_type IN ('cc_by', 'cc_by_sa', 'press_kit') THEN true
      ELSE false
    END,
    CASE
      WHEN p_license_type IN ('cc0', 'public_domain', 'cc_by', 'cc_by_sa', 'cc_by_nc', 'cc_by_nc_sa', 'pexels', 'unsplash', 'ai_generated') THEN true
      ELSE false
    END,
    CASE
      WHEN p_license_type IN ('cc0', 'public_domain') THEN false
      ELSE true
    END,
    CASE
      WHEN p_license_type IN ('unknown', 'restricted') THEN false
      ELSE true
    END,
    CASE
      WHEN p_license_type IN ('cc_by_nd', 'cc_by_nc_nd') THEN false
      ELSE true
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Validate image for use
CREATE OR REPLACE FUNCTION validate_image_for_use(
  p_image_id UUID,
  p_usage_type VARCHAR
) RETURNS TABLE (
  is_valid BOOLEAN,
  reason TEXT,
  attribution_required BOOLEAN,
  attribution_text TEXT
) AS $$
DECLARE
  v_image RECORD;
BEGIN
  SELECT * INTO v_image FROM image_registry WHERE id = p_image_id;

  IF v_image IS NULL THEN
    RETURN QUERY SELECT false, 'Image not found', false, NULL::TEXT;
    RETURN;
  END IF;

  -- Check validation status
  IF v_image.validation_status = 'rejected' THEN
    RETURN QUERY SELECT false, 'Image rejected: ' || COALESCE(v_image.validation_notes, 'No reason'), false, NULL::TEXT;
    RETURN;
  END IF;

  -- Check license
  IF v_image.license_type IN ('unknown', 'restricted') THEN
    RETURN QUERY SELECT false, 'License does not permit use', false, NULL::TEXT;
    RETURN;
  END IF;

  -- Check AdSense safety
  IF NOT v_image.is_adsense_safe THEN
    RETURN QUERY SELECT false, 'Image is not AdSense safe', false, NULL::TEXT;
    RETURN;
  END IF;

  -- Check watermark
  IF v_image.has_watermark THEN
    RETURN QUERY SELECT false, 'Image has watermark', false, NULL::TEXT;
    RETURN;
  END IF;

  -- Check quality
  IF v_image.quality_score < 40 THEN
    RETURN QUERY SELECT false, 'Image quality too low', false, NULL::TEXT;
    RETURN;
  END IF;

  -- Valid - return with attribution info
  RETURN QUERY SELECT
    true,
    'Image approved for use',
    v_image.requires_attribution,
    v_image.attribution_text;
END;
$$ LANGUAGE plpgsql;

-- Function: Get best image for entity
CREATE OR REPLACE FUNCTION get_best_image_for_entity(
  p_entity_id UUID,
  p_entity_type VARCHAR,
  p_image_type VARCHAR DEFAULT 'any'
) RETURNS TABLE (
  image_id UUID,
  cdn_url TEXT,
  source VARCHAR,
  attribution_text TEXT,
  quality_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ir.id,
    COALESCE(ir.cdn_url, ir.source_url),
    ir.source,
    ir.attribution_text,
    ir.quality_score
  FROM image_registry ir
  WHERE ir.entity_id = p_entity_id
    AND ir.entity_type = p_entity_type
    AND (p_image_type = 'any' OR ir.image_type = p_image_type)
    AND ir.validation_status = 'approved'
    AND ir.is_adsense_safe = true
    AND ir.has_watermark = false
    AND ir.license_type NOT IN ('unknown', 'restricted')
  ORDER BY
    ir.quality_score DESC,
    ir.times_used DESC,
    ir.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Update source performance
CREATE OR REPLACE FUNCTION update_source_performance(p_source VARCHAR)
RETURNS VOID AS $$
BEGIN
  INSERT INTO image_source_performance (source)
  VALUES (p_source)
  ON CONFLICT (source) DO NOTHING;

  UPDATE image_source_performance
  SET
    total_images = (SELECT COUNT(*) FROM image_registry WHERE source = p_source),
    approved_images = (SELECT COUNT(*) FROM image_registry WHERE source = p_source AND validation_status = 'approved'),
    rejected_images = (SELECT COUNT(*) FROM image_registry WHERE source = p_source AND validation_status = 'rejected'),
    avg_quality_score = (SELECT AVG(quality_score) FROM image_registry WHERE source = p_source),
    watermark_rate = (SELECT COUNT(*) FILTER (WHERE has_watermark) * 100.0 / NULLIF(COUNT(*), 0) FROM image_registry WHERE source = p_source),
    adsense_safe_rate = (SELECT COUNT(*) FILTER (WHERE is_adsense_safe) * 100.0 / NULLIF(COUNT(*), 0) FROM image_registry WHERE source = p_source),
    last_updated_at = NOW()
  WHERE source = p_source;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VIEWS
-- ============================================================

-- View: Approved images ready for use
CREATE OR REPLACE VIEW v_approved_images AS
SELECT
  ir.*,
  CASE
    WHEN ir.width >= 1200 THEN 'large'
    WHEN ir.width >= 800 THEN 'medium'
    ELSE 'small'
  END as size_category
FROM image_registry ir
WHERE ir.validation_status = 'approved'
  AND ir.is_adsense_safe = true
  AND ir.has_watermark = false
  AND ir.license_type NOT IN ('unknown', 'restricted');

-- View: Images needing review
CREATE OR REPLACE VIEW v_images_pending_review AS
SELECT
  ir.*,
  CASE
    WHEN ir.license_type = 'unknown' THEN 'License unclear'
    WHEN ir.quality_score < 50 THEN 'Low quality'
    WHEN ir.has_watermark THEN 'Has watermark'
    ELSE 'Standard review'
  END as review_reason
FROM image_registry ir
WHERE ir.validation_status IN ('pending', 'needs_review')
ORDER BY ir.created_at DESC;

-- View: Source reliability ranking
CREATE OR REPLACE VIEW v_source_ranking AS
SELECT
  isp.*,
  RANK() OVER (ORDER BY isp.reliability_score DESC) as rank
FROM image_source_performance isp
WHERE isp.is_recommended = true
ORDER BY isp.reliability_score DESC;

-- ============================================================
-- INITIAL DATA: License Rules
-- ============================================================

INSERT INTO license_validation_rules (
  license_type, allows_commercial, allows_derivatives, requires_attribution,
  can_use_for_article, can_use_for_og_image, can_modify_for_social, auto_approve, notes
) VALUES
  ('tmdb_api', true, false, true, true, true, false, true, 'TMDB API terms - must link to TMDB'),
  ('cc0', true, true, false, true, true, true, true, 'Public Domain - no restrictions'),
  ('public_domain', true, true, false, true, true, true, true, 'Public Domain - no restrictions'),
  ('cc_by', true, true, true, true, true, true, true, 'Attribution required'),
  ('cc_by_sa', true, true, true, true, true, true, true, 'Attribution + ShareAlike'),
  ('cc_by_nc', false, true, true, true, true, true, false, 'Non-commercial only - review required'),
  ('cc_by_nc_sa', false, true, true, true, true, true, false, 'Non-commercial + ShareAlike'),
  ('cc_by_nd', true, false, true, true, true, false, false, 'No derivatives - cannot modify'),
  ('cc_by_nc_nd', false, false, true, true, false, false, false, 'Most restrictive CC license'),
  ('pexels', true, true, false, true, true, true, true, 'Pexels license - very permissive'),
  ('unsplash', true, true, false, true, true, true, true, 'Unsplash license - very permissive'),
  ('press_kit', true, true, true, true, true, false, false, 'Editorial use - needs review'),
  ('ai_generated', true, true, false, true, true, true, true, 'AI generated - check model terms'),
  ('unknown', false, false, false, false, false, false, false, 'DO NOT USE - license unclear'),
  ('restricted', false, false, false, false, false, false, false, 'DO NOT USE - restricted')
ON CONFLICT (license_type) DO NOTHING;

-- Initial blocked sources
INSERT INTO blocked_image_sources (block_type, block_value, reason) VALUES
  ('domain', 'google.com/images', 'Google Images scraping is illegal'),
  ('domain', 'images.google.com', 'Google Images scraping is illegal'),
  ('domain', 'instagram.com', 'Instagram images cannot be downloaded'),
  ('domain', 'cdninstagram.com', 'Instagram CDN - not allowed'),
  ('domain', 'fbcdn.net', 'Facebook CDN - not allowed'),
  ('domain', 'imdb.com', 'IMDB images are copyrighted'),
  ('domain', 'media-amazon.com/images', 'Amazon/IMDB images are copyrighted'),
  ('domain', 'pinterest.com', 'Pinterest aggregates copyrighted images'),
  ('url_pattern', '%getty%', 'Getty Images are heavily copyrighted'),
  ('url_pattern', '%shutterstock%', 'Shutterstock images are licensed'),
  ('url_pattern', '%istock%', 'iStock images are licensed')
ON CONFLICT DO NOTHING;

-- Initial source performance
INSERT INTO image_source_performance (source, reliability_score, priority_rank, is_recommended) VALUES
  ('tmdb', 95, 1, true),
  ('wikimedia_commons', 90, 2, true),
  ('wikipedia', 85, 3, true),
  ('pexels', 85, 4, true),
  ('unsplash', 85, 5, true),
  ('ai_generated', 80, 6, true),
  ('press_kit', 75, 7, true),
  ('user_upload', 50, 8, true),
  ('embed_only', 70, 9, true)
ON CONFLICT (source) DO NOTHING;









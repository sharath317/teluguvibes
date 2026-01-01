-- =====================================================
-- TeluguVibes Social Profiles Intelligence System
-- Database Schema v1.0
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CELEBRITY SOCIAL PROFILES TABLE
-- =====================================================
-- Stores verified social media handles from trusted sources only
-- NO scraping, only metadata from Wikidata, Wikipedia, TMDB

CREATE TABLE IF NOT EXISTS celebrity_social_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to celebrities table
  celebrity_id UUID NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
  
  -- Platform & Handle
  platform TEXT NOT NULL CHECK (platform IN (
    'instagram',
    'youtube',
    'twitter',
    'facebook',
    'tiktok',
    'wikipedia',
    'imdb',
    'official_website'
  )),
  
  -- The actual handle or username (without @)
  handle TEXT NOT NULL,
  
  -- Full profile URL
  profile_url TEXT NOT NULL,
  
  -- Data source for verification
  source TEXT NOT NULL CHECK (source IN (
    'wikidata',      -- P2003 (Instagram), P2002 (Twitter), P2397 (YouTube)
    'wikipedia',     -- External links from infobox
    'tmdb',          -- external_ids API
    'official_site', -- From official celebrity website
    'manual'         -- Admin verified manually
  )),
  
  -- Confidence scoring
  confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.0 CHECK (
    confidence_score >= 0 AND confidence_score <= 1
  ),
  
  -- Verification status
  verified BOOLEAN DEFAULT false,
  verification_method TEXT CHECK (verification_method IN (
    'wikidata_official',
    'cross_source_match',
    'admin_verified',
    'blue_checkmark',
    'unverified'
  )),
  
  -- Last verification timestamps
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  last_verified TIMESTAMPTZ,
  
  -- Additional metadata (JSON for flexibility)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Flags
  is_active BOOLEAN DEFAULT true,
  is_official BOOLEAN DEFAULT false,  -- Is this the official handle?
  is_primary BOOLEAN DEFAULT false,   -- Primary account for this platform
  
  -- Engagement hints (from API metadata, not scraping)
  follower_count_hint INTEGER,  -- Approximate count from API metadata
  post_count_hint INTEGER,
  
  -- Admin notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one handle per platform per celebrity
  UNIQUE(celebrity_id, platform, handle)
);

-- =====================================================
-- 2. SOCIAL INGESTION LOG TABLE
-- =====================================================
-- Tracks all social handle ingestion runs

CREATE TABLE IF NOT EXISTS social_ingestion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Run info
  source TEXT NOT NULL CHECK (source IN ('wikidata', 'wikipedia', 'tmdb', 'all')),
  run_type TEXT NOT NULL CHECK (run_type IN ('full', 'incremental', 'single', 'dry_run')),
  
  -- Stats
  total_celebrities_processed INTEGER DEFAULT 0,
  handles_added INTEGER DEFAULT 0,
  handles_updated INTEGER DEFAULT 0,
  handles_skipped INTEGER DEFAULT 0,
  handles_rejected INTEGER DEFAULT 0,
  
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
-- 3. BLOCKED HANDLES TABLE
-- =====================================================
-- Handles that are explicitly blocked (fan pages, unofficial, etc.)

CREATE TABLE IF NOT EXISTS social_blocked_handles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  platform TEXT NOT NULL,
  handle TEXT NOT NULL,
  
  -- Why it's blocked
  reason TEXT NOT NULL CHECK (reason IN (
    'fan_page',
    'parody_account',
    'impersonator',
    'inactive',
    'private',
    'inappropriate',
    'name_mismatch',
    'political'
  )),
  
  -- Admin who blocked it
  blocked_by TEXT,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  
  notes TEXT,
  
  UNIQUE(platform, handle)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Fast lookup by celebrity
CREATE INDEX IF NOT EXISTS idx_social_profiles_celebrity 
  ON celebrity_social_profiles(celebrity_id);

-- Platform + confidence for priority sorting
CREATE INDEX IF NOT EXISTS idx_social_profiles_platform_confidence 
  ON celebrity_social_profiles(platform, confidence_score DESC);

-- Verified handles only
CREATE INDEX IF NOT EXISTS idx_social_profiles_verified 
  ON celebrity_social_profiles(verified) 
  WHERE verified = true;

-- Active handles
CREATE INDEX IF NOT EXISTS idx_social_profiles_active 
  ON celebrity_social_profiles(is_active) 
  WHERE is_active = true;

-- Source for auditing
CREATE INDEX IF NOT EXISTS idx_social_profiles_source 
  ON celebrity_social_profiles(source);

-- Blocked handles lookup
CREATE INDEX IF NOT EXISTS idx_blocked_handles_lookup 
  ON social_blocked_handles(platform, handle);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_social_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_social_profiles_updated_at
  BEFORE UPDATE ON celebrity_social_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_social_profile_timestamp();

-- Get all social profiles for a celebrity
CREATE OR REPLACE FUNCTION get_celebrity_social_profiles(p_celebrity_id UUID)
RETURNS TABLE (
  platform TEXT,
  handle TEXT,
  profile_url TEXT,
  confidence_score DECIMAL,
  verified BOOLEAN,
  is_official BOOLEAN,
  source TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.platform,
    sp.handle,
    sp.profile_url,
    sp.confidence_score,
    sp.verified,
    sp.is_official,
    sp.source
  FROM celebrity_social_profiles sp
  WHERE sp.celebrity_id = p_celebrity_id
    AND sp.is_active = true
  ORDER BY 
    sp.verified DESC,
    sp.is_official DESC,
    sp.confidence_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Check if handle is blocked
CREATE OR REPLACE FUNCTION is_handle_blocked(p_platform TEXT, p_handle TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM social_blocked_handles
    WHERE platform = p_platform AND handle = p_handle
  );
END;
$$ LANGUAGE plpgsql;

-- Calculate confidence score based on multiple factors
CREATE OR REPLACE FUNCTION calculate_social_confidence(
  p_wikidata_match BOOLEAN,
  p_wikipedia_match BOOLEAN,
  p_tmdb_match BOOLEAN,
  p_name_match BOOLEAN
)
RETURNS DECIMAL AS $$
DECLARE
  score DECIMAL := 0;
BEGIN
  -- Wikidata is most authoritative (+0.5)
  IF p_wikidata_match THEN
    score := score + 0.5;
  END IF;
  
  -- Wikipedia link (+0.3)
  IF p_wikipedia_match THEN
    score := score + 0.3;
  END IF;
  
  -- TMDB confirmation (+0.2)
  IF p_tmdb_match THEN
    score := score + 0.2;
  END IF;
  
  -- Name mismatch penalty
  IF NOT p_name_match THEN
    score := score - 0.3;
  END IF;
  
  -- Ensure score is within bounds
  RETURN GREATEST(0, LEAST(1, score));
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE celebrity_social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_ingestion_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_blocked_handles ENABLE ROW LEVEL SECURITY;

-- Public can read verified profiles
CREATE POLICY "Public can read verified social profiles"
  ON celebrity_social_profiles
  FOR SELECT
  USING (is_active = true AND (verified = true OR confidence_score >= 0.6));

-- Admin can do everything
CREATE POLICY "Admin full access to social profiles"
  ON celebrity_social_profiles
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to ingestion log"
  ON social_ingestion_log
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to blocked handles"
  ON social_blocked_handles
  FOR ALL
  USING (auth.role() = 'authenticated');

-- =====================================================
-- VIEWS
-- =====================================================

-- View: Celebrities with social profiles summary
CREATE OR REPLACE VIEW celebrity_social_summary AS
SELECT 
  c.id AS celebrity_id,
  c.name_en,
  c.name_te,
  COUNT(sp.id) FILTER (WHERE sp.platform = 'instagram') AS instagram_count,
  COUNT(sp.id) FILTER (WHERE sp.platform = 'youtube') AS youtube_count,
  COUNT(sp.id) FILTER (WHERE sp.platform = 'twitter') AS twitter_count,
  COUNT(sp.id) FILTER (WHERE sp.verified = true) AS verified_count,
  MAX(sp.confidence_score) AS max_confidence,
  MAX(sp.updated_at) AS last_updated
FROM celebrities c
LEFT JOIN celebrity_social_profiles sp ON c.id = sp.celebrity_id AND sp.is_active = true
GROUP BY c.id, c.name_en, c.name_te;

-- View: Recent ingestion stats
CREATE OR REPLACE VIEW social_ingestion_stats AS
SELECT 
  DATE(started_at) AS ingestion_date,
  source,
  COUNT(*) AS runs,
  SUM(handles_added) AS total_added,
  SUM(handles_updated) AS total_updated,
  SUM(handles_rejected) AS total_rejected,
  SUM(error_count) AS total_errors
FROM social_ingestion_log
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(started_at), source
ORDER BY ingestion_date DESC;

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Block known fan page handles
INSERT INTO social_blocked_handles (platform, handle, reason, notes) VALUES
  ('instagram', 'samantha_fans', 'fan_page', 'Not official account'),
  ('instagram', 'rashmika_fc', 'fan_page', 'Fan club account'),
  ('twitter', 'maheshbabu_fc', 'fan_page', 'Fan club account')
ON CONFLICT DO NOTHING;



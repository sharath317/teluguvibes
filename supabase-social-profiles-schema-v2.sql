-- ============================================================================
-- SOCIAL PROFILES SCHEMA V2 - Extended Platform Support
-- ============================================================================
-- Adds: TikTok, Snapchat, Twitter/X support
-- Updates: embed_supported column, discovery_method enum
-- Run this AFTER running supabase-social-profiles-schema.sql
-- ============================================================================

-- ============================================================================
-- 1. EXTEND PLATFORM ENUM (if using enum, otherwise skip)
-- ============================================================================

-- Add new platform values to existing enum (if exists)
DO $$ 
BEGIN
    -- Check if the type exists and add new values
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_platform') THEN
        -- Add tiktok if not exists
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'tiktok' AND enumtypid = 'social_platform'::regtype) THEN
            ALTER TYPE social_platform ADD VALUE 'tiktok';
        END IF;
        
        -- Add snapchat if not exists
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'snapchat' AND enumtypid = 'social_platform'::regtype) THEN
            ALTER TYPE social_platform ADD VALUE 'snapchat';
        END IF;
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Enum modification skipped: %', SQLERRM;
END $$;

-- ============================================================================
-- 2. ADD NEW COLUMNS TO celebrity_social_profiles
-- ============================================================================

-- Add embed_supported column
ALTER TABLE celebrity_social_profiles
ADD COLUMN IF NOT EXISTS embed_supported BOOLEAN DEFAULT true;

-- Add discovery_method column
ALTER TABLE celebrity_social_profiles
ADD COLUMN IF NOT EXISTS discovery_method TEXT DEFAULT 'wikidata';

-- Add platform_priority column for sorting
ALTER TABLE celebrity_social_profiles
ADD COLUMN IF NOT EXISTS platform_priority DECIMAL(3,2) DEFAULT 0.5;

-- Add glam_suitability column
ALTER TABLE celebrity_social_profiles
ADD COLUMN IF NOT EXISTS glam_suitability DECIMAL(3,2) DEFAULT 0.5;

-- ============================================================================
-- 3. UPDATE EXISTING DATA - Set embed_supported based on platform
-- ============================================================================

-- Snapchat: NO embed support
UPDATE celebrity_social_profiles 
SET embed_supported = false,
    platform_priority = 0.5,
    glam_suitability = 0.7
WHERE platform = 'snapchat';

-- Instagram: Full embed support
UPDATE celebrity_social_profiles 
SET embed_supported = true,
    platform_priority = 1.0,
    glam_suitability = 1.0
WHERE platform = 'instagram';

-- TikTok: Partial embed support
UPDATE celebrity_social_profiles 
SET embed_supported = true,
    platform_priority = 0.9,
    glam_suitability = 0.9
WHERE platform = 'tiktok';

-- YouTube: Full embed support
UPDATE celebrity_social_profiles 
SET embed_supported = true,
    platform_priority = 0.95,
    glam_suitability = 0.8
WHERE platform = 'youtube';

-- Twitter/X: Full embed support
UPDATE celebrity_social_profiles 
SET embed_supported = true,
    platform_priority = 0.85,
    glam_suitability = 0.6
WHERE platform = 'twitter';

-- Facebook: Partial embed support
UPDATE celebrity_social_profiles 
SET embed_supported = true,
    platform_priority = 0.7,
    glam_suitability = 0.5
WHERE platform = 'facebook';

-- IMDB: No embed
UPDATE celebrity_social_profiles 
SET embed_supported = false,
    platform_priority = 0.3,
    glam_suitability = 0.2
WHERE platform = 'imdb';

-- Official website: No embed
UPDATE celebrity_social_profiles 
SET embed_supported = false,
    platform_priority = 0.4,
    glam_suitability = 0.3
WHERE platform = 'official_website';

-- ============================================================================
-- 4. CREATE PLATFORM CAPABILITIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_capabilities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    supports_embed BOOLEAN NOT NULL DEFAULT false,
    embed_level TEXT NOT NULL DEFAULT 'none' CHECK (embed_level IN ('full', 'partial', 'none')),
    priority_score DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    glam_suitability_score DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    oembed_endpoint TEXT,
    max_embed_width INTEGER,
    supports_profile_embed BOOLEAN NOT NULL DEFAULT false,
    supports_post_embed BOOLEAN NOT NULL DEFAULT false,
    wikidata_property TEXT,
    legal_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert platform capabilities
INSERT INTO platform_capabilities (id, name, icon, supports_embed, embed_level, priority_score, glam_suitability_score, oembed_endpoint, max_embed_width, supports_profile_embed, supports_post_embed, wikidata_property, legal_notes)
VALUES
    ('instagram', 'Instagram', '📸', true, 'full', 1.0, 1.0, 'https://graph.facebook.com/v18.0/instagram_oembed', 540, false, true, 'P2003', 'oEmbed requires Facebook Graph API token for full access.'),
    ('youtube', 'YouTube', '▶️', true, 'full', 0.95, 0.8, 'https://www.youtube.com/oembed', 640, false, true, 'P2397', 'Full oEmbed support.'),
    ('twitter', 'Twitter/X', '🐦', true, 'full', 0.85, 0.6, 'https://publish.twitter.com/oembed', 550, false, true, 'P2002', 'Full oEmbed support via publish.twitter.com.'),
    ('facebook', 'Facebook', '📘', true, 'partial', 0.7, 0.5, 'https://graph.facebook.com/v18.0/oembed_page', 500, false, true, 'P2013', 'Limited oEmbed. Page embeds require app review.'),
    ('tiktok', 'TikTok', '🎵', true, 'partial', 0.9, 0.9, 'https://www.tiktok.com/oembed', 325, false, true, 'P7085', 'oEmbed for videos only. Web-only rendering.'),
    ('snapchat', 'Snapchat', '👻', false, 'none', 0.5, 0.7, NULL, NULL, false, false, 'P11012', 'NO PUBLIC EMBEDDING API. Metadata storage only.'),
    ('imdb', 'IMDB', '🎬', false, 'none', 0.3, 0.2, NULL, NULL, false, false, 'P345', 'Reference only. No embedding support.'),
    ('wikipedia', 'Wikipedia', '📖', false, 'none', 0.2, 0.1, NULL, NULL, false, false, NULL, 'Reference only.'),
    ('official_website', 'Official Website', '🌐', false, 'none', 0.4, 0.3, NULL, NULL, false, false, 'P856', 'Reference only.')
ON CONFLICT (id) DO UPDATE SET
    supports_embed = EXCLUDED.supports_embed,
    embed_level = EXCLUDED.embed_level,
    priority_score = EXCLUDED.priority_score,
    glam_suitability_score = EXCLUDED.glam_suitability_score,
    updated_at = NOW();

-- ============================================================================
-- 5. ADD INDEXES FOR NEW COLUMNS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_social_profiles_embed_supported 
ON celebrity_social_profiles(embed_supported);

CREATE INDEX IF NOT EXISTS idx_social_profiles_platform_priority 
ON celebrity_social_profiles(platform_priority DESC);

CREATE INDEX IF NOT EXISTS idx_social_profiles_glam_suitability 
ON celebrity_social_profiles(glam_suitability DESC);

-- ============================================================================
-- 6. CREATE VIEW FOR HOT CONTENT PRIORITY
-- ============================================================================

CREATE OR REPLACE VIEW v_social_profiles_hot_priority AS
SELECT 
    csp.*,
    pc.supports_embed,
    pc.embed_level,
    pc.glam_suitability_score as platform_glam_score,
    pc.legal_notes,
    CASE 
        WHEN csp.platform = 'instagram' THEN 1
        WHEN csp.platform = 'tiktok' THEN 2
        WHEN csp.platform = 'youtube' THEN 3
        WHEN csp.platform = 'twitter' THEN 4
        WHEN csp.platform = 'facebook' THEN 5
        ELSE 99
    END as hot_content_rank
FROM celebrity_social_profiles csp
LEFT JOIN platform_capabilities pc ON csp.platform = pc.id
WHERE csp.is_active = true
ORDER BY hot_content_rank, csp.confidence_score DESC;

-- ============================================================================
-- 7. TRIGGER TO AUTO-SET embed_supported ON INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION set_embed_supported()
RETURNS TRIGGER AS $$
BEGIN
    -- Set embed_supported based on platform
    NEW.embed_supported := CASE
        WHEN NEW.platform IN ('snapchat', 'imdb', 'wikipedia', 'official_website') THEN false
        ELSE true
    END;
    
    -- Set platform priority
    NEW.platform_priority := CASE NEW.platform
        WHEN 'instagram' THEN 1.0
        WHEN 'youtube' THEN 0.95
        WHEN 'tiktok' THEN 0.9
        WHEN 'twitter' THEN 0.85
        WHEN 'facebook' THEN 0.7
        WHEN 'snapchat' THEN 0.5
        WHEN 'official_website' THEN 0.4
        WHEN 'imdb' THEN 0.3
        ELSE 0.5
    END;
    
    -- Set glam suitability
    NEW.glam_suitability := CASE NEW.platform
        WHEN 'instagram' THEN 1.0
        WHEN 'tiktok' THEN 0.9
        WHEN 'youtube' THEN 0.8
        WHEN 'snapchat' THEN 0.7
        WHEN 'twitter' THEN 0.6
        WHEN 'facebook' THEN 0.5
        WHEN 'official_website' THEN 0.3
        WHEN 'imdb' THEN 0.2
        ELSE 0.5
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_embed_supported ON celebrity_social_profiles;
CREATE TRIGGER trg_set_embed_supported
    BEFORE INSERT ON celebrity_social_profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_embed_supported();

-- ============================================================================
-- 8. ADD COMMENT DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN celebrity_social_profiles.embed_supported IS 
'Whether this platform supports oEmbed. Snapchat, IMDB, Wikipedia do NOT support embedding.';

COMMENT ON COLUMN celebrity_social_profiles.discovery_method IS 
'How this handle was discovered: wikidata, wikipedia, tmdb, or manual';

COMMENT ON COLUMN celebrity_social_profiles.platform_priority IS 
'Priority score for Hot content selection (1.0 = highest)';

COMMENT ON COLUMN celebrity_social_profiles.glam_suitability IS 
'Glamour content suitability score (1.0 = best for glam)';

COMMENT ON TABLE platform_capabilities IS 
'Configuration table for platform embedding and legal constraints';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- LEGAL CONSTRAINTS BY PLATFORM:
-- 
-- Instagram: oEmbed works but requires Facebook Graph API token for some features
-- YouTube:   Full oEmbed support, respect Terms of Service
-- Twitter/X: Full oEmbed via publish.twitter.com
-- TikTok:    oEmbed for videos only, web-only rendering, no profile embeds
-- Snapchat:  NO PUBLIC EMBEDDING API - metadata storage only
-- Facebook:  Limited oEmbed, page embeds require app review
-- 
-- WHY SNAPCHAT HAS NO EMBED:
-- Snapchat does not provide a public API for embedding content.
-- Stories are ephemeral and cannot be embedded.
-- We store the handle for reference only.
-- 
-- WHY TIKTOK EMBEDS ARE LIMITED:
-- TikTok oEmbed only works for individual video posts.
-- Profile pages cannot be embedded.
-- Embeds may require JavaScript to render.
-- Mobile compatibility varies.
-- 
-- ============================================================================


-- ============================================================
-- MIGRATION: Add Structured Review Intelligence Fields
-- ============================================================
-- Purpose: Extend movie_reviews table to support structured
--          review dimensions, performance scores, and audience signals
-- Date: 2026-01-03
-- Backward Compatible: YES (all columns are nullable)
-- ============================================================

-- Add JSON columns for structured review data
ALTER TABLE movie_reviews 
ADD COLUMN IF NOT EXISTS dimensions_json JSONB,
ADD COLUMN IF NOT EXISTS performance_scores JSONB,
ADD COLUMN IF NOT EXISTS technical_scores JSONB,
ADD COLUMN IF NOT EXISTS audience_signals JSONB,
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.75;

-- Add indexes for faster queries on JSON fields
CREATE INDEX IF NOT EXISTS idx_reviews_dimensions 
ON movie_reviews USING GIN (dimensions_json);

CREATE INDEX IF NOT EXISTS idx_reviews_performance 
ON movie_reviews USING GIN (performance_scores);

CREATE INDEX IF NOT EXISTS idx_reviews_technical 
ON movie_reviews USING GIN (technical_scores);

CREATE INDEX IF NOT EXISTS idx_reviews_audience 
ON movie_reviews USING GIN (audience_signals);

CREATE INDEX IF NOT EXISTS idx_reviews_confidence 
ON movie_reviews (confidence_score DESC);

-- Add composite score column (weighted rating)
ALTER TABLE movie_reviews 
ADD COLUMN IF NOT EXISTS composite_score DECIMAL(4,2);

CREATE INDEX IF NOT EXISTS idx_reviews_composite 
ON movie_reviews (composite_score DESC NULLS LAST);

-- Add metadata tracking
ALTER TABLE movie_reviews 
ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS enrichment_version VARCHAR(10) DEFAULT 'v1.0';

-- ============================================================
-- SCHEMA DOCUMENTATION
-- ============================================================

COMMENT ON COLUMN movie_reviews.dimensions_json IS 
'Structured review dimensions: story_screenplay, direction, acting_lead, acting_supporting, music_bgm, cinematography, editing_pacing, emotional_impact, rewatch_value, mass_vs_class';

COMMENT ON COLUMN movie_reviews.performance_scores IS 
'Actor-wise performance breakdown with scores and highlights';

COMMENT ON COLUMN movie_reviews.technical_scores IS 
'Technical aspects: cinematography, editing, sound design, VFX';

COMMENT ON COLUMN movie_reviews.audience_signals IS 
'Audience mood indicators: tears, laughter, thrill, family_friendly';

COMMENT ON COLUMN movie_reviews.confidence_score IS 
'Confidence in review quality (0.0 - 1.0), based on data completeness and source reliability';

COMMENT ON COLUMN movie_reviews.composite_score IS 
'Weighted composite score combining rating, dimensions, engagement, and box office';

COMMENT ON COLUMN movie_reviews.enriched_at IS 
'Timestamp when structured intelligence was last generated';

COMMENT ON COLUMN movie_reviews.enrichment_version IS 
'Version of enrichment algorithm used';

-- ============================================================
-- EXAMPLE DATA STRUCTURE
-- ============================================================

-- dimensions_json structure:
-- {
--   "story_screenplay": { "score": 8.5, "highlights": ["..."], "weaknesses": ["..."] },
--   "direction": { "score": 9.0, "style": "mass-commercial", "innovation": 7 },
--   "acting_lead": {
--     "hero": { "name": "...", "score": 9.5, "transformation": 8 },
--     "heroine": { "name": "...", "score": 8.0, "chemistry": 9 }
--   },
--   "acting_supporting": { "standouts": [{ "name": "...", "impact": "..." }] },
--   "music_bgm": { "songs": 8, "bgm": 9, "replay_value": 8 },
--   "cinematography": { "score": 9, "memorable_shots": ["..."] },
--   "editing_pacing": { "score": 8, "runtime_efficiency": 85 },
--   "emotional_impact": { "tears": 7, "laughter": 8, "thrill": 9 },
--   "rewatch_value": 8.5,
--   "mass_vs_class": { "mass": 9, "class": 6, "universal_appeal": 7 }
-- }

-- performance_scores structure:
-- {
--   "lead_actors": [
--     { "name": "...", "role": "hero", "score": 9.5, "career_best": true },
--     { "name": "...", "role": "heroine", "score": 8.0, "chemistry": 9 }
--   ],
--   "supporting_cast": [
--     { "name": "...", "role": "villain", "score": 8.5, "impact": "high" }
--   ]
-- }

-- technical_scores structure:
-- {
--   "cinematography": 9.0,
--   "editing": 8.5,
--   "sound_design": 8.0,
--   "vfx": 7.5,
--   "production_design": 8.5
-- }

-- audience_signals structure:
-- {
--   "mood": ["thrilling", "emotional", "uplifting"],
--   "family_friendly": true,
--   "age_rating": "U/A",
--   "rewatch_potential": "high",
--   "mass_appeal": 9,
--   "critic_appeal": 7
-- }



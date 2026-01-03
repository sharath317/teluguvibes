-- Migration: Add Editorial Review Columns to movie_reviews
-- Run this in Supabase SQL Editor to enable proper storage of editorial reviews

-- Add structured_review_v2 column for 9-section editorial reviews
ALTER TABLE movie_reviews 
ADD COLUMN IF NOT EXISTS structured_review_v2 JSONB;

-- Add quality score column
ALTER TABLE movie_reviews 
ADD COLUMN IF NOT EXISTS review_quality_score REAL DEFAULT 0.0;

-- Add rewrite timestamp
ALTER TABLE movie_reviews 
ADD COLUMN IF NOT EXISTS editorial_rewrite_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_reviews_quality_score 
ON movie_reviews (review_quality_score);

CREATE INDEX IF NOT EXISTS idx_reviews_structured_v2 
ON movie_reviews USING GIN (structured_review_v2);

CREATE INDEX IF NOT EXISTS idx_reviews_editorial_rewrite 
ON movie_reviews (editorial_rewrite_at);

-- Comment for documentation
COMMENT ON COLUMN movie_reviews.structured_review_v2 IS 'Editorial review with 9-section structure (synopsis, performances, verdict, etc.)';
COMMENT ON COLUMN movie_reviews.review_quality_score IS 'Quality score from 0-1 calculated by the editorial generator';
COMMENT ON COLUMN movie_reviews.editorial_rewrite_at IS 'Timestamp when the editorial review was last generated';

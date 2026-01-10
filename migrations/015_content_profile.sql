-- Migration: Add content_profile to movies table
-- Purpose: Store structured content classification for family-safe filtering

-- Add content_profile column to movies table
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS content_profile JSONB DEFAULT NULL;

-- Add index for fast filtering
CREATE INDEX IF NOT EXISTS idx_movies_content_profile_adult 
ON movies ((content_profile->>'isAdult'));

CREATE INDEX IF NOT EXISTS idx_movies_content_profile_family_safe 
ON movies ((content_profile->>'isFamilySafe'));

CREATE INDEX IF NOT EXISTS idx_movies_content_profile_rating 
ON movies ((content_profile->>'audienceRating'));

-- Add comment explaining the schema
COMMENT ON COLUMN movies.content_profile IS 'Content classification profile including sensitivity, audience rating, and warnings. Schema: { category, sensitivity: { violence, substances, language, sexual, themes, horror, gambling }, audienceRating, warnings: [], isAdult, isFamilySafe, requiresWarning, minimumAge, classifiedAt, classifiedBy, confidence }';

-- Create a function to check if movie is family safe
CREATE OR REPLACE FUNCTION is_movie_family_safe(movie_record movies)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- If no content profile, default to not family safe
  IF movie_record.content_profile IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check isFamilySafe flag
  RETURN COALESCE(
    (movie_record.content_profile->>'isFamilySafe')::boolean,
    FALSE
  );
END;
$$;

-- Create a view for family-safe movies
CREATE OR REPLACE VIEW family_safe_movies AS
SELECT *
FROM movies
WHERE content_profile IS NOT NULL
  AND (content_profile->>'isFamilySafe')::boolean = true
  AND (content_profile->>'isAdult')::boolean = false;

-- Create a view for adult content (for admin only)
CREATE OR REPLACE VIEW adult_movies AS
SELECT *
FROM movies
WHERE content_profile IS NOT NULL
  AND (content_profile->>'isAdult')::boolean = true;

-- Grant read access to family_safe_movies view
-- (Actual permissions depend on your RLS policies)

-- Add RLS policy for content filtering (optional, enable if using RLS)
-- ALTER TABLE movies ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY content_filtering_policy ON movies
-- FOR SELECT
-- USING (
--   CASE 
--     WHEN current_setting('app.content_mode', true) = 'family_safe' THEN
--       content_profile IS NOT NULL 
--       AND (content_profile->>'isFamilySafe')::boolean = true
--     ELSE true
--   END
-- );



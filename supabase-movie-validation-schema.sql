-- ============================================================
-- MOVIE VALIDATION SCHEMA MIGRATION
-- Adds validation constraints and statuses for movie data integrity
-- ============================================================

-- 1. Add validation_status column to movies table
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'PENDING_VALIDATION'
CHECK (validation_status IN (
  'VALID',
  'PENDING_VALIDATION',
  'INVALID_NOT_MOVIE',
  'INVALID_NOT_TELUGU',
  'INVALID_NO_TMDB_MATCH',
  'INVALID_DUPLICATE',
  'INVALID_MISSING_DATA',
  'INVALID_CAST_CREW',
  'INVALID_NO_IMAGE',
  'INVALID_FUTURE_RELEASE'
));

-- 2. Add canonical_title column for duplicate detection
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS canonical_title TEXT;

-- 3. Add data_quality_score for tracking
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS data_quality_score DECIMAL(4,2) DEFAULT 0
CHECK (data_quality_score >= 0 AND data_quality_score <= 100);

-- 4. Create unique index on tmdb_id (partial - only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS movies_tmdb_id_unique_idx 
ON movies (tmdb_id) 
WHERE tmdb_id IS NOT NULL;

-- 5. Create unique index on canonical_title + release_year for duplicate prevention
CREATE UNIQUE INDEX IF NOT EXISTS movies_canonical_title_year_unique_idx 
ON movies (canonical_title, release_year) 
WHERE canonical_title IS NOT NULL AND release_year IS NOT NULL;

-- 6. Create index on validation_status for filtering
CREATE INDEX IF NOT EXISTS movies_validation_status_idx 
ON movies (validation_status);

-- 7. Create index on canonical_title for searches
CREATE INDEX IF NOT EXISTS movies_canonical_title_idx 
ON movies (canonical_title);

-- 8. Function to auto-generate canonical_title on insert/update
CREATE OR REPLACE FUNCTION generate_canonical_title()
RETURNS TRIGGER AS $$
BEGIN
  -- Canonicalize: lowercase, remove special chars, trim
  NEW.canonical_title := LOWER(TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(NEW.title_en, '\s*\(film\)\s*', '', 'gi'),
        '\s*\(\d{4}\)\s*', '', 'gi'
      ),
      '[^a-z0-9\s]', '', 'gi'
    )
  ));
  
  -- Replace multiple spaces with single space
  NEW.canonical_title := REGEXP_REPLACE(NEW.canonical_title, '\s+', ' ', 'g');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for canonical title generation
DROP TRIGGER IF EXISTS movies_canonical_title_trigger ON movies;
CREATE TRIGGER movies_canonical_title_trigger
  BEFORE INSERT OR UPDATE OF title_en ON movies
  FOR EACH ROW
  EXECUTE FUNCTION generate_canonical_title();

-- 10. Function to calculate data quality score
CREATE OR REPLACE FUNCTION calculate_movie_quality_score()
RETURNS TRIGGER AS $$
DECLARE
  score DECIMAL(4,2) := 0;
BEGIN
  -- TMDB ID present (30 points)
  IF NEW.tmdb_id IS NOT NULL THEN
    score := score + 30;
  END IF;
  
  -- Poster URL present (20 points)
  IF NEW.poster_url IS NOT NULL THEN
    score := score + 20;
  END IF;
  
  -- Director present (15 points)
  IF NEW.director IS NOT NULL AND NEW.director != '' THEN
    score := score + 15;
  END IF;
  
  -- Cast members present (15 points)
  IF NEW.cast_members IS NOT NULL AND jsonb_array_length(NEW.cast_members) >= 3 THEN
    score := score + 15;
  ELSIF NEW.cast_members IS NOT NULL AND jsonb_array_length(NEW.cast_members) > 0 THEN
    score := score + 8;
  END IF;
  
  -- Synopsis present (10 points)
  IF NEW.synopsis IS NOT NULL AND length(NEW.synopsis) > 50 THEN
    score := score + 10;
  ELSIF NEW.synopsis IS NOT NULL AND length(NEW.synopsis) > 10 THEN
    score := score + 5;
  END IF;
  
  -- Telugu title present (5 points)
  IF NEW.title_te IS NOT NULL AND NEW.title_te != '' THEN
    score := score + 5;
  END IF;
  
  -- Release date present (5 points)
  IF NEW.release_date IS NOT NULL OR NEW.release_year IS NOT NULL THEN
    score := score + 5;
  END IF;
  
  NEW.data_quality_score := score;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger for quality score calculation
DROP TRIGGER IF EXISTS movies_quality_score_trigger ON movies;
CREATE TRIGGER movies_quality_score_trigger
  BEFORE INSERT OR UPDATE ON movies
  FOR EACH ROW
  EXECUTE FUNCTION calculate_movie_quality_score();

-- 12. View for invalid movies
CREATE OR REPLACE VIEW invalid_movies AS
SELECT 
  id,
  title_en,
  title_te,
  release_year,
  validation_status,
  data_quality_score,
  tmdb_id,
  poster_url IS NOT NULL as has_poster,
  director IS NOT NULL as has_director,
  created_at
FROM movies
WHERE validation_status LIKE 'INVALID_%'
ORDER BY created_at DESC;

-- 13. View for movies needing validation
CREATE OR REPLACE VIEW movies_pending_validation AS
SELECT 
  id,
  title_en,
  release_year,
  tmdb_id,
  data_quality_score,
  created_at
FROM movies
WHERE validation_status = 'PENDING_VALIDATION'
ORDER BY created_at DESC
LIMIT 100;

-- 14. View for duplicate candidates
CREATE OR REPLACE VIEW duplicate_movie_candidates AS
SELECT 
  canonical_title,
  release_year,
  COUNT(*) as count,
  array_agg(id) as movie_ids,
  array_agg(title_en) as titles
FROM movies
WHERE canonical_title IS NOT NULL
GROUP BY canonical_title, release_year
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 15. Function to mark movie as valid after verification
CREATE OR REPLACE FUNCTION mark_movie_valid(movie_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE movies 
  SET 
    validation_status = 'VALID',
    updated_at = NOW()
  WHERE id = movie_id;
END;
$$ LANGUAGE plpgsql;

-- 16. Function to mark movie as invalid
CREATE OR REPLACE FUNCTION mark_movie_invalid(movie_id UUID, status TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE movies 
  SET 
    validation_status = status,
    is_published = FALSE,
    updated_at = NOW()
  WHERE id = movie_id;
END;
$$ LANGUAGE plpgsql;

-- 17. RLS Policies for validation views (admin only)
-- Note: These views are for admin use, so we don't add public policies

-- 18. Comments for documentation
COMMENT ON COLUMN movies.validation_status IS 'Validation status from movie identity gate';
COMMENT ON COLUMN movies.canonical_title IS 'Normalized title for duplicate detection';
COMMENT ON COLUMN movies.data_quality_score IS 'Quality score 0-100 based on data completeness';
COMMENT ON VIEW invalid_movies IS 'View of all movies with invalid status';
COMMENT ON VIEW movies_pending_validation IS 'Movies awaiting validation';
COMMENT ON VIEW duplicate_movie_candidates IS 'Potential duplicate movies by canonical title';

-- 19. Update existing movies to generate canonical titles
UPDATE movies 
SET canonical_title = LOWER(TRIM(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(title_en, '\s*\(film\)\s*', '', 'gi'),
      '\s*\(\d{4}\)\s*', '', 'gi'
    ),
    '[^a-z0-9\s]', '', 'gi'
  )
))
WHERE canonical_title IS NULL;

-- 20. Update quality scores for existing movies
UPDATE movies 
SET data_quality_score = (
  CASE WHEN tmdb_id IS NOT NULL THEN 30 ELSE 0 END +
  CASE WHEN poster_url IS NOT NULL THEN 20 ELSE 0 END +
  CASE WHEN director IS NOT NULL AND director != '' THEN 15 ELSE 0 END +
  CASE WHEN cast_members IS NOT NULL AND jsonb_array_length(cast_members) >= 3 THEN 15
       WHEN cast_members IS NOT NULL AND jsonb_array_length(cast_members) > 0 THEN 8 ELSE 0 END +
  CASE WHEN synopsis IS NOT NULL AND length(synopsis) > 50 THEN 10
       WHEN synopsis IS NOT NULL AND length(synopsis) > 10 THEN 5 ELSE 0 END +
  CASE WHEN title_te IS NOT NULL AND title_te != '' THEN 5 ELSE 0 END +
  CASE WHEN release_date IS NOT NULL OR release_year IS NOT NULL THEN 5 ELSE 0 END
)
WHERE data_quality_score IS NULL OR data_quality_score = 0;

SELECT 'Movie validation schema migration complete!' as status;







-- ============================================================
-- ENHANCED TAGS SCHEMA FOR TELUGUVIBES
-- ============================================================
-- This migration adds comprehensive tagging capabilities:
-- - Box office categories
-- - Awards tracking
-- - Content flags (remake, sequel, biopic, etc.)
-- - Mood/vibe tags
-- - Age rating and audience signals
-- - Trigger warnings
-- ============================================================

-- ============================================================
-- MOVIES TABLE ENHANCEMENTS
-- ============================================================

-- Box office performance category
ALTER TABLE movies ADD COLUMN IF NOT EXISTS box_office_category TEXT 
  CHECK (box_office_category IN (
    'industry-hit',   -- Top grosser of year/era
    'blockbuster',    -- Huge success
    'super-hit',      -- Very successful
    'hit',            -- Commercially successful
    'average',        -- Broke even
    'below-average',  -- Lost money
    'disaster'        -- Major flop
  ));

-- Awards received (JSON array)
-- Format: [{"type": "national", "category": "Best Actor", "year": 2023, "recipient": "Actor Name"}]
ALTER TABLE movies ADD COLUMN IF NOT EXISTS awards JSONB DEFAULT '[]';

-- Content classification flags
-- Format: {"pan_india": true, "remake_of": "movie_id", "original_language": "Hindi", "sequel_number": 2, "franchise": "Baahubali", "biopic": true, "based_on": "true events", "debut_director": true, "debut_hero": false}
ALTER TABLE movies ADD COLUMN IF NOT EXISTS content_flags JSONB DEFAULT '{}';

-- Mood/vibe tags for discovery
-- Options: feel-good, dark-intense, thought-provoking, patriotic, nostalgic, inspirational, emotional, gripping, light-hearted, edge-of-seat
ALTER TABLE movies ADD COLUMN IF NOT EXISTS mood_tags TEXT[] DEFAULT '{}';

-- Age rating (Indian censor board classification)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS age_rating TEXT 
  CHECK (age_rating IN ('U', 'U/A', 'A', 'S'));

-- Trigger warnings for sensitive content
-- Options: violence, death, trauma, abuse, substance-use, suicide, sexual-content, gore, disturbing-imagery, animal-harm
ALTER TABLE movies ADD COLUMN IF NOT EXISTS trigger_warnings TEXT[] DEFAULT '{}';

-- Audience fit signals
-- Format: {"kids_friendly": false, "family_watch": true, "date_movie": true, "group_watch": false, "solo_watch": true}
ALTER TABLE movies ADD COLUMN IF NOT EXISTS audience_fit JSONB DEFAULT '{}';

-- Watch platform recommendation
ALTER TABLE movies ADD COLUMN IF NOT EXISTS watch_recommendation TEXT 
  CHECK (watch_recommendation IN ('theater-must', 'theater-preferred', 'ott-friendly', 'any'));

-- Quality tier tags (existing is_blockbuster, is_classic, is_underrated will be supplemented)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS quality_tags TEXT[] DEFAULT '{}';
-- Options: masterpiece, cult-classic, hidden-gem, fan-favorite, critically-acclaimed, crowd-pleaser, sleeper-hit

-- Box office collection data (in crores)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS box_office_data JSONB DEFAULT '{}';
-- Format: {"opening_day": 10, "first_week": 50, "lifetime": 200, "worldwide": 500, "budget": 100}

-- ============================================================
-- MOVIE_REVIEWS TABLE ENHANCEMENTS
-- ============================================================

-- Audience signals derived during review generation
ALTER TABLE movie_reviews ADD COLUMN IF NOT EXISTS audience_signals JSONB DEFAULT '{}';
-- Format: {
--   "age_rating": "U/A",
--   "kids_friendly": false,
--   "family_watch": true,
--   "date_movie": true,
--   "group_watch": true,
--   "theater_recommended": true,
--   "trigger_warnings": ["violence"],
--   "mood_tags": ["intense", "emotional"],
--   "best_time_to_watch": "weekend"
-- }

-- Why Watch / Why Skip sections
ALTER TABLE movie_reviews ADD COLUMN IF NOT EXISTS why_watch TEXT[] DEFAULT '{}';
ALTER TABLE movie_reviews ADD COLUMN IF NOT EXISTS why_skip TEXT[] DEFAULT '{}';

-- Crew insights (populated during review generation)
ALTER TABLE movie_reviews ADD COLUMN IF NOT EXISTS crew_insights JSONB DEFAULT '[]';
-- Format: [{"crew_type": "music_director", "name": "DSP", "note_en": "...", "note_te": "...", "confidence": 0.85}]

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Box office queries
CREATE INDEX IF NOT EXISTS idx_movies_box_office_category ON movies(box_office_category);

-- Age rating filtering
CREATE INDEX IF NOT EXISTS idx_movies_age_rating ON movies(age_rating);

-- Mood tags search
CREATE INDEX IF NOT EXISTS idx_movies_mood_tags ON movies USING GIN(mood_tags);

-- Quality tags search
CREATE INDEX IF NOT EXISTS idx_movies_quality_tags ON movies USING GIN(quality_tags);

-- Trigger warnings filtering
CREATE INDEX IF NOT EXISTS idx_movies_trigger_warnings ON movies USING GIN(trigger_warnings);

-- ============================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================

-- Family-friendly movies view
CREATE OR REPLACE VIEW v_family_friendly_movies AS
SELECT *
FROM movies
WHERE 
  is_published = true
  AND (
    age_rating = 'U'
    OR (audience_fit->>'family_watch')::boolean = true
    OR (audience_fit->>'kids_friendly')::boolean = true
  )
  AND NOT ('violence' = ANY(trigger_warnings))
  AND NOT ('gore' = ANY(trigger_warnings))
ORDER BY avg_rating DESC NULLS LAST;

-- Award-winning movies view
CREATE OR REPLACE VIEW v_award_winning_movies AS
SELECT 
  m.*,
  jsonb_array_length(m.awards) as award_count
FROM movies m
WHERE 
  is_published = true
  AND jsonb_array_length(m.awards) > 0
ORDER BY award_count DESC, avg_rating DESC NULLS LAST;

-- Box office hits by category
CREATE OR REPLACE VIEW v_box_office_hits AS
SELECT *
FROM movies
WHERE 
  is_published = true
  AND box_office_category IN ('industry-hit', 'blockbuster', 'super-hit', 'hit')
ORDER BY 
  CASE box_office_category
    WHEN 'industry-hit' THEN 1
    WHEN 'blockbuster' THEN 2
    WHEN 'super-hit' THEN 3
    WHEN 'hit' THEN 4
  END,
  release_year DESC NULLS LAST;

-- Pan-India releases
CREATE OR REPLACE VIEW v_pan_india_movies AS
SELECT *
FROM movies
WHERE 
  is_published = true
  AND (content_flags->>'pan_india')::boolean = true
ORDER BY release_year DESC NULLS LAST, avg_rating DESC NULLS LAST;

-- Remakes tracking
CREATE OR REPLACE VIEW v_remake_movies AS
SELECT 
  m.*,
  content_flags->>'remake_of' as original_movie_id,
  content_flags->>'original_language' as original_language
FROM movies m
WHERE 
  is_published = true
  AND content_flags->>'remake_of' IS NOT NULL
ORDER BY release_year DESC NULLS LAST;

-- Biopics and true stories
CREATE OR REPLACE VIEW v_biopic_movies AS
SELECT *
FROM movies
WHERE 
  is_published = true
  AND (
    (content_flags->>'biopic')::boolean = true
    OR content_flags->>'based_on' = 'true events'
  )
ORDER BY release_year DESC NULLS LAST;

-- ============================================================
-- FUNCTIONS FOR TAG MANAGEMENT
-- ============================================================

-- Function to add a mood tag to a movie
CREATE OR REPLACE FUNCTION add_mood_tag(
  p_movie_id UUID,
  p_tag TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE movies 
  SET mood_tags = array_append(mood_tags, p_tag)
  WHERE id = p_movie_id 
  AND NOT (p_tag = ANY(mood_tags));
END;
$$ LANGUAGE plpgsql;

-- Function to add a quality tag to a movie
CREATE OR REPLACE FUNCTION add_quality_tag(
  p_movie_id UUID,
  p_tag TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE movies 
  SET quality_tags = array_append(quality_tags, p_tag)
  WHERE id = p_movie_id 
  AND NOT (p_tag = ANY(quality_tags));
END;
$$ LANGUAGE plpgsql;

-- Function to add an award to a movie
CREATE OR REPLACE FUNCTION add_movie_award(
  p_movie_id UUID,
  p_award_type TEXT,
  p_category TEXT,
  p_year INTEGER,
  p_recipient TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE movies 
  SET awards = awards || jsonb_build_object(
    'type', p_award_type,
    'category', p_category,
    'year', p_year,
    'recipient', p_recipient
  )
  WHERE id = p_movie_id;
END;
$$ LANGUAGE plpgsql;

-- Function to derive box office category from data
CREATE OR REPLACE FUNCTION derive_box_office_category(
  p_movie_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_budget NUMERIC;
  v_lifetime NUMERIC;
  v_roi NUMERIC;
  v_category TEXT;
BEGIN
  SELECT 
    (box_office_data->>'budget')::NUMERIC,
    (box_office_data->>'lifetime')::NUMERIC
  INTO v_budget, v_lifetime
  FROM movies
  WHERE id = p_movie_id;
  
  IF v_budget IS NULL OR v_lifetime IS NULL THEN
    RETURN NULL;
  END IF;
  
  v_roi := v_lifetime / NULLIF(v_budget, 0);
  
  IF v_roi >= 4 THEN
    v_category := 'industry-hit';
  ELSIF v_roi >= 3 THEN
    v_category := 'blockbuster';
  ELSIF v_roi >= 2 THEN
    v_category := 'super-hit';
  ELSIF v_roi >= 1.5 THEN
    v_category := 'hit';
  ELSIF v_roi >= 0.8 THEN
    v_category := 'average';
  ELSIF v_roi >= 0.5 THEN
    v_category := 'below-average';
  ELSE
    v_category := 'disaster';
  END IF;
  
  -- Update the movie
  UPDATE movies SET box_office_category = v_category WHERE id = p_movie_id;
  
  RETURN v_category;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER FOR AUTO-UPDATING QUALITY FLAGS
-- ============================================================

CREATE OR REPLACE FUNCTION update_movie_quality_flags()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-add 'masterpiece' tag for 9+ rated movies
  IF NEW.avg_rating >= 9 AND NOT ('masterpiece' = ANY(NEW.quality_tags)) THEN
    NEW.quality_tags := array_append(NEW.quality_tags, 'masterpiece');
  END IF;
  
  -- Auto-add 'critically-acclaimed' for 8+ with enough votes
  IF NEW.avg_rating >= 8 AND NEW.total_reviews >= 10 AND NOT ('critically-acclaimed' = ANY(NEW.quality_tags)) THEN
    NEW.quality_tags := array_append(NEW.quality_tags, 'critically-acclaimed');
  END IF;
  
  -- Sync is_blockbuster with box_office_category
  IF NEW.box_office_category IN ('industry-hit', 'blockbuster') THEN
    NEW.is_blockbuster := true;
  END IF;
  
  -- Sync is_classic for old highly-rated films
  IF NEW.release_year <= 2000 AND NEW.avg_rating >= 7.5 THEN
    NEW.is_classic := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_movie_quality_flags ON movies;
CREATE TRIGGER trg_update_movie_quality_flags
  BEFORE INSERT OR UPDATE ON movies
  FOR EACH ROW
  EXECUTE FUNCTION update_movie_quality_flags();

-- ============================================================
-- SAMPLE DATA COMMENTS (for reference)
-- ============================================================

-- Example: Adding awards to RRR
-- SELECT add_movie_award(
--   (SELECT id FROM movies WHERE title_en ILIKE 'RRR'),
--   'national',
--   'Best Popular Film',
--   2022
-- );

-- Example: Setting content flags for Baahubali 2
-- UPDATE movies 
-- SET content_flags = jsonb_build_object(
--   'sequel_number', 2,
--   'franchise', 'Baahubali',
--   'pan_india', true
-- )
-- WHERE title_en ILIKE 'Baahubali 2%';

-- Example: Adding mood tags to Arjun Reddy
-- UPDATE movies 
-- SET mood_tags = ARRAY['dark-intense', 'emotional', 'gripping']
-- WHERE title_en ILIKE 'Arjun Reddy';


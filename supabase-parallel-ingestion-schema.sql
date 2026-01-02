-- ============================================================
-- PARALLEL INGESTION PIPELINE SCHEMA UPDATES
-- ============================================================
-- Adds columns to support:
-- - Fast mode (partial) vs Finalize mode (verified) ingestion
-- - Completeness scoring
-- - Stage tracking for resumability
-- ============================================================

-- Add ingestion_status column to movies table
-- Tracks the data lifecycle: raw → partial → enriched → verified → published
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS ingestion_status TEXT DEFAULT 'raw';

-- Add completeness_score column to movies table
-- Score from 0.0 to 1.0 indicating data completeness
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS completeness_score DECIMAL(3,2) DEFAULT 0.00;

-- Add last_stage_completed column to movies table
-- Tracks which pipeline stage was last completed
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS last_stage_completed TEXT;

-- Add stage_completed_at timestamp
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS stage_completed_at TIMESTAMPTZ;

-- ============================================================
-- INDEXES FOR EFFICIENT QUERYING
-- ============================================================

-- Index on ingestion_status for fast filtering
CREATE INDEX IF NOT EXISTS idx_movies_ingestion_status 
ON movies(ingestion_status);

-- Index on completeness_score for finding incomplete movies
CREATE INDEX IF NOT EXISTS idx_movies_completeness_score 
ON movies(completeness_score);

-- Composite index for finding movies needing specific stages
CREATE INDEX IF NOT EXISTS idx_movies_status_stage 
ON movies(ingestion_status, last_stage_completed);

-- ============================================================
-- CONSTRAINT FOR VALID STATUS VALUES
-- ============================================================

-- Add check constraint for valid ingestion_status values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'movies_ingestion_status_check'
  ) THEN
    ALTER TABLE movies 
    ADD CONSTRAINT movies_ingestion_status_check 
    CHECK (ingestion_status IN ('raw', 'partial', 'enriched', 'verified', 'published'));
  END IF;
END $$;

-- Add check constraint for completeness_score range
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'movies_completeness_score_check'
  ) THEN
    ALTER TABLE movies 
    ADD CONSTRAINT movies_completeness_score_check 
    CHECK (completeness_score >= 0.00 AND completeness_score <= 1.00);
  END IF;
END $$;

-- ============================================================
-- UPDATE EXISTING DATA
-- ============================================================

-- Set default ingestion_status for existing movies based on their data
UPDATE movies 
SET ingestion_status = CASE
  WHEN is_published = true AND director IS NOT NULL AND poster_url IS NOT NULL 
    THEN 'verified'
  WHEN director IS NOT NULL OR poster_url IS NOT NULL 
    THEN 'partial'
  ELSE 'raw'
END
WHERE ingestion_status IS NULL OR ingestion_status = 'raw';

-- Calculate initial completeness scores for existing movies
UPDATE movies 
SET completeness_score = (
  CASE WHEN tmdb_id IS NOT NULL THEN 0.1 ELSE 0 END +
  CASE WHEN title_en IS NOT NULL AND title_en != '' THEN 0.1 ELSE 0 END +
  CASE WHEN poster_url IS NOT NULL THEN 0.1 ELSE 0 END +
  CASE WHEN backdrop_url IS NOT NULL THEN 0.05 ELSE 0 END +
  CASE WHEN director IS NOT NULL THEN 0.15 ELSE 0 END +
  CASE WHEN hero IS NOT NULL THEN 0.1 ELSE 0 END +
  CASE WHEN genres IS NOT NULL AND array_length(genres, 1) > 0 THEN 0.1 ELSE 0 END +
  CASE WHEN cast_members IS NOT NULL THEN 0.1 ELSE 0 END +
  CASE WHEN release_date IS NOT NULL THEN 0.05 ELSE 0 END +
  CASE WHEN is_published = true THEN 0.15 ELSE 0 END
)
WHERE completeness_score IS NULL OR completeness_score = 0;

-- ============================================================
-- PIPELINE STAGE HISTORY TABLE (OPTIONAL - for detailed tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS pipeline_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT valid_stage CHECK (stage IN (
    'discovery', 'validation', 'enrichment', 'media', 
    'tagging', 'review', 'normalize', 'dedupe', 'finalize'
  )),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped'))
);

-- Index for querying stage history by movie
CREATE INDEX IF NOT EXISTS idx_pipeline_stage_history_movie 
ON pipeline_stage_history(movie_id);

-- Index for querying by stage and status
CREATE INDEX IF NOT EXISTS idx_pipeline_stage_history_stage_status 
ON pipeline_stage_history(stage, status);

-- ============================================================
-- PIPELINE RUN TRACKING TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL, -- 'fast', 'finalize', 'accelerated'
  language TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  
  -- Metrics
  total_movies INTEGER DEFAULT 0,
  processed INTEGER DEFAULT 0,
  successful INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  
  -- Configuration
  config JSONB DEFAULT '{}'::jsonb,
  
  -- Error summary
  errors JSONB DEFAULT '[]'::jsonb,
  
  CONSTRAINT valid_run_type CHECK (run_type IN ('fast', 'finalize', 'accelerated', 'discovery', 'enrichment')),
  CONSTRAINT valid_run_status CHECK (status IN ('running', 'completed', 'failed', 'cancelled'))
);

-- Index for querying recent runs
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_started 
ON pipeline_runs(started_at DESC);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to get movies needing a specific stage
CREATE OR REPLACE FUNCTION get_movies_needing_stage(target_stage TEXT, limit_count INTEGER DEFAULT 100)
RETURNS TABLE(movie_id UUID, title TEXT, current_stage TEXT, score DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as movie_id,
    m.title_en as title,
    m.last_stage_completed as current_stage,
    m.completeness_score as score
  FROM movies m
  WHERE m.ingestion_status != 'verified'
    AND (m.last_stage_completed IS NULL OR m.last_stage_completed != target_stage)
  ORDER BY m.completeness_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update movie stage and recalculate score
CREATE OR REPLACE FUNCTION update_movie_stage(
  p_movie_id UUID, 
  p_stage TEXT, 
  p_score_increment DECIMAL DEFAULT 0.1
)
RETURNS VOID AS $$
BEGIN
  UPDATE movies 
  SET 
    last_stage_completed = p_stage,
    stage_completed_at = now(),
    completeness_score = LEAST(1.00, completeness_score + p_score_increment),
    ingestion_status = CASE 
      WHEN p_stage = 'finalize' THEN 'verified'
      WHEN p_stage IN ('review', 'normalize', 'dedupe') THEN 'enriched'
      WHEN p_stage IN ('enrichment', 'media', 'tagging') THEN 'partial'
      ELSE ingestion_status
    END
  WHERE id = p_movie_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON COLUMN movies.ingestion_status IS 
'Data lifecycle status: raw → partial → enriched → verified → published';

COMMENT ON COLUMN movies.completeness_score IS 
'Data completeness score from 0.0 to 1.0. Score >= 0.8 is considered ready for verification.';

COMMENT ON COLUMN movies.last_stage_completed IS 
'Last successfully completed pipeline stage for this movie';

COMMENT ON COLUMN movies.stage_completed_at IS 
'Timestamp when the last stage was completed';

COMMENT ON TABLE pipeline_stage_history IS 
'Detailed history of pipeline stage executions for each movie';

COMMENT ON TABLE pipeline_runs IS 
'Tracking table for pipeline execution runs';


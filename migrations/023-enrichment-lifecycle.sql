-- ============================================================
-- MIGRATION 023: Enrichment Lifecycle and Freshness Tracking
-- ============================================================
-- This migration adds operational metadata for partial refreshes,
-- cost control, and data decay awareness.
-- ============================================================

-- ============================================================
-- ENRICHMENT LIFECYCLE TABLE
-- ============================================================

-- Per-phase enrichment tracking for each movie
CREATE TABLE IF NOT EXISTS enrichment_lifecycle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  last_enriched_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  last_failure_reason TEXT,
  retry_eligible BOOLEAN DEFAULT true,
  next_refresh_after TIMESTAMPTZ,
  data_version INTEGER DEFAULT 1,
  source_used TEXT,
  confidence_at_enrich DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(movie_id, phase)
);

COMMENT ON TABLE enrichment_lifecycle IS 
  'Tracks enrichment status per phase per movie. Enables partial refresh and cost optimization.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lifecycle_movie 
  ON enrichment_lifecycle(movie_id);

CREATE INDEX IF NOT EXISTS idx_lifecycle_phase 
  ON enrichment_lifecycle(phase);

CREATE INDEX IF NOT EXISTS idx_lifecycle_stale 
  ON enrichment_lifecycle(next_refresh_after) 
  WHERE next_refresh_after < NOW() AND retry_eligible = true;

CREATE INDEX IF NOT EXISTS idx_lifecycle_failed 
  ON enrichment_lifecycle(failure_count DESC) 
  WHERE failure_count > 0 AND retry_eligible = true;

-- ============================================================
-- DATA FRESHNESS TABLE
-- ============================================================

-- Overall staleness tracking for movies (NEW - decay awareness)
CREATE TABLE IF NOT EXISTS data_freshness (
  movie_id UUID PRIMARY KEY REFERENCES movies(id) ON DELETE CASCADE,
  overall_staleness_score DECIMAL(3,2) CHECK (overall_staleness_score BETWEEN 0 AND 1),
  staleness_breakdown JSONB DEFAULT '{}',
  -- Format: {"images": 0.1, "cast": 0.0, "synopsis": 0.5, "ratings": 0.2}
  last_full_refresh TIMESTAMPTZ,
  needs_review BOOLEAN DEFAULT false,
  auto_downgraded BOOLEAN DEFAULT false,  -- Trust badge downgraded due to staleness
  downgrade_reason TEXT,
  review_priority INTEGER DEFAULT 0,  -- Higher = more urgent
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE data_freshness IS 
  'Tracks data staleness for each movie. Enables "needs review" dashboards and auto-downgrade.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_freshness_stale 
  ON data_freshness(overall_staleness_score DESC) 
  WHERE overall_staleness_score > 0.5;

CREATE INDEX IF NOT EXISTS idx_freshness_review 
  ON data_freshness(review_priority DESC) 
  WHERE needs_review = true;

-- ============================================================
-- ENRICHMENT SESSIONS TABLE
-- ============================================================

-- Track enrichment batch runs
CREATE TABLE IF NOT EXISTS enrichment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  phases TEXT[],
  total_movies INTEGER DEFAULT 0,
  successful INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  duration_ms INTEGER,
  options JSONB DEFAULT '{}',
  summary JSONB DEFAULT '{}',
  report_path TEXT,
  created_by TEXT DEFAULT 'system'
);

COMMENT ON TABLE enrichment_sessions IS 
  'Log of enrichment batch sessions for auditing and debugging.';

-- Index for recent sessions
CREATE INDEX IF NOT EXISTS idx_sessions_recent 
  ON enrichment_sessions(started_at DESC);

-- ============================================================
-- FUNCTIONS FOR FRESHNESS CALCULATION
-- ============================================================

-- Calculate staleness (0=fresh, 1=completely stale)
-- Based on 90 days = full staleness
CREATE OR REPLACE FUNCTION calculate_staleness(last_enriched TIMESTAMPTZ) 
RETURNS DECIMAL(3,2) AS $$
BEGIN
  IF last_enriched IS NULL THEN
    RETURN 1.0;  -- No data = completely stale
  END IF;
  
  RETURN LEAST(1.0, EXTRACT(EPOCH FROM (NOW() - last_enriched)) / (90 * 24 * 60 * 60));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate overall staleness for a movie
CREATE OR REPLACE FUNCTION calculate_movie_staleness(p_movie_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  v_staleness_sum DECIMAL := 0;
  v_weight_sum DECIMAL := 0;
  v_phase_weight JSONB := '{
    "core_metadata": 1.0,
    "cast_crew": 0.8,
    "images": 0.9,
    "ratings": 0.7,
    "synopsis": 0.8,
    "tags": 0.5,
    "box_office": 0.4
  }'::JSONB;
  v_record RECORD;
BEGIN
  FOR v_record IN 
    SELECT phase, last_success_at
    FROM enrichment_lifecycle
    WHERE movie_id = p_movie_id
  LOOP
    v_staleness_sum := v_staleness_sum + 
      calculate_staleness(v_record.last_success_at) * 
      COALESCE((v_phase_weight->>v_record.phase)::DECIMAL, 0.5);
    v_weight_sum := v_weight_sum + COALESCE((v_phase_weight->>v_record.phase)::DECIMAL, 0.5);
  END LOOP;
  
  IF v_weight_sum = 0 THEN
    RETURN 1.0;  -- No enrichment data
  END IF;
  
  RETURN v_staleness_sum / v_weight_sum;
END;
$$ LANGUAGE plpgsql STABLE;

-- Determine if refresh needed
CREATE OR REPLACE FUNCTION needs_refresh(
  p_movie_id UUID,
  p_phase TEXT,
  p_max_staleness DECIMAL DEFAULT 0.5
)
RETURNS BOOLEAN AS $$
DECLARE
  v_lifecycle enrichment_lifecycle%ROWTYPE;
BEGIN
  SELECT * INTO v_lifecycle
  FROM enrichment_lifecycle
  WHERE movie_id = p_movie_id AND phase = p_phase;
  
  IF NOT FOUND THEN
    RETURN true;  -- Never enriched
  END IF;
  
  IF NOT v_lifecycle.retry_eligible THEN
    RETURN false;  -- Marked as not retryable
  END IF;
  
  IF v_lifecycle.next_refresh_after IS NOT NULL 
     AND v_lifecycle.next_refresh_after > NOW() THEN
    RETURN false;  -- Not yet due
  END IF;
  
  RETURN calculate_staleness(v_lifecycle.last_success_at) > p_max_staleness;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- TRIGGER: Auto-update freshness
-- ============================================================

CREATE OR REPLACE FUNCTION update_freshness_on_lifecycle_change()
RETURNS TRIGGER AS $$
DECLARE
  v_staleness DECIMAL(3,2);
  v_breakdown JSONB;
BEGIN
  -- Calculate new staleness
  v_staleness := calculate_movie_staleness(NEW.movie_id);
  
  -- Build breakdown from lifecycle data
  SELECT jsonb_object_agg(
    phase, 
    round(calculate_staleness(last_success_at)::numeric, 2)
  ) INTO v_breakdown
  FROM enrichment_lifecycle
  WHERE movie_id = NEW.movie_id;
  
  -- Upsert freshness record
  INSERT INTO data_freshness (movie_id, overall_staleness_score, staleness_breakdown, updated_at)
  VALUES (NEW.movie_id, v_staleness, COALESCE(v_breakdown, '{}'), NOW())
  ON CONFLICT (movie_id) DO UPDATE SET
    overall_staleness_score = EXCLUDED.overall_staleness_score,
    staleness_breakdown = EXCLUDED.staleness_breakdown,
    updated_at = NOW(),
    needs_review = CASE 
      WHEN EXCLUDED.overall_staleness_score > 0.7 THEN true 
      ELSE data_freshness.needs_review 
    END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_freshness
  AFTER INSERT OR UPDATE ON enrichment_lifecycle
  FOR EACH ROW
  EXECUTE FUNCTION update_freshness_on_lifecycle_change();

-- ============================================================
-- VIEWS
-- ============================================================

-- View: Movies needing refresh (for enrichment orchestrator)
CREATE OR REPLACE VIEW movies_needing_refresh AS
SELECT 
  m.id,
  m.slug,
  m.title_en,
  m.release_year,
  df.overall_staleness_score,
  df.staleness_breakdown,
  df.last_full_refresh,
  df.needs_review,
  COALESCE(df.review_priority, 0) as priority
FROM movies m
LEFT JOIN data_freshness df ON m.id = df.movie_id
WHERE m.is_published = true
  AND (df.overall_staleness_score > 0.5 OR df.overall_staleness_score IS NULL)
ORDER BY 
  CASE WHEN m.release_year >= EXTRACT(YEAR FROM NOW()) - 2 THEN 0 ELSE 1 END,
  df.overall_staleness_score DESC NULLS FIRST,
  m.release_year DESC;

-- View: Enrichment phase statistics
CREATE OR REPLACE VIEW enrichment_phase_stats AS
SELECT 
  phase,
  COUNT(*) as total_movies,
  COUNT(*) FILTER (WHERE last_success_at IS NOT NULL) as enriched,
  COUNT(*) FILTER (WHERE failure_count > 0) as with_failures,
  AVG(calculate_staleness(last_success_at)) as avg_staleness,
  MAX(last_success_at) as last_run
FROM enrichment_lifecycle
GROUP BY phase
ORDER BY avg_staleness DESC;

-- View: Stale movies by priority
CREATE OR REPLACE VIEW stale_movies_priority AS
SELECT 
  m.id,
  m.slug,
  m.title_en,
  m.release_year,
  df.overall_staleness_score as staleness,
  df.auto_downgraded,
  CASE 
    WHEN m.release_year >= EXTRACT(YEAR FROM NOW()) THEN 'current'
    WHEN m.release_year >= EXTRACT(YEAR FROM NOW()) - 5 THEN 'recent'
    WHEN m.is_blockbuster OR m.is_classic THEN 'notable'
    ELSE 'standard'
  END as priority_tier,
  (
    SELECT array_agg(phase ORDER BY calculate_staleness(last_success_at) DESC)
    FROM enrichment_lifecycle el
    WHERE el.movie_id = m.id AND calculate_staleness(el.last_success_at) > 0.5
    LIMIT 3
  ) as stale_phases
FROM movies m
JOIN data_freshness df ON m.id = df.movie_id
WHERE m.is_published = true
  AND df.overall_staleness_score > 0.5
ORDER BY 
  df.overall_staleness_score DESC,
  CASE 
    WHEN m.release_year >= EXTRACT(YEAR FROM NOW()) THEN 1
    WHEN m.is_blockbuster OR m.is_classic THEN 2
    ELSE 3
  END;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Record successful enrichment
CREATE OR REPLACE FUNCTION record_enrichment_success(
  p_movie_id UUID,
  p_phase TEXT,
  p_source TEXT DEFAULT NULL,
  p_confidence DECIMAL DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO enrichment_lifecycle (
    movie_id, phase, last_enriched_at, last_success_at, 
    source_used, confidence_at_enrich, failure_count, retry_eligible
  )
  VALUES (
    p_movie_id, p_phase, NOW(), NOW(),
    p_source, p_confidence, 0, true
  )
  ON CONFLICT (movie_id, phase) DO UPDATE SET
    last_enriched_at = NOW(),
    last_success_at = NOW(),
    source_used = COALESCE(EXCLUDED.source_used, enrichment_lifecycle.source_used),
    confidence_at_enrich = COALESCE(EXCLUDED.confidence_at_enrich, enrichment_lifecycle.confidence_at_enrich),
    failure_count = 0,
    retry_eligible = true,
    data_version = enrichment_lifecycle.data_version + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Record enrichment failure
CREATE OR REPLACE FUNCTION record_enrichment_failure(
  p_movie_id UUID,
  p_phase TEXT,
  p_reason TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO enrichment_lifecycle (
    movie_id, phase, last_enriched_at, failure_count, 
    last_failure_reason, retry_eligible
  )
  VALUES (
    p_movie_id, p_phase, NOW(), 1,
    p_reason, true
  )
  ON CONFLICT (movie_id, phase) DO UPDATE SET
    last_enriched_at = NOW(),
    failure_count = enrichment_lifecycle.failure_count + 1,
    last_failure_reason = p_reason,
    retry_eligible = enrichment_lifecycle.failure_count < 5,  -- Disable after 5 failures
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;


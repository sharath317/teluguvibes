-- ============================================================
-- EDITORIAL ANALYZER MIGRATION
-- Adds new fields for editorial intelligence
-- ============================================================

-- ============================================================
-- 1. UPDATE generation_contexts TABLE
-- ============================================================

-- Add new columns to generation_contexts if they don't exist
DO $$
BEGIN
  -- Main entity
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_contexts' AND column_name = 'main_entity') THEN
    ALTER TABLE generation_contexts ADD COLUMN main_entity TEXT;
  END IF;

  -- Entity type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_contexts' AND column_name = 'entity_type') THEN
    ALTER TABLE generation_contexts ADD COLUMN entity_type TEXT;
  END IF;

  -- Audience emotion
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_contexts' AND column_name = 'audience_emotion') THEN
    ALTER TABLE generation_contexts ADD COLUMN audience_emotion TEXT;
  END IF;

  -- Best angle
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_contexts' AND column_name = 'best_angle') THEN
    ALTER TABLE generation_contexts ADD COLUMN best_angle TEXT;
  END IF;

  -- Safety risk
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_contexts' AND column_name = 'safety_risk') THEN
    ALTER TABLE generation_contexts ADD COLUMN safety_risk TEXT DEFAULT 'medium';
  END IF;

  -- Narrative plan (JSONB)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_contexts' AND column_name = 'narrative_plan') THEN
    ALTER TABLE generation_contexts ADD COLUMN narrative_plan JSONB;
  END IF;

  -- Confidence score
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_contexts' AND column_name = 'confidence') THEN
    ALTER TABLE generation_contexts ADD COLUMN confidence DECIMAL(3,2);
  END IF;

  -- Needs human review flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generation_contexts' AND column_name = 'needs_human_review') THEN
    ALTER TABLE generation_contexts ADD COLUMN needs_human_review BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================================
-- 2. UPDATE posts TABLE
-- ============================================================

DO $$
BEGIN
  -- Audience emotion
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'audience_emotion') THEN
    ALTER TABLE posts ADD COLUMN audience_emotion TEXT;
  END IF;

  -- Editorial angle
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'editorial_angle') THEN
    ALTER TABLE posts ADD COLUMN editorial_angle TEXT;
  END IF;

  -- Safety risk
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'safety_risk') THEN
    ALTER TABLE posts ADD COLUMN safety_risk TEXT DEFAULT 'low';
  END IF;

  -- AI confidence
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'ai_confidence') THEN
    ALTER TABLE posts ADD COLUMN ai_confidence DECIMAL(3,2);
  END IF;

  -- Editorial plan (full JSONB)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'editorial_plan') THEN
    ALTER TABLE posts ADD COLUMN editorial_plan JSONB;
  END IF;

  -- Needs human POV flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'needs_human_pov') THEN
    ALTER TABLE posts ADD COLUMN needs_human_pov BOOLEAN DEFAULT true;
  END IF;

  -- Human POV text (added by editor)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'human_pov') THEN
    ALTER TABLE posts ADD COLUMN human_pov TEXT;
  END IF;

  -- Human POV added by
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'human_pov_editor') THEN
    ALTER TABLE posts ADD COLUMN human_pov_editor TEXT;
  END IF;
END $$;

-- ============================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================

-- Index for filtering by emotion
CREATE INDEX IF NOT EXISTS idx_posts_audience_emotion ON posts(audience_emotion);

-- Index for filtering by angle
CREATE INDEX IF NOT EXISTS idx_posts_editorial_angle ON posts(editorial_angle);

-- Index for safety risk filtering
CREATE INDEX IF NOT EXISTS idx_posts_safety_risk ON posts(safety_risk);

-- Index for finding posts needing human POV
CREATE INDEX IF NOT EXISTS idx_posts_needs_human_pov ON posts(needs_human_pov) WHERE needs_human_pov = true;

-- Index on generation_contexts for analytics
CREATE INDEX IF NOT EXISTS idx_gen_contexts_emotion ON generation_contexts(audience_emotion);
CREATE INDEX IF NOT EXISTS idx_gen_contexts_angle ON generation_contexts(best_angle);

-- ============================================================
-- 4. CREATE ANALYTICS VIEW
-- ============================================================

CREATE OR REPLACE VIEW v_editorial_analytics AS
SELECT
  audience_emotion,
  editorial_angle,
  COUNT(*) as total_posts,
  COUNT(*) FILTER (WHERE status = 'published') as published,
  AVG(ai_confidence) as avg_confidence,
  AVG(view_count) as avg_views,
  COUNT(*) FILTER (WHERE needs_human_pov = true AND human_pov IS NULL) as pending_human_pov
FROM posts
WHERE audience_emotion IS NOT NULL
GROUP BY audience_emotion, editorial_angle
ORDER BY total_posts DESC;

-- ============================================================
-- 5. CREATE EMOTION→ANGLE PERFORMANCE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS editorial_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Editorial choices
  audience_emotion TEXT NOT NULL,
  editorial_angle TEXT NOT NULL,
  entity_type TEXT,

  -- Performance metrics (updated periodically)
  total_posts INT DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  avg_engagement DECIMAL(5,2) DEFAULT 0,
  avg_scroll_depth DECIMAL(3,2) DEFAULT 0,
  avg_time_on_page INT DEFAULT 0, -- seconds

  -- Click-through from search/social
  ctr_from_search DECIMAL(5,4) DEFAULT 0,
  ctr_from_social DECIMAL(5,4) DEFAULT 0,

  -- Learning signals
  is_recommended BOOLEAN DEFAULT true,
  recommendation_reason TEXT,

  -- Time tracking
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(audience_emotion, editorial_angle)
);

-- Insert default performance data
INSERT INTO editorial_performance (audience_emotion, editorial_angle, is_recommended, recommendation_reason)
VALUES
  ('nostalgia', 'nostalgia', true, 'Best for legend/senior actor content'),
  ('nostalgia', 'tribute', true, 'Alternative for anniversaries'),
  ('pride', 'tribute', true, 'Best for achievements, awards'),
  ('pride', 'analysis', true, 'Good for success stories'),
  ('excitement', 'viral', true, 'Best for trailers, announcements'),
  ('excitement', 'gossip', false, 'Use sparingly - can feel clickbaity'),
  ('curiosity', 'info', true, 'Best for OTT, casting news'),
  ('curiosity', 'analysis', true, 'Good for behind-the-scenes'),
  ('celebration', 'tribute', true, 'Best for birthdays, milestones'),
  ('celebration', 'viral', true, 'Good for box office records'),
  ('sadness', 'tribute', true, 'Best for death anniversaries'),
  ('sadness', 'info', true, 'Fallback for sensitive topics'),
  ('controversy', 'info', true, 'ONLY option for controversy - stay neutral')
ON CONFLICT (audience_emotion, editorial_angle) DO NOTHING;

-- ============================================================
-- 6. HELPER FUNCTION: GET BEST ANGLE FOR EMOTION
-- ============================================================

CREATE OR REPLACE FUNCTION get_recommended_angle(emotion TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT editorial_angle
    FROM editorial_performance
    WHERE audience_emotion = emotion
      AND is_recommended = true
    ORDER BY avg_engagement DESC NULLS LAST
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. TRIGGER: UPDATE PERFORMANCE ON PUBLISH
-- ============================================================

CREATE OR REPLACE FUNCTION update_editorial_performance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.audience_emotion IS NOT NULL AND NEW.editorial_angle IS NOT NULL THEN
    INSERT INTO editorial_performance (audience_emotion, editorial_angle, total_posts)
    VALUES (NEW.audience_emotion, NEW.editorial_angle, 1)
    ON CONFLICT (audience_emotion, editorial_angle)
    DO UPDATE SET
      total_posts = editorial_performance.total_posts + 1,
      last_updated = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_editorial_performance ON posts;
CREATE TRIGGER trigger_editorial_performance
  AFTER INSERT OR UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_editorial_performance();

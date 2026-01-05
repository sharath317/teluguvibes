-- ============================================================
-- STORY ARCS - MULTI-DAY CONNECTED STORIES
-- Phase 6: Connected Story Engine
-- ============================================================

-- 1. Story arcs table
CREATE TABLE IF NOT EXISTS story_arcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  title_en TEXT NOT NULL,
  title_te TEXT,
  slug TEXT UNIQUE NOT NULL,
  
  -- Type
  story_type TEXT NOT NULL DEFAULT 'developing' 
    CHECK (story_type IN ('breaking', 'developing', 'feature', 'series')),
  
  -- Timeline
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_end_at TIMESTAMPTZ,
  
  -- Content
  summary_en TEXT,
  summary_te TEXT,
  main_entity TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'topic'
    CHECK (entity_type IN ('movie', 'celebrity', 'event', 'topic')),
  
  -- Posts
  post_count INTEGER DEFAULT 0,
  post_ids UUID[] DEFAULT '{}',
  
  -- Status
  status TEXT DEFAULT 'active' 
    CHECK (status IN ('active', 'concluded', 'dormant')),
  
  -- Clustering (links to topic_clusters)
  cluster_id UUID,
  keywords TEXT[] DEFAULT '{}',
  
  -- Engagement
  total_views INTEGER DEFAULT 0,
  total_engagement INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Story posts (links individual posts to stories)
CREATE TABLE IF NOT EXISTS story_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  story_id UUID NOT NULL REFERENCES story_arcs(id) ON DELETE CASCADE,
  post_id UUID NOT NULL,
  
  sequence_number INTEGER NOT NULL DEFAULT 1,
  post_type TEXT NOT NULL DEFAULT 'update'
    CHECK (post_type IN ('initial', 'update', 'resolution', 'reaction')),
  
  title TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  
  is_main_post BOOLEAN DEFAULT false,
  parent_post_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (story_id, post_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_story_arcs_status 
ON story_arcs (status);

CREATE INDEX IF NOT EXISTS idx_story_arcs_last_updated 
ON story_arcs (last_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_story_arcs_main_entity 
ON story_arcs (main_entity);

CREATE INDEX IF NOT EXISTS idx_story_arcs_keywords 
ON story_arcs USING GIN (keywords);

CREATE INDEX IF NOT EXISTS idx_story_posts_story 
ON story_posts (story_id);

CREATE INDEX IF NOT EXISTS idx_story_posts_published 
ON story_posts (published_at);

-- 4. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_story_arc_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS story_arcs_updated_at ON story_arcs;
CREATE TRIGGER story_arcs_updated_at
  BEFORE UPDATE ON story_arcs
  FOR EACH ROW
  EXECUTE FUNCTION update_story_arc_timestamp();

-- 5. View for active stories with latest post
CREATE OR REPLACE VIEW active_stories_with_latest AS
SELECT 
  sa.*,
  sp.title as latest_post_title,
  sp.published_at as latest_post_at
FROM story_arcs sa
LEFT JOIN LATERAL (
  SELECT title, published_at
  FROM story_posts
  WHERE story_id = sa.id
  ORDER BY published_at DESC
  LIMIT 1
) sp ON true
WHERE sa.status = 'active'
ORDER BY sa.last_updated_at DESC;

-- 6. View for story timeline
CREATE OR REPLACE VIEW story_timeline_summary AS
SELECT 
  sa.id as story_id,
  sa.title_en,
  sa.main_entity,
  sa.story_type,
  sa.started_at,
  sa.last_updated_at,
  sa.post_count,
  EXTRACT(DAY FROM (sa.last_updated_at - sa.started_at)) as days_span,
  array_agg(
    jsonb_build_object(
      'date', DATE(sp.published_at),
      'title', sp.title,
      'type', sp.post_type
    ) ORDER BY sp.published_at
  ) as timeline
FROM story_arcs sa
LEFT JOIN story_posts sp ON sp.story_id = sa.id
GROUP BY sa.id;

-- Comments
COMMENT ON TABLE story_arcs IS 'Multi-day story arcs that connect related posts';
COMMENT ON TABLE story_posts IS 'Individual posts linked to story arcs';
COMMENT ON COLUMN story_arcs.story_type IS 'breaking=urgent news, developing=ongoing story, feature=planned series, series=regular content';
COMMENT ON COLUMN story_posts.post_type IS 'initial=first post, update=new development, resolution=conclusion, reaction=response';

SELECT 'Story arcs schema created!' as status;







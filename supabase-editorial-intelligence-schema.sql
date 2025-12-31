-- =====================================================
-- TeluguVibes Editorial Intelligence System
-- Human POV + Zero-Click SEO + Self-Learning
-- Schema v1.0
-- =====================================================

-- =====================================================
-- PART 1: HUMAN POINT OF VIEW (ANTI-AI FATIGUE)
-- =====================================================

-- 1.1 HUMAN POV ENTRIES (Mandatory human touch per article)
CREATE TABLE IF NOT EXISTS human_pov (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

  -- POV Content
  pov_text TEXT NOT NULL, -- 2-4 sentences minimum
  pov_type TEXT NOT NULL CHECK (pov_type IN (
    'insider_trivia',      -- Behind-the-scenes info
    'cultural_context',    -- Telugu cinema culture
    'opinionated_framing', -- Editorial stance
    'industry_relevance',  -- Why this matters
    'personal_anecdote',   -- Editor's experience
    'prediction',          -- Industry forecast
    'comparison'           -- Historical comparison
  )),

  -- Editor Info
  editor_id TEXT NOT NULL, -- Admin email or ID
  editor_name TEXT,

  -- AI Learning Signals
  ai_gap_analysis TEXT, -- What human added that AI missed
  originality_score DECIMAL(3,2), -- How unique vs AI version

  -- Performance Metrics
  with_pov_bounce_rate DECIMAL(5,2),
  without_pov_bounce_rate DECIMAL(5,2),
  pov_impact_score DECIMAL(5,2), -- Calculated improvement

  -- Status
  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(post_id) -- One POV per post
);

-- 1.2 POV LEARNING (What humans add that AI misses)
CREATE TABLE IF NOT EXISTS pov_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Pattern Detection
  pov_type TEXT NOT NULL,
  category TEXT, -- Post category

  -- What AI Missed
  common_gaps TEXT[], -- Patterns AI consistently misses
  successful_additions TEXT[], -- What humans add that works

  -- Performance Data
  avg_impact_score DECIMAL(5,2),
  sample_size INTEGER DEFAULT 0,

  -- Prompt Improvements
  prompt_additions TEXT, -- Suggested prompt improvements

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pov_type, category)
);

-- 1.3 POV SUGGESTIONS (AI-generated suggestions for editors)
CREATE TABLE IF NOT EXISTS pov_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

  -- Suggestions
  suggested_type TEXT NOT NULL,
  suggested_text TEXT NOT NULL,
  reasoning TEXT, -- Why this suggestion

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'modified')),
  editor_action TEXT, -- What editor did

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 2: ZERO-CLICK SEO OPTIMIZATION
-- =====================================================

-- 2.1 CITATION BLOCKS (Schema.org Q&A for AI citations)
CREATE TABLE IF NOT EXISTS citation_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

  -- Q&A Content
  question TEXT NOT NULL, -- The question this answers
  answer TEXT NOT NULL, -- 40-60 word answer-first summary
  answer_te TEXT, -- Telugu version

  -- Schema Type
  schema_type TEXT DEFAULT 'QAPage' CHECK (schema_type IN (
    'QAPage', 'FAQPage', 'HowTo', 'Review', 'NewsArticle'
  )),

  -- Structured Data
  schema_json JSONB, -- Full schema.org markup

  -- Citation Tracking
  was_cited BOOLEAN DEFAULT false,
  cited_by TEXT[], -- AI Overview, Bing Chat, etc.
  citation_date TIMESTAMPTZ,
  citation_context TEXT, -- How it was cited

  -- Performance
  search_impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  position_avg DECIMAL(4,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 AUTHOR ENTITIES (Entity-based author schema)
CREATE TABLE IF NOT EXISTS author_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  author_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_te TEXT,

  -- Schema.org Person
  bio TEXT,
  expertise TEXT[], -- Areas of expertise
  credentials TEXT[], -- Qualifications
  profile_image TEXT,

  -- Social Proof
  social_links JSONB DEFAULT '{}',
  same_as TEXT[], -- Schema.org sameAs URLs

  -- Performance
  total_articles INTEGER DEFAULT 0,
  avg_article_performance DECIMAL(5,2) DEFAULT 0,
  citation_count INTEGER DEFAULT 0,

  -- E-E-A-T Signals
  experience_score DECIMAL(3,2) DEFAULT 0.5,
  expertise_score DECIMAL(3,2) DEFAULT 0.5,
  authority_score DECIMAL(3,2) DEFAULT 0.5,
  trust_score DECIMAL(3,2) DEFAULT 0.5,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 SCHEMA PERFORMANCE (Track what gets cited)
CREATE TABLE IF NOT EXISTS schema_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  citation_block_id UUID REFERENCES citation_blocks(id) ON DELETE CASCADE,

  -- Event
  event_type TEXT NOT NULL CHECK (event_type IN (
    'ai_overview_citation',
    'featured_snippet',
    'knowledge_panel',
    'rich_result',
    'search_impression',
    'click'
  )),

  -- Details
  source TEXT, -- Google, Bing, Perplexity, etc.
  query TEXT, -- Search query
  position INTEGER,
  snippet_text TEXT,

  -- Timestamp
  event_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 ANSWER SUMMARIES (Citation-friendly opening)
CREATE TABLE IF NOT EXISTS answer_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

  -- Summary Content (40-60 words)
  summary TEXT NOT NULL,
  summary_te TEXT,
  word_count INTEGER,

  -- Optimization
  target_query TEXT, -- Query this answers
  is_factual BOOLEAN DEFAULT true,
  is_structured BOOLEAN DEFAULT true,

  -- AI Generation
  ai_generated BOOLEAN DEFAULT true,
  human_edited BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(post_id)
);

-- =====================================================
-- PART 3: CONTENT PUBLISHING GATES
-- =====================================================

-- 3.1 PUBLISHING CHECKLIST (Quality gates)
CREATE TABLE IF NOT EXISTS publishing_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

  -- Mandatory Checks
  has_human_pov BOOLEAN DEFAULT false,
  has_citation_block BOOLEAN DEFAULT false,
  has_answer_summary BOOLEAN DEFAULT false,
  has_schema_markup BOOLEAN DEFAULT false,

  -- Quality Checks
  originality_checked BOOLEAN DEFAULT false,
  originality_score DECIMAL(3,2),

  factual_checked BOOLEAN DEFAULT false,
  toxicity_checked BOOLEAN DEFAULT false,

  -- SEO Checks
  seo_title_optimized BOOLEAN DEFAULT false,
  meta_description_set BOOLEAN DEFAULT false,

  -- Final Approval
  all_gates_passed BOOLEAN DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(post_id)
);

-- =====================================================
-- PART 4: EDITORIAL INTELLIGENCE METRICS
-- =====================================================

-- 4.1 EDITORIAL INSIGHTS (Aggregated learnings)
CREATE TABLE IF NOT EXISTS editorial_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dimension
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'pov_impact',
    'citation_success',
    'ai_fatigue',
    'topic_authority',
    'editor_performance'
  )),

  dimension TEXT, -- category, author, topic
  dimension_value TEXT,

  -- Metric
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10,2),
  comparison_value DECIMAL(10,2), -- Previous period
  change_pct DECIMAL(5,2),

  -- Insight
  insight_text TEXT,
  recommendation TEXT,

  -- Period
  period_start DATE,
  period_end DATE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_human_pov_post ON human_pov(post_id);
CREATE INDEX idx_human_pov_editor ON human_pov(editor_id);
CREATE INDEX idx_human_pov_type ON human_pov(pov_type);

CREATE INDEX idx_citation_blocks_post ON citation_blocks(post_id);
CREATE INDEX idx_citation_blocks_cited ON citation_blocks(was_cited) WHERE was_cited = true;

CREATE INDEX idx_author_entities_id ON author_entities(author_id);
CREATE INDEX idx_author_entities_citation ON author_entities(citation_count DESC);

CREATE INDEX idx_schema_performance_post ON schema_performance(post_id);
CREATE INDEX idx_schema_performance_date ON schema_performance(event_date DESC);

CREATE INDEX idx_publishing_gates_post ON publishing_gates(post_id);
CREATE INDEX idx_publishing_gates_passed ON publishing_gates(all_gates_passed);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Calculate POV impact score
CREATE OR REPLACE FUNCTION calculate_pov_impact(p_post_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_pov_bounce DECIMAL;
  v_avg_bounce DECIMAL;
  v_impact DECIMAL;
BEGIN
  -- Get post's bounce rate
  SELECT bounce_rate INTO v_pov_bounce
  FROM content_performance
  WHERE post_id = p_post_id;

  -- Get average bounce rate for posts without POV
  SELECT AVG(cp.bounce_rate) INTO v_avg_bounce
  FROM content_performance cp
  LEFT JOIN human_pov hp ON hp.post_id = cp.post_id
  WHERE hp.id IS NULL;

  IF v_avg_bounce IS NULL OR v_avg_bounce = 0 THEN
    RETURN 0;
  END IF;

  -- Impact = improvement over average
  v_impact := ((v_avg_bounce - COALESCE(v_pov_bounce, v_avg_bounce)) / v_avg_bounce) * 100;

  -- Update POV record
  UPDATE human_pov
  SET pov_impact_score = v_impact,
      with_pov_bounce_rate = v_pov_bounce,
      without_pov_bounce_rate = v_avg_bounce
  WHERE post_id = p_post_id;

  RETURN v_impact;
END;
$$ LANGUAGE plpgsql;

-- Check publishing gates
CREATE OR REPLACE FUNCTION check_publishing_gates(p_post_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_pov BOOLEAN;
  v_has_citation BOOLEAN;
  v_has_summary BOOLEAN;
  v_all_passed BOOLEAN;
BEGIN
  -- Check POV
  SELECT EXISTS(SELECT 1 FROM human_pov WHERE post_id = p_post_id AND is_approved = true)
  INTO v_has_pov;

  -- Check citation block
  SELECT EXISTS(SELECT 1 FROM citation_blocks WHERE post_id = p_post_id)
  INTO v_has_citation;

  -- Check answer summary
  SELECT EXISTS(SELECT 1 FROM answer_summaries WHERE post_id = p_post_id)
  INTO v_has_summary;

  v_all_passed := v_has_pov AND v_has_citation AND v_has_summary;

  -- Update gates
  INSERT INTO publishing_gates (post_id, has_human_pov, has_citation_block, has_answer_summary, all_gates_passed)
  VALUES (p_post_id, v_has_pov, v_has_citation, v_has_summary, v_all_passed)
  ON CONFLICT (post_id) DO UPDATE SET
    has_human_pov = v_has_pov,
    has_citation_block = v_has_citation,
    has_answer_summary = v_has_summary,
    all_gates_passed = v_all_passed,
    updated_at = NOW();

  RETURN v_all_passed;
END;
$$ LANGUAGE plpgsql;

-- Generate author schema
CREATE OR REPLACE FUNCTION get_author_schema(p_author_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_author author_entities%ROWTYPE;
  v_schema JSONB;
BEGIN
  SELECT * INTO v_author FROM author_entities WHERE author_id = p_author_id;

  IF v_author IS NULL THEN
    RETURN NULL;
  END IF;

  v_schema := jsonb_build_object(
    '@context', 'https://schema.org',
    '@type', 'Person',
    'name', v_author.name,
    'description', v_author.bio,
    'image', v_author.profile_image,
    'sameAs', v_author.same_as,
    'jobTitle', 'Entertainment Editor',
    'worksFor', jsonb_build_object(
      '@type', 'Organization',
      'name', 'TeluguVibes'
    )
  );

  RETURN v_schema;
END;
$$ LANGUAGE plpgsql;

-- Update author stats
CREATE OR REPLACE FUNCTION update_author_stats()
RETURNS void AS $$
BEGIN
  UPDATE author_entities ae SET
    total_articles = (
      SELECT COUNT(*) FROM posts p WHERE p.author_id = ae.author_id
    ),
    avg_article_performance = (
      SELECT AVG(cp.overall_performance)
      FROM posts p
      JOIN content_performance cp ON cp.post_id = p.id
      WHERE p.author_id = ae.author_id
    ),
    citation_count = (
      SELECT COUNT(*)
      FROM citation_blocks cb
      JOIN posts p ON p.id = cb.post_id
      WHERE p.author_id = ae.author_id AND cb.was_cited = true
    ),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-check gates when POV is added
CREATE OR REPLACE FUNCTION trigger_check_gates()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_publishing_gates(NEW.post_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pov_gates
  AFTER INSERT OR UPDATE ON human_pov
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_gates();

CREATE TRIGGER trigger_citation_gates
  AFTER INSERT OR UPDATE ON citation_blocks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_gates();

CREATE TRIGGER trigger_summary_gates
  AFTER INSERT OR UPDATE ON answer_summaries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_gates();




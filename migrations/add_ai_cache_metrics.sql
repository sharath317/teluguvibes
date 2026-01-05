-- ============================================================
-- AI Cache Table
-- Stores cached AI responses to avoid duplicate API calls
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_cache (
  cache_key TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  input_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0,
  size_bytes INTEGER,
  
  -- Valid categories
  CONSTRAINT valid_category CHECK (category IN (
    'synopsis', 'story_analysis', 'performances', 'direction',
    'perspectives', 'why_watch', 'why_skip', 'cultural_impact',
    'awards', 'verdict', 'article', 'translation', 'trending'
  ))
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_cache_category ON ai_cache(category);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at);

-- ============================================================
-- AI Metrics Table
-- Tracks API usage, costs, and performance metrics
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_metrics (
  id SERIAL PRIMARY KEY,
  request_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  feature TEXT NOT NULL,
  section TEXT,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd DECIMAL(10, 8) NOT NULL,
  latency_ms INTEGER NOT NULL,
  cached BOOLEAN DEFAULT FALSE,
  success BOOLEAN DEFAULT TRUE,
  error TEXT
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_ai_metrics_timestamp ON ai_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_feature ON ai_metrics(feature);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_provider ON ai_metrics(provider);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_model ON ai_metrics(model);

-- ============================================================
-- Helper function to increment cache hit count
-- ============================================================

CREATE OR REPLACE FUNCTION increment_cache_hit_count(key_to_update TEXT)
RETURNS INTEGER AS $$
  UPDATE ai_cache 
  SET hit_count = hit_count + 1 
  WHERE cache_key = key_to_update
  RETURNING hit_count;
$$ LANGUAGE SQL;

-- ============================================================
-- View for daily cost summary
-- ============================================================

CREATE OR REPLACE VIEW ai_daily_costs AS
SELECT 
  DATE(timestamp) as date,
  provider,
  model,
  COUNT(*) as request_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(cost_usd) as total_cost_usd,
  AVG(latency_ms) as avg_latency_ms,
  SUM(CASE WHEN cached THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as cache_hit_rate
FROM ai_metrics
GROUP BY DATE(timestamp), provider, model
ORDER BY date DESC, total_cost_usd DESC;

-- ============================================================
-- View for feature cost breakdown
-- ============================================================

CREATE OR REPLACE VIEW ai_feature_costs AS
SELECT 
  feature,
  section,
  COUNT(*) as request_count,
  SUM(cost_usd) as total_cost_usd,
  AVG(cost_usd) as avg_cost_per_request,
  AVG(latency_ms) as avg_latency_ms
FROM ai_metrics
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY feature, section
ORDER BY total_cost_usd DESC;



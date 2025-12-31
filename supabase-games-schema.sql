-- ============================================================
-- TELUGUVIBES GAMES & CAREER VISUALIZATION SCHEMA
-- ============================================================

-- ============================================================
-- 1. GAME SESSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_token TEXT NOT NULL,

  -- Game info
  game_type TEXT NOT NULL,

  -- Progress
  current_round INT DEFAULT 0,
  total_rounds INT DEFAULT 10,
  rounds_completed JSONB DEFAULT '[]'::jsonb,

  -- Scoring
  total_score INT DEFAULT 0,
  streak INT DEFAULT 0,
  best_streak INT DEFAULT 0,
  hints_used INT DEFAULT 0,

  -- Adaptive difficulty
  current_difficulty TEXT DEFAULT 'medium',
  correct_answers INT DEFAULT 0,
  wrong_answers INT DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_time_seconds INT DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'in_progress',

  CONSTRAINT valid_status CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  CONSTRAINT valid_difficulty CHECK (current_difficulty IN ('easy', 'medium', 'hard', 'legend'))
);

-- Index for leaderboards
CREATE INDEX IF NOT EXISTS idx_game_sessions_score ON game_sessions(game_type, total_score DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);

-- ============================================================
-- 2. GAME ROUNDS (For analytics and repetition prevention)
-- ============================================================

CREATE TABLE IF NOT EXISTS game_rounds (
  id TEXT PRIMARY KEY,

  -- Round info
  game_type TEXT NOT NULL,
  difficulty TEXT NOT NULL,

  -- Content
  question TEXT NOT NULL,
  question_te TEXT,
  question_image TEXT,
  question_emojis TEXT[],

  -- Hints
  hints JSONB DEFAULT '[]'::jsonb,

  -- Answer
  correct_answer TEXT NOT NULL,
  correct_answer_te TEXT,
  answer_image TEXT,

  -- Explanation
  explanation TEXT,
  explanation_te TEXT,

  -- Options
  options TEXT[],
  is_multiple_choice BOOLEAN DEFAULT true,

  -- Source data
  source_movies TEXT[],
  source_celebrities TEXT[],

  -- Metadata
  era TEXT,
  tags TEXT[],
  points INT DEFAULT 100,
  time_limit_seconds INT DEFAULT 30,

  -- Stats
  times_shown INT DEFAULT 0,
  times_correct INT DEFAULT 0,
  avg_time_seconds DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_rounds_type ON game_rounds(game_type, difficulty);

-- ============================================================
-- 3. GAME LEADERBOARD
-- ============================================================

CREATE TABLE IF NOT EXISTS game_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  session_id TEXT REFERENCES game_sessions(id),
  user_id UUID REFERENCES auth.users(id),

  -- Display
  display_name TEXT,

  -- Score info
  game_type TEXT NOT NULL,
  score INT NOT NULL,
  rounds_played INT,
  accuracy DECIMAL(5,2),
  best_streak INT,

  -- Ranking
  rank_position INT,

  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_game ON game_leaderboard(game_type, score DESC);

-- ============================================================
-- 4. GAME ADMIN CONFIG
-- ============================================================

CREATE TABLE IF NOT EXISTS game_admin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Global
  games_enabled BOOLEAN DEFAULT true,
  maintenance_mode BOOLEAN DEFAULT false,

  -- Per game type (stored as JSONB)
  enabled_games TEXT[] DEFAULT ARRAY['dumb_charades', 'dialogue_guess', 'hit_or_flop', 'emoji_movie'],

  -- Content filters
  excluded_movies TEXT[] DEFAULT ARRAY[]::TEXT[],
  excluded_celebrities TEXT[] DEFAULT ARRAY[]::TEXT[],
  excluded_dialogues TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Difficulty settings
  default_difficulty TEXT DEFAULT 'medium',
  adaptive_difficulty BOOLEAN DEFAULT true,
  difficulty_adjustment_threshold INT DEFAULT 3,

  -- Content settings
  prefer_nostalgic BOOLEAN DEFAULT true,
  prefer_classics BOOLEAN DEFAULT true,
  min_movie_year INT,
  max_movie_year INT,

  -- Safety
  require_verified_data BOOLEAN DEFAULT true,
  exclude_sensitive_content BOOLEAN DEFAULT true,

  -- Monetization
  show_ads_in_games BOOLEAN DEFAULT false,

  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default config
INSERT INTO game_admin_config (
  games_enabled,
  enabled_games,
  default_difficulty,
  adaptive_difficulty,
  prefer_nostalgic,
  prefer_classics
) VALUES (
  true,
  ARRAY['dumb_charades', 'dialogue_guess', 'hit_or_flop', 'emoji_movie', 'director_guess'],
  'medium',
  true,
  true,
  true
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. ICONIC DIALOGUES (Curated for games)
-- ============================================================

CREATE TABLE IF NOT EXISTS iconic_dialogues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content (short excerpts only, not full dialogues)
  dialogue TEXT NOT NULL,
  dialogue_romanized TEXT,

  -- Source
  movie_id UUID REFERENCES movies(id),
  movie_title TEXT NOT NULL,
  actor TEXT NOT NULL,
  character_name TEXT,
  year INT NOT NULL,

  -- Classification
  difficulty TEXT DEFAULT 'medium',
  popularity INT DEFAULT 50,
  is_verified BOOLEAN DEFAULT false,

  -- Safety
  is_safe_for_games BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dialogues_actor ON iconic_dialogues(actor);
CREATE INDEX IF NOT EXISTS idx_dialogues_movie ON iconic_dialogues(movie_title);

-- Insert some iconic dialogues
INSERT INTO iconic_dialogues (dialogue, movie_title, actor, year, difficulty, is_verified) VALUES
  ('నేను సాధారణ మనిషిని, సూపర్ హీరో కాదు', 'Pokiri', 'Mahesh Babu', 2006, 'easy', true),
  ('నా స్టైల్ వేరయ్య!', 'Pokiri', 'Mahesh Babu', 2006, 'easy', true),
  ('తగ్గేదెలే!', 'Pushpa', 'Allu Arjun', 2021, 'easy', true),
  ('అసలు power ఎవరిది?', 'Baahubali', 'Prabhas', 2015, 'medium', true),
  ('ఇది నా అల్లుడు... మహేష్ బాబు!', 'Businessman', 'Mahesh Babu', 2012, 'medium', true),
  ('నేను ట్రిగర్ లాగితే, గన్ మాట్లాడుతుంది', 'Gabbar Singh', 'Pawan Kalyan', 2012, 'medium', true),
  ('1 నీకు...', 'Jalsa', 'Pawan Kalyan', 2008, 'hard', true),
  ('నేను మీకు భార్య కాదు, భయం కాదు, బాధ్యత!', 'Arjun Reddy', 'Vijay Deverakonda', 2017, 'medium', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. CAREER STATS (Pre-computed for performance)
-- ============================================================

CREATE TABLE IF NOT EXISTS celebrity_career_stats (
  celebrity_id UUID PRIMARY KEY REFERENCES celebrities(id),

  -- Counts
  total_movies INT DEFAULT 0,
  hits INT DEFAULT 0,
  average INT DEFAULT 0,
  flops INT DEFAULT 0,
  classics INT DEFAULT 0,

  -- Rates
  hit_rate DECIMAL(5,2) DEFAULT 0,

  -- Career info
  debut_year INT,
  last_movie_year INT,
  active_years TEXT,
  peak_years TEXT,

  -- Best movie
  best_movie_id UUID,
  best_movie_title TEXT,

  -- Updated
  last_calculated TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. FUNCTIONS
-- ============================================================

-- Function to update leaderboard rankings
CREATE OR REPLACE FUNCTION update_leaderboard_ranks()
RETURNS TRIGGER AS $$
BEGIN
  -- Update ranks for this game type
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC) as new_rank
    FROM game_leaderboard
    WHERE game_type = NEW.game_type
  )
  UPDATE game_leaderboard gl
  SET rank_position = ranked.new_rank
  FROM ranked
  WHERE gl.id = ranked.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ranks ON game_leaderboard;
CREATE TRIGGER trigger_update_ranks
  AFTER INSERT ON game_leaderboard
  FOR EACH ROW EXECUTE FUNCTION update_leaderboard_ranks();

-- Function to update game round stats
CREATE OR REPLACE FUNCTION update_round_stats()
RETURNS TRIGGER AS $$
DECLARE
  round_result JSONB;
BEGIN
  -- For each completed round, update the game_rounds stats
  FOR round_result IN SELECT * FROM jsonb_array_elements(NEW.rounds_completed)
  LOOP
    UPDATE game_rounds
    SET
      times_shown = times_shown + 1,
      times_correct = times_correct + CASE WHEN (round_result->>'is_correct')::boolean THEN 1 ELSE 0 END,
      avg_time_seconds = COALESCE(
        (avg_time_seconds * times_shown + (round_result->>'time_taken_seconds')::decimal) / (times_shown + 1),
        (round_result->>'time_taken_seconds')::decimal
      )
    WHERE id = round_result->>'question_id';
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_round_stats ON game_sessions;
CREATE TRIGGER trigger_round_stats
  AFTER UPDATE OF status ON game_sessions
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_round_stats();

-- ============================================================
-- 8. VIEWS
-- ============================================================

-- Game statistics view
CREATE OR REPLACE VIEW v_game_stats AS
SELECT
  game_type,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
  AVG(total_score) as avg_score,
  AVG(correct_answers::decimal / NULLIF(current_round, 0) * 100) as avg_accuracy,
  AVG(total_time_seconds) as avg_time,
  MAX(total_score) as high_score,
  MAX(best_streak) as max_streak
FROM game_sessions
GROUP BY game_type;

-- Top players view
CREATE OR REPLACE VIEW v_top_players AS
SELECT
  game_type,
  display_name,
  score,
  rank_position,
  completed_at
FROM game_leaderboard
WHERE rank_position <= 10
ORDER BY game_type, rank_position;

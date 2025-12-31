-- ============================================================
-- CHALLENGES & WEEKLY GAMES SCHEMA
-- ============================================================
-- Fan engagement system with:
-- - Weekly challenges
-- - Daily trivia
-- - Shareable results
-- - Leaderboards
-- ============================================================

-- Challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('weekly_quiz', 'daily_trivia', 'movie_marathon', 'actor_birthday', 'classic_movies', 'hit_or_flop_streak')),
  title TEXT NOT NULL,
  title_te TEXT NOT NULL,
  description TEXT,
  description_te TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  questions_count INTEGER NOT NULL DEFAULT 10,
  points_per_correct INTEGER NOT NULL DEFAULT 10,
  bonus_for_streak INTEGER NOT NULL DEFAULT 5,
  badge_image TEXT,
  prize_description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  theme TEXT,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenge questions
CREATE TABLE IF NOT EXISTS challenge_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL DEFAULT 1,
  question TEXT NOT NULL,
  question_te TEXT NOT NULL,
  options JSONB NOT NULL, -- ["option1", "option2", "option3", "option4"]
  correct_index INTEGER NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
  hint TEXT,
  hint_te TEXT,
  image_url TEXT,
  points INTEGER NOT NULL DEFAULT 10,
  time_limit_seconds INTEGER DEFAULT 30,
  explanation TEXT,
  explanation_te TEXT,
  movie_id UUID REFERENCES movies(id),
  celebrity_id UUID REFERENCES celebrities(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenge attempts (user participation)
CREATE TABLE IF NOT EXISTS challenge_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Anonymous browser ID
  user_name TEXT, -- Optional display name
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  max_streak INTEGER NOT NULL DEFAULT 0,
  answers JSONB DEFAULT '[]'::JSONB,
  time_taken_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_image TEXT,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  challenge_id UUID REFERENCES challenges(id),
  UNIQUE(user_id, badge_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_dates ON challenges(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_challenges_type ON challenges(type);
CREATE INDEX IF NOT EXISTS idx_challenge_questions_challenge ON challenge_questions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_attempts_user ON challenge_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_attempts_challenge ON challenge_attempts(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_attempts_score ON challenge_attempts(challenge_id, score DESC);

-- Function to update challenge status
CREATE OR REPLACE FUNCTION update_challenge_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_date < NOW() AND NEW.status = 'active' THEN
    NEW.status := 'expired';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for challenge status
DROP TRIGGER IF EXISTS trigger_update_challenge_status ON challenges;
CREATE TRIGGER trigger_update_challenge_status
  BEFORE UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_challenge_status();

-- View for leaderboard
CREATE OR REPLACE VIEW challenge_leaderboard AS
SELECT
  ca.challenge_id,
  ca.user_id,
  ca.user_name,
  ca.score,
  ca.max_streak,
  ca.completed_at,
  ca.time_taken_ms,
  RANK() OVER (PARTITION BY ca.challenge_id ORDER BY ca.score DESC, ca.completed_at ASC) as rank
FROM challenge_attempts ca
WHERE ca.completed_at IS NOT NULL;

-- View for weekly challenge stats
CREATE OR REPLACE VIEW weekly_challenge_stats AS
SELECT
  c.id as challenge_id,
  c.title,
  c.title_te,
  c.start_date,
  c.end_date,
  c.status,
  COUNT(DISTINCT ca.user_id) as participants,
  COUNT(ca.id) as total_attempts,
  COUNT(ca.id) FILTER (WHERE ca.completed_at IS NOT NULL) as completed_attempts,
  AVG(ca.score) FILTER (WHERE ca.completed_at IS NOT NULL) as avg_score,
  MAX(ca.score) as top_score,
  AVG(ca.max_streak) FILTER (WHERE ca.completed_at IS NOT NULL) as avg_streak
FROM challenges c
LEFT JOIN challenge_attempts ca ON ca.challenge_id = c.id
WHERE c.type = 'weekly_quiz'
GROUP BY c.id;

-- Sample weekly challenge (current week)
INSERT INTO challenges (type, title, title_te, description, description_te, difficulty, start_date, end_date, questions_count, max_attempts, points_per_correct, bonus_for_streak, theme, featured)
VALUES (
  'weekly_quiz',
  'Telugu Cinema Legends',
  'తెలుగు సినిమా లెజెండ్స్',
  'Test your knowledge about legendary Telugu actors and their iconic movies',
  'తెలుగు లెజెండరీ నటులు, వారి ఐకానిక్ సినిమాల గురించి మీ జ్ఞానాన్ని పరీక్షించండి',
  'medium',
  DATE_TRUNC('week', NOW())::TIMESTAMPTZ,
  (DATE_TRUNC('week', NOW()) + INTERVAL '6 days 23 hours 59 minutes 59 seconds')::TIMESTAMPTZ,
  10,
  3,
  10,
  5,
  'legends',
  true
) ON CONFLICT DO NOTHING;

-- Sample questions for the challenge (if challenge exists)
DO $$
DECLARE
  challenge_uuid UUID;
BEGIN
  SELECT id INTO challenge_uuid FROM challenges WHERE type = 'weekly_quiz' AND featured = true LIMIT 1;

  IF challenge_uuid IS NOT NULL THEN
    -- Check if questions already exist
    IF NOT EXISTS (SELECT 1 FROM challenge_questions WHERE challenge_id = challenge_uuid) THEN
      INSERT INTO challenge_questions (challenge_id, sequence, question, question_te, options, correct_index, points)
      VALUES
        (challenge_uuid, 1, 'Who is known as "Rebel Star"?', '"రెబెల్ స్టార్" గా ఎవరు ప్రసిద్ధి?', '["Chiranjeevi", "Prabhas", "Allu Arjun", "Jr NTR"]', 1, 10),
        (challenge_uuid, 2, 'Which movie won 2 National Awards in 2022?', '2022 లో 2 నేషనల్ అవార్డులు గెలుచుకున్న సినిమా?', '["Pushpa", "RRR", "Akhanda", "Vakeel Saab"]', 1, 10),
        (challenge_uuid, 3, 'Who directed Baahubali?', 'బాహుబలి దర్శకుడు ఎవరు?', '["Trivikram", "Rajamouli", "Sukumar", "Koratala Siva"]', 1, 10),
        (challenge_uuid, 4, 'Which actor debuted with "Pelli Sandadi"?', '"పెళ్లి సందడి" తో ఎవరు డెబ్యూ చేశారు?', '["Mahesh Babu", "Srikanth", "Venkatesh", "Nagarjuna"]', 1, 10),
        (challenge_uuid, 5, 'Who is called "Megastar"?', '"మెగాస్టార్" అని ఎవరిని పిలుస్తారు?', '["Nagarjuna", "Venkatesh", "Chiranjeevi", "Balakrishna"]', 2, 10),
        (challenge_uuid, 6, 'Which is Allu Arjun''s debut movie?', 'అల్లు అర్జున్ మొదటి సినిమా ఏది?', '["Arya", "Gangotri", "Desamuduru", "Happy"]', 1, 10),
        (challenge_uuid, 7, 'Who composed music for "Arjun Reddy"?', '"అర్జున్ రెడ్డి" సంగీతం ఎవరు?', '["DSP", "Thaman", "Radhan", "Anirudh"]', 2, 10),
        (challenge_uuid, 8, 'Which year was "Magadheera" released?', '"మగధీర" ఏ సంవత్సరం విడుదలైంది?', '["2007", "2008", "2009", "2010"]', 2, 10),
        (challenge_uuid, 9, 'Who played the villain in "Pushpa"?', '"పుష్ప" లో విలన్ ఎవరు?', '["Fahad Faasil", "Jagapathi Babu", "Prakash Raj", "Sunil"]', 0, 10),
        (challenge_uuid, 10, 'Which actress starred in "Ala Vaikunthapurramuloo"?', '"అల వైకుంఠపురములో" హీరోయిన్ ఎవరు?', '["Samantha", "Pooja Hegde", "Rashmika", "Kajal"]', 1, 10);
    END IF;
  END IF;
END $$;

-- Daily trivia template (auto-generated daily)
CREATE TABLE IF NOT EXISTS daily_trivia_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- movie, actor, director, music, dialogue
  question_template TEXT NOT NULL,
  question_template_te TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'easy',
  is_active BOOLEAN DEFAULT true
);

-- Sample trivia templates
INSERT INTO daily_trivia_templates (category, question_template, question_template_te, difficulty)
VALUES
  ('movie', 'In which year was "{movie}" released?', '"{movie}" ఏ సంవత్సరం విడుదలైంది?', 'easy'),
  ('actor', 'Which actor played the lead in "{movie}"?', '"{movie}" లో హీరో ఎవరు?', 'easy'),
  ('director', 'Who directed "{movie}"?', '"{movie}" దర్శకుడు ఎవరు?', 'medium'),
  ('dialogue', 'Which movie features the dialogue: "{dialogue}"?', 'ఈ డైలాగ్ ఏ సినిమాలో ఉంది: "{dialogue}"?', 'hard')
ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Public read access for challenges
CREATE POLICY "Public read access for challenges"
  ON challenges FOR SELECT
  USING (status = 'active');

-- Public read access for questions (only if challenge is active)
CREATE POLICY "Public read access for challenge questions"
  ON challenge_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM challenges c WHERE c.id = challenge_id AND c.status = 'active'
  ));

-- Anyone can create attempts
CREATE POLICY "Anyone can create challenge attempts"
  ON challenge_attempts FOR INSERT
  WITH CHECK (true);

-- Users can only read/update their own attempts
CREATE POLICY "Users can read own attempts"
  ON challenge_attempts FOR SELECT
  USING (true);

CREATE POLICY "Users can update own attempts"
  ON challenge_attempts FOR UPDATE
  USING (true);

-- Users can read their own badges
CREATE POLICY "Users can read own badges"
  ON user_badges FOR SELECT
  USING (true);

COMMENT ON TABLE challenges IS 'Fan challenges and weekly games';
COMMENT ON TABLE challenge_questions IS 'Questions for challenges';
COMMENT ON TABLE challenge_attempts IS 'User participation in challenges';
COMMENT ON TABLE user_badges IS 'Badges earned by users';

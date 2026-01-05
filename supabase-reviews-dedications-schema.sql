-- =====================================================
-- TeluguVibes Movie Reviews & Dedications System
-- Database Schema v1.0
-- =====================================================

-- =====================================================
-- PART 1: MOVIE REVIEWS SYSTEM
-- =====================================================

-- 1. MOVIES TABLE (Central movie database)
CREATE TABLE IF NOT EXISTS movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  title_en TEXT NOT NULL,
  title_te TEXT,
  slug TEXT UNIQUE NOT NULL,

  -- Release Info
  release_date DATE,
  release_year INTEGER,
  runtime_minutes INTEGER,

  -- Classification
  genres TEXT[] DEFAULT '{}',
  language TEXT DEFAULT 'Telugu',
  certification TEXT, -- U, U/A, A

  -- Media
  poster_url TEXT,
  backdrop_url TEXT,
  trailer_url TEXT,

  -- External IDs
  tmdb_id INTEGER,
  imdb_id TEXT,

  -- Crew (JSON for flexibility)
  director TEXT,
  directors TEXT[] DEFAULT '{}',
  producers TEXT[] DEFAULT '{}',
  music_director TEXT,
  cinematographer TEXT,
  editor TEXT,
  writer TEXT,

  -- Cast (Array of names, can link to celebrities later)
  cast_members TEXT[] DEFAULT '{}',
  hero TEXT,
  heroine TEXT,

  -- Synopsis
  synopsis TEXT,
  synopsis_te TEXT,

  -- Ratings (aggregated)
  avg_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,

  -- Tags
  tags TEXT[] DEFAULT '{}',
  is_underrated BOOLEAN DEFAULT false,
  is_blockbuster BOOLEAN DEFAULT false,
  is_classic BOOLEAN DEFAULT false,

  -- Status
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MOVIE REVIEWS TABLE
CREATE TABLE IF NOT EXISTS movie_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,

  -- Reviewer (can be admin or user)
  reviewer_type TEXT DEFAULT 'admin' CHECK (reviewer_type IN ('admin', 'critic', 'user')),
  reviewer_name TEXT NOT NULL,
  reviewer_avatar TEXT,

  -- Overall Rating
  overall_rating DECIMAL(3,1) NOT NULL CHECK (overall_rating >= 0 AND overall_rating <= 10),

  -- Detailed Ratings (0-10 scale)
  direction_rating DECIMAL(3,1) CHECK (direction_rating >= 0 AND direction_rating <= 10),
  screenplay_rating DECIMAL(3,1) CHECK (screenplay_rating >= 0 AND screenplay_rating <= 10),
  acting_rating DECIMAL(3,1) CHECK (acting_rating >= 0 AND acting_rating <= 10),
  music_rating DECIMAL(3,1) CHECK (music_rating >= 0 AND music_rating <= 10),
  cinematography_rating DECIMAL(3,1) CHECK (cinematography_rating >= 0 AND cinematography_rating <= 10),
  production_rating DECIMAL(3,1) CHECK (production_rating >= 0 AND production_rating <= 10),
  entertainment_rating DECIMAL(3,1) CHECK (entertainment_rating >= 0 AND entertainment_rating <= 10),

  -- Review Content
  title TEXT,
  title_te TEXT,

  -- Structured Review Sections
  summary TEXT, -- Quick verdict
  summary_te TEXT,

  direction_review TEXT,
  screenplay_review TEXT,
  acting_review TEXT,
  music_review TEXT,
  cinematography_review TEXT,
  production_review TEXT,

  directors_vision TEXT, -- What was the director trying to convey
  strengths TEXT[], -- Array of strong points
  weaknesses TEXT[], -- Array of weak points

  verdict TEXT, -- Final verdict
  verdict_te TEXT,

  -- Recommendation
  worth_watching BOOLEAN DEFAULT true,
  recommended_for TEXT[], -- e.g., ['family', 'action_lovers', 'comedy_fans']

  -- Engagement
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  helpful_votes INTEGER DEFAULT 0,

  -- Status
  is_featured BOOLEAN DEFAULT false,
  is_spoiler_free BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. REVIEW COMMENTS (User discussions on reviews)
CREATE TABLE IF NOT EXISTS review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES movie_reviews(id) ON DELETE CASCADE,

  commenter_name TEXT NOT NULL,
  commenter_email TEXT,
  comment_text TEXT NOT NULL,

  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 2: USER DEDICATIONS SYSTEM
-- =====================================================

-- 4. DEDICATIONS TABLE
CREATE TABLE IF NOT EXISTS dedications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dedication Type
  dedication_type TEXT NOT NULL CHECK (dedication_type IN (
    'birthday', 'anniversary', 'achievement', 'memorial',
    'congratulations', 'thank_you', 'love', 'friendship', 'general'
  )),

  -- From/To
  from_name TEXT NOT NULL,
  from_location TEXT,
  to_name TEXT NOT NULL,
  to_relation TEXT, -- e.g., 'friend', 'wife', 'fan'

  -- Content
  message TEXT NOT NULL,
  message_te TEXT,

  -- Optional: Link to celebrity
  celebrity_id UUID REFERENCES celebrities(id) ON DELETE SET NULL,
  celebrity_name TEXT, -- Denormalized for quick access

  -- Media (optional photo)
  photo_url TEXT,

  -- Animation Style
  animation_type TEXT DEFAULT 'flowers' CHECK (animation_type IN (
    'flowers', 'crackers', 'confetti', 'hearts', 'stars',
    'balloons', 'sparkles', 'fireworks', 'petals', 'none'
  )),

  -- Display Settings
  display_date DATE DEFAULT CURRENT_DATE,
  display_duration_hours INTEGER DEFAULT 24,
  is_premium BOOLEAN DEFAULT false, -- For highlighted dedications

  -- Moderation
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderation_notes TEXT,

  -- Analytics
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Movies
CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug);
CREATE INDEX IF NOT EXISTS idx_movies_release_year ON movies(release_year DESC);
CREATE INDEX IF NOT EXISTS idx_movies_genres ON movies USING GIN(genres);
CREATE INDEX IF NOT EXISTS idx_movies_cast ON movies USING GIN(cast_members);
CREATE INDEX IF NOT EXISTS idx_movies_director ON movies(director);
CREATE INDEX IF NOT EXISTS idx_movies_rating ON movies(avg_rating DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_movies_underrated ON movies(avg_rating DESC) WHERE is_underrated = true;

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_movie ON movie_reviews(movie_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON movie_reviews(overall_rating DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_featured ON movie_reviews(created_at DESC) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_reviews_status ON movie_reviews(status);

-- Dedications
CREATE INDEX IF NOT EXISTS idx_dedications_date ON dedications(display_date);
CREATE INDEX IF NOT EXISTS idx_dedications_type ON dedications(dedication_type);
CREATE INDEX IF NOT EXISTS idx_dedications_status ON dedications(status);
CREATE INDEX IF NOT EXISTS idx_dedications_active ON dedications(created_at DESC)
  WHERE status = 'approved' AND expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_dedications_celebrity ON dedications(celebrity_id)
  WHERE celebrity_id IS NOT NULL;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Update movie average rating when review is added/updated
CREATE OR REPLACE FUNCTION update_movie_avg_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE movies SET
    avg_rating = (
      SELECT COALESCE(AVG(overall_rating), 0)
      FROM movie_reviews
      WHERE movie_id = COALESCE(NEW.movie_id, OLD.movie_id)
      AND status = 'published'
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM movie_reviews
      WHERE movie_id = COALESCE(NEW.movie_id, OLD.movie_id)
      AND status = 'published'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.movie_id, OLD.movie_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_movie_rating
  AFTER INSERT OR UPDATE OR DELETE ON movie_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_movie_avg_rating();

-- Auto-expire dedications
CREATE OR REPLACE FUNCTION cleanup_expired_dedications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE dedications
  SET status = 'archived'
  WHERE expires_at < NOW()
  AND status = 'approved';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Get active dedications for display
CREATE OR REPLACE FUNCTION get_active_dedications(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  dedication_type TEXT,
  from_name TEXT,
  to_name TEXT,
  message TEXT,
  animation_type TEXT,
  photo_url TEXT,
  celebrity_name TEXT,
  is_premium BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id, d.dedication_type, d.from_name, d.to_name,
    d.message, d.animation_type, d.photo_url,
    d.celebrity_name, d.is_premium, d.created_at
  FROM dedications d
  WHERE d.status = 'approved'
  AND d.expires_at > NOW()
  ORDER BY d.is_premium DESC, d.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_movies_updated_at
  BEFORE UPDATE ON movies FOR EACH ROW
  EXECUTE FUNCTION update_media_updated_at();

CREATE TRIGGER trigger_reviews_updated_at
  BEFORE UPDATE ON movie_reviews FOR EACH ROW
  EXECUTE FUNCTION update_media_updated_at();

-- =====================================================
-- SEED DATA: Sample Movies
-- =====================================================

INSERT INTO movies (title_en, title_te, slug, release_year, genres, director, hero, heroine, avg_rating, is_underrated, is_blockbuster, is_classic, synopsis)
VALUES
  ('Baahubali: The Beginning', 'బాహుబలి: ది బిగినింగ్', 'baahubali-the-beginning', 2015,
   ARRAY['Action', 'Drama', 'Fantasy'], 'S.S. Rajamouli', 'Prabhas', 'Anushka Shetty', 8.5,
   false, true, true, 'An epic action drama about a young man who discovers his royal heritage.'),

  ('Arjun Reddy', 'అర్జున్ రెడ్డి', 'arjun-reddy', 2017,
   ARRAY['Drama', 'Romance'], 'Sandeep Reddy Vanga', 'Vijay Deverakonda', 'Shalini Pandey', 8.0,
   false, true, false, 'A brilliant but short-tempered surgeon spirals into self-destruction after his girlfriend is forced to marry another man.'),

  ('C/o Kancharapalem', 'సి/ఓ కంచరపాలెం', 'co-kancharapalem', 2018,
   ARRAY['Drama', 'Romance'], 'Venkatesh Maha', 'Multiple', 'Multiple', 8.2,
   true, false, false, 'Four love stories set in the Kancharapalem area of Visakhapatnam.'),

  ('Pushpa: The Rise', 'పుష్ప: ది రైజ్', 'pushpa-the-rise', 2021,
   ARRAY['Action', 'Thriller', 'Crime'], 'Sukumar', 'Allu Arjun', 'Rashmika Mandanna', 7.8,
   false, true, false, 'A laborer rises through the ranks of a red sandalwood smuggling syndicate.'),

  ('RRR', 'ఆర్ఆర్ఆర్', 'rrr', 2022,
   ARRAY['Action', 'Drama', 'Period'], 'S.S. Rajamouli', 'Jr. NTR, Ram Charan', 'Alia Bhatt', 8.8,
   false, true, true, 'A fictional story about two legendary revolutionaries and their journey away from home.')
ON CONFLICT (slug) DO NOTHING;

-- Sample Review
INSERT INTO movie_reviews (
  movie_id, reviewer_type, reviewer_name, overall_rating,
  direction_rating, screenplay_rating, acting_rating, music_rating,
  title, summary, direction_review, screenplay_review, acting_review,
  directors_vision, strengths, weaknesses, verdict, worth_watching,
  is_featured, status
)
SELECT
  id, 'admin', 'TeluguVibes Team', 8.8,
  9.0, 8.5, 9.0, 8.5,
  'A Visual Masterpiece',
  'RRR is a cinematic spectacle that redefines Indian filmmaking.',
  'Rajamouli once again proves why he is the master of epic storytelling. Every frame is meticulously crafted.',
  'The screenplay brilliantly weaves together two parallel stories before bringing them together in an explosive climax.',
  'Jr. NTR and Ram Charan deliver career-best performances. Their chemistry is electric.',
  'Rajamouli wanted to celebrate the unsung heroes of Indian independence through a larger-than-life spectacle.',
  ARRAY['Stunning visuals', 'Powerful performances', 'Epic action sequences', 'Emotional depth'],
  ARRAY['Runtime could be trimmed', 'Some historical liberties'],
  'A must-watch theatrical experience that showcases the best of Indian cinema.',
  true, true, 'published'
FROM movies WHERE slug = 'rrr'
ON CONFLICT DO NOTHING;









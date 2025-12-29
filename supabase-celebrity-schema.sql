-- =====================================================
-- TeluguVibes Celebrity Intelligence System
-- Database Schema v1.0
-- =====================================================

-- 1. CELEBRITIES TABLE (Master Data)
CREATE TABLE IF NOT EXISTS celebrities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name_en TEXT NOT NULL,
  name_te TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),

  -- Dates
  birth_date DATE,
  death_date DATE,
  birth_place TEXT,

  -- Career Info
  occupation TEXT[] DEFAULT '{}',
  active_years_start INTEGER,
  active_years_end INTEGER,

  -- Biography
  short_bio TEXT,
  short_bio_te TEXT,

  -- External IDs
  wikidata_id TEXT UNIQUE,
  wikipedia_url TEXT,
  tmdb_id INTEGER,
  imdb_id TEXT,

  -- Media
  profile_image TEXT,
  profile_image_source TEXT,
  gallery_images TEXT[] DEFAULT '{}',

  -- Scoring
  popularity_score DECIMAL(5,2) DEFAULT 0,
  site_performance_score DECIMAL(5,2) DEFAULT 0,

  -- Meta
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CELEBRITY WORKS (Movies, Shows)
CREATE TABLE IF NOT EXISTS celebrity_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebrity_id UUID NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,

  -- Work Details
  title_en TEXT NOT NULL,
  title_te TEXT,
  work_type TEXT DEFAULT 'movie' CHECK (work_type IN ('movie', 'tv_show', 'web_series', 'short_film')),
  release_date DATE,
  release_year INTEGER,

  -- Role Info
  role_name TEXT,
  role_type TEXT CHECK (role_type IN ('lead', 'supporting', 'cameo', 'voice', 'special_appearance')),

  -- Significance
  is_debut BOOLEAN DEFAULT false,
  is_iconic BOOLEAN DEFAULT false,
  is_blockbuster BOOLEAN DEFAULT false,
  box_office_rank INTEGER,

  -- External IDs
  tmdb_movie_id INTEGER,
  imdb_movie_id TEXT,

  -- Media
  poster_url TEXT,

  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CELEBRITY EVENTS (Special Days)
CREATE TABLE IF NOT EXISTS celebrity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebrity_id UUID NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,

  -- Event Info
  event_type TEXT NOT NULL CHECK (event_type IN (
    'birthday',
    'death_anniversary',
    'debut_anniversary',
    'movie_anniversary',
    'award_anniversary',
    'career_milestone'
  )),

  -- Date (stored as MM-DD for yearly matching)
  event_month INTEGER NOT NULL CHECK (event_month BETWEEN 1 AND 12),
  event_day INTEGER NOT NULL CHECK (event_day BETWEEN 1 AND 31),
  event_year INTEGER, -- Original year (for calculating anniversaries)

  -- Content
  title_template TEXT,
  description TEXT,
  description_te TEXT,

  -- Related Work (for movie anniversaries)
  related_work_id UUID REFERENCES celebrity_works(id) ON DELETE SET NULL,

  -- Scoring
  priority_score INTEGER DEFAULT 50 CHECK (priority_score BETWEEN 1 AND 100),

  -- Meta
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. HISTORIC POSTS (Generated Posts Tracker)
CREATE TABLE IF NOT EXISTS historic_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  celebrity_id UUID NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
  event_id UUID REFERENCES celebrity_events(id) ON DELETE SET NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,

  -- Event Info
  event_type TEXT NOT NULL,
  event_year INTEGER NOT NULL, -- Year this post was generated for

  -- Slug for URL reuse
  slug_pattern TEXT NOT NULL, -- e.g., "chiranjeevi-birthday"

  -- Performance
  views_count INTEGER DEFAULT 0,
  engagement_score DECIMAL(5,2) DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  -- Meta
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one post per event per year
  UNIQUE(celebrity_id, event_type, event_year, slug_pattern)
);

-- 5. CELEBRITY QUOTES (For enriching content)
CREATE TABLE IF NOT EXISTS celebrity_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebrity_id UUID NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,

  quote_text TEXT NOT NULL,
  quote_text_te TEXT,
  source TEXT,
  context TEXT,

  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CELEBRITY RELATIONSHIPS (For "Also Related" sections)
CREATE TABLE IF NOT EXISTS celebrity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebrity_id UUID NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
  related_celebrity_id UUID NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,

  relationship_type TEXT CHECK (relationship_type IN (
    'spouse', 'parent', 'child', 'sibling',
    'frequent_costar', 'mentor', 'rival',
    'same_family', 'same_era'
  )),

  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(celebrity_id, related_celebrity_id, relationship_type)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Celebrity lookups
CREATE INDEX IF NOT EXISTS idx_celebrities_name ON celebrities(name_en);
CREATE INDEX IF NOT EXISTS idx_celebrities_wikidata ON celebrities(wikidata_id);
CREATE INDEX IF NOT EXISTS idx_celebrities_tmdb ON celebrities(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_celebrities_birth ON celebrities(birth_date);
CREATE INDEX IF NOT EXISTS idx_celebrities_death ON celebrities(death_date);
CREATE INDEX IF NOT EXISTS idx_celebrities_popularity ON celebrities(popularity_score DESC);

-- Event date lookups (crucial for On This Day)
CREATE INDEX IF NOT EXISTS idx_events_date ON celebrity_events(event_month, event_day);
CREATE INDEX IF NOT EXISTS idx_events_type ON celebrity_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_priority ON celebrity_events(priority_score DESC);

-- Works lookups
CREATE INDEX IF NOT EXISTS idx_works_celebrity ON celebrity_works(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_works_release ON celebrity_works(release_date);
CREATE INDEX IF NOT EXISTS idx_works_iconic ON celebrity_works(is_iconic) WHERE is_iconic = true;

-- Historic posts
CREATE INDEX IF NOT EXISTS idx_historic_celebrity ON historic_posts(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_historic_event ON historic_posts(event_type, event_year);
CREATE INDEX IF NOT EXISTS idx_historic_slug ON historic_posts(slug_pattern);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get today's events
CREATE OR REPLACE FUNCTION get_todays_events(p_month INTEGER, p_day INTEGER)
RETURNS TABLE (
  event_id UUID,
  celebrity_id UUID,
  celebrity_name TEXT,
  celebrity_name_te TEXT,
  event_type TEXT,
  event_year INTEGER,
  years_ago INTEGER,
  priority_score INTEGER,
  popularity_score DECIMAL,
  profile_image TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id as event_id,
    c.id as celebrity_id,
    c.name_en as celebrity_name,
    c.name_te as celebrity_name_te,
    e.event_type,
    e.event_year,
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER - e.event_year as years_ago,
    e.priority_score,
    c.popularity_score,
    c.profile_image
  FROM celebrity_events e
  JOIN celebrities c ON e.celebrity_id = c.id
  WHERE e.event_month = p_month
    AND e.event_day = p_day
    AND e.is_active = true
    AND c.is_active = true
  ORDER BY
    e.priority_score DESC,
    c.popularity_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate events from celebrity data
CREATE OR REPLACE FUNCTION generate_celebrity_events(p_celebrity_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_celebrity RECORD;
  v_count INTEGER := 0;
BEGIN
  SELECT * INTO v_celebrity FROM celebrities WHERE id = p_celebrity_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Birthday event
  IF v_celebrity.birth_date IS NOT NULL THEN
    INSERT INTO celebrity_events (
      celebrity_id, event_type, event_month, event_day, event_year, priority_score
    ) VALUES (
      p_celebrity_id,
      'birthday',
      EXTRACT(MONTH FROM v_celebrity.birth_date)::INTEGER,
      EXTRACT(DAY FROM v_celebrity.birth_date)::INTEGER,
      EXTRACT(YEAR FROM v_celebrity.birth_date)::INTEGER,
      CASE
        WHEN v_celebrity.popularity_score > 80 THEN 90
        WHEN v_celebrity.popularity_score > 50 THEN 70
        ELSE 50
      END
    ) ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END IF;

  -- Death anniversary event
  IF v_celebrity.death_date IS NOT NULL THEN
    INSERT INTO celebrity_events (
      celebrity_id, event_type, event_month, event_day, event_year, priority_score
    ) VALUES (
      p_celebrity_id,
      'death_anniversary',
      EXTRACT(MONTH FROM v_celebrity.death_date)::INTEGER,
      EXTRACT(DAY FROM v_celebrity.death_date)::INTEGER,
      EXTRACT(YEAR FROM v_celebrity.death_date)::INTEGER,
      CASE
        WHEN v_celebrity.popularity_score > 80 THEN 85
        WHEN v_celebrity.popularity_score > 50 THEN 65
        ELSE 45
      END
    ) ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END IF;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_celebrity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_celebrities_updated_at
  BEFORE UPDATE ON celebrities
  FOR EACH ROW
  EXECUTE FUNCTION update_celebrity_updated_at();

CREATE TRIGGER trigger_historic_posts_updated_at
  BEFORE UPDATE ON historic_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_celebrity_updated_at();

-- =====================================================
-- SEED DATA: Top Telugu Celebrities (Sample)
-- =====================================================

INSERT INTO celebrities (name_en, name_te, gender, birth_date, occupation, popularity_score, is_verified)
VALUES
  ('Chiranjeevi', 'చిరంజీవి', 'male', '1955-08-22', ARRAY['actor', 'politician'], 95, true),
  ('Mahesh Babu', 'మహేష్ బాబు', 'male', '1975-08-09', ARRAY['actor', 'producer'], 92, true),
  ('Prabhas', 'ప్రభాస్', 'male', '1979-10-23', ARRAY['actor'], 94, true),
  ('NTR Jr', 'జూనియర్ ఎన్టీఆర్', 'male', '1983-05-20', ARRAY['actor'], 90, true),
  ('Allu Arjun', 'అల్లు అర్జున్', 'male', '1982-04-08', ARRAY['actor'], 93, true),
  ('Ram Charan', 'రామ్ చరణ్', 'male', '1985-03-27', ARRAY['actor', 'producer'], 91, true),
  ('Nagarjuna', 'నాగార్జున', 'male', '1959-08-29', ARRAY['actor', 'producer'], 88, true),
  ('Venkatesh', 'వెంకటేష్', 'male', '1960-12-13', ARRAY['actor'], 85, true),
  ('Samantha Ruth Prabhu', 'సమంత రూత్ ప్రభు', 'female', '1987-04-28', ARRAY['actress'], 87, true),
  ('Rashmika Mandanna', 'రష్మిక మందన్న', 'female', '1996-04-05', ARRAY['actress'], 86, true),
  ('Kajal Aggarwal', 'కాజల్ అగర్వాల్', 'female', '1985-06-19', ARRAY['actress'], 82, true),
  ('Anushka Shetty', 'అనుష్క శెట్టి', 'female', '1981-11-07', ARRAY['actress'], 84, true),
  ('S. S. Rajamouli', 'ఎస్.ఎస్. రాజమౌళి', 'male', '1973-10-10', ARRAY['director', 'screenwriter'], 96, true),
  ('Trivikram Srinivas', 'త్రివిక్రమ్ శ్రీనివాస్', 'male', '1971-11-07', ARRAY['director', 'screenwriter'], 85, true),
  ('N. T. Rama Rao', 'ఎన్.టి. రామారావు', 'male', '1923-05-28', ARRAY['actor', 'politician'], 98, true)
ON CONFLICT DO NOTHING;

-- Generate events for seeded celebrities
DO $$
DECLARE
  celeb_id UUID;
BEGIN
  FOR celeb_id IN SELECT id FROM celebrities LOOP
    PERFORM generate_celebrity_events(celeb_id);
  END LOOP;
END $$;

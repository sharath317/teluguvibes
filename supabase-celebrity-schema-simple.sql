-- =====================================================
-- TeluguVibes Celebrity Intelligence System
-- Database Schema v1.0 (Simple - No Telugu chars)
-- =====================================================

-- 1. CELEBRITIES TABLE
CREATE TABLE IF NOT EXISTS celebrities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_te TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  birth_date DATE,
  death_date DATE,
  birth_place TEXT,
  occupation TEXT[] DEFAULT '{}',
  active_years_start INTEGER,
  active_years_end INTEGER,
  short_bio TEXT,
  short_bio_te TEXT,
  wikidata_id TEXT UNIQUE,
  wikipedia_url TEXT,
  tmdb_id INTEGER,
  imdb_id TEXT,
  profile_image TEXT,
  profile_image_source TEXT,
  gallery_images TEXT[] DEFAULT '{}',
  popularity_score DECIMAL(5,2) DEFAULT 0,
  site_performance_score DECIMAL(5,2) DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CELEBRITY WORKS
CREATE TABLE IF NOT EXISTS celebrity_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebrity_id UUID NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
  title_en TEXT NOT NULL,
  title_te TEXT,
  work_type TEXT DEFAULT 'movie' CHECK (work_type IN ('movie', 'tv_show', 'web_series', 'short_film')),
  release_date DATE,
  release_year INTEGER,
  role_name TEXT,
  role_type TEXT CHECK (role_type IN ('lead', 'supporting', 'cameo', 'voice', 'special_appearance')),
  is_debut BOOLEAN DEFAULT false,
  is_iconic BOOLEAN DEFAULT false,
  is_blockbuster BOOLEAN DEFAULT false,
  box_office_rank INTEGER,
  tmdb_movie_id INTEGER,
  imdb_movie_id TEXT,
  poster_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CELEBRITY EVENTS
CREATE TABLE IF NOT EXISTS celebrity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebrity_id UUID NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'birthday', 'death_anniversary', 'debut_anniversary',
    'movie_anniversary', 'award_anniversary', 'career_milestone'
  )),
  event_month INTEGER NOT NULL CHECK (event_month BETWEEN 1 AND 12),
  event_day INTEGER NOT NULL CHECK (event_day BETWEEN 1 AND 31),
  event_year INTEGER,
  title_template TEXT,
  description TEXT,
  description_te TEXT,
  related_work_id UUID REFERENCES celebrity_works(id) ON DELETE SET NULL,
  priority_score INTEGER DEFAULT 50 CHECK (priority_score BETWEEN 1 AND 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. HISTORIC POSTS
CREATE TABLE IF NOT EXISTS historic_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebrity_id UUID NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
  event_id UUID REFERENCES celebrity_events(id) ON DELETE SET NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_year INTEGER NOT NULL,
  slug_pattern TEXT NOT NULL,
  views_count INTEGER DEFAULT 0,
  engagement_score DECIMAL(5,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(celebrity_id, event_type, event_year, slug_pattern)
);

-- 5. CELEBRITY QUOTES
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

-- 6. CELEBRITY RELATIONSHIPS
CREATE TABLE IF NOT EXISTS celebrity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebrity_id UUID NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
  related_celebrity_id UUID NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
  relationship_type TEXT CHECK (relationship_type IN (
    'spouse', 'parent', 'child', 'sibling',
    'frequent_costar', 'mentor', 'rival', 'same_family', 'same_era'
  )),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(celebrity_id, related_celebrity_id, relationship_type)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_celebrities_name ON celebrities(name_en);
CREATE INDEX IF NOT EXISTS idx_celebrities_wikidata ON celebrities(wikidata_id);
CREATE INDEX IF NOT EXISTS idx_celebrities_tmdb ON celebrities(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_celebrities_birth ON celebrities(birth_date);
CREATE INDEX IF NOT EXISTS idx_celebrities_death ON celebrities(death_date);
CREATE INDEX IF NOT EXISTS idx_celebrities_popularity ON celebrities(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_events_date ON celebrity_events(event_month, event_day);
CREATE INDEX IF NOT EXISTS idx_events_type ON celebrity_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_priority ON celebrity_events(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_works_celebrity ON celebrity_works(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_works_release ON celebrity_works(release_date);
CREATE INDEX IF NOT EXISTS idx_works_iconic ON celebrity_works(is_iconic) WHERE is_iconic = true;
CREATE INDEX IF NOT EXISTS idx_historic_celebrity ON historic_posts(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_historic_event ON historic_posts(event_type, event_year);
CREATE INDEX IF NOT EXISTS idx_historic_slug ON historic_posts(slug_pattern);

-- FUNCTION: Get today's events
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
  SELECT e.id, c.id, c.name_en, c.name_te, e.event_type, e.event_year,
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER - e.event_year,
    e.priority_score, c.popularity_score, c.profile_image
  FROM celebrity_events e
  JOIN celebrities c ON e.celebrity_id = c.id
  WHERE e.event_month = p_month AND e.event_day = p_day
    AND e.is_active = true AND c.is_active = true
  ORDER BY e.priority_score DESC, c.popularity_score DESC;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION: Generate events for celebrity
CREATE OR REPLACE FUNCTION generate_celebrity_events(p_celebrity_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_celebrity RECORD;
  v_count INTEGER := 0;
BEGIN
  SELECT * INTO v_celebrity FROM celebrities WHERE id = p_celebrity_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF v_celebrity.birth_date IS NOT NULL THEN
    INSERT INTO celebrity_events (celebrity_id, event_type, event_month, event_day, event_year, priority_score)
    VALUES (p_celebrity_id, 'birthday',
      EXTRACT(MONTH FROM v_celebrity.birth_date)::INTEGER,
      EXTRACT(DAY FROM v_celebrity.birth_date)::INTEGER,
      EXTRACT(YEAR FROM v_celebrity.birth_date)::INTEGER,
      CASE WHEN v_celebrity.popularity_score > 80 THEN 90
           WHEN v_celebrity.popularity_score > 50 THEN 70 ELSE 50 END
    ) ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END IF;

  IF v_celebrity.death_date IS NOT NULL THEN
    INSERT INTO celebrity_events (celebrity_id, event_type, event_month, event_day, event_year, priority_score)
    VALUES (p_celebrity_id, 'death_anniversary',
      EXTRACT(MONTH FROM v_celebrity.death_date)::INTEGER,
      EXTRACT(DAY FROM v_celebrity.death_date)::INTEGER,
      EXTRACT(YEAR FROM v_celebrity.death_date)::INTEGER,
      CASE WHEN v_celebrity.popularity_score > 80 THEN 85
           WHEN v_celebrity.popularity_score > 50 THEN 65 ELSE 45 END
    ) ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END IF;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: Update timestamp
CREATE OR REPLACE FUNCTION update_celebrity_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_celebrities_updated_at ON celebrities;
CREATE TRIGGER trigger_celebrities_updated_at
  BEFORE UPDATE ON celebrities FOR EACH ROW
  EXECUTE FUNCTION update_celebrity_updated_at();

DROP TRIGGER IF EXISTS trigger_historic_posts_updated_at ON historic_posts;
CREATE TRIGGER trigger_historic_posts_updated_at
  BEFORE UPDATE ON historic_posts FOR EACH ROW
  EXECUTE FUNCTION update_celebrity_updated_at();




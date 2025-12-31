-- ============================================================
-- SIMPLE SEED DATA - Works with existing tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- First, let's check what tables exist and create categories if needed
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_te TEXT,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraints if they don't exist (will fail silently if they do)
DO $$ BEGIN
  ALTER TABLE categories ADD CONSTRAINT categories_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE categories ADD CONSTRAINT categories_name_key UNIQUE (name);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Insert categories
INSERT INTO categories (name, name_te, slug, description, icon, is_active, sort_order)
SELECT 'gossip', 'గాసిప్', 'gossip', 'Telugu Celebrity Gossip', '💫', true, 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'gossip');

INSERT INTO categories (name, name_te, slug, description, icon, is_active, sort_order)
SELECT 'sports', 'స్పోర్ట్స్', 'sports', 'Cricket & Sports News', '🏏', true, 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'sports');

INSERT INTO categories (name, name_te, slug, description, icon, is_active, sort_order)
SELECT 'politics', 'రాజకీయాలు', 'politics', 'Political News', '🏛️', true, 3
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'politics');

INSERT INTO categories (name, name_te, slug, description, icon, is_active, sort_order)
SELECT 'entertainment', 'వినోదం', 'entertainment', 'Entertainment News', '🎬', true, 4
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'entertainment');

INSERT INTO categories (name, name_te, slug, description, icon, is_active, sort_order)
SELECT 'trending', 'ట్రెండింగ్', 'trending', 'Trending Topics', '📈', true, 5
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'trending');

-- Now insert posts (using category_id lookup)
INSERT INTO posts (slug, title, title_te, summary, body_te, category_id, status, image_url, views, created_at)
SELECT
  'prabhas-adipurush-update',
  'Prabhas Adipurush Latest Update',
  'ప్రభాస్ ఆదిపురుష్ తాజా అప్‌డేట్',
  'ప్రభాస్ సినిమా గురించి తాజా వార్తలు',
  'ప్రభాస్ నటిస్తున్న ఆదిపురుష్ సినిమా గురించి తాజా అప్‌డేట్ వచ్చింది.',
  (SELECT id FROM categories WHERE slug = 'gossip' LIMIT 1),
  'published',
  'https://image.tmdb.org/t/p/w500/2CAL2433ZeIihfX1Hb2139CX0pW.jpg',
  150,
  NOW() - INTERVAL '1 day'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'prabhas-adipurush-update');

INSERT INTO posts (slug, title, title_te, summary, body_te, category_id, status, image_url, views, created_at)
SELECT
  'samantha-latest-movie',
  'Samantha New Movie Announcement',
  'సమంత కొత్త సినిమా ప్రకటన',
  'సమంత కొత్త ప్రాజెక్ట్ వార్తలు',
  'సమంత అక్కినేని కొత్త సినిమా గురించి ప్రకటన వచ్చింది.',
  (SELECT id FROM categories WHERE slug = 'gossip' LIMIT 1),
  'published',
  'https://image.tmdb.org/t/p/w500/oNVnv9iq5LmIhJPPLJ4lFANDOqv.jpg',
  200,
  NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'samantha-latest-movie');

INSERT INTO posts (slug, title, title_te, summary, body_te, category_id, status, image_url, views, created_at)
SELECT
  'vijay-deverakonda-wedding',
  'Vijay Deverakonda Marriage Rumors',
  'విజయ్ దేవరకొండ పెళ్లి వార్తలు',
  'విజయ్ దేవరకొండ పెళ్లి గురించి గాసిప్',
  'విజయ్ దేవరకొండ పెళ్లి గురించి చాలా గాసిప్ వార్తలు వస్తున్నాయి.',
  (SELECT id FROM categories WHERE slug = 'gossip' LIMIT 1),
  'published',
  'https://image.tmdb.org/t/p/w500/lxPTIz19GHTuxSp3ArCmKcEaQKW.jpg',
  300,
  NOW() - INTERVAL '3 days'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'vijay-deverakonda-wedding');

-- Sports posts
INSERT INTO posts (slug, title, title_te, summary, body_te, category_id, status, image_url, views, created_at)
SELECT
  'ipl-2024-csk-update',
  'IPL 2024 CSK Team Update',
  'ఐపీఎల్ 2024 సీఎస్‌కే జట్టు అప్‌డేట్',
  'సీఎస్‌కే జట్టు గురించి తాజా వార్తలు',
  'ఐపీఎల్ 2024లో చెన్నై సూపర్ కింగ్స్ జట్టు గురించి తాజా అప్‌డేట్లు.',
  (SELECT id FROM categories WHERE slug = 'sports' LIMIT 1),
  'published',
  'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=500',
  250,
  NOW() - INTERVAL '1 day'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'ipl-2024-csk-update');

INSERT INTO posts (slug, title, title_te, summary, body_te, category_id, status, image_url, views, created_at)
SELECT
  'virat-kohli-record',
  'Virat Kohli Creates New Record',
  'విరాట్ కోహ్లీ కొత్త రికార్డు',
  'కోహ్లీ రికార్డు గురించి వార్తలు',
  'విరాట్ కోహ్లీ మరో కొత్త రికార్డు సృష్టించారు.',
  (SELECT id FROM categories WHERE slug = 'sports' LIMIT 1),
  'published',
  'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=500',
  350,
  NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'virat-kohli-record');

-- Politics posts
INSERT INTO posts (slug, title, title_te, summary, body_te, category_id, status, image_url, views, created_at)
SELECT
  'telangana-cm-announcement',
  'Telangana CM Latest Statement',
  'తెలంగాణ సీఎం తాజా ప్రకటన',
  'తెలంగాణ సీఎం వార్తలు',
  'తెలంగాణ ముఖ్యమంత్రి తాజా ప్రకటన చేశారు.',
  (SELECT id FROM categories WHERE slug = 'politics' LIMIT 1),
  'published',
  'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=500',
  400,
  NOW() - INTERVAL '1 day'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'telangana-cm-announcement');

INSERT INTO posts (slug, title, title_te, summary, body_te, category_id, status, image_url, views, created_at)
SELECT
  'ap-budget-2024',
  'AP Budget 2024 Highlights',
  'ఆంధ్రప్రదేశ్ బడ్జెట్ 2024 హైలైట్స్',
  'AP బడ్జెట్ వార్తలు',
  'ఆంధ్రప్రదేశ్ ప్రభుత్వం 2024 బడ్జెట్ ప్రవేశపెట్టింది.',
  (SELECT id FROM categories WHERE slug = 'politics' LIMIT 1),
  'published',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=500',
  280,
  NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'ap-budget-2024');

-- Celebrities
INSERT INTO celebrities (slug, name_en, name_te, occupation, birth_date, image_url, biography, popularity_score, is_active)
SELECT 'chiranjeevi', 'Chiranjeevi', 'చిరంజీవి', 'actor', '1955-08-22', 'https://image.tmdb.org/t/p/w500/8NhFFIrXoYhXBvFuJwK1lxwlPvW.jpg', 'మెగాస్టార్ చిరంజీవి', 95, true
WHERE NOT EXISTS (SELECT 1 FROM celebrities WHERE slug = 'chiranjeevi');

INSERT INTO celebrities (slug, name_en, name_te, occupation, birth_date, image_url, biography, popularity_score, is_active)
SELECT 'prabhas', 'Prabhas', 'ప్రభాస్', 'actor', '1979-10-23', 'https://image.tmdb.org/t/p/w500/2CAL2433ZeIihfX1Hb2139CX0pW.jpg', 'బాహుబలి ఫేమ్ ప్రభాస్', 92, true
WHERE NOT EXISTS (SELECT 1 FROM celebrities WHERE slug = 'prabhas');

INSERT INTO celebrities (slug, name_en, name_te, occupation, birth_date, image_url, biography, popularity_score, is_active)
SELECT 'mahesh-babu', 'Mahesh Babu', 'మహేష్ బాబు', 'actor', '1975-08-09', 'https://image.tmdb.org/t/p/w500/7AZWDwGBwYGQ0hBxqvdPPtGqcZk.jpg', 'ప్రిన్స్ ఆఫ్ టాలీవుడ్', 90, true
WHERE NOT EXISTS (SELECT 1 FROM celebrities WHERE slug = 'mahesh-babu');

INSERT INTO celebrities (slug, name_en, name_te, occupation, birth_date, image_url, biography, popularity_score, is_active)
SELECT 'allu-arjun', 'Allu Arjun', 'అల్లు అర్జున్', 'actor', '1982-04-08', 'https://image.tmdb.org/t/p/w500/mYvPLG6P7sQuWQJJTEZO6VuqvPB.jpg', 'ఐకాన్ స్టార్ అల్లు అర్జున్', 93, true
WHERE NOT EXISTS (SELECT 1 FROM celebrities WHERE slug = 'allu-arjun');

INSERT INTO celebrities (slug, name_en, name_te, occupation, birth_date, image_url, biography, popularity_score, is_active)
SELECT 'ntr-jr', 'Jr NTR', 'జూ. ఎన్టీఆర్', 'actor', '1983-05-20', 'https://image.tmdb.org/t/p/w500/5XQtLADPVzJoZfNJMQfLhPQC9wU.jpg', 'యంగ్ టైగర్ ఎన్టీఆర్', 91, true
WHERE NOT EXISTS (SELECT 1 FROM celebrities WHERE slug = 'ntr-jr');

INSERT INTO celebrities (slug, name_en, name_te, occupation, birth_date, image_url, biography, popularity_score, is_active)
SELECT 'samantha', 'Samantha Ruth Prabhu', 'సమంత', 'actress', '1987-04-28', 'https://image.tmdb.org/t/p/w500/oNVnv9iq5LmIhJPPLJ4lFANDOqv.jpg', 'టాలీవుడ్ టాప్ హీరోయిన్', 88, true
WHERE NOT EXISTS (SELECT 1 FROM celebrities WHERE slug = 'samantha');

INSERT INTO celebrities (slug, name_en, name_te, occupation, birth_date, image_url, biography, popularity_score, is_active)
SELECT 'rashmika', 'Rashmika Mandanna', 'రష్మిక మందన్న', 'actress', '1996-04-05', 'https://image.tmdb.org/t/p/w500/qGQ2xPnxmApHfHy9N7PrgMKoX8N.jpg', 'నేషనల్ క్రష్', 85, true
WHERE NOT EXISTS (SELECT 1 FROM celebrities WHERE slug = 'rashmika');

-- Movies
INSERT INTO movies (slug, title_en, title_te, release_year, hero, heroine, director, poster_url, genre, verdict, avg_rating, is_published)
SELECT 'pushpa-the-rise', 'Pushpa: The Rise', 'పుష్ప: ది రైజ్', 2021, 'Allu Arjun', 'Rashmika Mandanna', 'Sukumar', 'https://image.tmdb.org/t/p/w500/zwYN0IVs38JlVNvFcfXALLjc3m0.jpg', 'Action', 'Blockbuster', 8.5, true
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE slug = 'pushpa-the-rise');

INSERT INTO movies (slug, title_en, title_te, release_year, hero, heroine, director, poster_url, genre, verdict, avg_rating, is_published)
SELECT 'rrr', 'RRR', 'ఆర్ఆర్ఆర్', 2022, 'Jr NTR, Ram Charan', 'Alia Bhatt', 'S. S. Rajamouli', 'https://image.tmdb.org/t/p/w500/nEufeZlyAOLqO2brrs0yeF1lgXO.jpg', 'Action', 'All Time Blockbuster', 9.0, true
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE slug = 'rrr');

INSERT INTO movies (slug, title_en, title_te, release_year, hero, heroine, director, poster_url, genre, verdict, avg_rating, is_published)
SELECT 'baahubali-2', 'Baahubali 2', 'బాహుబలి 2', 2017, 'Prabhas', 'Anushka Shetty', 'S. S. Rajamouli', 'https://image.tmdb.org/t/p/w500/qfNP7CrZ6vPTOWIvLrVxNf2oCPC.jpg', 'Action', 'All Time Blockbuster', 9.2, true
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE slug = 'baahubali-2');

INSERT INTO movies (slug, title_en, title_te, release_year, hero, heroine, director, poster_url, genre, verdict, avg_rating, is_published)
SELECT 'arjun-reddy', 'Arjun Reddy', 'అర్జున్ రెడ్డి', 2017, 'Vijay Deverakonda', 'Shalini Pandey', 'Sandeep Vanga', 'https://image.tmdb.org/t/p/w500/lxPTIz19GHTuxSp3ArCmKcEaQKW.jpg', 'Drama', 'Super Hit', 8.4, true
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE slug = 'arjun-reddy');

-- Stories
INSERT INTO stories (title_te, title_en, summary_te, body_te, category, status, reading_time_minutes, view_count)
SELECT 'ప్రేమ ఎప్పుడూ గెలుస్తుంది', 'Love Always Wins', 'ఒక అందమైన ప్రేమ కథ', 'ఇది ఒక అందమైన ప్రేమ కథ. రవి మరియు ప్రియ కాలేజీలో కలిశారు.', 'love', 'published', 5, 100
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title_en = 'Love Always Wins');

INSERT INTO stories (title_te, title_en, summary_te, body_te, category, status, reading_time_minutes, view_count)
SELECT 'విజయం దిశగా', 'Journey to Success', 'ఒక విద్యార్థి విజయ గాథ', 'రాము ఒక పేద కుటుంబం నుండి వచ్చాడు. కానీ చదువు పట్ల ఆసక్తి ఎక్కువ.', 'inspiration', 'published', 10, 200
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title_en = 'Journey to Success');

INSERT INTO stories (title_te, title_en, summary_te, body_te, category, status, reading_time_minutes, view_count)
SELECT 'స్నేహం అమూల్యం', 'Friendship is Priceless', 'నిజమైన స్నేహం గురించి', 'రాజు మరియు శేఖర్ చిన్ననాటి స్నేహితులు.', 'friendship', 'published', 4, 60
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title_en = 'Friendship is Priceless');

-- Success message
SELECT 'Seed data inserted successfully!' as result;




-- ============================================================
-- SEED DATA ONLY - Just inserts, no table modifications
-- Run this in Supabase SQL Editor
-- ============================================================

-- Insert categories (skip if exists)
INSERT INTO categories (name, name_te, slug, description, icon, is_active, sort_order)
SELECT 'gossip', 'గాసిప్', 'gossip', 'Celebrity Gossip', '💫', true, 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'gossip');

INSERT INTO categories (name, name_te, slug, description, icon, is_active, sort_order)
SELECT 'sports', 'స్పోర్ట్స్', 'sports', 'Sports News', '🏏', true, 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'sports');

INSERT INTO categories (name, name_te, slug, description, icon, is_active, sort_order)
SELECT 'politics', 'రాజకీయాలు', 'politics', 'Political News', '🏛️', true, 3
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'politics');

INSERT INTO categories (name, name_te, slug, description, icon, is_active, sort_order)
SELECT 'entertainment', 'వినోదం', 'entertainment', 'Entertainment', '🎬', true, 4
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'entertainment');

INSERT INTO categories (name, name_te, slug, description, icon, is_active, sort_order)
SELECT 'trending', 'ట్రెండింగ్', 'trending', 'Trending', '📈', true, 5
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'trending');

-- Insert gossip posts
INSERT INTO posts (slug, title, title_te, summary, body_te, category_id, status, image_url, views, created_at)
SELECT 'prabhas-update-1', 'Prabhas Adipurush Update', 'ప్రభాస్ ఆదిపురుష్ అప్‌డేట్', 'ప్రభాస్ సినిమా వార్తలు', 'ప్రభాస్ నటిస్తున్న ఆదిపురుష్ సినిమా గురించి తాజా వార్తలు వచ్చాయి.', c.id, 'published', 'https://image.tmdb.org/t/p/w500/2CAL2433ZeIihfX1Hb2139CX0pW.jpg', 150, NOW() - INTERVAL '1 day'
FROM categories c WHERE c.slug = 'gossip' AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'prabhas-update-1');

INSERT INTO posts (slug, title, title_te, summary, body_te, category_id, status, image_url, views, created_at)
SELECT 'samantha-movie-1', 'Samantha New Movie', 'సమంత కొత్త సినిమా', 'సమంత ప్రాజెక్ట్ వార్తలు', 'సమంత కొత్త సినిమా గురించి ప్రకటన వచ్చింది.', c.id, 'published', 'https://image.tmdb.org/t/p/w500/oNVnv9iq5LmIhJPPLJ4lFANDOqv.jpg', 200, NOW() - INTERVAL '2 days'
FROM categories c WHERE c.slug = 'gossip' AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'samantha-movie-1');

INSERT INTO posts (slug, title, title_te, summary, body_te, category_id, status, image_url, views, created_at)
SELECT 'vijay-wedding-1', 'Vijay Deverakonda Marriage', 'విజయ్ దేవరకొండ పెళ్లి', 'విజయ్ గాసిప్ వార్తలు', 'విజయ్ దేవరకొండ పెళ్లి గురించి వార్తలు.', c.id, 'published', 'https://image.tmdb.org/t/p/w500/lxPTIz19GHTuxSp3ArCmKcEaQKW.jpg', 300, NOW() - INTERVAL '3 days'
FROM categories c WHERE c.slug = 'gossip' AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'vijay-wedding-1');

-- Insert sports posts
INSERT INTO posts (slug, title, title_te, summary, body_te, category_id, status, image_url, views, created_at)
SELECT 'ipl-csk-update-1', 'IPL CSK Team Update', 'ఐపీఎల్ సీఎస్‌కే అప్‌డేట్', 'సీఎస్‌కే జట్టు వార్తలు', 'చెన్నై సూపర్ కింగ్స్ జట్టు గురించి తాజా అప్‌డేట్లు.', c.id, 'published', 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=500', 250, NOW() - INTERVAL '1 day'
FROM categories c WHERE c.slug = 'sports' AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'ipl-csk-update-1');

INSERT INTO posts (slug, title, title_te, summary, body_te, category_id, status, image_url, views, created_at)
SELECT 'kohli-record-1', 'Virat Kohli New Record', 'కోహ్లీ కొత్త రికార్డు', 'కోహ్లీ రికార్డు వార్తలు', 'విరాట్ కోహ్లీ మరో కొత్త రికార్డు సృష్టించారు.', c.id, 'published', 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=500', 350, NOW() - INTERVAL '2 days'
FROM categories c WHERE c.slug = 'sports' AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'kohli-record-1');

INSERT INTO posts (slug, title, title_te, summary, body_te, category_id, status, image_url, views, created_at)
SELECT 'srh-auction-1', 'SRH Auction Strategy', 'SRH వేలం వ్యూహం', 'SRH వేలం వార్తలు', 'సన్‌రైజర్స్ హైదరాబాద్ వేలం వ్యూహం.', c.id, 'published', 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=500', 180, NOW() - INTERVAL '3 days'
FROM categories c WHERE c.slug = 'sports' AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'srh-auction-1');

-- Insert politics posts
INSERT INTO posts (slug, title, title_te, summary, body_te, category_id, status, image_url, views, created_at)
SELECT 'telangana-cm-1', 'Telangana CM Statement', 'తెలంగాణ సీఎం ప్రకటన', 'తెలంగాణ సీఎం వార్తలు', 'తెలంగాణ ముఖ్యమంత్రి తాజా ప్రకటన చేశారు.', c.id, 'published', 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=500', 400, NOW() - INTERVAL '1 day'
FROM categories c WHERE c.slug = 'politics' AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'telangana-cm-1');

INSERT INTO posts (slug, title, title_te, summary, body_te, category_id, status, image_url, views, created_at)
SELECT 'ap-budget-1', 'AP Budget 2024', 'AP బడ్జెట్ 2024', 'AP బడ్జెట్ వార్తలు', 'ఆంధ్రప్రదేశ్ బడ్జెట్ ప్రవేశపెట్టబడింది.', c.id, 'published', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=500', 280, NOW() - INTERVAL '2 days'
FROM categories c WHERE c.slug = 'politics' AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'ap-budget-1');

INSERT INTO posts (slug, title, title_te, summary, body_te, category_id, status, image_url, views, created_at)
SELECT 'local-elections-1', 'Local Elections Update', 'స్థానిక ఎన్నికల అప్‌డేట్', 'ఎన్నికల వార్తలు', 'స్థానిక సంస్థల ఎన్నికల అప్‌డేట్లు.', c.id, 'published', 'https://images.unsplash.com/photo-1494172961521-33799ddd43a5?w=500', 150, NOW() - INTERVAL '3 days'
FROM categories c WHERE c.slug = 'politics' AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = 'local-elections-1');

-- Insert celebrities
INSERT INTO celebrities (slug, name_en, name_te, occupation, image_url, biography, popularity_score, is_active)
SELECT 'chiranjeevi', 'Chiranjeevi', 'చిరంజీవి', 'actor', 'https://image.tmdb.org/t/p/w500/8NhFFIrXoYhXBvFuJwK1lxwlPvW.jpg', 'మెగాస్టార్ చిరంజీవి', 95, true
WHERE NOT EXISTS (SELECT 1 FROM celebrities WHERE slug = 'chiranjeevi');

INSERT INTO celebrities (slug, name_en, name_te, occupation, image_url, biography, popularity_score, is_active)
SELECT 'prabhas', 'Prabhas', 'ప్రభాస్', 'actor', 'https://image.tmdb.org/t/p/w500/2CAL2433ZeIihfX1Hb2139CX0pW.jpg', 'బాహుబలి ఫేమ్ ప్రభాస్', 92, true
WHERE NOT EXISTS (SELECT 1 FROM celebrities WHERE slug = 'prabhas');

INSERT INTO celebrities (slug, name_en, name_te, occupation, image_url, biography, popularity_score, is_active)
SELECT 'mahesh-babu', 'Mahesh Babu', 'మహేష్ బాబు', 'actor', 'https://image.tmdb.org/t/p/w500/7AZWDwGBwYGQ0hBxqvdPPtGqcZk.jpg', 'ప్రిన్స్ ఆఫ్ టాలీవుడ్', 90, true
WHERE NOT EXISTS (SELECT 1 FROM celebrities WHERE slug = 'mahesh-babu');

INSERT INTO celebrities (slug, name_en, name_te, occupation, image_url, biography, popularity_score, is_active)
SELECT 'allu-arjun', 'Allu Arjun', 'అల్లు అర్జున్', 'actor', 'https://image.tmdb.org/t/p/w500/mYvPLG6P7sQuWQJJTEZO6VuqvPB.jpg', 'ఐకాన్ స్టార్ అల్లు అర్జున్', 93, true
WHERE NOT EXISTS (SELECT 1 FROM celebrities WHERE slug = 'allu-arjun');

INSERT INTO celebrities (slug, name_en, name_te, occupation, image_url, biography, popularity_score, is_active)
SELECT 'ntr-jr', 'Jr NTR', 'జూ. ఎన్టీఆర్', 'actor', 'https://image.tmdb.org/t/p/w500/5XQtLADPVzJoZfNJMQfLhPQC9wU.jpg', 'యంగ్ టైగర్ ఎన్టీఆర్', 91, true
WHERE NOT EXISTS (SELECT 1 FROM celebrities WHERE slug = 'ntr-jr');

INSERT INTO celebrities (slug, name_en, name_te, occupation, image_url, biography, popularity_score, is_active)
SELECT 'samantha', 'Samantha Ruth Prabhu', 'సమంత', 'actress', 'https://image.tmdb.org/t/p/w500/oNVnv9iq5LmIhJPPLJ4lFANDOqv.jpg', 'టాలీవుడ్ టాప్ హీరోయిన్', 88, true
WHERE NOT EXISTS (SELECT 1 FROM celebrities WHERE slug = 'samantha');

INSERT INTO celebrities (slug, name_en, name_te, occupation, image_url, biography, popularity_score, is_active)
SELECT 'rashmika', 'Rashmika Mandanna', 'రష్మిక మందన్న', 'actress', 'https://image.tmdb.org/t/p/w500/qGQ2xPnxmApHfHy9N7PrgMKoX8N.jpg', 'నేషనల్ క్రష్', 85, true
WHERE NOT EXISTS (SELECT 1 FROM celebrities WHERE slug = 'rashmika');

INSERT INTO celebrities (slug, name_en, name_te, occupation, image_url, biography, popularity_score, is_active)
SELECT 'vijay-deverakonda', 'Vijay Deverakonda', 'విజయ్ దేవరకొండ', 'actor', 'https://image.tmdb.org/t/p/w500/lxPTIz19GHTuxSp3ArCmKcEaQKW.jpg', 'రౌడీ స్టార్', 87, true
WHERE NOT EXISTS (SELECT 1 FROM celebrities WHERE slug = 'vijay-deverakonda');

-- Insert movies
INSERT INTO movies (slug, title_en, title_te, release_year, hero, director, poster_url, genre, verdict, avg_rating, is_published)
SELECT 'pushpa-the-rise', 'Pushpa: The Rise', 'పుష్ప: ది రైజ్', 2021, 'Allu Arjun', 'Sukumar', 'https://image.tmdb.org/t/p/w500/zwYN0IVs38JlVNvFcfXALLjc3m0.jpg', 'Action', 'Blockbuster', 8.5, true
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE slug = 'pushpa-the-rise');

INSERT INTO movies (slug, title_en, title_te, release_year, hero, director, poster_url, genre, verdict, avg_rating, is_published)
SELECT 'rrr-movie', 'RRR', 'ఆర్ఆర్ఆర్', 2022, 'Jr NTR', 'S. S. Rajamouli', 'https://image.tmdb.org/t/p/w500/nEufeZlyAOLqO2brrs0yeF1lgXO.jpg', 'Action', 'Blockbuster', 9.0, true
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE slug = 'rrr-movie');

INSERT INTO movies (slug, title_en, title_te, release_year, hero, director, poster_url, genre, verdict, avg_rating, is_published)
SELECT 'baahubali-2-movie', 'Baahubali 2', 'బాహుబలి 2', 2017, 'Prabhas', 'S. S. Rajamouli', 'https://image.tmdb.org/t/p/w500/qfNP7CrZ6vPTOWIvLrVxNf2oCPC.jpg', 'Action', 'Blockbuster', 9.2, true
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE slug = 'baahubali-2-movie');

INSERT INTO movies (slug, title_en, title_te, release_year, hero, director, poster_url, genre, verdict, avg_rating, is_published)
SELECT 'arjun-reddy-movie', 'Arjun Reddy', 'అర్జున్ రెడ్డి', 2017, 'Vijay Deverakonda', 'Sandeep Vanga', 'https://image.tmdb.org/t/p/w500/lxPTIz19GHTuxSp3ArCmKcEaQKW.jpg', 'Drama', 'Super Hit', 8.4, true
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE slug = 'arjun-reddy-movie');

-- Insert stories
INSERT INTO stories (title_te, title_en, summary_te, body_te, category, status, reading_time_minutes, view_count)
SELECT 'ప్రేమ ఎప్పుడూ గెలుస్తుంది', 'Love Always Wins', 'అందమైన ప్రేమ కథ', 'ఇది ఒక అందమైన ప్రేమ కథ.', 'love', 'published', 5, 100
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title_en = 'Love Always Wins');

INSERT INTO stories (title_te, title_en, summary_te, body_te, category, status, reading_time_minutes, view_count)
SELECT 'విజయం దిశగా', 'Journey to Success', 'విద్యార్థి విజయ గాథ', 'రాము ఒక పేద కుటుంబం నుండి వచ్చాడు.', 'inspiration', 'published', 10, 200
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title_en = 'Journey to Success');

INSERT INTO stories (title_te, title_en, summary_te, body_te, category, status, reading_time_minutes, view_count)
SELECT 'స్నేహం అమూల్యం', 'Friendship is Priceless', 'నిజమైన స్నేహం', 'రాజు మరియు శేఖర్ చిన్ననాటి స్నేహితులు.', 'friendship', 'published', 4, 60
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title_en = 'Friendship is Priceless');

INSERT INTO stories (title_te, title_en, summary_te, body_te, category, status, reading_time_minutes, view_count)
SELECT 'అమ్మ ప్రేమ', 'Mothers Love', 'అమ్మ త్యాగం', 'అమ్మ ప్రేమకు పరిమితులు ఉండవు.', 'family', 'published', 7, 150
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title_en = 'Mothers Love');

-- Success
SELECT 'Data seeded successfully!' as result,
  (SELECT COUNT(*) FROM posts WHERE status = 'published') as posts_count,
  (SELECT COUNT(*) FROM celebrities) as celebrities_count,
  (SELECT COUNT(*) FROM movies) as movies_count,
  (SELECT COUNT(*) FROM stories WHERE status = 'published') as stories_count;

-- ============================================================
-- SEED SAMPLE DATA FOR TELUGUVIBES
-- Run this AFTER the main schema is in place
-- ============================================================

-- First, seed the categories
INSERT INTO categories (name, name_te, slug, description, icon, is_active, sort_order)
VALUES
  ('gossip', 'గాసిప్', 'gossip', 'Telugu Celebrity Gossip & News', '💫', true, 1),
  ('sports', 'స్పోర్ట్స్', 'sports', 'Cricket, IPL & Sports News', '🏏', true, 2),
  ('politics', 'రాజకీయాలు', 'politics', 'Telangana & AP Political News', '🏛️', true, 3),
  ('entertainment', 'వినోదం', 'entertainment', 'Movies, TV & Entertainment', '🎬', true, 4),
  ('trending', 'ట్రెండింగ్', 'trending', 'Trending Topics on Social Media', '📈', true, 5)
ON CONFLICT (slug) DO NOTHING;

-- Seed Sample Posts for each category
-- Note: Using subqueries to get category_id
INSERT INTO posts (slug, title, title_te, summary, body_te, category_id, status, image_url, views, created_at)
VALUES
  -- Gossip
  ('prabhas-adipurush-update', 'Prabhas Adipurush Latest Update', 'ప్రభాస్ ఆదిపురుష్ తాజా అప్‌డేట్', 'ప్రభాస్ సినిమా గురించి తాజా వార్తలు', 'ప్రభాస్ నటిస్తున్న ఆదిపురుష్ సినిమా గురించి తాజా అప్‌డేట్ వచ్చింది. ఈ సినిమా త్వరలో విడుదల అవుతుంది అని టాక్. దర్శకుడు ఓం రాత్ ఈ సినిమాను చాలా గొప్పగా తీస్తున్నారు. ప్రభాస్ అద్భుతమైన లుక్‌లో కనిపిస్తారు.', (SELECT id FROM categories WHERE slug = 'gossip'), 'published', 'https://image.tmdb.org/t/p/w500/2CAL2433ZeIihfX1Hb2139CX0pW.jpg', 150, NOW() - INTERVAL '1 day'),

  ('samantha-latest-movie', 'Samantha New Movie Announcement', 'సమంత కొత్త సినిమా ప్రకటన', 'సమంత కొత్త ప్రాజెక్ట్ వార్తలు', 'సమంత అక్కినేని కొత్త సినిమా గురించి ప్రకటన వచ్చింది. ఈ సినిమాలో ఆమె చాలా కొత్త పాత్రలో కనిపించనుంది. ఈ సినిమా బాలీవుడ్‌లో కూడా విడుదల అవుతుంది. సమంత అభిమానులకు శుభవార్త!', (SELECT id FROM categories WHERE slug = 'gossip'), 'published', 'https://image.tmdb.org/t/p/w500/oNVnv9iq5LmIhJPPLJ4lFANDOqv.jpg', 200, NOW() - INTERVAL '2 days'),

  ('vijay-deverakonda-wedding', 'Vijay Deverakonda Marriage Rumors', 'విజయ్ దేవరకొండ పెళ్లి వార్తలు', 'విజయ్ దేవరకొండ పెళ్లి గురించి గాసిప్', 'విజయ్ దేవరకొండ పెళ్లి గురించి చాలా గాసిప్ వార్తలు వస్తున్నాయి. అయితే అధికారిక ప్రకటన ఇంకా రాలేదు. విజయ్ ఇప్పుడు చాలా బిజీగా సినిమాలు చేస్తున్నారు.', (SELECT id FROM categories WHERE slug = 'gossip'), 'published', 'https://image.tmdb.org/t/p/w500/lxPTIz19GHTuxSp3ArCmKcEaQKW.jpg', 300, NOW() - INTERVAL '3 days'),

  -- Sports
  ('ipl-2024-csk-update', 'IPL 2024 CSK Team Update', 'ఐపీఎల్ 2024 సీఎస్‌కే జట్టు అప్‌డేట్', 'సీఎస్‌కే జట్టు గురించి తాజా వార్తలు', 'ఐపీఎల్ 2024లో చెన్నై సూపర్ కింగ్స్ జట్టు గురించి తాజా అప్‌డేట్లు. ధోని ఈసారి కూడా ఆడతారా అనే ప్రశ్నలకు సమాధానాలు. జట్టు మెరుగైన ప్రదర్శన కోసం కొత్త ఆటగాళ్లను తీసుకుంది.', (SELECT id FROM categories WHERE slug = 'sports'), 'published', 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=500', 250, NOW() - INTERVAL '1 day'),

  ('virat-kohli-record', 'Virat Kohli Creates New Record', 'విరాట్ కోహ్లీ కొత్త రికార్డు', 'కోహ్లీ రికార్డు గురించి వార్తలు', 'విరాట్ కోహ్లీ మరో కొత్త రికార్డు సృష్టించారు. అంతర్జాతీయ క్రికెట్‌లో ఆయన అద్భుతమైన ప్రదర్శన కొనసాగిస్తున్నారు. అభిమానులు సంతోషంలో మునిగిపోయారు.', (SELECT id FROM categories WHERE slug = 'sports'), 'published', 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=500', 350, NOW() - INTERVAL '2 days'),

  ('sunrisers-hyderabad-auction', 'SRH Auction Strategy 2024', 'సన్‌రైజర్స్ హైదరాబాద్ వేలం వ్యూహం', 'SRH వేలం వార్తలు', 'సన్‌రైజర్స్ హైదరాబాద్ జట్టు ఈ ఏడాది వేలంలో చాలా స్మార్ట్‌గా ఆడింది. కొత్త ఆటగాళ్లను తీసుకున్నారు. హైదరాబాద్ అభిమానులు ఉత్సాహంగా ఎదురు చూస్తున్నారు.', (SELECT id FROM categories WHERE slug = 'sports'), 'published', 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=500', 180, NOW() - INTERVAL '3 days'),

  -- Politics
  ('telangana-cm-announcement', 'Telangana CM Latest Statement', 'తెలంగాణ సీఎం తాజా ప్రకటన', 'తెలంగాణ సీఎం వార్తలు', 'తెలంగాణ ముఖ్యమంత్రి తాజా ప్రకటన చేశారు. రాష్ట్ర అభివృద్ధి గురించి కొత్త పథకాలు ప్రకటించారు. ప్రజలకు మంచి వార్త!', (SELECT id FROM categories WHERE slug = 'politics'), 'published', 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=500', 400, NOW() - INTERVAL '1 day'),

  ('ap-budget-2024', 'AP Budget 2024 Highlights', 'ఆంధ్రప్రదేశ్ బడ్జెట్ 2024 హైలైట్స్', 'AP బడ్జెట్ వార్తలు', 'ఆంధ్రప్రదేశ్ ప్రభుత్వం 2024 బడ్జెట్ ప్రవేశపెట్టింది. వివిధ రంగాలకు కేటాయింపులు ప్రకటించారు. వ్యవసాయం, విద్య, ఆరోగ్యానికి ప్రాధాన్యత ఇచ్చారు.', (SELECT id FROM categories WHERE slug = 'politics'), 'published', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=500', 280, NOW() - INTERVAL '2 days'),

  ('local-elections-update', 'Local Body Elections Update', 'స్థానిక సంస్థల ఎన్నికల అప్‌డేట్', 'ఎన్నికల వార్తలు', 'స్థానిక సంస్థల ఎన్నికలకు సంబంధించిన తాజా అప్‌డేట్లు. ఓటింగ్ తేదీలు, అభ్యర్థుల వివరాలు. ప్రజలు ఉత్సాహంగా ఎదురు చూస్తున్నారు.', (SELECT id FROM categories WHERE slug = 'politics'), 'published', 'https://images.unsplash.com/photo-1494172961521-33799ddd43a5?w=500', 150, NOW() - INTERVAL '3 days')
ON CONFLICT (slug) DO NOTHING;

-- Seed Sample Celebrities
INSERT INTO celebrities (slug, name_en, name_te, occupation, birth_date, image_url, biography, popularity_score, is_active)
VALUES
  ('chiranjeevi', 'Chiranjeevi', 'చిరంజీవి', 'actor', '1955-08-22', 'https://image.tmdb.org/t/p/w500/8NhFFIrXoYhXBvFuJwK1lxwlPvW.jpg', 'మెగాస్టార్ చిరంజీవి తెలుగు సినిమా దిగ్గజం. 150+ సినిమాలు చేశారు.', 95, true),
  ('prabhas', 'Prabhas', 'ప్రభాస్', 'actor', '1979-10-23', 'https://image.tmdb.org/t/p/w500/2CAL2433ZeIihfX1Hb2139CX0pW.jpg', 'బాహుబలి ఫేమ్ ప్రభాస్ పాన్ ఇండియా స్టార్.', 92, true),
  ('mahesh-babu', 'Mahesh Babu', 'మహేష్ బాబు', 'actor', '1975-08-09', 'https://image.tmdb.org/t/p/w500/7AZWDwGBwYGQ0hBxqvdPPtGqcZk.jpg', 'ప్రిన్స్ ఆఫ్ టాలీవుడ్ మహేష్ బాబు.', 90, true),
  ('allu-arjun', 'Allu Arjun', 'అల్లు అర్జున్', 'actor', '1982-04-08', 'https://image.tmdb.org/t/p/w500/mYvPLG6P7sQuWQJJTEZO6VuqvPB.jpg', 'ఐకాన్ స్టార్ అల్లు అర్జున్, పుష్ప ఫేమ్.', 93, true),
  ('ntr-jr', 'Jr NTR', 'జూ. ఎన్టీఆర్', 'actor', '1983-05-20', 'https://image.tmdb.org/t/p/w500/5XQtLADPVzJoZfNJMQfLhPQC9wU.jpg', 'యంగ్ టైగర్ ఎన్టీఆర్, RRR ఫేమ్.', 91, true),
  ('samantha', 'Samantha Ruth Prabhu', 'సమంత', 'actress', '1987-04-28', 'https://image.tmdb.org/t/p/w500/oNVnv9iq5LmIhJPPLJ4lFANDOqv.jpg', 'టాలీవుడ్ టాప్ హీరోయిన్ సమంత.', 88, true),
  ('rashmika', 'Rashmika Mandanna', 'రష్మిక మందన్న', 'actress', '1996-04-05', 'https://image.tmdb.org/t/p/w500/qGQ2xPnxmApHfHy9N7PrgMKoX8N.jpg', 'నేషనల్ క్రష్ రష్మిక మందన్న.', 85, true),
  ('ss-rajamouli', 'S. S. Rajamouli', 'ఎస్.ఎస్. రాజమౌళి', 'director', '1973-10-10', 'https://image.tmdb.org/t/p/w500/9dXDe9nRGjvIKtNKQD0pZbYhYfT.jpg', 'బాహుబలి, RRR దర్శకుడు రాజమౌళి.', 90, true)
ON CONFLICT (slug) DO NOTHING;

-- Seed Sample Movies
INSERT INTO movies (slug, title_en, title_te, release_year, hero, heroine, director, poster_url, genre, verdict, avg_rating, is_published)
VALUES
  ('pushpa-the-rise', 'Pushpa: The Rise', 'పుష్ప: ది రైజ్', 2021, 'Allu Arjun', 'Rashmika Mandanna', 'Sukumar', 'https://image.tmdb.org/t/p/w500/zwYN0IVs38JlVNvFcfXALLjc3m0.jpg', 'Action', 'Blockbuster', 8.5, true),
  ('rrr', 'RRR', 'ఆర్ఆర్ఆర్', 2022, 'Jr NTR, Ram Charan', 'Alia Bhatt', 'S. S. Rajamouli', 'https://image.tmdb.org/t/p/w500/nEufeZlyAOLqO2brrs0yeF1lgXO.jpg', 'Action', 'All Time Blockbuster', 9.0, true),
  ('baahubali-2', 'Baahubali 2: The Conclusion', 'బాహుబలి 2: ది కన్‌క్లూజన్', 2017, 'Prabhas', 'Anushka Shetty', 'S. S. Rajamouli', 'https://image.tmdb.org/t/p/w500/qfNP7CrZ6vPTOWIvLrVxNf2oCPC.jpg', 'Action', 'All Time Blockbuster', 9.2, true),
  ('ala-vaikunthapurramuloo', 'Ala Vaikunthapurramuloo', 'అల వైకుంఠపురములో', 2020, 'Allu Arjun', 'Pooja Hegde', 'Trivikram Srinivas', 'https://image.tmdb.org/t/p/w500/7hnGiuJgW56TLlCsUQxT7d3rKl4.jpg', 'Action Comedy', 'Blockbuster', 8.2, true),
  ('sarileru-neekevvaru', 'Sarileru Neekevvaru', 'సరిలేరు నీకెవ్వరు', 2020, 'Mahesh Babu', 'Rashmika Mandanna', 'Anil Ravipudi', 'https://image.tmdb.org/t/p/w500/8HwjhzxJKIeAb6cXqfPaAYDrBlB.jpg', 'Action', 'Blockbuster', 7.8, true),
  ('sye-raa', 'Sye Raa Narasimha Reddy', 'సైరా నరసింహారెడ్డి', 2019, 'Chiranjeevi', 'Nayanthara', 'Surender Reddy', 'https://image.tmdb.org/t/p/w500/8cHqbG1xY5Z7yTbP8oYpNMKmqKq.jpg', 'Historical', 'Hit', 7.5, true),
  ('arjun-reddy', 'Arjun Reddy', 'అర్జున్ రెడ్డి', 2017, 'Vijay Deverakonda', 'Shalini Pandey', 'Sandeep Vanga', 'https://image.tmdb.org/t/p/w500/lxPTIz19GHTuxSp3ArCmKcEaQKW.jpg', 'Drama', 'Super Hit', 8.4, true),
  ('geetha-govindam', 'Geetha Govindam', 'గీత గోవిందం', 2018, 'Vijay Deverakonda', 'Rashmika Mandanna', 'Parasuram', 'https://image.tmdb.org/t/p/w500/ynGkl5qXMZVz3jU5fXJCfCYjAeW.jpg', 'Romantic Comedy', 'Blockbuster', 8.0, true)
ON CONFLICT (slug) DO NOTHING;

-- Seed Sample Stories
INSERT INTO stories (title_te, title_en, summary_te, body_te, category, status, reading_time_minutes, view_count)
VALUES
  ('ప్రేమ ఎప్పుడూ గెలుస్తుంది', 'Love Always Wins', 'ఒక అందమైన ప్రేమ కథ', 'ఇది ఒక అందమైన ప్రేమ కథ. రవి మరియు ప్రియ కాలేజీలో కలిశారు. వారి ప్రేమ చాలా ప్రత్యేకమైనది. ఎన్నో అడ్డంకులు ఎదురైనా, వారి ప్రేమ గెలిచింది. చివరికి వారు పెళ్లి చేసుకొని సంతోషంగా ఉన్నారు.', 'love', 'published', 5, 100),
  ('అమ్మ ప్రేమ అనంతం', 'Mothers Infinite Love', 'ఒక అమ్మ త్యాగం గురించి కథ', 'అమ్మ ప్రేమకు పరిమితులు ఉండవు. ఈ కథలో, ఒక అమ్మ తన పిల్లల కోసం ఎంత త్యాగం చేసిందో చూద్దాం. ఆమె కష్టాలు, ఆమె సంతోషం అన్నీ పిల్లల కోసమే.', 'family', 'published', 7, 150),
  ('విజయం దిశగా', 'Journey to Success', 'ఒక విద్యార్థి విజయ గాథ', 'రాము ఒక పేద కుటుంబం నుండి వచ్చాడు. కానీ చదువు పట్ల ఆసక్తి ఎక్కువ. ఎన్నో కష్టాలు పడి IIT లో సీటు సంపాదించాడు. ఇప్పుడు ఒక పెద్ద కంపెనీలో ఉద్యోగం చేస్తున్నాడు.', 'inspiration', 'published', 10, 200),
  ('మిడిల్ క్లాస్ కలలు', 'Middle Class Dreams', 'ఒక సాధారణ కుటుంబం కథ', 'రమేష్ ఒక మిడిల్ క్లాస్ ఉద్యోగి. నెలవారీ జీతంతో కుటుంబాన్ని నడిపిస్తున్నాడు. ఇంటి EMI, పిల్లల ఫీజులు, ఖర్చులు అన్నీ బాలెన్స్ చేసుకుంటూ సంతోషంగా ఉన్నారు.', 'middle_class', 'published', 6, 80),
  ('స్నేహం అమూల్యం', 'Friendship is Priceless', 'నిజమైన స్నేహం గురించి', 'రాజు మరియు శేఖర్ చిన్ననాటి స్నేహితులు. ఎన్నో కష్టాలలో, సుఖాలలో కలిసే ఉన్నారు. వారి స్నేహం ఎప్పటికీ చెరగదు.', 'friendship', 'published', 4, 60)
ON CONFLICT DO NOTHING;

-- Add columns to game_rounds if they don't exist
DO $$
BEGIN
  ALTER TABLE game_rounds ADD COLUMN IF NOT EXISTS question_te TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE game_rounds ADD COLUMN IF NOT EXISTS correct_answer_te TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE game_rounds ADD COLUMN IF NOT EXISTS explanation_te TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE game_rounds ADD COLUMN IF NOT EXISTS enact_word TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE game_rounds ADD COLUMN IF NOT EXISTS enact_word_te TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE game_rounds ADD COLUMN IF NOT EXISTS is_enact_mode BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE game_rounds ADD COLUMN IF NOT EXISTS is_kids_mode BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE game_rounds ADD COLUMN IF NOT EXISTS answer_image TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE game_rounds ADD COLUMN IF NOT EXISTS time_limit_seconds INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Seed some iconic dialogues for games
INSERT INTO iconic_dialogues (dialogue, dialogue_te, movie, actor, year, is_verified)
VALUES
  ('Taggedele!', 'తగ్గేదెలే!', 'Pushpa', 'Allu Arjun', 2021, true),
  ('Mana ooru bangaram', 'మన ఊరు బంగారం!', 'Srimanthudu', 'Mahesh Babu', 2015, true),
  ('Dookudu... Gelupuu!', 'దూకుడు... గెలుపు!', 'Dookudu', 'Mahesh Babu', 2011, true),
  ('Baahubali ki antha balam evaru ichadu?', 'బాహుబలికి అంత బలం ఎవరిచ్చాడు?', 'Baahubali', 'Prabhas', 2015, true),
  ('Naaku konchem crazy undi', 'నాకు కొంచెం క్రేజీ ఉంది', 'Arjun Reddy', 'Vijay Deverakonda', 2017, true),
  ('Ee Nagaram lo evadaina single ga undadam impossible', 'ఈ నగరంలో ఎవడైనా సింగిల్ గా ఉండటం ఇంపాసిబుల్', 'Geetha Govindam', 'Vijay Deverakonda', 2018, true),
  ('Flower kaadhu... fire!', 'ఫ్లవర్ కాదు... ఫైర్!', 'Pushpa', 'Allu Arjun', 2021, true),
  ('Orey! Hello!', 'ఒరే! హలో!', 'Hello', 'Akhil', 2017, true),
  ('Gokul, Gokul... Neeku idea vasthey chaalu', 'గోకుల్, గోకుల్... నీకు ఐడియా వస్తే చాలు', 'Race Gurram', 'Allu Arjun', 2014, true),
  ('I am coming... My future gonna be super', 'ఐ యామ్ కమింగ్... మై ఫ్యూచర్ గోన బి సూపర్', 'Athadu', 'Mahesh Babu', 2005, true)
ON CONFLICT DO NOTHING;

-- Display success
SELECT 'Sample data seeded successfully!' as result;

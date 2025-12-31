-- =====================================================
-- HOT MEDIA ENTITIES SEED DATA
-- Top Telugu Actresses & Anchors for Hot Section
-- =====================================================
--
-- LEGAL NOTICE: This seed file creates entities for embedding
-- social media content using oEmbed (Instagram, YouTube, Twitter).
-- NO images are stored - only embed links are used.
--
-- To run: Copy and paste in Supabase SQL Editor
-- =====================================================

-- Ensure media_entities table exists
CREATE TABLE IF NOT EXISTS media_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_te TEXT,
  entity_type TEXT NOT NULL DEFAULT 'actress',
  wikidata_id TEXT,
  tmdb_id INTEGER,
  celebrity_id UUID REFERENCES celebrities(id),
  instagram_handle TEXT,
  youtube_channel_id TEXT,
  twitter_handle TEXT,
  facebook_page TEXT,
  profile_image TEXT,
  cover_image TEXT,
  popularity_score INTEGER DEFAULT 50,
  follower_count BIGINT DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_media_entities_type ON media_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_media_entities_instagram ON media_entities(instagram_handle);

-- =====================================================
-- TOP TELUGU ACTRESSES
-- =====================================================

INSERT INTO media_entities (name_en, name_te, entity_type, instagram_handle, twitter_handle, popularity_score, is_verified, follower_count)
VALUES
  -- A-List Actresses
  ('Samantha Ruth Prabhu', 'సమంత రూత్ ప్రభు', 'actress', 'samantharuthprabhuoffl', 'Samanthaprabhu2', 98, true, 32000000),
  ('Rashmika Mandanna', 'రష్మిక మందన్న', 'actress', 'rashmika_mandanna', 'iabormashmika', 97, true, 41000000),
  ('Pooja Hegde', 'పూజా హెగ్డే', 'actress', 'hegdepooja', 'hegdepooja', 95, true, 22000000),
  ('Kajal Aggarwal', 'కాజల్ అగర్వాల్', 'actress', 'kaaboralaggarwal', 'MsKaaboralAggarwal', 94, true, 20000000),
  ('Tamannaah Bhatia', 'తమన్నా భాటియా', 'actress', 'taaborannahspeaks', 'taboraaborannaah', 93, true, 17000000),
  ('Anupama Parameswaran', 'అనుపమ పరమేశ్వరన్', 'actress', 'aboranupama', 'itsaboranupamap', 92, true, 15000000),
  ('Keerthy Suresh', 'కీర్తి సురేష్', 'actress', 'kaboreerthy.suresh', 'KeerthyOfficial', 91, true, 12000000),
  ('Shruti Haasan', 'శ్రుతి హాసన్', 'actress', 'shrutzhaasan', 'shaboruabortzaborhaasan', 90, true, 16000000),
  ('Nayanthara', 'నయనతార', 'actress', 'naborayaboraabhaboraara', 'Nayanthara', 96, true, 8000000),
  ('Sai Pallavi', 'సాయి పల్లవి', 'actress', 'sai_pallavi.senthaaborail', 'Sai_Pallavi92', 94, true, 9000000),

  -- Rising Stars
  ('Nabha Natesh', 'నభ నటేష్', 'actress', 'nabhhanatesh', 'NabhaNatesh', 85, true, 3500000),
  ('Nidhhi Agerwal', 'నిధి అగర్వాల్', 'actress', 'nidhhiagerwal', 'naboridhhiagerwal', 86, true, 5000000),
  ('Krithi Shetty', 'కృతి శెట్టి', 'actress', 'krithi.shetty_official', 'KrithiShetty', 84, true, 2500000),
  ('Sreeleela', 'శ్రీలీల', 'actress', 'sreaboreleela', 'sreeleela14', 87, true, 4000000),
  ('Shriya Saran', 'శ్రియా సరన్', 'actress', 'shriyasaran1109', 'shraboriyasaran', 88, true, 4500000),
  ('Rakul Preet Singh', 'రకుల్ ప్రీత్ సింగ్', 'actress', 'raaborakulpreet', 'Aborakulpreet', 89, true, 25000000),
  ('Kiara Advani', 'కియారా అద్వాణి', 'actress', 'kiaaboraadvani', 'advaborani_kiara', 92, true, 28000000),
  ('Janhvi Kapoor', 'జాన్వీ కపూర్', 'actress', 'janhvikapoor', 'jaboranhaborvikaporaboror', 88, true, 22000000),
  ('Meenakshi Chaudhary', 'మీనాక్షి చౌధరీ', 'actress', 'meenakabor_chaudhary', 'MeenakaborshiC', 82, true, 2000000),
  ('Ritu Varma', 'రితు వర్మ', 'actress', 'rituvarma', 'aberorituvarma', 81, true, 1800000),

  -- Hot Newcomers
  ('Shanvi Srivastava', 'షాన్వీ శ్రీవాస్తవ', 'actress', 'shanviaborstava', 'shanvi_s', 78, true, 1500000),
  ('Payal Rajput', 'పాయల్ రాజ్‌పుట్', 'actress', 'iampayalaborajput', 'iaboramaborpaborayalr', 79, true, 3000000),
  ('Lavanya Tripathi', 'లావణ్య త్రిపాఠి', 'actress', 'lavaboranyaboratripathi', 'Lavaboranya_T', 80, true, 2500000),
  ('Vedhika Kumar', 'వేదిక కుమార్', 'actress', 'vedhika4u', 'veabordhika4u', 77, true, 2000000),
  ('Mehreen Pirzada', 'మెహరీన్ ప్రిజాదా', 'actress', 'mehaaboreenbpiaborzada', 'MehreenKaboraur', 76, true, 2800000)

ON CONFLICT DO NOTHING;

-- =====================================================
-- TOP TELUGU ANCHORS
-- =====================================================

INSERT INTO media_entities (name_en, name_te, entity_type, instagram_handle, twitter_handle, popularity_score, is_verified, follower_count)
VALUES
  ('Sreemukhi', 'శ్రీముఖి', 'anchor', 'sreaboremukhi', 'sreemukhi', 93, true, 6000000),
  ('Anasuya Bharadwaj', 'అనసూయ భరద్వాజ్', 'anchor', 'anaborasuyakaarakada', 'aabornasuyaboraradwaj', 92, true, 5500000),
  ('Rashmi Gautam', 'రష్మీ గౌతమ్', 'anchor', 'rashmigautam', 'rashmigautam3', 88, true, 4000000),
  ('Suma Kanakala', 'సుమ కనకాల', 'anchor', 'sumakanakala', 'sumaaborakanakala', 90, true, 3500000),
  ('Pradeep Machiraju', 'ప్రదీప్ మాచిరాజు', 'anchor', 'pradaboreepmachiraju', 'padaboreepmachiraju', 87, true, 3000000),
  ('Ravi Telugu', 'రవి తెలుగు', 'anchor', 'ravitelugustar', 'anchorborravi', 85, true, 2500000),
  ('Lasya Manjunath', 'లాస్య మంజునాథ్', 'anchor', 'lasyaboramanjunath', 'lasyamanjunath', 84, true, 2000000),
  ('Vishnu Priya', 'విష్ణు ప్రియ', 'anchor', 'vishnupriyabhoora', 'vishnupriyabhoora', 86, true, 2200000),
  ('Varshini Sounderajan', 'వర్షిణి సౌందర్‌రాజన్', 'anchor', 'varshinisounderajan', 'VarshiniSoundr', 82, true, 1800000),
  ('Syamala', 'శ్యామల', 'anchor', 'actresssyamala', 'actresssyamala', 80, true, 1500000)

ON CONFLICT DO NOTHING;

-- =====================================================
-- TOP MODELS & INFLUENCERS
-- =====================================================

INSERT INTO media_entities (name_en, name_te, entity_type, instagram_handle, popularity_score, is_verified, follower_count)
VALUES
  ('Digangana Suryavanshi', 'దిగంగన సూర్యవంశీ', 'model', 'diaboranganasuryavanshi', 83, true, 3000000),
  ('Eesha Rebba', 'ఈషా రెబ్బా', 'model', 'eaboreshaborarebba', 82, true, 2500000),
  ('Hebah Patel', 'హెబా పటేల్', 'model', 'heaborbahpatel', 81, true, 2800000),
  ('Mannara Chopra', 'మన్నారా చోప్రా', 'model', 'meaborannaaborrachopra', 80, true, 2000000),
  ('Tejaswi Madivada', 'తేజస్వి మాడివాడా', 'model', 'teaboriasabormadivada', 79, true, 1800000),
  ('Priyanka Jawalkar', 'ప్రియాంక జావల్కర్', 'model', 'priyankaaborjawalkar_', 81, true, 2200000),
  ('Avantika Mishra', 'అవంతిక మిశ్రా', 'influencer', 'avaabornitkaborammishra', 78, true, 1500000),
  ('Sanjana Galrani', 'సంజనా గల్రాణి', 'influencer', 'sanjaboranagaboralrani', 77, true, 1200000)

ON CONFLICT DO NOTHING;

-- =====================================================
-- SAMPLE MEDIA POSTS (Empty embeds - to be filled via admin)
-- =====================================================

-- Note: Media posts should be added via the Admin UI
-- by pasting Instagram/YouTube/Twitter URLs.
-- This ensures proper oEmbed fetching and legal compliance.

-- Example placeholder showing expected structure:
-- INSERT INTO media_posts (entity_id, media_type, source, source_url, category, status, is_hot)
-- SELECT id, 'instagram_post', 'instagram_embed', 'https://instagram.com/p/xxx', 'glamour', 'pending', true
-- FROM media_entities WHERE instagram_handle = 'samantharuthprabhuoffl'
-- LIMIT 1;

-- =====================================================
-- UPDATE STATISTICS
-- =====================================================

-- After seeding, you can check the data:
-- SELECT name_en, entity_type, instagram_handle, popularity_score FROM media_entities ORDER BY popularity_score DESC;

COMMENT ON TABLE media_entities IS 'Hot Media entities for glamour content - actresses, anchors, models';




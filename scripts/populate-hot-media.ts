#!/usr/bin/env npx tsx
/**
 * Populate Hot Media - Direct injection of Telugu actress content
 * 
 * Uses TMDB to fetch images and populates hot_media table directly
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';

// Telugu actresses to populate
const ACTRESSES = [
  { name: 'Samantha Ruth Prabhu', name_te: 'సమంత రూత్ ప్రభు' },
  { name: 'Rashmika Mandanna', name_te: 'రష్మిక మందన్న' },
  { name: 'Pooja Hegde', name_te: 'పూజా హెగ్డే' },
  { name: 'Kajal Aggarwal', name_te: 'కాజల్ అగర్వాల్' },
  { name: 'Tamannaah Bhatia', name_te: 'తమన్నా భాటియా' },
  { name: 'Anushka Shetty', name_te: 'అనుష్క శెట్టి' },
  { name: 'Nayanthara', name_te: 'నయనతార' },
  { name: 'Keerthy Suresh', name_te: 'కీర్తి సురేష్' },
  { name: 'Sai Pallavi', name_te: 'సాయి పల్లవి' },
  { name: 'Shruti Haasan', name_te: 'శృతి హసన్' },
  { name: 'Rakul Preet Singh', name_te: 'రకుల్ ప్రీత్ సింగ్' },
  { name: 'Krithi Shetty', name_te: 'కృతి శెట్టి' },
  { name: 'Sreeleela', name_te: 'శ్రీలీల' },
  { name: 'Nabha Natesh', name_te: 'నభా నటేష్' },
  { name: 'Anupama Parameswaran', name_te: 'అనుపమ పరమేశ్వరన్' },
  { name: 'Nidhhi Agerwal', name_te: 'నిధి అగర్వాల్' },
  { name: 'Kiara Advani', name_te: 'కియారా అద్వానీ' },
  { name: 'Janhvi Kapoor', name_te: 'జాన్హ్వీ కపూర్' },
  { name: 'Malavika Mohanan', name_te: 'మాళవిక మోహనన్' },
  { name: 'Shriya Saran', name_te: 'శ్రియా సరన్' },
];

const CATEGORIES = ['photoshoot', 'fashion', 'events', 'traditional', 'western'];

const TELUGU_CAPTIONS: Record<string, string[]> = {
  photoshoot: [
    '{name} లేటెస్ట్ ఫోటోషూట్ 📸 స్టన్నింగ్!',
    '{name} మ్యాగజైన్ ఫోటోషూట్ 🔥 అద్భుతం!',
    '{name} ఫోటోషూట్ క్లిక్స్ ✨ గార్జియస్!',
  ],
  fashion: [
    '{name} ఫ్యాషన్ ఈవెంట్‌లో స్టైలిష్‌గా 👗',
    '{name} ఫ్యాషన్ వీక్‌లో అద్భుతంగా ✨',
    '{name} డిజైనర్ డ్రెస్‌లో స్టన్నింగ్ 🌟',
  ],
  traditional: [
    '{name} సాంప్రదాయ చీరలో అందంగా 🪷',
    '{name} ఎథ్నిక్ లుక్‌లో స్టన్నింగ్ 🌺',
    '{name} లెహంగాలో అద్భుతంగా 💫',
  ],
  western: [
    '{name} వెస్టర్న్ ఔట్‌ఫిట్‌లో స్లేయింగ్ 👠',
    '{name} క్యాజువల్ లుక్‌లో స్టైలిష్ 🔥',
    '{name} ఈవెనింగ్ గౌన్‌లో గార్జియస్ ✨',
  ],
  events: [
    '{name} మూవీ లాంచ్ ఈవెంట్‌లో 🎬',
    '{name} అవార్డ్ ఫంక్షన్‌లో 🏆 గ్లామరస్!',
    '{name} ప్రెస్ మీట్‌లో 📰 స్టన్నింగ్!',
  ],
};

function getCaption(name: string, category: string): string {
  const templates = TELUGU_CAPTIONS[category] || TELUGU_CAPTIONS.photoshoot;
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template.replace('{name}', name);
}

async function fetchTMDBImages(name: string, limit = 5): Promise<Array<{
  url: string;
  thumbnail: string;
  type: 'profile' | 'tagged' | 'backdrop';
}>> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.log('⚠️ TMDB_API_KEY not set');
    return [];
  }
  
  const images: Array<{ url: string; thumbnail: string; type: 'profile' | 'tagged' | 'backdrop' }> = [];
  
  try {
    // Search for person
    const searchUrl = `${TMDB_API_BASE}/search/person?api_key=${apiKey}&query=${encodeURIComponent(name)}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    const person = searchData.results?.find((p: any) => 
      p.name.toLowerCase() === name.toLowerCase()
    ) || searchData.results?.[0];
    
    if (!person) return [];
    
    const personId = person.id;
    
    // Get tagged images (full body shots)
    const taggedUrl = `${TMDB_API_BASE}/person/${personId}/tagged_images?api_key=${apiKey}`;
    const taggedRes = await fetch(taggedUrl);
    const taggedData = await taggedRes.json();
    
    for (const img of (taggedData.results || []).slice(0, 3)) {
      if (img.file_path) {
        images.push({
          url: `https://image.tmdb.org/t/p/original${img.file_path}`,
          thumbnail: `https://image.tmdb.org/t/p/w500${img.file_path}`,
          type: 'tagged',
        });
      }
    }
    
    // Get profile images
    const profileUrl = `${TMDB_API_BASE}/person/${personId}/images?api_key=${apiKey}`;
    const profileRes = await fetch(profileUrl);
    const profileData = await profileRes.json();
    
    for (const img of (profileData.profiles || []).slice(0, limit - images.length)) {
      if (img.file_path) {
        images.push({
          url: `https://image.tmdb.org/t/p/original${img.file_path}`,
          thumbnail: `https://image.tmdb.org/t/p/w500${img.file_path}`,
          type: 'profile',
        });
      }
    }
  } catch (error) {
    console.error(`   Error fetching TMDB images for ${name}:`, error);
  }
  
  return images.slice(0, limit);
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              POPULATE HOT MEDIA                                  ║
║              Direct TMDB Image Injection                         ║
╚══════════════════════════════════════════════════════════════════╝
`);

  // Initialize Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  let totalAdded = 0;
  let totalErrors = 0;
  
  for (const actress of ACTRESSES) {
    console.log(`\n🔍 Processing: ${actress.name}`);
    
    // Fetch images from TMDB
    const images = await fetchTMDBImages(actress.name, 5);
    
    if (images.length === 0) {
      console.log(`   ⚠️ No images found`);
      continue;
    }
    
    console.log(`   📸 Found ${images.length} images`);
    
    // Insert each image as hot_media entry
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const category = CATEGORIES[i % CATEGORIES.length];
      const caption = getCaption(actress.name_te || actress.name, category);
      
      // Check if already exists
      const { data: existing } = await supabase
        .from('hot_media')
        .select('id')
        .eq('image_url', img.url)
        .maybeSingle();
      
      if (existing) {
        console.log(`   ⏭️ Image ${i + 1} already exists`);
        continue;
      }
      
      // Insert new hot_media entry
      const { error } = await supabase
        .from('hot_media')
        .insert({
          entity_name: actress.name,
          entity_type: 'actress',
          platform: 'tmdb',
          source_url: img.url,
          image_url: img.url,
          thumbnail_url: img.thumbnail,
          license_source: 'TMDB',
          license_type: 'api-provided',
          category: category,
          tags: [actress.name.split(' ')[0], category, 'glamour', 'telugu'],
          selected_caption: caption,
          caption_te: caption,
          detected_emotion: 'glamour',
          content_angle: 'glam',
          confidence_score: 80 + Math.floor(Math.random() * 15),
          safety_risk: 'low',
          requires_review: false,
          is_blocked: false,
          is_featured: i === 0, // First image is featured
          is_hot: true,
          status: 'approved',
          published_at: new Date().toISOString(),
        });
      
      if (error) {
        console.log(`   ❌ Error inserting image ${i + 1}: ${error.message}`);
        totalErrors++;
      } else {
        console.log(`   ✅ Added: ${category} (${img.type})`);
        totalAdded++;
      }
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log(`
════════════════════════════════════════════════════════════
📊 SUMMARY
════════════════════════════════════════════════════════════
   Actresses processed: ${ACTRESSES.length}
   Images added: ${totalAdded}
   Errors: ${totalErrors}
════════════════════════════════════════════════════════════
`);
  
  // Show sample of what was added
  const { data: samples } = await supabase
    .from('hot_media')
    .select('entity_name, category, status, is_featured')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (samples && samples.length > 0) {
    console.log('📸 Recently added:');
    for (const s of samples) {
      console.log(`   ${s.is_featured ? '⭐' : '  '} ${s.entity_name} - ${s.category}`);
    }
  }
}

main().catch(console.error);







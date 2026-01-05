#!/usr/bin/env npx tsx
/**
 * Instagram oEmbed Auto-Fetcher for Hot Section
 * 
 * This script:
 * 1. Takes known Telugu celebrity Instagram post URLs
 * 2. Fetches oEmbed data (no auth required for public posts!)
 * 3. Stores embed HTML in hot_media for display
 * 
 * How it works:
 * - Instagram's oEmbed endpoint: https://api.instagram.com/oembed?url=...
 * - No API key required for public posts
 * - Returns embed HTML, thumbnail, author info
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { fetchInstagramEmbed, createInstagramMediaEntry, TELUGU_CELEBRITY_INSTAGRAM } from '../lib/hot-media/instagram-embed';

// Curated Instagram post URLs for Telugu celebrities
// These are public posts that can be embedded legally
const INSTAGRAM_POSTS: Array<{
  celebrity: string;
  celebrity_te: string;
  url: string;
  category: 'photoshoot' | 'fashion' | 'traditional' | 'western' | 'events' | 'beach' | 'saree';
}> = [
  // Rashmika Mandanna
  { celebrity: 'Rashmika Mandanna', celebrity_te: 'రష్మిక మందన్న', url: 'https://www.instagram.com/p/C1234567/', category: 'photoshoot' },
  
  // Samantha
  { celebrity: 'Samantha Ruth Prabhu', celebrity_te: 'సమంత రూత్ ప్రభు', url: 'https://www.instagram.com/p/C1234567/', category: 'fashion' },
  
  // Add more curated posts here...
];

// Telugu captions for categories
const TELUGU_CAPTIONS: Record<string, string[]> = {
  photoshoot: [
    '{name} లేటెస్ట్ ఫోటోషూట్ 📸 ఫ్యాన్స్ ఫిదా!',
    '{name} గ్లామరస్ క్లిక్స్ 🔥 వైరల్!',
    '{name} స్టన్నింగ్ ఫోటోస్ ✨ అద్భుతం!',
  ],
  fashion: [
    '{name} ఫ్యాషన్ గేమ్ స్ట్రాంగ్ 👗',
    '{name} స్టైల్ క్వీన్ 🔥',
    '{name} డిజైనర్ లుక్‌లో గ్లామరస్ ✨',
  ],
  traditional: [
    '{name} చీరలో అందంగా 🪷',
    '{name} సంప్రదాయ వేషంలో అద్భుతం ✨',
    '{name} ఎథ్నిక్ బ్యూటీ 🔥',
  ],
  western: [
    '{name} వెస్టర్న్ లుక్‌లో హాట్ 👠',
    '{name} బోల్డ్ & బ్యూటిఫుల్ 🔥',
    '{name} మోడ్రన్ గ్లామ్ ✨',
  ],
  events: [
    '{name} ఈవెంట్‌లో గ్లామరస్ 🎬',
    '{name} రెడ్ కార్పెట్ లుక్ 🏆',
    '{name} ప్రీమియర్‌లో స్టన్నింగ్ ⭐',
  ],
  beach: [
    '{name} బీచ్ వైబ్స్ 🏖️',
    '{name} వెకేషన్ మోడ్ ☀️',
    '{name} సమ్మర్ లుక్ 🌴',
  ],
  saree: [
    '{name} చీర అందం 🥻',
    '{name} సిల్క్ సారీలో అద్భుతం 🪷',
    '{name} ట్రెడిషనల్ గ్లామ్ ✨',
  ],
};

function getCaption(name: string, category: string): string {
  const templates = TELUGU_CAPTIONS[category] || TELUGU_CAPTIONS.photoshoot;
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template.replace('{name}', name);
}

async function fetchAndStoreInstagramEmbed(
  supabase: ReturnType<typeof createClient>,
  post: typeof INSTAGRAM_POSTS[0],
  dryRun = false
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch oEmbed data
    const embedInfo = await fetchInstagramEmbed(post.url);
    
    if (!embedInfo.isValid) {
      return { success: false, error: embedInfo.error || 'Invalid embed' };
    }

    const caption = getCaption(post.celebrity_te, post.category);

    if (dryRun) {
      console.log(`   [DRY] Would add: ${post.celebrity} - ${post.category}`);
      console.log(`         Thumbnail: ${embedInfo.thumbnailUrl ? '✅' : '❌ (fallback embed)'}`);
      return { success: true };
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('hot_media')
      .select('id')
      .eq('source_url', embedInfo.postUrl)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Duplicate' };
    }

    // Insert into hot_media
    const { error } = await supabase
      .from('hot_media')
      .insert({
        entity_name: post.celebrity,
        entity_type: 'actress',
        platform: 'instagram',
        source_url: embedInfo.postUrl,
        embed_url: embedInfo.postUrl,
        embed_html: embedInfo.embedHtml,
        image_url: embedInfo.thumbnailUrl || null,
        thumbnail_url: embedInfo.thumbnailUrl || null,
        license_source: 'Instagram oEmbed',
        license_type: 'embed',
        category: post.category,
        content_type: 'embed',
        tags: [
          post.celebrity.split(' ')[0],
          'Instagram',
          'Telugu',
          post.category,
        ],
        selected_caption: caption,
        caption_te: caption,
        detected_emotion: 'glamour',
        content_angle: 'glam',
        confidence_score: 95,
        safety_risk: 'low',
        requires_review: false,
        is_blocked: false,
        is_featured: true,
        is_hot: true,
        trending_score: 90 + Math.random() * 10,
        status: 'approved',
        published_at: new Date().toISOString(),
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Discover latest posts from known handles
 * Note: This generates embed-ready URLs that work with Instagram's embed.js
 */
async function generateEmbedUrlsFromHandles(): Promise<typeof INSTAGRAM_POSTS> {
  const posts: typeof INSTAGRAM_POSTS = [];
  
  // For each known handle, we can generate embed-friendly links
  // The actual posts need to be curated manually or via official API
  for (const [celebrity, handle] of Object.entries(TELUGU_CELEBRITY_INSTAGRAM)) {
    // Generate profile embed link (works without specific post)
    const profileUrl = `https://www.instagram.com/${handle}/`;
    
    // Note: For actual posts, you'd need to:
    // 1. Use Instagram Basic Display API (with auth)
    // 2. Or curate posts manually
    // 3. Or use the admin UI to add post URLs
    
    console.log(`📱 ${celebrity}: @${handle}`);
  }
  
  return posts;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry');
  const showHandles = args.includes('--handles');
  const testOembed = args.includes('--test');

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║       INSTAGRAM OEMBED FETCHER FOR HOT SECTION                   ║
║       Legal embeds only - No scraping                            ║
╚══════════════════════════════════════════════════════════════════╝
`);

  if (showHandles) {
    console.log('📱 Known Telugu Celebrity Instagram Handles:\n');
    for (const [name, handle] of Object.entries(TELUGU_CELEBRITY_INSTAGRAM)) {
      console.log(`   ${name.padEnd(25)} @${handle}`);
    }
    console.log('\n💡 Use these handles to find glamour posts on Instagram.');
    console.log('   Then add post URLs to the INSTAGRAM_POSTS array above.');
    return;
  }

  if (testOembed) {
    console.log('🧪 Testing Instagram oEmbed API...\n');
    
    // Test with a sample post (replace with a real public post)
    const testUrl = 'https://www.instagram.com/p/CxM0WYcPZ-p/';
    console.log(`   Testing URL: ${testUrl}`);
    
    const result = await fetchInstagramEmbed(testUrl);
    console.log(`   Valid: ${result.isValid}`);
    console.log(`   Author: ${result.authorName || 'N/A'}`);
    console.log(`   Thumbnail: ${result.thumbnailUrl ? 'Yes' : 'No (fallback mode)'}`);
    console.log(`   Error: ${result.error || 'None'}`);
    
    if (result.embedHtml) {
      console.log(`\n   Embed HTML preview (first 200 chars):`);
      console.log(`   ${result.embedHtml.substring(0, 200)}...`);
    }
    return;
  }

  // Initialize Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(dryRun ? '🔍 DRY RUN MODE\n' : '🚀 LIVE MODE\n');

  if (INSTAGRAM_POSTS.length === 0) {
    console.log('⚠️  No Instagram posts configured.');
    console.log('\n📝 To add Instagram embeds:');
    console.log('   1. Run: pnpm instagram:handles - to see known handles');
    console.log('   2. Visit Instagram and find glamour posts from these celebrities');
    console.log('   3. Copy post URLs and add them to INSTAGRAM_POSTS array in this script');
    console.log('   4. Run: pnpm instagram:fetch - to fetch and store embeds');
    console.log('\n   OR use the Admin UI at /admin/hot-media to add posts individually.');
    return;
  }

  let added = 0;
  let errors = 0;

  for (const post of INSTAGRAM_POSTS) {
    console.log(`📸 ${post.celebrity} (${post.category})`);
    
    const result = await fetchAndStoreInstagramEmbed(supabase, post, dryRun);
    
    if (result.success) {
      added++;
      console.log(`   ✅ ${dryRun ? 'Would add' : 'Added'}`);
    } else {
      errors++;
      console.log(`   ❌ ${result.error}`);
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`
════════════════════════════════════════════════════════════
📊 INSTAGRAM EMBED FETCH COMPLETE
════════════════════════════════════════════════════════════
   ${dryRun ? 'Would add' : 'Added'}: ${added}
   Errors: ${errors}
════════════════════════════════════════════════════════════
`);
}

main().catch(console.error);







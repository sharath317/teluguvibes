/**
 * Seed sample content for all Hot page categories
 * Run with: npx tsx scripts/seed-category-content.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample content for each category with placeholder images
const sampleContent = [
  // ==================== PHOTOSHOOT ====================
  {
    media_type: 'image',
    source: 'official_website',
    source_url: 'https://example.com/samantha-photoshoot',
    image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
    thumbnail_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    title: 'Samantha Ruth Prabhu stunning photoshoot',
    caption: 'Latest glamorous photoshoot of Samantha',
    tags: ['samantha', 'photoshoot', 'tollywood'],
    category: 'photoshoot',
    status: 'approved',
    is_hot: true,
    is_featured: true,
    trending_score: 95,
    viral_source: 'seed_data',
  },
  {
    media_type: 'image',
    source: 'official_website',
    source_url: 'https://example.com/rashmika-photoshoot',
    image_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
    thumbnail_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400',
    title: 'Rashmika Mandanna gorgeous new pics',
    caption: 'Rashmika looking stunning in her latest photoshoot',
    tags: ['rashmika', 'photoshoot', 'tollywood'],
    category: 'photoshoot',
    status: 'approved',
    is_hot: true,
    is_featured: true,
    trending_score: 92,
    viral_source: 'seed_data',
  },
  {
    media_type: 'image',
    source: 'official_website',
    source_url: 'https://example.com/pooja-photoshoot',
    image_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
    thumbnail_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
    title: 'Pooja Hegde sizzling photoshoot',
    caption: 'Pooja Hegde in her latest glamour shoot',
    tags: ['pooja hegde', 'photoshoot', 'tollywood'],
    category: 'photoshoot',
    status: 'approved',
    is_hot: true,
    is_featured: true,
    trending_score: 88,
    viral_source: 'seed_data',
  },

  // ==================== EVENTS ====================
  {
    media_type: 'image',
    source: 'official_website',
    source_url: 'https://example.com/pushpa2-event',
    image_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
    thumbnail_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400',
    title: 'Pushpa 2 Pre-Release Event Highlights',
    caption: 'Grand pre-release event of Pushpa 2 with Allu Arjun',
    tags: ['pushpa2', 'allu arjun', 'event', 'pre-release'],
    category: 'event',
    status: 'approved',
    is_hot: true,
    is_featured: true,
    trending_score: 94,
    viral_source: 'seed_data',
  },
  {
    media_type: 'image',
    source: 'official_website',
    source_url: 'https://example.com/kalki-success-meet',
    image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    thumbnail_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400',
    title: 'Kalki 2898 AD Success Meet',
    caption: 'Prabhas and team celebrate the massive success',
    tags: ['kalki', 'prabhas', 'success meet', 'event'],
    category: 'event',
    status: 'approved',
    is_hot: true,
    trending_score: 86,
    viral_source: 'seed_data',
  },

  // ==================== MOVIE PROMOTIONS ====================
  {
    media_type: 'image',
    source: 'official_website',
    source_url: 'https://example.com/game-changer-poster',
    image_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
    thumbnail_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400',
    title: 'Game Changer Official Teaser - Ram Charan',
    caption: 'Ram Charan powerful teaser for Game Changer',
    tags: ['ram charan', 'game changer', 'teaser', 'movie promotion'],
    category: 'movie_promotion',
    status: 'approved',
    is_hot: true,
    is_featured: true,
    trending_score: 96,
    viral_source: 'seed_data',
  },
  {
    media_type: 'image',
    source: 'official_website',
    source_url: 'https://example.com/devara-poster',
    image_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800',
    thumbnail_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400',
    title: 'Devara Part 1 Official Trailer - NTR',
    caption: 'NTR mass trailer for Devara Part 1',
    tags: ['ntr', 'devara', 'trailer', 'movie promotion'],
    category: 'movie_promotion',
    status: 'approved',
    is_hot: true,
    trending_score: 91,
    viral_source: 'seed_data',
  },
  {
    media_type: 'image',
    source: 'official_website',
    source_url: 'https://example.com/ssmb29-first-look',
    image_url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800',
    thumbnail_url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400',
    title: 'Mahesh Babu SSMB29 First Look',
    caption: 'First look poster of Mahesh Babu with SS Rajamouli',
    tags: ['mahesh babu', 'ssmb29', 'first look', 'rajamouli'],
    category: 'movie_promotion',
    status: 'approved',
    is_hot: true,
    trending_score: 89,
    viral_source: 'seed_data',
  },

  // ==================== TRADITIONAL ====================
  {
    media_type: 'image',
    source: 'official_website',
    source_url: 'https://example.com/keerthy-traditional',
    image_url: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800',
    thumbnail_url: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400',
    title: 'Keerthy Suresh in traditional saree',
    caption: 'Keerthy Suresh stunning in a traditional pattu saree',
    tags: ['keerthy suresh', 'traditional', 'saree', 'tollywood'],
    category: 'traditional',
    status: 'approved',
    is_hot: true,
    trending_score: 78,
    viral_source: 'seed_data',
  },
  {
    media_type: 'image',
    source: 'official_website',
    source_url: 'https://example.com/sai-pallavi-ethnic',
    image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800',
    thumbnail_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400',
    title: 'Sai Pallavi ethnic look at Diwali',
    caption: 'Sai Pallavi looking beautiful in ethnic wear for Diwali',
    tags: ['sai pallavi', 'traditional', 'diwali', 'ethnic'],
    category: 'traditional',
    status: 'approved',
    is_hot: true,
    trending_score: 76,
    viral_source: 'seed_data',
  },

  // ==================== FITNESS ====================
  {
    media_type: 'image',
    source: 'official_website',
    source_url: 'https://example.com/allu-arjun-fitness',
    image_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800',
    thumbnail_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400',
    title: 'Allu Arjun Pushpa 2 Body Transformation',
    caption: 'Allu Arjun intense workout for Pushpa 2',
    tags: ['allu arjun', 'fitness', 'workout', 'transformation'],
    category: 'fitness',
    status: 'approved',
    is_hot: true,
    trending_score: 82,
    viral_source: 'seed_data',
  },
  {
    media_type: 'image',
    source: 'official_website',
    source_url: 'https://example.com/ram-charan-gym',
    image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
    thumbnail_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
    title: 'Ram Charan gym workout session',
    caption: 'Ram Charan maintaining his physique at the gym',
    tags: ['ram charan', 'fitness', 'gym', 'workout'],
    category: 'fitness',
    status: 'approved',
    is_hot: true,
    trending_score: 74,
    viral_source: 'seed_data',
  },
  {
    media_type: 'image',
    source: 'official_website',
    source_url: 'https://example.com/samantha-fitness',
    image_url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800',
    thumbnail_url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400',
    title: 'Samantha fitness motivation',
    caption: 'Samantha shares her fitness routine',
    tags: ['samantha', 'fitness', 'workout', 'motivation'],
    category: 'fitness',
    status: 'approved',
    is_hot: true,
    trending_score: 79,
    viral_source: 'seed_data',
  },

  // ==================== BEHIND THE SCENES ====================
  {
    media_type: 'image',
    source: 'official_website',
    source_url: 'https://example.com/rrr-making',
    image_url: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800',
    thumbnail_url: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400',
    title: 'RRR Making Video - Behind The Scenes',
    caption: 'Exclusive making of RRR with Rajamouli, NTR and Ram Charan',
    tags: ['rrr', 'making', 'bts', 'rajamouli'],
    category: 'behind_the_scenes',
    status: 'approved',
    is_hot: true,
    trending_score: 84,
    viral_source: 'seed_data',
  },
  {
    media_type: 'image',
    source: 'official_website',
    source_url: 'https://example.com/prabhas-interview',
    image_url: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=800',
    thumbnail_url: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=400',
    title: 'Prabhas exclusive interview for Kalki',
    caption: 'Prabhas talks about his experience working on Kalki 2898 AD',
    tags: ['prabhas', 'interview', 'kalki', 'behind the scenes'],
    category: 'behind_the_scenes',
    status: 'approved',
    is_hot: true,
    trending_score: 80,
    viral_source: 'seed_data',
  },
  {
    media_type: 'image',
    source: 'official_website',
    source_url: 'https://example.com/vd-on-set',
    image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    thumbnail_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    title: 'Vijay Deverakonda on set of his next film',
    caption: 'Behind the scenes from VD shooting location',
    tags: ['vijay deverakonda', 'bts', 'on set', 'tollywood'],
    category: 'behind_the_scenes',
    status: 'approved',
    is_hot: true,
    trending_score: 73,
    viral_source: 'seed_data',
  },

  // ==================== SOCIAL BUZZ (Twitter/Instagram posts) ====================
  {
    media_type: 'twitter_post',
    source: 'twitter_embed',
    source_url: 'https://twitter.com/alaborjun/status/sample1',
    embed_html: `<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Pushpa 2 breaks all records! 🔥 Thank you all for the love! This is just the beginning 💪</p>&mdash; Allu Arjun (@alaborjun) <a href="https://twitter.com/alaborjun/status/sample1">December 31, 2025</a></blockquote><script async src="https://platform.twitter.com/widgets.js"></script>`,
    thumbnail_url: null,
    title: 'Allu Arjun thanks fans for Pushpa 2 success',
    caption: 'Pushpa 2 breaks all records!',
    tags: ['allu arjun', 'pushpa2', 'twitter', 'social buzz'],
    category: 'general',
    status: 'approved',
    is_hot: true,
    trending_score: 95,
    viral_source: 'twitter_viral',
  },
  {
    media_type: 'twitter_post',
    source: 'twitter_embed',
    source_url: 'https://twitter.com/RRRMovie/status/sample2',
    embed_html: `<blockquote class="twitter-tweet"><p lang="en" dir="ltr">RRR crosses $200M worldwide! 🌍 India's pride 🇮🇳 Thank you fans across the globe!</p>&mdash; RRR Movie (@RRRMovie) <a href="https://twitter.com/RRRMovie/status/sample2">December 30, 2025</a></blockquote><script async src="https://platform.twitter.com/widgets.js"></script>`,
    thumbnail_url: null,
    title: 'RRR crosses $200M worldwide box office',
    caption: 'RRR becomes highest grossing Indian film',
    tags: ['rrr', 'box office', 'record', 'social buzz'],
    category: 'general',
    status: 'approved',
    is_hot: true,
    trending_score: 90,
    viral_source: 'twitter_viral',
  },
  {
    media_type: 'twitter_post',
    source: 'twitter_embed',
    source_url: 'https://twitter.com/AlwaysRamCharan/status/sample3',
    embed_html: `<blockquote class="twitter-tweet"><p lang="en" dir="ltr">When you meet your hero! Thank you <a href="https://twitter.com/ssrajamouli">@ssrajamouli</a> sir for believing in us 🙏❤️</p>&mdash; Ram Charan (@AlwaysRamCharan) <a href="https://twitter.com/AlwaysRamCharan/status/sample3">December 29, 2025</a></blockquote><script async src="https://platform.twitter.com/widgets.js"></script>`,
    thumbnail_url: null,
    title: 'Ram Charan shares moment with Rajamouli',
    caption: 'Heartwarming post from Ram Charan',
    tags: ['ram charan', 'rajamouli', 'twitter', 'social buzz'],
    category: 'general',
    status: 'approved',
    is_hot: true,
    trending_score: 85,
    viral_source: 'twitter_viral',
  },
  {
    media_type: 'instagram_post',
    source: 'instagram_embed',
    source_url: 'https://www.instagram.com/p/sample-rashmika/',
    embed_html: `<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/sample/"><p>Grateful for all the love 💕 2025 has been amazing!</p></blockquote><script async src="//www.instagram.com/embed.js"></script>`,
    thumbnail_url: null,
    title: 'Rashmika shares gratitude post',
    caption: 'Grateful for all the love! 2025 has been amazing!',
    tags: ['rashmika', 'instagram', 'social buzz'],
    category: 'general',
    status: 'approved',
    is_hot: true,
    trending_score: 82,
    viral_source: 'instagram_viral',
  },
  {
    media_type: 'instagram_post',
    source: 'instagram_embed',
    source_url: 'https://www.instagram.com/p/sample-samantha/',
    embed_html: `<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/sample2/"><p>New beginnings 🌟 Excited for what's coming!</p></blockquote><script async src="//www.instagram.com/embed.js"></script>`,
    thumbnail_url: null,
    title: 'Samantha announces new project',
    caption: 'New beginnings! Excited for what\'s coming!',
    tags: ['samantha', 'instagram', 'social buzz', 'announcement'],
    category: 'general',
    status: 'approved',
    is_hot: true,
    trending_score: 88,
    viral_source: 'instagram_viral',
  },
];

async function seedContent() {
  console.log('🌱 Seeding category content...\n');

  let inserted = 0;
  let skipped = 0;
  const categoryCounts: Record<string, number> = {};

  for (const content of sampleContent) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('media_posts')
      .select('id')
      .eq('title', content.title)
      .single();

    if (existing) {
      console.log(`⏭️  Skipping (exists): ${content.title}`);
      skipped++;
      continue;
    }

    const { error } = await supabase.from('media_posts').insert({
      ...content,
      source_license: 'embed-allowed',
      views: Math.floor(Math.random() * 10000) + 1000,
      likes: Math.floor(Math.random() * 500) + 100,
      shares: Math.floor(Math.random() * 100) + 10,
      external_views: Math.floor(Math.random() * 100000) + 10000,
      external_likes: Math.floor(Math.random() * 5000) + 500,
      fetched_at: new Date().toISOString(),
    });

    if (error) {
      console.error(`❌ Error inserting "${content.title}":`, error.message);
    } else {
      console.log(`✅ Inserted: ${content.title} [${content.category}]`);
      inserted++;
      categoryCounts[content.category] = (categoryCounts[content.category] || 0) + 1;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Skipped: ${skipped}`);
  console.log('\n   By Category:');
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    console.log(`   - ${cat}: ${count}`);
  });
}

seedContent()
  .then(() => {
    console.log('\n✨ Seeding complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });

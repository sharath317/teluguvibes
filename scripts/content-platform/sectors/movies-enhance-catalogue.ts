#!/usr/bin/env npx tsx
/**
 * MOVIES CATALOGUE ENHANCER
 * 
 * Enhances existing movies in the database with content platform metadata.
 * - Generates review drafts for movies without reviews
 * - Identifies cult classics and forgotten gems
 * - Generates actor pair analytics content
 * 
 * Usage:
 *   npx tsx scripts/content-platform/sectors/movies-enhance-catalogue.ts
 *   npx tsx scripts/content-platform/sectors/movies-enhance-catalogue.ts --type=reviews --limit=50
 *   npx tsx scripts/content-platform/sectors/movies-enhance-catalogue.ts --type=classics
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// REVIEW GENERATION
// ============================================================

async function generateReviewDrafts(limit: number) {
  console.log('📝 Generating review drafts for movies...\n');

  // Get movies that don't have associated posts/reviews
  const { data: movies, error } = await supabase
    .from('movies')
    .select(`
      id, title_en, title_te, synopsis, synopsis_te,
      director, hero, heroine, music_director,
      release_year, genres, poster_url, overview_te
    `)
    .not('synopsis', 'is', null)
    .gte('release_year', 2000)
    .order('release_year', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching movies:', error);
    return;
  }

  console.log(`Found ${movies?.length || 0} movies to process\n`);

  let created = 0;
  for (const movie of movies || []) {
    const slug = `${movie.title_en}-${movie.release_year}-review`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if review already exists
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      console.log(`  ⏭️ Review exists: ${movie.title_en}`);
      continue;
    }

    // Generate review body
    const reviewBody = generateReviewBody(movie);
    const reviewBodyTe = movie.overview_te 
      ? generateReviewBodyTe(movie)
      : undefined;

      // Calculate confidence based on available data
      const confidenceScore = calculateConfidence(movie);

      const postData = {
        id: uuidv4(),
        title: `${movie.title_en} (${movie.release_year}) - Movie Review`,
        title_te: movie.title_te ? `${movie.title_te} (${movie.release_year}) - మూవీ రివ్యూ` : null,
        slug,
        telugu_body: reviewBodyTe || reviewBody,
        body_te: reviewBodyTe || reviewBody,
        
        // Content platform fields
        content_type: 'review',
        content_sector: 'movies_cinema',
        content_subsector: 'reviews',
        audience_profile: 'general',
        sensitivity_level: 'none',
        
        // Verification
        fact_confidence_score: confidenceScore,
        source_count: 2,
        source_refs: [
          { id: '1', sourceName: 'TMDB', trustLevel: 0.95 },
          { id: '2', sourceName: 'Internal Database', trustLevel: 0.70 },
        ],
        verification_status: confidenceScore >= 70 ? 'verified' : 'pending',
        
        // Labels
        fictional_label: false,
        requires_disclaimer: false,
        
        // Metadata
        tags: movie.genres || [],
        image_url: movie.poster_url,
        category: 'entertainment',
        status: 'draft',
        
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

    const { error: insertError } = await supabase.from('posts').insert(postData);

    if (insertError) {
      console.error(`  ❌ Error: ${movie.title_en} - ${insertError.message}`);
    } else {
      console.log(`  ✅ Created: ${movie.title_en}`);
      created++;
    }
  }

  console.log(`\n📊 Summary: Created ${created} review drafts`);
}

function generateReviewBody(movie: any): string {
  const parts = [];
  
  parts.push(`# ${movie.title_en} (${movie.release_year})`);
  parts.push('');
  
  if (movie.synopsis) {
    parts.push('## Synopsis');
    parts.push(movie.synopsis);
    parts.push('');
  }
  
  parts.push('## Cast & Crew');
  if (movie.director) parts.push(`**Director:** ${movie.director}`);
  if (movie.hero) parts.push(`**Lead Actor:** ${movie.hero}`);
  if (movie.heroine) parts.push(`**Lead Actress:** ${movie.heroine}`);
  if (movie.music_director) parts.push(`**Music:** ${movie.music_director}`);
  parts.push('');
  
  if (movie.genres && movie.genres.length > 0) {
    parts.push(`**Genres:** ${movie.genres.join(', ')}`);
    parts.push('');
  }
  
  return parts.join('\n');
}

function generateReviewBodyTe(movie: any): string {
  const parts = [];
  
  parts.push(`# ${movie.title_te || movie.title_en} (${movie.release_year})`);
  parts.push('');
  
  if (movie.synopsis_te) {
    parts.push('## కథ');
    parts.push(movie.synopsis_te);
    parts.push('');
  }
  
  parts.push('## తారాగణం & సాంకేతికం');
  if (movie.director) parts.push(`**దర్శకుడు:** ${movie.director}`);
  if (movie.hero) parts.push(`**హీరో:** ${movie.hero}`);
  if (movie.heroine) parts.push(`**హీరోయిన్:** ${movie.heroine}`);
  if (movie.music_director) parts.push(`**సంగీతం:** ${movie.music_director}`);
  
  return parts.join('\n');
}

function calculateConfidence(movie: any): number {
  let score = 0;
  
  if (movie.title_en) score += 15;
  if (movie.synopsis) score += 25;
  if (movie.director) score += 15;
  if (movie.hero) score += 15;
  if (movie.release_year) score += 10;
  if (movie.genres?.length > 0) score += 10;
  if (movie.music_director) score += 10;
  
  return Math.min(score, 100);
}

// ============================================================
// CLASSICS IDENTIFICATION
// ============================================================

async function identifyClassics(limit: number) {
  console.log('🎬 Identifying cult classics and forgotten gems...\n');

  const { data: movies, error } = await supabase
    .from('movies')
    .select(`
      id, title_en, title_te, synopsis, synopsis_te, director, hero,
      release_year, genres, poster_url
    `)
    .lt('release_year', 2000)
    .not('synopsis', 'is', null)
    .order('release_year', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${movies?.length || 0} potential classics\n`);

  let created = 0;
  for (const movie of movies || []) {
    const slug = `forgotten-gem-${movie.title_en}-${movie.release_year}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');

    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) continue;

    const englishBody = `Rediscovering ${movie.title_en}, a ${movie.release_year} Telugu classic. Directed by ${movie.director || 'Unknown'}, starring ${movie.hero || 'Unknown'}. ${movie.synopsis || ''}\n\nThis classic film deserves to be remembered.`;
    const teluguBody = movie.synopsis_te 
      ? `${movie.title_te || movie.title_en} (${movie.release_year}) తెలుగు క్లాసిక్‌ను తిరిగి కనుగొందాం. ${movie.director || 'Unknown'} దర్శకత్వం వహించారు, ${movie.hero || 'Unknown'} నటించారు. ${movie.synopsis_te}`
      : englishBody;

    const postData = {
      id: uuidv4(),
      title: `Forgotten Gem: ${movie.title_en} (${movie.release_year})`,
      title_te: movie.title_te ? `మరచిపోయిన రత్నం: ${movie.title_te}` : null,
      slug,
      telugu_body: teluguBody,
      body_te: teluguBody,
      
      content_type: 'article',
      content_sector: 'movies_cinema',
      content_subsector: 'forgotten_gems',
      audience_profile: 'general',
      sensitivity_level: 'none',
      fact_confidence_score: 75,
      source_count: 1,
      source_refs: [{ id: '1', sourceName: 'TMDB', trustLevel: 0.95 }],
      verification_status: 'verified',
      fictional_label: false,
      requires_disclaimer: false,
      historical_period: `${Math.floor(movie.release_year / 10) * 10}s`,
      tags: ['classic', 'forgotten-gem', ...(movie.genres || [])],
      image_url: movie.poster_url,
      category: 'entertainment',
      status: 'draft',
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase.from('posts').insert(postData);

    if (!insertError) {
      console.log(`  ✅ ${movie.title_en} (${movie.release_year})`);
      created++;
    }
  }

  console.log(`\n📊 Created ${created} "Forgotten Gems" articles`);
}

// ============================================================
// ACTOR PAIR ANALYTICS
// ============================================================

async function generateActorPairAnalytics(limit: number) {
  console.log('👥 Generating actor pair analytics...\n');

  // Get actor collaboration data
  const { data: movies } = await supabase
    .from('movies')
    .select('title_en, hero, heroine, director, release_year, verdict')
    .not('hero', 'is', null)
    .not('heroine', 'is', null);

  if (!movies) return;

  // Count collaborations
  const pairs: Record<string, { count: number; movies: string[]; hits: number }> = {};
  
  for (const movie of movies) {
    const pairKey = [movie.hero, movie.heroine].sort().join(' & ');
    if (!pairs[pairKey]) {
      pairs[pairKey] = { count: 0, movies: [], hits: 0 };
    }
    pairs[pairKey].count++;
    pairs[pairKey].movies.push(movie.title_en);
    if (movie.verdict?.toLowerCase().includes('hit')) {
      pairs[pairKey].hits++;
    }
  }

  // Get top pairs
  const topPairs = Object.entries(pairs)
    .filter(([_, data]) => data.count >= 3)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit);

  console.log(`Found ${topPairs.length} notable actor pairs\n`);

  for (const [pair, data] of topPairs) {
    const slug = `actor-pair-${pair.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;

    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) continue;

    const bodyContent = `## ${pair}\n\nThis iconic pair has starred together in ${data.count} films, with ${data.hits} hits.\n\n### Filmography\n${data.movies.map(m => `- ${m}`).join('\n')}\n\n### Success Rate\n${Math.round((data.hits / data.count) * 100)}% hit rate`;

    const postData = {
      id: uuidv4(),
      title: `${pair}: ${data.count} Films Together`,
      slug,
      telugu_body: bodyContent,
      body_te: bodyContent,
      
      content_type: 'analysis',
      content_sector: 'movies_cinema',
      content_subsector: 'actor_pairs',
      audience_profile: 'general',
      sensitivity_level: 'none',
      fact_confidence_score: 90,
      source_count: 1,
      source_refs: [{ id: '1', sourceName: 'Internal Analytics', trustLevel: 0.90 }],
      verification_status: 'verified',
      fictional_label: false,
      tags: ['actor-pairs', 'analytics', 'collaborations'],
      category: 'entertainment',
      status: 'draft',
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('posts').insert(postData);
    if (!error) {
      console.log(`  ✅ ${pair} (${data.count} films)`);
    }
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const typeArg = args.find(a => a.startsWith('--type='));
  const limitArg = args.find(a => a.startsWith('--limit='));

  const type = typeArg?.split('=')[1] || 'all';
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 20;

  console.log('🎬 Movies Catalogue Enhancer');
  console.log('============================\n');

  switch (type) {
    case 'reviews':
      await generateReviewDrafts(limit);
      break;
    case 'classics':
      await identifyClassics(limit);
      break;
    case 'pairs':
      await generateActorPairAnalytics(limit);
      break;
    case 'all':
    default:
      await generateReviewDrafts(limit);
      await identifyClassics(limit);
      await generateActorPairAnalytics(limit);
  }

  console.log('\n✨ Done!');
}

main().catch(console.error);


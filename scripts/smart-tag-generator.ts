#!/usr/bin/env npx tsx
/**
 * SMART TAG GENERATOR
 * 
 * Single source of truth for:
 * - Blockbusters, Hidden Gems, Classics
 * - Top 10 / Quick Links
 * - Year/Month/Decade groupings
 * - OTT & Collection sections
 * 
 * NO hardcoded lists. ALL data-driven.
 * 
 * Usage:
 *   pnpm tags:generate           # Generate all tags
 *   pnpm tags:generate --dry     # Preview mode
 *   pnpm tags:generate --status  # Show current status
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const BATCH_SIZE = 100;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

interface Movie {
  id: string;
  title_en: string | null;
  release_year: number | null;
  avg_rating: number | null;
  total_reviews: number | null;
  genres: string[] | null;
  director: string | null;
  hero: string | null;
  language: string | null;
  is_blockbuster: boolean | null;
  is_classic: boolean | null;
  is_underrated: boolean | null;
  tags: string[] | null;
  tmdb_id: number | null;
}

interface TagResult {
  performanceTags: string[];
  temporalTags: string[];
  contentTags: string[];
  industryTags: string[];
}

function generateTags(movie: Movie): TagResult {
  const performanceTags: string[] = [];
  const temporalTags: string[] = [];
  const contentTags: string[] = [];
  const industryTags: string[] = [];
  
  const year = movie.release_year || 0;
  const rating = movie.avg_rating || 0;
  const reviewCount = movie.total_reviews || 0;
  
  // ========== PERFORMANCE TAGS ==========
  
  // Blockbuster: High rating + many reviews
  if (rating >= 8.0 || movie.is_blockbuster) {
    performanceTags.push('blockbuster');
  }
  
  // Super Hit: Very good rating
  if (rating >= 7.5 && rating < 8.0) {
    performanceTags.push('super_hit');
  }
  
  // Hit: Good rating
  if (rating >= 7.0 && rating < 7.5) {
    performanceTags.push('hit');
  }
  
  // Classic: Old + high rating
  if (year <= 2000 && rating >= 7.0) {
    performanceTags.push('cult_classic');
  }
  
  // Hidden Gem: High rating + few reviews
  if (rating >= 7.5 && reviewCount < 5) {
    performanceTags.push('hidden_gem');
  }
  
  // Underrated: Good rating, low visibility
  if (movie.is_underrated || (rating >= 7.0 && reviewCount < 3)) {
    performanceTags.push('underrated');
  }
  
  // ========== TEMPORAL TAGS ==========
  
  if (year) {
    // Year tag
    temporalTags.push(`year:${year}`);
    
    // Decade tag
    const decade = Math.floor(year / 10) * 10;
    temporalTags.push(`decade:${decade}s`);
    
    // Era tag
    if (year < 1970) {
      temporalTags.push('era:golden');
    } else if (year < 1990) {
      temporalTags.push('era:silver');
    } else if (year < 2010) {
      temporalTags.push('era:modern');
    } else {
      temporalTags.push('era:contemporary');
    }
  }
  
  // ========== CONTENT TAGS ==========
  
  // Genre tags
  if (movie.genres && movie.genres.length > 0) {
    movie.genres.forEach(genre => {
      if (genre) {
        contentTags.push(`genre:${genre.toLowerCase().replace(/\s+/g, '_')}`);
      }
    });
    
    // Check for family-friendly
    const familyGenres = ['Family', 'Animation', 'Comedy'];
    if (movie.genres.some(g => familyGenres.includes(g))) {
      contentTags.push('family_friendly');
    }
    
    // Check for kids-safe
    const nonKidsGenres = ['Horror', 'Thriller', 'Crime', 'War'];
    if (!movie.genres.some(g => nonKidsGenres.includes(g)) && 
        movie.genres.some(g => familyGenres.includes(g))) {
      contentTags.push('kids_safe');
    }
  }
  
  // Director signature (if director has multiple movies)
  if (movie.director) {
    contentTags.push(`director:${movie.director.toLowerCase().replace(/\s+/g, '_')}`);
  }
  
  // Actor-led
  if (movie.hero) {
    contentTags.push(`actor:${movie.hero.toLowerCase().replace(/\s+/g, '_')}`);
  }
  
  // ========== INDUSTRY TAGS ==========
  
  // Language tag
  if (movie.language) {
    industryTags.push(`language:${movie.language.toLowerCase()}`);
    
    // Industry mapping
    const industryMap: Record<string, string> = {
      'Telugu': 'tollywood',
      'Tamil': 'kollywood',
      'Hindi': 'bollywood',
      'Malayalam': 'mollywood',
      'Kannada': 'sandalwood',
      'English': 'hollywood',
    };
    
    if (industryMap[movie.language]) {
      industryTags.push(`industry:${industryMap[movie.language]}`);
    }
  }
  
  return {
    performanceTags,
    temporalTags,
    contentTags,
    industryTags,
  };
}

function mergeAllTags(result: TagResult): string[] {
  return [
    ...result.performanceTags,
    ...result.temporalTags,
    ...result.contentTags,
    ...result.industryTags,
  ].filter((tag, index, self) => self.indexOf(tag) === index); // dedupe
}

async function showStatus(supabase: SupabaseClient) {
  console.log(chalk.cyan.bold('\n📊 TAG STATUS\n'));
  
  // Movies with tags
  const { data: taggedMovies } = await supabase
    .from('movies')
    .select('tags')
    .not('tags', 'is', null)
    .limit(1000);
  
  const withTags = taggedMovies?.filter(m => m.tags && m.tags.length > 0).length || 0;
  console.log(`  Movies with tags: ${withTags}`);
  
  // Count by performance tags
  const performanceTags = ['blockbuster', 'super_hit', 'hit', 'cult_classic', 'hidden_gem', 'underrated'];
  console.log(chalk.cyan('\n  Performance Tags:'));
  
  for (const tag of performanceTags) {
    const { count } = await supabase
      .from('movies')
      .select('id', { count: 'exact', head: true })
      .contains('tags', [tag]);
    console.log(`    ${tag.padEnd(15)} ${count || 0}`);
  }
  
  // Boolean flags
  console.log(chalk.cyan('\n  Boolean Flags:'));
  
  const { count: blockbusters } = await supabase.from('movies').select('id', { count: 'exact', head: true }).eq('is_blockbuster', true);
  const { count: classics } = await supabase.from('movies').select('id', { count: 'exact', head: true }).eq('is_classic', true);
  const { count: underrated } = await supabase.from('movies').select('id', { count: 'exact', head: true }).eq('is_underrated', true);
  
  console.log(`    is_blockbuster  ${blockbusters || 0}`);
  console.log(`    is_classic      ${classics || 0}`);
  console.log(`    is_underrated   ${underrated || 0}`);
}

async function generateAllTags(supabase: SupabaseClient, dryRun: boolean) {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║              SMART TAG GENERATOR                              ║
║         Data-driven tags for all sections                     ║
╚══════════════════════════════════════════════════════════════╝
`));
  
  if (dryRun) {
    console.log(chalk.yellow('  🔍 DRY RUN MODE - No changes will be made\n'));
  }
  
  const startTime = Date.now();
  
  // Get all published movies
  const { data: movies, error, count } = await supabase
    .from('movies')
    .select('id, title_en, release_year, avg_rating, total_reviews, genres, director, hero, language, is_blockbuster, is_classic, is_underrated, tags, tmdb_id', { count: 'exact' })
    .eq('is_published', true);
  
  if (error) {
    console.error(chalk.red('Error fetching movies:', error.message));
    return;
  }
  
  console.log(`  Processing ${count} published movies\n`);
  
  let processed = 0;
  let updated = 0;
  let tagStats: Record<string, number> = {};
  
  const updateBatch: { id: string; tags: string[]; is_blockbuster: boolean; is_classic: boolean; is_underrated: boolean }[] = [];
  
  for (const movie of movies || []) {
    const tagResult = generateTags(movie as Movie);
    const allTags = mergeAllTags(tagResult);
    
    // Track tag counts
    allTags.forEach(tag => {
      tagStats[tag] = (tagStats[tag] || 0) + 1;
    });
    
    // Determine boolean flags from tags
    const isBlockbuster = tagResult.performanceTags.includes('blockbuster') || tagResult.performanceTags.includes('super_hit');
    const isClassic = tagResult.performanceTags.includes('cult_classic');
    const isUnderrated = tagResult.performanceTags.includes('hidden_gem') || tagResult.performanceTags.includes('underrated');
    
    updateBatch.push({
      id: movie.id,
      tags: allTags,
      is_blockbuster: isBlockbuster,
      is_classic: isClassic,
      is_underrated: isUnderrated,
    });
    
    processed++;
    
    // Process batch
    if (updateBatch.length >= BATCH_SIZE || processed === (movies?.length || 0)) {
      if (!dryRun && updateBatch.length > 0) {
        for (const update of updateBatch) {
          const { error: updateError } = await supabase
            .from('movies')
            .update({
              tags: update.tags,
              is_blockbuster: update.is_blockbuster,
              is_classic: update.is_classic,
              is_underrated: update.is_underrated,
            })
            .eq('id', update.id);
          
          if (!updateError) updated++;
        }
        updateBatch.length = 0;
      } else if (dryRun) {
        updated += updateBatch.length;
        updateBatch.length = 0;
      }
      
      // Progress
      const pct = Math.round((processed / (movies?.length || 1)) * 100);
      const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
      process.stdout.write(`\r  [${bar}] ${pct}% (${processed}/${movies?.length || 0})`);
    }
  }
  
  console.log('\n');
  
  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log(chalk.cyan.bold(`
═══════════════════════════════════════════════════════════
📊 TAG GENERATION SUMMARY
═══════════════════════════════════════════════════════════
`));
  console.log(`  Processed:    ${processed} movies`);
  console.log(`  Tagged:       ${updated} movies`);
  console.log(`  Duration:     ${duration}s`);
  
  // Top tags
  console.log(chalk.cyan('\n  Top Performance Tags:'));
  const perfTags = ['blockbuster', 'super_hit', 'hit', 'cult_classic', 'hidden_gem', 'underrated'];
  perfTags.forEach(tag => {
    if (tagStats[tag]) {
      console.log(`    ${tag.padEnd(15)} ${tagStats[tag]}`);
    }
  });
  
  // Top decades
  console.log(chalk.cyan('\n  By Decade:'));
  Object.entries(tagStats)
    .filter(([tag]) => tag.startsWith('decade:'))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([tag, count]) => {
      console.log(`    ${tag.replace('decade:', '').padEnd(10)} ${count}`);
    });
  
  if (dryRun) {
    console.log(chalk.yellow('\n  [DRY RUN] No changes were made'));
  } else {
    console.log(chalk.green('\n  ✅ Tag generation complete!'));
  }
}

async function main() {
  const supabase = getSupabaseClient();
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry');
  const showStatusOnly = args.includes('--status');
  
  if (showStatusOnly) {
    await showStatus(supabase);
  } else {
    await generateAllTags(supabase, dryRun);
    console.log('\n');
    await showStatus(supabase);
  }
}

main().catch(console.error);






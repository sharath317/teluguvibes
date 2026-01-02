#!/usr/bin/env npx tsx
/**
 * Phase 5: Smart Tags Rebuild CLI
 * 
 * Rebuilds structured, deterministic tags for all movies.
 * Includes Phase 5.2: SmartTagContext with actor prominence,
 * director patterns, genre confidence, and audience segmentation.
 * 
 * Usage:
 *   pnpm tags:rebuild              # Dry run
 *   pnpm tags:rebuild --apply      # Apply tags
 *   pnpm tags:rebuild --stats      # Show tag distribution only
 *   pnpm tags:rebuild --smart      # Generate SmartTagContext
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';
import { rebuildAllTags, getAvailableTags } from '../lib/media-evolution';

// ============================================================
// PHASE 5.2: SMART TAG CONTEXT
// ============================================================

export interface SmartTagContext {
  actor_prominence: 'hero' | 'ensemble' | 'cameo';
  director_pattern: 'debut' | 'established' | 'comeback';
  genre_confidence: number;
  narrative_themes: string[];
  era_decade: string;
  mood_tags: string[];
  audience_segment: 'family' | 'youth' | 'mass' | 'class';
}

interface MovieForTags {
  id: string;
  title_en: string;
  hero?: string;
  heroine?: string;
  director?: string;
  genres?: string[];
  release_year?: number;
  cast_members?: string[];
  tmdb_rating?: number;
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

/**
 * Analyze actor prominence based on cast structure
 */
function analyzeActorProminence(movie: MovieForTags): 'hero' | 'ensemble' | 'cameo' {
  const castCount = movie.cast_members?.length || 0;
  
  // Solo hero film: 1 clear hero, supporting cast
  if (movie.hero && !movie.heroine && castCount < 5) {
    return 'hero';
  }
  
  // Multi-starrer or ensemble
  if (castCount >= 5) {
    return 'ensemble';
  }
  
  // Minimal cast info - likely hero-centric
  return 'hero';
}

/**
 * Analyze director pattern based on filmography
 */
async function analyzeDirectorPattern(
  director: string
): Promise<'debut' | 'established' | 'comeback'> {
  const supabase = getSupabaseClient();
  
  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, release_year')
    .eq('director', director)
    .order('release_year', { ascending: true });
  
  if (error || !movies || movies.length === 0) {
    return 'debut';
  }
  
  const movieCount = movies.length;
  const years = movies.map(m => m.release_year).filter(Boolean);
  
  if (movieCount === 1) {
    return 'debut';
  }
  
  if (movieCount >= 5) {
    return 'established';
  }
  
  // Check for gap indicating comeback
  if (years.length >= 2) {
    const lastYear = years[years.length - 1];
    const prevYear = years[years.length - 2];
    if (lastYear && prevYear && (lastYear - prevYear) >= 5) {
      return 'comeback';
    }
  }
  
  return 'established';
}

/**
 * Extract narrative themes from movie metadata
 */
function extractNarrativeThemes(movie: MovieForTags): string[] {
  const themes: string[] = [];
  const genres = movie.genres || [];
  const title = movie.title_en.toLowerCase();
  
  // Genre-based themes
  if (genres.includes('Action')) themes.push('revenge', 'justice');
  if (genres.includes('Romance')) themes.push('love', 'relationship');
  if (genres.includes('Drama')) themes.push('family', 'conflict');
  if (genres.includes('Thriller')) themes.push('mystery', 'suspense');
  if (genres.includes('Comedy')) themes.push('humor', 'entertainment');
  if (genres.includes('Horror')) themes.push('fear', 'supernatural');
  
  // Title-based themes (common Telugu movie patterns)
  if (/king|raja|emperor|samrat/i.test(title)) themes.push('power');
  if (/love|prema|ishq/i.test(title)) themes.push('love');
  if (/village|palle|oorike/i.test(title)) themes.push('rural');
  if (/police|officer|inspector/i.test(title)) themes.push('law');
  
  return [...new Set(themes)].slice(0, 5);
}

/**
 * Generate mood tags based on genres and rating
 */
function generateMoodTags(movie: MovieForTags): string[] {
  const moods: string[] = [];
  const genres = movie.genres || [];
  const rating = movie.tmdb_rating || 6;
  
  if (genres.includes('Comedy')) moods.push('fun', 'lighthearted');
  if (genres.includes('Action')) moods.push('intense', 'thrilling');
  if (genres.includes('Drama')) moods.push('emotional', 'thoughtful');
  if (genres.includes('Romance')) moods.push('romantic', 'heartfelt');
  if (genres.includes('Horror')) moods.push('scary', 'dark');
  if (genres.includes('Family')) moods.push('wholesome', 'feel-good');
  
  if (rating >= 8) moods.push('acclaimed');
  if (rating <= 5) moods.push('divisive');
  
  return [...new Set(moods)].slice(0, 4);
}

/**
 * Determine audience segment based on content
 */
function determineAudienceSegment(movie: MovieForTags): 'family' | 'youth' | 'mass' | 'class' {
  const genres = movie.genres || [];
  const rating = movie.tmdb_rating || 6;
  
  // High-rated dramas/thrillers → Class
  if (rating >= 7.5 && (genres.includes('Drama') || genres.includes('Thriller'))) {
    return 'class';
  }
  
  // Action-heavy → Mass
  if (genres.includes('Action') && !genres.includes('Romance')) {
    return 'mass';
  }
  
  // Romance/Comedy for youth
  if (genres.includes('Romance') || genres.includes('Comedy')) {
    return 'youth';
  }
  
  // Family-friendly content
  if (genres.includes('Family') || genres.includes('Drama')) {
    return 'family';
  }
  
  return 'family'; // Default
}

/**
 * Calculate genre confidence based on available data
 */
function calculateGenreConfidence(movie: MovieForTags): number {
  const genres = movie.genres || [];
  
  if (genres.length === 0) return 0;
  if (genres.length === 1) return 0.6;
  if (genres.length === 2) return 0.8;
  if (genres.length >= 3) return 0.9;
  
  return 0.7;
}

/**
 * Generate complete SmartTagContext for a movie
 */
async function generateSmartTags(movie: MovieForTags): Promise<SmartTagContext> {
  const actorProminence = analyzeActorProminence(movie);
  const directorPattern = movie.director 
    ? await analyzeDirectorPattern(movie.director)
    : 'debut';
  const genreConfidence = calculateGenreConfidence(movie);
  const narrativeThemes = extractNarrativeThemes(movie);
  const moodTags = generateMoodTags(movie);
  const audienceSegment = determineAudienceSegment(movie);
  
  // Era/decade
  const decade = movie.release_year 
    ? `${Math.floor(movie.release_year / 10) * 10}s`
    : 'Unknown';
  
  return {
    actor_prominence: actorProminence,
    director_pattern: directorPattern,
    genre_confidence: genreConfidence,
    narrative_themes: narrativeThemes,
    era_decade: decade,
    mood_tags: moodTags,
    audience_segment: audienceSegment
  };
}

/**
 * Batch generate SmartTagContext for movies
 */
async function batchGenerateSmartTags(options: {
  limit: number;
  dryRun: boolean;
}): Promise<{
  processed: number;
  tagged: number;
  by_prominence: Record<string, number>;
  by_pattern: Record<string, number>;
  by_segment: Record<string, number>;
}> {
  const supabase = getSupabaseClient();
  
  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, title_en, hero, heroine, director, genres, release_year, cast_members, tmdb_rating')
    .limit(options.limit);
  
  if (error || !movies) {
    throw new Error(`Failed to fetch movies: ${error?.message}`);
  }
  
  const stats = {
    processed: 0,
    tagged: 0,
    by_prominence: {} as Record<string, number>,
    by_pattern: {} as Record<string, number>,
    by_segment: {} as Record<string, number>
  };
  
  for (const movie of movies) {
    stats.processed++;
    
    try {
      const smartTags = await generateSmartTags(movie);
      
      // Track distributions
      stats.by_prominence[smartTags.actor_prominence] = 
        (stats.by_prominence[smartTags.actor_prominence] || 0) + 1;
      stats.by_pattern[smartTags.director_pattern] = 
        (stats.by_pattern[smartTags.director_pattern] || 0) + 1;
      stats.by_segment[smartTags.audience_segment] = 
        (stats.by_segment[smartTags.audience_segment] || 0) + 1;
      
      if (!options.dryRun) {
        await supabase
          .from('movies')
          .update({ smart_tags: smartTags })
          .eq('id', movie.id);
      }
      
      stats.tagged++;
    } catch (err) {
      console.error(`Failed to generate smart tags for ${movie.title_en}:`, err);
    }
  }
  
  return stats;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const statsOnly = args.includes('--stats');
  const smartMode = args.includes('--smart');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 1000;

  console.log(chalk.bold.cyan('\n🏷️  SMART TAG SYSTEM\n'));

  // Phase 5.2: Smart Tag Context generation
  if (smartMode) {
    console.log(chalk.bold('🧠 SMART TAG CONTEXT GENERATION\n'));
    console.log(`Limit: ${chalk.yellow(limit)}`);
    console.log(`Mode: ${apply ? chalk.green('APPLY') : chalk.yellow('DRY RUN')}\n`);
    
    try {
      const result = await batchGenerateSmartTags({
        limit,
        dryRun: !apply
      });
      
      console.log(chalk.bold('\n📊 SMART TAG RESULTS\n'));
      console.log(`Processed: ${chalk.cyan(result.processed)}`);
      console.log(`Tagged: ${chalk.green(result.tagged)}`);
      
      console.log(chalk.bold('\n👤 ACTOR PROMINENCE:\n'));
      Object.entries(result.by_prominence).forEach(([prominence, count]) => {
        const bar = '█'.repeat(Math.min(30, Math.floor(count / 3)));
        console.log(`  ${prominence.padEnd(12)} ${bar} ${count}`);
      });
      
      console.log(chalk.bold('\n🎬 DIRECTOR PATTERNS:\n'));
      Object.entries(result.by_pattern).forEach(([pattern, count]) => {
        const bar = '█'.repeat(Math.min(30, Math.floor(count / 3)));
        console.log(`  ${pattern.padEnd(12)} ${bar} ${count}`);
      });
      
      console.log(chalk.bold('\n🎯 AUDIENCE SEGMENTS:\n'));
      Object.entries(result.by_segment).forEach(([segment, count]) => {
        const bar = '█'.repeat(Math.min(30, Math.floor(count / 3)));
        console.log(`  ${segment.padEnd(12)} ${bar} ${count}`);
      });
      
      if (!apply) {
        console.log(chalk.yellow('\n⚠️  DRY RUN - Smart tags not persisted'));
        console.log('Run with --apply --smart to save smart tags');
      }
      
    } catch (error) {
      console.error(chalk.red('\n❌ Smart tag generation failed:'), error);
      process.exit(1);
    }
    return;
  }

  // Show available tags
  if (statsOnly) {
    const available = getAvailableTags();
    console.log(chalk.bold('📚 AVAILABLE TAGS:\n'));
    
    console.log(chalk.cyan('NARRATIVE:'));
    console.log('  ' + available.narrative.join(', '));
    
    console.log(chalk.cyan('\nTONE:'));
    console.log('  ' + available.tone.join(', '));
    
    console.log(chalk.cyan('\nCULTURAL:'));
    console.log('  ' + available.cultural.join(', '));
    
    console.log(chalk.cyan('\nCAREER:'));
    console.log('  ' + available.career.join(', '));
    return;
  }

  console.log(`Limit: ${chalk.yellow(limit)}`);
  console.log(`Mode: ${apply ? chalk.green('APPLY') : chalk.yellow('DRY RUN')}\n`);

  try {
    const result = await rebuildAllTags({
      limit,
      dryRun: !apply,
      onProgress: (current, total) => {
        process.stdout.write(`\rProcessing: ${current}/${total}`);
      }
    });

    console.log('\n');
    console.log(chalk.bold('📊 TAG REBUILD RESULTS\n'));
    console.log(`Processed: ${chalk.cyan(result.processed)}`);
    console.log(`Tagged: ${chalk.green(result.tagged)}`);
    console.log(`Tag Coverage: ${chalk.cyan(Math.round((result.tagged / result.processed) * 100))}%`);

    // Show tag distribution
    console.log(chalk.bold('\n🏷️  TAG DISTRIBUTION (top 20):\n'));
    
    const sorted = Object.entries(result.tag_distribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20);

    sorted.forEach(([tag, count]) => {
      const bar = '█'.repeat(Math.min(40, Math.floor(count / 5)));
      console.log(`${tag.padEnd(25)} ${bar} ${count}`);
    });

    // Group by category
    console.log(chalk.bold('\n📊 BY CATEGORY:\n'));
    const byCategory: Record<string, number> = {
      narrative: 0,
      tone: 0,
      cultural: 0,
      career: 0
    };

    Object.entries(result.tag_distribution).forEach(([tag, count]) => {
      const category = tag.split(':')[0];
      if (byCategory[category] !== undefined) {
        byCategory[category] += count;
      }
    });

    Object.entries(byCategory).forEach(([category, count]) => {
      console.log(`${category.padEnd(12)} ${chalk.cyan(count)}`);
    });

    if (!apply) {
      console.log(chalk.yellow('\n⚠️  DRY RUN - Tags not persisted'));
      console.log('Run with --apply to save tags');
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Tag rebuild failed:'), error);
    process.exit(1);
  }
}

main();


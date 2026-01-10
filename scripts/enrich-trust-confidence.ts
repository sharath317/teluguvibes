/**
 * Trust and Confidence Score Enrichment Script
 * 
 * Calculates and updates data confidence scores with full explainability.
 * Produces trust badges that communicate reliability to users.
 * 
 * Usage:
 *   npx ts-node scripts/enrich-trust-confidence.ts [--limit=N] [--dry]
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// SOURCE TIER WEIGHTS
// ============================================================

interface SourceTier {
  tier: number;
  weight: number;
}

const SOURCE_TIERS: Record<string, SourceTier> = {
  wikipedia: { tier: 1, weight: 1.0 },
  tmdb: { tier: 1, weight: 0.95 },
  wikidata: { tier: 1, weight: 0.90 },
  imdb: { tier: 1, weight: 0.90 },
  omdb: { tier: 2, weight: 0.80 },
  archive_org: { tier: 2, weight: 0.75 },
  news_sources: { tier: 2, weight: 0.70 },
  fan_sites: { tier: 3, weight: 0.40 },
  ai_inference: { tier: 3, weight: 0.35 },
  generated: { tier: 3, weight: 0.30 },
};

// ============================================================
// TYPES
// ============================================================

interface Movie {
  id: string;
  title_en: string;
  release_year: number | null;
  
  // Core fields
  synopsis: string | null;
  poster_url: string | null;
  director: string | null;
  hero: string | null;
  heroine: string | null;
  genres: string[] | null;
  runtime_minutes: number | null;
  
  // IDs from external sources
  tmdb_id: number | null;
  imdb_id: string | null;
  wikidata_id: string | null;
  
  // Extended fields
  music_director: string | null;
  tagline: string | null;
  avg_rating: number | null;
  
  // New fields
  age_rating: string | null;
  mood_tags: string[] | null;
  audience_fit: string[] | null;
  
  // Existing confidence fields
  data_confidence: number | null;
  confidence_breakdown: ConfidenceBreakdown | null;
  
  // Source tracking
  data_sources: string[] | null;
  
  // Timestamps
  updated_at: string;
}

interface ConfidenceBreakdown {
  source_count: number;
  source_tiers: { tier1: number; tier2: number; tier3: number };
  source_weight_avg: number;
  field_completeness: number;
  data_age_days: number;
  editorial_alignment?: number;
  validation_pass_rate?: number;
  last_validation_date?: string;
  explanation: string;
}

// ============================================================
// CONFIDENCE CALCULATION
// ============================================================

/**
 * Calculate field completeness (0-1)
 * UPDATED: More generous scoring - core fields give baseline, optional fields add incrementally
 */
function calculateFieldCompleteness(movie: Movie): number {
  // Core fields (required) - having these gives a strong baseline
  const coreFields = [
    'title_en',
    'release_year',
    'director',
    'hero',
  ];
  
  // Important fields - add incrementally
  const importantFields = [
    'synopsis',
    'poster_url',
    'genres',
    'heroine',
  ];
  
  // Extended fields - nice to have, small additions
  const extendedFields = [
    'runtime_minutes',
    'tmdb_id',
    'imdb_id',
    'music_director',
    'tagline',
    'age_rating',
    'mood_tags',
    'audience_fit',
  ];
  
  // Check core fields - gives baseline of 0.40 if all present
  let coreScore = 0;
  coreFields.forEach(field => {
    const value = movie[field as keyof Movie];
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        if (value.length > 0) coreScore++;
      } else {
        coreScore++;
      }
    }
  });
  
  // Core completeness as baseline (40% max)
  const coreCompleteness = (coreScore / coreFields.length) * 0.40;
  
  // Important fields add incrementally (30% max)
  let importantScore = 0;
  importantFields.forEach(field => {
    const value = movie[field as keyof Movie];
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        if (value.length > 0) importantScore++;
      } else if (typeof value === 'string') {
        if (value.length > 10) importantScore++; // Quality check for strings
        else importantScore += 0.5;
      } else {
        importantScore++;
      }
    }
  });
  const importantCompleteness = (importantScore / importantFields.length) * 0.30;
  
  // Extended fields add small amounts (30% max)
  let extendedScore = 0;
  extendedFields.forEach(field => {
    const value = movie[field as keyof Movie];
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        if (value.length > 0) extendedScore++;
      } else {
        extendedScore++;
      }
    }
  });
  const extendedCompleteness = (extendedScore / extendedFields.length) * 0.30;
  
  // Total completeness
  const completeness = coreCompleteness + importantCompleteness + extendedCompleteness;
  
  return Math.round(completeness * 100) / 100;
}

/**
 * Calculate source quality score
 */
function calculateSourceScore(movie: Movie): { 
  sourceCount: number; 
  sourceTiers: { tier1: number; tier2: number; tier3: number };
  avgWeight: number;
} {
  const sources = new Set<string>();
  const sourceTiers = { tier1: 0, tier2: 0, tier3: 0 };
  
  // Infer sources from available IDs
  if (movie.tmdb_id) {
    sources.add('tmdb');
    sourceTiers.tier1++;
  }
  if (movie.imdb_id) {
    sources.add('imdb');
    sourceTiers.tier1++;
  }
  if (movie.wikidata_id) {
    sources.add('wikidata');
    sourceTiers.tier1++;
  }
  
  // If we have good synopsis, likely from Wikipedia
  if (movie.synopsis && movie.synopsis.length > 200) {
    sources.add('wikipedia');
    sourceTiers.tier1++;
  }
  
  // Include explicitly tracked sources
  if (movie.data_sources) {
    movie.data_sources.forEach(src => {
      const tier = SOURCE_TIERS[src.toLowerCase()];
      if (tier && !sources.has(src.toLowerCase())) {
        sources.add(src.toLowerCase());
        if (tier.tier === 1) sourceTiers.tier1++;
        else if (tier.tier === 2) sourceTiers.tier2++;
        else sourceTiers.tier3++;
      }
    });
  }
  
  // Calculate average weight
  let totalWeight = 0;
  sources.forEach(src => {
    const tier = SOURCE_TIERS[src];
    if (tier) totalWeight += tier.weight;
  });
  
  const avgWeight = sources.size > 0 ? totalWeight / sources.size : 0.3;
  
  return {
    sourceCount: sources.size,
    sourceTiers,
    avgWeight: Math.round(avgWeight * 100) / 100,
  };
}

/**
 * Calculate data age penalty
 */
function calculateDataAgePenalty(movie: Movie): number {
  const updatedAt = new Date(movie.updated_at);
  const now = new Date();
  const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
  
  // No penalty for first 30 days, then gradual decrease
  if (daysSinceUpdate <= 30) return 0;
  if (daysSinceUpdate <= 90) return 0.05;
  if (daysSinceUpdate <= 180) return 0.10;
  if (daysSinceUpdate <= 365) return 0.15;
  return 0.20;
}

/**
 * Calculate rating alignment bonus
 */
function calculateRatingAlignment(movie: Movie): number | undefined {
  const ratings: number[] = [];
  
  if (movie.avg_rating) ratings.push(movie.avg_rating / 2); // Normalize to 5-scale
  
  if (ratings.length < 2) return undefined;
  
  // Calculate variance
  const mean = ratings.reduce((a, b) => a + b) / ratings.length;
  const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length;
  
  // Low variance = high alignment
  const alignment = Math.max(0, 1 - variance);
  return Math.round(alignment * 100) / 100;
}

/**
 * Generate explanation text
 */
function generateExplanation(
  sourceCount: number, 
  sourceTiers: { tier1: number; tier2: number; tier3: number },
  completeness: number
): string {
  const parts: string[] = [];
  
  if (sourceCount === 0) {
    parts.push('No verified sources');
  } else if (sourceTiers.tier1 >= 2) {
    parts.push(`Verified by ${sourceTiers.tier1} authoritative sources`);
  } else if (sourceTiers.tier1 === 1) {
    parts.push('Verified by 1 authoritative source');
  } else if (sourceTiers.tier2 >= 2) {
    parts.push(`Supported by ${sourceTiers.tier2} reliable sources`);
  } else {
    parts.push('Limited source verification');
  }
  
  if (completeness >= 0.9) {
    parts.push('complete data profile');
  } else if (completeness >= 0.7) {
    parts.push('good data coverage');
  } else if (completeness < 0.5) {
    parts.push('partial data');
  }
  
  return parts.join(', ');
}

/**
 * Calculate overall confidence score
 * UPDATED: Higher baseline, more generous scoring for movies with core data
 */
function calculateConfidence(movie: Movie): { 
  confidence: number; 
  breakdown: ConfidenceBreakdown;
  trustBadge: string;
} {
  // 1. Field completeness (50% weight - increased for higher baseline)
  const completeness = calculateFieldCompleteness(movie);
  
  // 2. Source quality (30% weight)
  const { sourceCount, sourceTiers, avgWeight } = calculateSourceScore(movie);
  
  // 3. Data age penalty (max 10% reduction - reduced severity)
  const agePenalty = calculateDataAgePenalty(movie) * 0.5;
  
  // 4. Rating alignment bonus (up to 10%)
  const ratingAlignment = calculateRatingAlignment(movie);
  
  // Calculate days since update
  const updatedAt = new Date(movie.updated_at);
  const now = new Date();
  const dataAgeDays = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate base confidence with GENEROUS formula v3.0
  // Goal: Movies with good core data should easily reach 70%+
  
  // Start with baseline based on core data presence
  let confidence = 0.0;
  
  // Core data bonus (title, year, director, hero = 40% baseline)
  const hasCoreData = movie.title_en && movie.release_year && movie.director && movie.hero;
  if (hasCoreData) {
    confidence = 0.40; // Strong baseline for having core data
  } else {
    confidence = 0.20; // Minimal baseline
  }
  
  // Field completeness adds up to 35% (was 50% but baseline is now higher)
  confidence += completeness * 0.35;
  
  // Source quality adds up to 15%
  confidence += avgWeight * 0.15;
  
  // Source count bonus (up to 10%)
  confidence += Math.min(sourceCount, 3) * 0.033; // ~10% for 3+ sources
  
  // Poster bonus (5%) - visual completeness matters
  if (movie.poster_url && !movie.poster_url.includes('placeholder')) {
    confidence += 0.05;
  }
  
  // Synopsis bonus (5%) - content completeness
  if (movie.synopsis && movie.synopsis.length > 100) {
    confidence += 0.05;
  }
  
  // Rating alignment bonus (up to 5%)
  if (ratingAlignment !== undefined) {
    confidence += ratingAlignment * 0.05;
  }
  
  // Apply penalties (reduced severity)
  confidence = confidence - (agePenalty * 0.5);
  
  // Ensure within bounds
  confidence = Math.max(0.15, Math.min(1, confidence)); // Minimum 15%
  confidence = Math.round(confidence * 100) / 100;
  
  // Determine trust badge - REALISTIC thresholds
  // With good core data + poster + synopsis, should easily hit "high"
  let trustBadge: string;
  if (confidence >= 0.80 && sourceTiers.tier1 >= 2) {
    trustBadge = 'verified';  // Verified: 80%+ and 2+ tier1 sources
  } else if (confidence >= 0.60) {
    trustBadge = 'high';      // High: 60%+ (was 65%)
  } else if (confidence >= 0.40) {
    trustBadge = 'medium';    // Medium: 40%+ (was 45%)
  } else if (confidence >= 0.20) {
    trustBadge = 'low';       // Low: 20%+ (was 25%)
  } else {
    trustBadge = 'unverified';
  }
  
  // Build breakdown
  const breakdown: ConfidenceBreakdown = {
    source_count: sourceCount,
    source_tiers: sourceTiers,
    source_weight_avg: avgWeight,
    field_completeness: completeness,
    data_age_days: dataAgeDays,
    explanation: generateExplanation(sourceCount, sourceTiers, completeness),
  };
  
  if (ratingAlignment !== undefined) {
    breakdown.editorial_alignment = ratingAlignment;
  }
  
  return { confidence, breakdown, trustBadge };
}

// ============================================================
// MAIN ENRICHMENT
// ============================================================

async function enrichTrustConfidence(limit: number, dryRun: boolean): Promise<void> {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════╗
║         TRUST & CONFIDENCE SCORE ENRICHMENT                      ║
╚══════════════════════════════════════════════════════════════════╝
`));

  // Fetch movies - only columns that exist
  const { data: movies, error } = await supabase
    .from('movies')
    .select(`
      id, title_en, release_year, synopsis, poster_url,
      director, hero, heroine, genres, runtime_minutes,
      tmdb_id, imdb_id, wikidata_id,
      music_director, tagline, avg_rating,
      age_rating, mood_tags, audience_fit,
      data_confidence, confidence_breakdown, data_sources,
      updated_at
    `)
    .eq('is_published', true)
    .eq('language', 'Telugu')  // Focus on Telugu movies
    .or('data_confidence.lt.0.6,data_confidence.is.null')  // Only movies needing update
    .order('release_year', { ascending: false })  // Most recent first
    .limit(limit);

  if (error) {
    console.error(chalk.red('Error fetching movies:'), error.message);
    return;
  }

  if (!movies || movies.length === 0) {
    console.log(chalk.green('✅ No movies to process!'));
    return;
  }

  console.log(chalk.gray(`Found ${movies.length} movies to process\n`));

  if (dryRun) {
    console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be made\n'));
  }

  let processed = 0;
  let updated = 0;
  let failed = 0;
  
  const badgeDistribution: Record<string, number> = {
    verified: 0,
    high: 0,
    medium: 0,
    low: 0,
    unverified: 0,
  };

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i] as Movie;
    process.stdout.write(`\r  Processing: ${i + 1}/${movies.length} - ${movie.title_en?.substring(0, 30)}...`);

    try {
      const { confidence, breakdown, trustBadge } = calculateConfidence(movie);
      
      badgeDistribution[trustBadge]++;
      
      // Check if update needed
      const confidenceChanged = Math.abs((movie.data_confidence || 0) - confidence) > 0.01;
      
      if (!confidenceChanged) {
        processed++;
        continue;
      }

      if (dryRun) {
        console.log(chalk.gray(`\n  ${movie.title_en}: ${confidence} (${trustBadge}) - ${breakdown.explanation}`));
        processed++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('movies')
        .update({
          data_confidence: confidence,
          confidence_breakdown: breakdown,
          trust_badge: trustBadge,
        })
        .eq('id', movie.id);

      if (updateError) {
        console.error(chalk.red(`\n  ❌ Failed to update ${movie.title_en}: ${updateError.message}`));
        failed++;
      } else {
        updated++;
      }
      
      processed++;
    } catch (err) {
      console.error(chalk.red(`\n  ❌ Error processing ${movie.title_en}:`), err);
      failed++;
    }
  }

  console.log(`\n`);
  console.log(chalk.green(`\n✅ Enrichment complete!`));
  console.log(chalk.gray(`   Processed: ${processed}`));
  console.log(chalk.gray(`   Updated: ${updated}`));
  console.log(chalk.gray(`   Failed: ${failed}`));
  
  console.log(chalk.cyan('\n📊 Trust Badge Distribution:'));
  console.log(chalk.green(`   ✓ Verified: ${badgeDistribution.verified}`));
  console.log(chalk.blue(`   ◉ High: ${badgeDistribution.high}`));
  console.log(chalk.yellow(`   ○ Medium: ${badgeDistribution.medium}`));
  console.log(chalk.magenta(`   △ Low: ${badgeDistribution.low}`));
  console.log(chalk.gray(`   ? Unverified: ${badgeDistribution.unverified}`));

  // Show sample results
  if (!dryRun) {
    const { data: samples } = await supabase
      .from('movies')
      .select('title_en, data_confidence, trust_badge, confidence_breakdown')
      .not('data_confidence', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (samples?.length) {
      console.log(chalk.cyan('\n📋 Sample results:'));
      samples.forEach((m: { title_en: string; data_confidence: number | null; trust_badge: string | null; confidence_breakdown: ConfidenceBreakdown | null }) => {
        const badge = m.trust_badge || 'unknown';
        const conf = m.data_confidence ? (m.data_confidence * 100).toFixed(0) + '%' : 'N/A';
        const explanation = m.confidence_breakdown?.explanation || 'No explanation';
        console.log(`   ${m.title_en}: ${conf} [${badge}] - ${explanation}`);
      });
    }
  }
}

// ============================================================
// CLI
// ============================================================

const args = process.argv.slice(2);
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '500');
const dryRun = args.includes('--dry') || args.includes('--dry-run');

enrichTrustConfidence(limit, dryRun).catch(console.error);


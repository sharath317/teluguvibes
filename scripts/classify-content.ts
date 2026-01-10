#!/usr/bin/env npx tsx
/**
 * Content Classification Script
 * 
 * Derives content profiles from existing movie data:
 * - Certification (A, U/A, U)
 * - Genres (horror, action, romance)
 * - Keywords and tags
 * - Existing content flags
 * 
 * Usage:
 *   npx tsx scripts/classify-content.ts --limit=100 --execute
 *   npx tsx scripts/classify-content.ts --movie=123 --execute
 *   npx tsx scripts/classify-content.ts --unclassified --execute
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { 
  ContentProfile, 
  ContentCategory, 
  SensitivityLevel, 
  AudienceRating,
  ContentWarning,
  SensitivityFlags,
  SensitivityFlagsWithMeta,
  DEFAULT_FAMILY_SAFE_PROFILE
} from '../types/content';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// CLASSIFICATION RULES
// ============================================================

/**
 * Genre to sensitivity mapping
 */
const GENRE_SENSITIVITY: Record<string, SensitivityFlagsWithMeta> = {
  'Horror': { horror: 'moderate', themes: 'moderate' },
  'Thriller': { themes: 'mild', violence: 'mild' },
  'Action': { violence: 'moderate' },
  'Crime': { violence: 'mild', themes: 'mild' },
  'War': { violence: 'moderate', themes: 'moderate' },
  'Drama': { themes: 'mild' },
  'Romance': { sexual: 'mild' },
  'Adult': { sexual: 'explicit', isAdult: true },
  'Erotic': { sexual: 'explicit', isAdult: true },
  'Animation': { violence: 'none' },
  'Family': { violence: 'none', themes: 'none' },
  'Comedy': { language: 'mild' },
};

/**
 * Certification to audience rating mapping
 */
const CERTIFICATION_TO_RATING: Record<string, AudienceRating> = {
  'U': 'U',
  'G': 'U',
  'U/A': 'U/A',
  'UA': 'U/A',
  'PG': 'U/A',
  'PG-13': 'U/A',
  '12A': 'U/A',
  'A': 'A',
  'R': 'A',
  '18': 'A',
  'NC-17': 'A',
  'S': 'S',
  'X': 'S',
};

/**
 * Keywords that indicate content warnings
 */
const KEYWORD_WARNINGS: Record<string, ContentWarning[]> = {
  'violence': ['violence_graphic'],
  'gore': ['violence_graphic'],
  'blood': ['violence_graphic'],
  'murder': ['death_murder'],
  'suicide': ['death_suicide'],
  'drugs': ['drug_use'],
  'alcohol': ['alcohol_abuse'],
  'smoking': ['smoking'],
  'nudity': ['nudity'],
  'sex': ['sexual_content'],
  'abuse': ['violence_domestic'],
  'rape': ['violence_sexual'],
  'discrimination': ['discrimination'],
  'racism': ['discrimination'],
};

// ============================================================
// CLASSIFICATION LOGIC
// ============================================================

interface MovieData {
  id: string;
  title_en: string;
  genres: string[] | null;
  certification: string | null;
  keywords: string[] | null;
  content_flags: string[] | null;
  mood_tags: string[] | null;
  is_adult: boolean | null;
  release_year: number | null;
}

function classifyMovie(movie: MovieData): ContentProfile {
  const profile: ContentProfile = {
    ...DEFAULT_FAMILY_SAFE_PROFILE,
    classifiedAt: new Date().toISOString(),
    classifiedBy: 'auto',
    confidence: 0.7,
  };

  const genres = movie.genres || [];
  const keywords = movie.keywords || [];
  const contentFlags = movie.content_flags || [];
  const moodTags = movie.mood_tags || [];
  const allKeywords = [...keywords, ...contentFlags, ...moodTags].map(k => k.toLowerCase());

  // 1. Determine category
  profile.category = determineCategory(genres, movie);

  // 2. Apply genre-based sensitivity
  for (const genre of genres) {
    const sensitivity = GENRE_SENSITIVITY[genre];
    if (sensitivity) {
      applySensitivity(profile.sensitivity, sensitivity);
    }
  }

  // 3. Apply certification-based rating
  if (movie.certification) {
    const certUpper = movie.certification.toUpperCase();
    if (CERTIFICATION_TO_RATING[certUpper]) {
      profile.audienceRating = CERTIFICATION_TO_RATING[certUpper];
    }
  }

  // 4. Scan keywords for warnings
  const warnings: Set<ContentWarning> = new Set();
  for (const keyword of allKeywords) {
    for (const [trigger, warningList] of Object.entries(KEYWORD_WARNINGS)) {
      if (keyword.includes(trigger)) {
        warningList.forEach(w => warnings.add(w));
      }
    }
  }
  profile.warnings = Array.from(warnings);

  // 5. Set adult flag
  if (movie.is_adult || genres.includes('Adult') || genres.includes('Erotic')) {
    profile.isAdult = true;
    profile.isFamilySafe = false;
    profile.audienceRating = 'A';
    profile.minimumAge = 18;
  }

  // 6. Calculate family-safe status
  profile.isFamilySafe = calculateFamilySafe(profile);
  
  // 7. Set minimum age
  profile.minimumAge = getMinimumAgeFromRating(profile.audienceRating);

  // 8. Determine if warning needed
  profile.requiresWarning = profile.warnings.length > 0 || !profile.isFamilySafe;

  // 9. Calculate confidence
  profile.confidence = calculateConfidence(movie, profile);

  return profile;
}

function determineCategory(genres: string[], movie: MovieData): ContentCategory {
  if (genres.includes('Documentary')) return 'documentary';
  if (genres.includes('Animation')) return 'animation';
  if (genres.includes('Short')) return 'short';
  if (genres.includes('Music') || genres.includes('Concert')) return 'concert';
  if (genres.includes('TV Movie')) return 'tv_movie';
  return 'feature';
}

function applySensitivity(
  target: SensitivityFlags, 
  source: Partial<SensitivityFlags>
): void {
  const levels: SensitivityLevel[] = ['none', 'mild', 'moderate', 'intense', 'explicit'];
  
  for (const [key, value] of Object.entries(source)) {
    if (key in target && typeof value === 'string') {
      const currentIndex = levels.indexOf(target[key as keyof SensitivityFlags]);
      const newIndex = levels.indexOf(value as SensitivityLevel);
      if (newIndex > currentIndex) {
        (target as any)[key] = value;
      }
    }
  }
}

function calculateFamilySafe(profile: ContentProfile): boolean {
  if (profile.isAdult) return false;
  if (profile.audienceRating === 'A' || profile.audienceRating === 'S') return false;
  
  const highSensitivity: SensitivityLevel[] = ['intense', 'explicit'];
  for (const value of Object.values(profile.sensitivity)) {
    if (highSensitivity.includes(value)) return false;
  }
  
  // Check for severe warnings
  const severeWarnings: ContentWarning[] = [
    'violence_sexual', 'violence_graphic', 'nudity', 'sexual_content'
  ];
  if (profile.warnings.some(w => severeWarnings.includes(w))) return false;
  
  return true;
}

function getMinimumAgeFromRating(rating: AudienceRating): number {
  switch (rating) {
    case 'U': return 0;
    case 'U/A': return 12;
    case 'A': return 18;
    case 'S': return 21;
    default: return 0;
  }
}

function calculateConfidence(movie: MovieData, profile: ContentProfile): number {
  let confidence = 0.5;
  
  // Has certification = +0.2
  if (movie.certification) confidence += 0.2;
  
  // Has genres = +0.1
  if (movie.genres && movie.genres.length > 0) confidence += 0.1;
  
  // Has keywords/tags = +0.1
  if ((movie.keywords?.length || 0) + (movie.content_flags?.length || 0) > 0) {
    confidence += 0.1;
  }
  
  // Explicit adult flag = +0.1
  if (movie.is_adult !== null) confidence += 0.1;
  
  return Math.min(confidence, 1.0);
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '100');
  const movieId = args.find(a => a.startsWith('--movie='))?.split('=')[1];
  const unclassifiedOnly = args.includes('--unclassified');

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║             CONTENT CLASSIFICATION SCRIPT                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Build query
  let query = supabase
    .from('movies')
    .select('id, title_en, genres, certification, keywords, content_flags, mood_tags, is_adult, release_year')
    .eq('is_published', true);

  if (movieId) {
    query = query.eq('id', movieId);
  } else if (unclassifiedOnly) {
    query = query.is('content_profile', null);
  }

  query = query.limit(limit);

  const { data: movies, error } = await query;

  if (error) {
    console.error('Error fetching movies:', error);
    process.exit(1);
  }

  console.log(`Found ${movies?.length || 0} movies to classify\n`);

  if (!movies || movies.length === 0) {
    console.log('No movies to classify.');
    return;
  }

  // Statistics
  const stats = {
    total: movies.length,
    familySafe: 0,
    adult: 0,
    needsReview: 0,
    byRating: { U: 0, UA: 0, 'U/A': 0, A: 0, S: 0 },
  };

  // Process each movie
  const updates: { id: string; content_profile: ContentProfile }[] = [];

  for (const movie of movies) {
    const profile = classifyMovie(movie);
    
    updates.push({ id: movie.id, content_profile: profile });

    // Update stats
    if (profile.isFamilySafe) stats.familySafe++;
    if (profile.isAdult) stats.adult++;
    if ((profile.confidence ?? 1) < 0.7) stats.needsReview++;
    stats.byRating[profile.audienceRating]++;

    if (!execute) {
      console.log(`📽️  ${movie.title_en}`);
      console.log(`    Rating: ${profile.audienceRating} | Family Safe: ${profile.isFamilySafe ? '✅' : '❌'} | Confidence: ${((profile.confidence ?? 1) * 100).toFixed(0)}%`);
      if (profile.warnings.length > 0) {
        console.log(`    Warnings: ${profile.warnings.join(', ')}`);
      }
    }
  }

  // Summary
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('CLASSIFICATION SUMMARY');
  console.log('════════════════════════════════════════════════════════════════\n');
  console.log(`Total Movies: ${stats.total}`);
  console.log(`Family Safe: ${stats.familySafe} (${(stats.familySafe/stats.total*100).toFixed(1)}%)`);
  console.log(`Adult Only: ${stats.adult} (${(stats.adult/stats.total*100).toFixed(1)}%)`);
  console.log(`Needs Review: ${stats.needsReview} (${(stats.needsReview/stats.total*100).toFixed(1)}%)`);
  console.log('\nBy Rating:');
  console.log(`  U (Universal): ${stats.byRating.U}`);
  console.log(`  U/A (12+): ${stats.byRating['U/A']}`);
  console.log(`  A (18+): ${stats.byRating.A}`);
  console.log(`  S (Restricted): ${stats.byRating.S}`);

  // Execute updates
  if (execute) {
    console.log('\n🔄 Applying classifications...');
    
    let successCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('movies')
        .update({ content_profile: update.content_profile })
        .eq('id', update.id);

      if (updateError) {
        console.error(`❌ Error updating ${update.id}:`, updateError.message);
        errorCount++;
      } else {
        successCount++;
      }
    }

    console.log(`\n✅ Successfully classified ${successCount} movies`);
    if (errorCount > 0) {
      console.log(`❌ Failed to classify ${errorCount} movies`);
    }
  } else {
    console.log('\n⚠️  DRY RUN - No changes made. Add --execute to apply.');
  }
}

main().catch(console.error);



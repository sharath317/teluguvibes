/**
 * Taxonomy and Categorization Enrichment Script
 * 
 * Enriches movies with structured taxonomy including primary/secondary genres,
 * era classification, tone/style categorization, and content sensitivity flags.
 * 
 * Usage:
 *   npx ts-node scripts/enrich-taxonomy.ts [--limit=N] [--dry]
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
// TAXONOMY MAPPINGS
// ============================================================

// Era definitions
const ERA_DEFINITIONS: Array<{ name: string; start: number; end: number; style: string }> = [
  { name: 'Golden Era', start: 1940, end: 1970, style: 'theatrical, classical music, mythological themes' },
  { name: 'Romantic Era', start: 1970, end: 1990, style: 'family dramas, love stories, comedy' },
  { name: 'Mass Era', start: 1990, end: 2005, style: 'mass masala, action, faction dramas' },
  { name: 'New Wave', start: 2005, end: 2015, style: 'experimental, urban, realistic' },
  { name: 'Pan-Indian', start: 2015, end: 2030, style: 'big budget, VFX, multi-lingual releases' },
];

// Genre hierarchy - primary genres and their related secondary genres
const GENRE_HIERARCHY: Record<string, string[]> = {
  'Action': ['Mass Masala', 'Martial Arts', 'Vigilante', 'Faction'],
  'Drama': ['Family', 'Social', 'Political', 'Courtroom', 'Sports'],
  'Romance': ['Romantic Comedy', 'Romantic Drama', 'Musical Romance'],
  'Comedy': ['Slapstick', 'Satirical', 'Black Comedy', 'Romantic Comedy'],
  'Thriller': ['Psychological', 'Crime', 'Mystery', 'Suspense'],
  'Horror': ['Supernatural', 'Psychological Horror', 'Slasher'],
  'Historical': ['Period Drama', 'Biographical', 'War', 'Mythological'],
  'Fantasy': ['Mythological', 'Supernatural', 'Sci-Fi'],
  'Animation': ['Family Animation', 'Adult Animation'],
};

// Tone/Style categories
const TONE_MAPPINGS: Array<{ pattern: RegExp | string[]; tone: string }> = [
  { pattern: ['comedy', 'family'], tone: 'light_entertainment' },
  { pattern: ['thriller', 'horror', 'crime'], tone: 'intense' },
  { pattern: ['drama', 'biographical'], tone: 'serious' },
  { pattern: ['action', 'mass'], tone: 'commercial' },
  { pattern: ['mythological', 'historical'], tone: 'epic' },
  { pattern: ['romance', 'romantic'], tone: 'emotional' },
  { pattern: ['experimental', 'art'], tone: 'artistic' },
];

// Content sensitivity patterns
const SENSITIVITY_PATTERNS = {
  violence: {
    genres: ['action', 'war', 'gangster', 'crime', 'thriller'],
    keywords: ['violent', 'brutal', 'gore', 'blood', 'fight'],
    level: 'moderate' as const,
  },
  mature_themes: {
    genres: ['adult', 'erotic'],
    keywords: ['sexual', 'nudity', 'intimate', 'explicit'],
    level: 'high' as const,
  },
  substance: {
    genres: [],
    keywords: ['drugs', 'alcohol', 'smoking', 'addiction'],
    level: 'low' as const,
  },
  language: {
    genres: ['crime', 'gangster'],
    keywords: ['abuse', 'profanity', 'slang'],
    level: 'moderate' as const,
  },
  dark_themes: {
    genres: ['horror', 'psychological thriller'],
    keywords: ['suicide', 'depression', 'trauma', 'death'],
    level: 'moderate' as const,
  },
};

// ============================================================
// TYPES
// ============================================================

interface Movie {
  id: string;
  title_en: string;
  release_year: number | null;
  genres: string[] | null;
  overview: string | null;
  synopsis: string | null;
  age_rating: string | null;
  content_flags: Record<string, unknown> | null;
  
  // Taxonomy fields (to be enriched)
  primary_genre: string | null;
  secondary_genres: string[] | null;
  era: string | null;
  decade: string | null;
  tone: string | null;
  style_tags: string[] | null;
  content_sensitivity: Record<string, unknown> | null;
  content_type: string | null;
  audience_suitability: string | null;
}

interface TaxonomyResult {
  primary_genre: string | null;
  secondary_genres: string[];
  era: string;
  decade: string;
  tone: string;
  style_tags: string[];
  content_sensitivity: {
    violence: boolean;
    mature_themes: boolean;
    substance: boolean;
    language: boolean;
    dark_themes: boolean;
    overall_level: 'none' | 'low' | 'moderate' | 'high';
  };
  content_type: string;
  audience_suitability: string;
}

// ============================================================
// TAXONOMY DERIVATION
// ============================================================

function deriveEra(year: number | null): string {
  if (!year) return 'Unknown';
  
  for (const era of ERA_DEFINITIONS) {
    if (year >= era.start && year <= era.end) {
      return era.name;
    }
  }
  
  return 'Contemporary';
}

function deriveDecade(year: number | null): string {
  if (!year) return 'Unknown';
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

function derivePrimaryGenre(genres: string[] | null): string | null {
  if (!genres || genres.length === 0) return null;
  
  // Map to primary genres
  for (const primary of Object.keys(GENRE_HIERARCHY)) {
    if (genres.some(g => g.toLowerCase().includes(primary.toLowerCase()))) {
      return primary;
    }
  }
  
  return genres[0]; // Fallback to first genre
}

function deriveSecondaryGenres(genres: string[] | null, primaryGenre: string | null): string[] {
  if (!genres || genres.length === 0) return [];
  
  const secondary: string[] = [];
  
  for (const genre of genres) {
    // Skip if it's the primary genre
    if (primaryGenre && genre.toLowerCase() === primaryGenre.toLowerCase()) {
      continue;
    }
    
    // Check if it's a recognized secondary genre
    let found = false;
    for (const [primary, secondaries] of Object.entries(GENRE_HIERARCHY)) {
      if (secondaries.some(s => genre.toLowerCase().includes(s.toLowerCase()))) {
        secondary.push(genre);
        found = true;
        break;
      }
    }
    
    // Add as-is if not a primary genre
    if (!found && !Object.keys(GENRE_HIERARCHY).some(p => p.toLowerCase() === genre.toLowerCase())) {
      secondary.push(genre);
    }
  }
  
  return secondary.slice(0, 3); // Limit to 3 secondary genres
}

function deriveTone(genres: string[] | null, overview: string | null): string {
  const text = (genres?.join(' ') + ' ' + (overview || '')).toLowerCase();
  
  for (const mapping of TONE_MAPPINGS) {
    if (Array.isArray(mapping.pattern)) {
      if (mapping.pattern.some(p => text.includes(p))) {
        return mapping.tone;
      }
    }
  }
  
  return 'neutral';
}

function deriveStyleTags(movie: Movie): string[] {
  const tags: string[] = [];
  const era = deriveEra(movie.release_year);
  
  // Era-based styles
  if (era === 'Golden Era') {
    tags.push('classic');
    if (movie.genres?.some(g => g.toLowerCase().includes('mythological'))) {
      tags.push('devotional');
    }
  } else if (era === 'Mass Era') {
    tags.push('masala');
    if (movie.genres?.some(g => ['action', 'faction'].some(a => g.toLowerCase().includes(a)))) {
      tags.push('mass-appeal');
    }
  } else if (era === 'New Wave') {
    tags.push('contemporary');
    tags.push('experimental');
  } else if (era === 'Pan-Indian') {
    tags.push('modern');
    if (movie.content_flags?.pan_india) {
      tags.push('pan-india');
    }
  }
  
  // Genre-based styles
  if (movie.genres?.some(g => g.toLowerCase().includes('biographical'))) {
    tags.push('biopic');
  }
  if (movie.genres?.some(g => g.toLowerCase().includes('documentary'))) {
    tags.push('documentary');
  }
  
  return [...new Set(tags)].slice(0, 5);
}

function deriveContentSensitivity(movie: Movie): TaxonomyResult['content_sensitivity'] {
  const result = {
    violence: false,
    mature_themes: false,
    substance: false,
    language: false,
    dark_themes: false,
    overall_level: 'none' as const,
  };
  
  const genres = movie.genres?.map(g => g.toLowerCase()) || [];
  const text = ((movie.overview || '') + ' ' + (movie.synopsis || '')).toLowerCase();
  
  // Check each sensitivity type
  for (const [key, config] of Object.entries(SENSITIVITY_PATTERNS)) {
    const hasGenre = config.genres.some(g => genres.some(mg => mg.includes(g)));
    const hasKeyword = config.keywords.some(k => text.includes(k));
    
    if (hasGenre || hasKeyword) {
      result[key as keyof typeof result] = true;
    }
  }
  
  // Determine overall level
  const flags = [result.violence, result.mature_themes, result.substance, result.language, result.dark_themes];
  const flagCount = flags.filter(Boolean).length;
  
  if (result.mature_themes) {
    result.overall_level = 'high';
  } else if (flagCount >= 2 || result.violence) {
    result.overall_level = 'moderate';
  } else if (flagCount === 1) {
    result.overall_level = 'low';
  }
  
  // Adjust based on age rating
  if (movie.age_rating === 'A' || movie.age_rating === 'S') {
    result.overall_level = 'high';
  } else if (movie.age_rating === 'U') {
    result.overall_level = 'none';
  }
  
  return result;
}

function deriveContentType(movie: Movie): string {
  // Default to 'fact' for most content
  let contentType = 'fact';
  
  // Check for different types
  if (movie.content_flags?.biopic) {
    contentType = 'archive'; // Historical/archival content
  }
  
  // Check overview for indicators
  const overview = (movie.overview || '').toLowerCase();
  if (overview.includes('fictional') || overview.includes('inspired by')) {
    contentType = 'editorial'; // Fictionalized account
  }
  
  return contentType;
}

function deriveAudienceSuitability(
  sensitivity: TaxonomyResult['content_sensitivity'],
  ageRating: string | null
): string {
  if (ageRating === 'U') return 'all_ages';
  if (ageRating === 'U/A') return 'family_with_guidance';
  if (ageRating === 'A') return 'adults_only';
  if (ageRating === 'S') return 'restricted';
  
  // Derive from sensitivity
  if (sensitivity.overall_level === 'high') return 'adults_only';
  if (sensitivity.overall_level === 'moderate') return 'family_with_guidance';
  if (sensitivity.overall_level === 'low') return 'general_audience';
  
  return 'general_audience';
}

function deriveTaxonomy(movie: Movie): TaxonomyResult {
  const primaryGenre = derivePrimaryGenre(movie.genres);
  const secondaryGenres = deriveSecondaryGenres(movie.genres, primaryGenre);
  const era = deriveEra(movie.release_year);
  const decade = deriveDecade(movie.release_year);
  const tone = deriveTone(movie.genres, movie.overview);
  const styleTags = deriveStyleTags(movie);
  const contentSensitivity = deriveContentSensitivity(movie);
  const contentType = deriveContentType(movie);
  const audienceSuitability = deriveAudienceSuitability(contentSensitivity, movie.age_rating);
  
  return {
    primary_genre: primaryGenre,
    secondary_genres: secondaryGenres,
    era,
    decade,
    tone,
    style_tags: styleTags,
    content_sensitivity: contentSensitivity,
    content_type: contentType,
    audience_suitability: audienceSuitability,
  };
}

// ============================================================
// MAIN ENRICHMENT
// ============================================================

async function enrichTaxonomy(limit: number, dryRun: boolean): Promise<void> {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════╗
║         TAXONOMY & CATEGORIZATION ENRICHMENT                     ║
╚══════════════════════════════════════════════════════════════════╝
`));

  // Fetch movies
  const { data: movies, error } = await supabase
    .from('movies')
    .select(`
      id, title_en, release_year, genres, overview, synopsis,
      age_rating, content_flags,
      primary_genre, secondary_genres, era, decade, tone,
      style_tags, content_sensitivity, content_type, audience_suitability
    `)
    .eq('is_published', true)
    .or('primary_genre.is.null,era.is.null')
    .order('release_year', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(chalk.red('Error fetching movies:'), error.message);
    return;
  }

  if (!movies || movies.length === 0) {
    console.log(chalk.green('✅ No movies need taxonomy enrichment!'));
    return;
  }

  console.log(chalk.gray(`Found ${movies.length} movies to process\n`));

  if (dryRun) {
    console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be made\n'));
  }

  let processed = 0;
  let updated = 0;
  let failed = 0;
  
  const eraDistribution: Record<string, number> = {};
  const toneDistribution: Record<string, number> = {};
  const sensitivityDistribution: Record<string, number> = {};

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i] as Movie;
    process.stdout.write(`\r  Processing: ${i + 1}/${movies.length} - ${movie.title_en?.substring(0, 30)}...`);

    try {
      const taxonomy = deriveTaxonomy(movie);
      
      // Track distributions
      eraDistribution[taxonomy.era] = (eraDistribution[taxonomy.era] || 0) + 1;
      toneDistribution[taxonomy.tone] = (toneDistribution[taxonomy.tone] || 0) + 1;
      sensitivityDistribution[taxonomy.content_sensitivity.overall_level] = 
        (sensitivityDistribution[taxonomy.content_sensitivity.overall_level] || 0) + 1;

      if (dryRun) {
        console.log(chalk.gray(`\n  ${movie.title_en}:`));
        console.log(chalk.gray(`    Primary: ${taxonomy.primary_genre}, Secondary: ${taxonomy.secondary_genres.join(', ')}`));
        console.log(chalk.gray(`    Era: ${taxonomy.era}, Decade: ${taxonomy.decade}, Tone: ${taxonomy.tone}`));
        console.log(chalk.gray(`    Sensitivity: ${taxonomy.content_sensitivity.overall_level}, Audience: ${taxonomy.audience_suitability}`));
        processed++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('movies')
        .update({
          primary_genre: taxonomy.primary_genre,
          secondary_genres: taxonomy.secondary_genres,
          era: taxonomy.era,
          decade: taxonomy.decade,
          tone: taxonomy.tone,
          style_tags: taxonomy.style_tags,
          content_sensitivity: taxonomy.content_sensitivity,
          content_type: taxonomy.content_type,
          audience_suitability: taxonomy.audience_suitability,
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
  
  console.log(chalk.cyan('\n📊 Era Distribution:'));
  Object.entries(eraDistribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([era, count]) => console.log(`   ${era}: ${count}`));
  
  console.log(chalk.cyan('\n🎭 Tone Distribution:'));
  Object.entries(toneDistribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tone, count]) => console.log(`   ${tone}: ${count}`));
  
  console.log(chalk.cyan('\n⚠️ Content Sensitivity:'));
  Object.entries(sensitivityDistribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([level, count]) => console.log(`   ${level}: ${count}`));
}

// ============================================================
// CLI
// ============================================================

const args = process.argv.slice(2);
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '500');
const dryRun = args.includes('--dry') || args.includes('--dry-run');

enrichTaxonomy(limit, dryRun).catch(console.error);


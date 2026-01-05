/**
 * Phase 5: Smart Tag System
 * 
 * Structured, deterministic tags derived from signals.
 * NO free text - all tags are typed and recomputable.
 */

import { getSupabaseClient } from '../supabase/client';
import {
  TagCategory,
  StructuredTag,
  NARRATIVE_TAGS,
  TONE_TAGS,
  CULTURAL_TAGS,
  CAREER_TAGS
} from './types';

// ============================================================
// GENRE TO TAG MAPPING
// ============================================================

const GENRE_TO_NARRATIVE: Record<string, typeof NARRATIVE_TAGS[number][]> = {
  'Action': ['action'],
  'Comedy': ['comedy'],
  'Drama': ['family', 'emotional'],
  'Romance': ['romance'],
  'Thriller': ['thriller'],
  'Crime': ['thriller', 'action'],
  'Horror': ['thriller'],
  'History': ['historical', 'biographical'],
  'War': ['patriotic', 'action'],
  'Family': ['family'],
  'Fantasy': ['mythology'],
  'Animation': ['family'],
  'Documentary': ['biographical'],
  'Music': ['romance', 'family'],
  'Adventure': ['action'],
  'Mystery': ['thriller'],
  'Science Fiction': ['action'],
  'Western': ['action'],
  'TV Movie': ['family']
};

const GENRE_TO_TONE: Record<string, typeof TONE_TAGS[number][]> = {
  'Action': ['mass', 'commercial'],
  'Comedy': ['light_hearted', 'commercial'],
  'Drama': ['emotional', 'realistic'],
  'Romance': ['emotional', 'commercial'],
  'Thriller': ['intense'],
  'Horror': ['intense'],
  'Art': ['artistic', 'experimental'],
  'Documentary': ['realistic'],
  'Animation': ['light_hearted']
};

// ============================================================
// KEYWORD SIGNALS
// ============================================================

const KEYWORD_PATTERNS = {
  narrative: {
    'revenge': /revenge|ప్రతీకారం|badla|enemy|rival|వంచన/i,
    'family': /family|కుటుంబం|mother|father|brother|అమ్మ|నాన్న/i,
    'political': /politics|political|election|minister|CM|MLA|రాజకీయ/i,
    'romance': /love|romance|lover|ప్రేమ|heart|wedding|పెళ్లి/i,
    'social_message': /social|message|society|change|సమాజం|awareness/i,
    'biographical': /biopic|biography|real life|true story|legend/i,
    'mythology': /god|goddess|temple|mythological|దేవుడు|పురాణ/i,
    'rural': /village|పల్లె|farmer|agriculture|గ్రామం/i,
    'patriotic': /patriot|india|freedom|soldier|army|దేశం|సైనికుడు/i,
  },
  tone: {
    'mass': /mass|commercial|blockbuster|hero|star|మాస్/i,
    'experimental': /experiment|different|unique|indie|art/i,
    'emotional': /emotion|heart|tears|touching|హృదయ|కన్నీళ్లు/i,
    'intense': /intense|dark|thriller|suspense|crime/i,
    'realistic': /realistic|real|authentic|సహజ/i,
  },
  cultural: {
    'village': /village|పల్లె|rural|గ్రామం|farmer/i,
    'festival': /festival|పండుగ|celebration|sankranti|diwali|dasara/i,
    'mythology': /mythology|god|temple|దేవాలయం|పురాణ/i,
    'historical': /history|historical|era|యుగం|చరిత్ర/i,
    'telangana': /telangana|hyderabad|తెలంగాణ|deccan/i,
    'coastal_andhra': /vizag|visakhapatnam|guntur|vijayawada|coastal|ఆంధ్ర/i,
    'rayalaseema': /rayalaseema|kurnool|anantapur|kadapa|రాయలసీమ/i,
    'nri': /nri|america|usa|abroad|విదేశం|foreign/i,
    'urban_hyderabad': /hyderabad|city|metro|హైదరాబాద్|urban/i,
  }
};

// ============================================================
// TAG DERIVATION
// ============================================================

function deriveFromGenres(genres: string[]): StructuredTag[] {
  const tags: StructuredTag[] = [];
  
  genres.forEach(genre => {
    // Narrative tags from genre
    const narrativeTags = GENRE_TO_NARRATIVE[genre] || [];
    narrativeTags.forEach(tagValue => {
      tags.push({
        id: `narrative_${tagValue}`,
        category: 'narrative',
        value: tagValue,
        derived_from: [`genre:${genre}`],
        confidence: 0.8,
        deterministic: true
      });
    });
    
    // Tone tags from genre
    const toneTags = GENRE_TO_TONE[genre] || [];
    toneTags.forEach(tagValue => {
      tags.push({
        id: `tone_${tagValue}`,
        category: 'tone',
        value: tagValue,
        derived_from: [`genre:${genre}`],
        confidence: 0.7,
        deterministic: true
      });
    });
  });
  
  return tags;
}

function deriveFromKeywords(
  text: string,
  category: TagCategory
): StructuredTag[] {
  const tags: StructuredTag[] = [];
  const patterns = KEYWORD_PATTERNS[category as keyof typeof KEYWORD_PATTERNS];
  
  if (!patterns) return tags;
  
  Object.entries(patterns).forEach(([tagValue, pattern]) => {
    if (pattern.test(text)) {
      tags.push({
        id: `${category}_${tagValue}`,
        category,
        value: tagValue,
        derived_from: [`keyword_match:${tagValue}`],
        confidence: 0.6,
        deterministic: true
      });
    }
  });
  
  return tags;
}

function deriveCareerTags(
  movie: any,
  actorFilmography: Map<string, number>
): StructuredTag[] {
  const tags: StructuredTag[] = [];
  const hero = movie.hero;
  
  if (hero && actorFilmography.has(hero)) {
    const filmCount = actorFilmography.get(hero)!;
    
    if (filmCount <= 3) {
      tags.push({
        id: 'career_debut',
        category: 'career',
        value: 'debut',
        derived_from: [`filmography:${hero}:${filmCount}`],
        confidence: 0.9,
        deterministic: true
      });
    }
  }
  
  return tags;
}

// ============================================================
// TAG GENERATION
// ============================================================

export interface MovieTags {
  movie_id: string;
  tmdb_id: number;
  title: string;
  tags: StructuredTag[];
  tag_summary: Record<TagCategory, string[]>;
}

export async function generateMovieTags(
  movieId: string
): Promise<MovieTags | null> {
  const supabase = getSupabaseClient();
  
  const { data: movie, error } = await supabase
    .from('movies')
    .select('id, tmdb_id, title_en, title_te, genres, overview_te, tagline, hero, director, release_year')
    .eq('id', movieId)
    .single();
  
  if (error || !movie) {
    return null;
  }
  
  const allTags: StructuredTag[] = [];
  
  // 1. Derive from genres
  if (movie.genres && movie.genres.length > 0) {
    allTags.push(...deriveFromGenres(movie.genres));
  }
  
  // 2. Derive from text signals
  const textToAnalyze = [
    movie.title_en || '',
    movie.title_te || '',
    movie.overview_te || '',
    movie.tagline || ''
  ].join(' ');
  
  allTags.push(...deriveFromKeywords(textToAnalyze, 'narrative'));
  allTags.push(...deriveFromKeywords(textToAnalyze, 'tone'));
  allTags.push(...deriveFromKeywords(textToAnalyze, 'cultural'));
  
  // 3. Deduplicate tags (keep highest confidence)
  const tagMap = new Map<string, StructuredTag>();
  allTags.forEach(tag => {
    const existing = tagMap.get(tag.id);
    if (!existing || tag.confidence > existing.confidence) {
      tagMap.set(tag.id, tag);
    }
  });
  
  const finalTags = Array.from(tagMap.values());
  
  // 4. Create summary
  const tagSummary: Record<TagCategory, string[]> = {
    narrative: [],
    tone: [],
    cultural: [],
    career: [],
    technical: []
  };
  
  finalTags.forEach(tag => {
    if (!tagSummary[tag.category].includes(tag.value)) {
      tagSummary[tag.category].push(tag.value);
    }
  });
  
  return {
    movie_id: movie.id,
    tmdb_id: movie.tmdb_id,
    title: movie.title_en,
    tags: finalTags,
    tag_summary: tagSummary
  };
}

// ============================================================
// BATCH TAG GENERATION
// ============================================================

export async function rebuildAllTags(options: {
  limit?: number;
  dryRun?: boolean;
  onProgress?: (current: number, total: number) => void;
}): Promise<{
  processed: number;
  tagged: number;
  tag_distribution: Record<string, number>;
}> {
  const supabase = getSupabaseClient();
  const { limit = 1000, dryRun = false, onProgress } = options;
  
  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, tmdb_id, title_en, title_te, genres, overview_te, tagline, hero, director')
    .limit(limit);
  
  if (error || !movies) {
    throw new Error(`Failed to fetch movies: ${error?.message}`);
  }
  
  const stats = {
    processed: 0,
    tagged: 0,
    tag_distribution: {} as Record<string, number>
  };
  
  for (const movie of movies) {
    const result = await generateMovieTags(movie.id);
    stats.processed++;
    
    if (result && result.tags.length > 0) {
      stats.tagged++;
      
      // Track distribution
      result.tags.forEach(tag => {
        const key = `${tag.category}:${tag.value}`;
        stats.tag_distribution[key] = (stats.tag_distribution[key] || 0) + 1;
      });
      
      // Store tags (if not dry run)
      if (!dryRun) {
        // Store in a structured_tags column or separate table
        await supabase
          .from('movies')
          .update({
            // Store as JSONB if column exists
            // structured_tags: result.tags
          })
          .eq('id', movie.id);
      }
    }
    
    if (onProgress) {
      onProgress(stats.processed, movies.length);
    }
  }
  
  return stats;
}

// ============================================================
// TAG QUERIES
// ============================================================

export async function getMoviesByTag(
  category: TagCategory,
  value: string,
  limit: number = 20
): Promise<Array<{ id: string; title: string; year: number | null }>> {
  const supabase = getSupabaseClient();
  
  // This would query the structured_tags JSONB column
  // For now, we use genre as a proxy for some tags
  if (category === 'narrative') {
    const genreMapping: Record<string, string[]> = {
      action: ['Action'],
      comedy: ['Comedy'],
      romance: ['Romance'],
      thriller: ['Thriller'],
      family: ['Family', 'Drama']
    };
    
    const genres = genreMapping[value];
    if (genres) {
      const { data } = await supabase
        .from('movies')
        .select('id, title_en, release_year')
        .contains('genres', [genres[0]])
        .limit(limit);
      
      return (data || []).map(m => ({
        id: m.id,
        title: m.title_en,
        year: m.release_year
      }));
    }
  }
  
  return [];
}

export function getAvailableTags(): {
  narrative: readonly string[];
  tone: readonly string[];
  cultural: readonly string[];
  career: readonly string[];
} {
  return {
    narrative: NARRATIVE_TAGS,
    tone: TONE_TAGS,
    cultural: CULTURAL_TAGS,
    career: CAREER_TAGS
  };
}






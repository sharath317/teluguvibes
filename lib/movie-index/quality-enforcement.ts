/**
 * Quality Enforcement Gates
 * 
 * Phase 7: Non-negotiable quality checks before publish
 * 
 * Before any movie can be published, it MUST pass:
 * 1. Image present & legal
 * 2. Movie exists in canonical index
 * 3. Cast & director validated
 * 4. No malformed titles
 * 5. No orphan celebrities
 * 6. Genre confidence ≥ threshold
 * 
 * If failed → mark NEEDS_REWORK
 */

import { createClient } from '@supabase/supabase-js';
import { canonicalizeTitle } from '../movie-validation/movie-identity-gate';

// ============================================================
// TYPES
// ============================================================

export interface QualityGateResult {
  gate: string;
  passed: boolean;
  score: number;
  reason: string;
  autoFixable: boolean;
  suggestion?: string;
}

export interface QualityCheckResult {
  movieId: string;
  movieTitle: string;
  allPassed: boolean;
  overallScore: number;
  gates: QualityGateResult[];
  status: 'PUBLISHABLE' | 'NEEDS_REWORK' | 'BLOCKED';
}

export interface MovieToCheck {
  id: string;
  title_en: string;
  title_te?: string;
  tmdb_id?: number;
  poster_url?: string;
  backdrop_url?: string;
  director?: string;
  cast_members?: any[];
  genres?: string[];
  release_year?: number;
  data_quality_score?: number;
  validation_status?: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const THRESHOLDS = {
  MIN_GENRE_CONFIDENCE: 0.8,
  MIN_DATA_QUALITY: 0.5,
  MIN_CAST_COUNT: 3,
};

const VALID_GENRES = new Set([
  'Action', 'Drama', 'Romance', 'Comedy', 'Thriller', 'Horror',
  'Family', 'Adventure', 'Crime', 'Fantasy', 'Science Fiction',
  'Musical', 'Documentary', 'Animation', 'Devotional', 'Mythological',
  'War', 'Western', 'History', 'Mystery',
]);

// ============================================================
// SUPABASE
// ============================================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  return createClient(url, key);
}

// ============================================================
// QUALITY GATES
// ============================================================

/**
 * Gate 1: Image present & legal
 */
function checkImagePresent(movie: MovieToCheck): QualityGateResult {
  const hasPoster = !!movie.poster_url;
  const hasBackdrop = !!movie.backdrop_url;
  const hasAnyImage = hasPoster || hasBackdrop;

  // Check if using TMDB images (legal)
  const isLegal = movie.poster_url?.includes('tmdb.org') || 
                  movie.backdrop_url?.includes('tmdb.org') ||
                  movie.poster_url?.includes('wikimedia') ||
                  movie.backdrop_url?.includes('wikimedia');

  if (!hasAnyImage) {
    return {
      gate: 'Image Present',
      passed: false,
      score: 0,
      reason: 'No poster or backdrop image',
      autoFixable: true,
      suggestion: 'Fetch image from TMDB',
    };
  }

  if (!isLegal) {
    return {
      gate: 'Image Present',
      passed: false,
      score: 50,
      reason: 'Image source may not be legal',
      autoFixable: false,
      suggestion: 'Verify image license',
    };
  }

  return {
    gate: 'Image Present',
    passed: true,
    score: 100,
    reason: hasPoster && hasBackdrop ? 'Both poster and backdrop present' : 'Image present',
    autoFixable: false,
  };
}

/**
 * Gate 2: Movie exists in canonical index
 */
async function checkCanonicalIndex(movie: MovieToCheck): Promise<QualityGateResult> {
  if (!movie.tmdb_id) {
    return {
      gate: 'Canonical Index',
      passed: false,
      score: 0,
      reason: 'No TMDB ID - not in canonical index',
      autoFixable: true,
      suggestion: 'Search TMDB for this movie',
    };
  }

  const supabase = getSupabaseClient();
  
  const { data } = await supabase
    .from('telugu_movie_index')
    .select('status')
    .eq('tmdb_id', movie.tmdb_id)
    .single();

  if (!data) {
    return {
      gate: 'Canonical Index',
      passed: false,
      score: 25,
      reason: 'Movie not found in telugu_movie_index',
      autoFixable: true,
      suggestion: 'Run TMDB discovery to add to index',
    };
  }

  if (data.status !== 'VALID') {
    return {
      gate: 'Canonical Index',
      passed: false,
      score: 50,
      reason: `Index status is ${data.status}, not VALID`,
      autoFixable: true,
      suggestion: 'Run validation on index entry',
    };
  }

  return {
    gate: 'Canonical Index',
    passed: true,
    score: 100,
    reason: 'Movie verified in canonical index',
    autoFixable: false,
  };
}

/**
 * Gate 3: Cast & director validated
 */
function checkCastDirector(movie: MovieToCheck): QualityGateResult {
  const hasDirector = !!movie.director && movie.director.trim() !== '';
  const castCount = movie.cast_members?.length || 0;
  const hasSufficientCast = castCount >= THRESHOLDS.MIN_CAST_COUNT;

  if (!hasDirector && !hasSufficientCast) {
    return {
      gate: 'Cast & Director',
      passed: false,
      score: 0,
      reason: 'Missing both director and sufficient cast',
      autoFixable: true,
      suggestion: 'Fetch credits from TMDB',
    };
  }

  if (!hasDirector) {
    return {
      gate: 'Cast & Director',
      passed: false,
      score: 40,
      reason: 'Director information missing',
      autoFixable: true,
      suggestion: 'Fetch director from TMDB',
    };
  }

  if (!hasSufficientCast) {
    return {
      gate: 'Cast & Director',
      passed: false,
      score: 60,
      reason: `Only ${castCount} cast members (need ${THRESHOLDS.MIN_CAST_COUNT}+)`,
      autoFixable: true,
      suggestion: 'Fetch more cast from TMDB',
    };
  }

  return {
    gate: 'Cast & Director',
    passed: true,
    score: 100,
    reason: `Director: ${movie.director}, Cast: ${castCount} members`,
    autoFixable: false,
  };
}

/**
 * Gate 4: No malformed titles
 */
function checkTitleQuality(movie: MovieToCheck): QualityGateResult {
  const title = movie.title_en;
  
  // Check for common issues
  const issues: string[] = [];

  if (!title || title.trim() === '') {
    return {
      gate: 'Title Quality',
      passed: false,
      score: 0,
      reason: 'Title is empty',
      autoFixable: false,
    };
  }

  // Check for malformed patterns
  if (title.match(/^\d{4}$/)) {
    issues.push('Title is just a year');
  }

  if (title.match(/\[.*\]/)) {
    issues.push('Title contains brackets');
  }

  if (title.match(/rowspan|colspan/i)) {
    issues.push('Title contains HTML table artifacts');
  }

  if (title.length < 2) {
    issues.push('Title too short');
  }

  if (title.length > 200) {
    issues.push('Title too long');
  }

  if (title === title.toUpperCase() && title.length > 10) {
    issues.push('Title is all uppercase');
  }

  if (issues.length > 0) {
    return {
      gate: 'Title Quality',
      passed: false,
      score: 50,
      reason: issues.join(', '),
      autoFixable: true,
      suggestion: 'Fix title formatting',
    };
  }

  // Check canonical title is reasonable
  const canonical = canonicalizeTitle(title);
  if (canonical.length < 2) {
    return {
      gate: 'Title Quality',
      passed: false,
      score: 60,
      reason: 'Canonical title is too short',
      autoFixable: false,
      suggestion: 'Review title',
    };
  }

  return {
    gate: 'Title Quality',
    passed: true,
    score: 100,
    reason: 'Title format is valid',
    autoFixable: false,
  };
}

/**
 * Gate 5: No orphan celebrities
 */
async function checkOrphanCelebrities(movie: MovieToCheck): Promise<QualityGateResult> {
  // This gate checks if celebrities mentioned in movie exist in our system
  // For now, we'll just check if cast_members have names
  
  if (!movie.cast_members || movie.cast_members.length === 0) {
    return {
      gate: 'Orphan Celebrities',
      passed: true,
      score: 100,
      reason: 'No cast to check',
      autoFixable: false,
    };
  }

  const invalidMembers = movie.cast_members.filter(m => 
    !m.name || m.name.trim() === '' || m.name.length < 2
  );

  if (invalidMembers.length > 0) {
    return {
      gate: 'Orphan Celebrities',
      passed: false,
      score: 70,
      reason: `${invalidMembers.length} cast members have invalid names`,
      autoFixable: true,
      suggestion: 'Clean up cast member names',
    };
  }

  return {
    gate: 'Orphan Celebrities',
    passed: true,
    score: 100,
    reason: 'All cast members have valid names',
    autoFixable: false,
  };
}

/**
 * Gate 6: Genre confidence
 */
function checkGenreConfidence(movie: MovieToCheck): QualityGateResult {
  if (!movie.genres || movie.genres.length === 0) {
    return {
      gate: 'Genre Confidence',
      passed: false,
      score: 0,
      reason: 'No genres assigned',
      autoFixable: true,
      suggestion: 'Fetch genres from TMDB',
    };
  }

  const validCount = movie.genres.filter(g => VALID_GENRES.has(g)).length;
  const confidence = validCount / movie.genres.length;

  if (confidence < THRESHOLDS.MIN_GENRE_CONFIDENCE) {
    const invalidGenres = movie.genres.filter(g => !VALID_GENRES.has(g));
    return {
      gate: 'Genre Confidence',
      passed: false,
      score: confidence * 100,
      reason: `Invalid genres: ${invalidGenres.join(', ')}`,
      autoFixable: true,
      suggestion: 'Map to valid genre names',
    };
  }

  return {
    gate: 'Genre Confidence',
    passed: true,
    score: confidence * 100,
    reason: `${validCount}/${movie.genres.length} genres valid`,
    autoFixable: false,
  };
}

/**
 * Gate 7: Data quality score
 */
function checkDataQuality(movie: MovieToCheck): QualityGateResult {
  const score = movie.data_quality_score || 0;

  if (score < THRESHOLDS.MIN_DATA_QUALITY) {
    return {
      gate: 'Data Quality',
      passed: false,
      score: score * 100,
      reason: `Quality score ${(score * 100).toFixed(0)}% below threshold ${THRESHOLDS.MIN_DATA_QUALITY * 100}%`,
      autoFixable: true,
      suggestion: 'Enrich movie data from TMDB',
    };
  }

  return {
    gate: 'Data Quality',
    passed: true,
    score: score * 100,
    reason: `Quality score: ${(score * 100).toFixed(0)}%`,
    autoFixable: false,
  };
}

// ============================================================
// MAIN ENFORCEMENT
// ============================================================

/**
 * Run all quality gates on a movie
 */
export async function enforceQualityGates(
  movie: MovieToCheck
): Promise<QualityCheckResult> {
  const gates: QualityGateResult[] = [];

  // Run all gates
  gates.push(checkImagePresent(movie));
  gates.push(await checkCanonicalIndex(movie));
  gates.push(checkCastDirector(movie));
  gates.push(checkTitleQuality(movie));
  gates.push(await checkOrphanCelebrities(movie));
  gates.push(checkGenreConfidence(movie));
  gates.push(checkDataQuality(movie));

  // Calculate overall
  const allPassed = gates.every(g => g.passed);
  const overallScore = gates.reduce((sum, g) => sum + g.score, 0) / gates.length;

  // Determine status
  let status: QualityCheckResult['status'] = 'PUBLISHABLE';
  
  if (!allPassed) {
    const blockingGates = gates.filter(g => !g.passed && !g.autoFixable);
    if (blockingGates.length > 0) {
      status = 'BLOCKED';
    } else {
      status = 'NEEDS_REWORK';
    }
  }

  return {
    movieId: movie.id,
    movieTitle: movie.title_en,
    allPassed,
    overallScore,
    gates,
    status,
  };
}

/**
 * Batch check movies
 */
export async function batchQualityCheck(
  limit: number = 100
): Promise<{
  total: number;
  publishable: number;
  needsRework: number;
  blocked: number;
  results: QualityCheckResult[];
}> {
  const supabase = getSupabaseClient();

  const { data: movies, error } = await supabase
    .from('movies')
    .select('*')
    .eq('is_published', true)
    .limit(limit);

  if (error || !movies) {
    return {
      total: 0,
      publishable: 0,
      needsRework: 0,
      blocked: 0,
      results: [],
    };
  }

  const results: QualityCheckResult[] = [];
  let publishable = 0;
  let needsRework = 0;
  let blocked = 0;

  for (const movie of movies) {
    const result = await enforceQualityGates(movie as MovieToCheck);
    results.push(result);

    switch (result.status) {
      case 'PUBLISHABLE':
        publishable++;
        break;
      case 'NEEDS_REWORK':
        needsRework++;
        break;
      case 'BLOCKED':
        blocked++;
        break;
    }
  }

  return {
    total: movies.length,
    publishable,
    needsRework,
    blocked,
    results,
  };
}

/**
 * Mark movie as needing rework
 */
export async function markNeedsRework(
  movieId: string,
  reasons: string[]
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('movies')
    .update({
      validation_status: 'NEEDS_REWORK',
      is_published: false,
    })
    .eq('id', movieId);

  return !error;
}







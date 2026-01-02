/**
 * Movie Identity Gate
 * 
 * Ensures ONLY valid movies are created by verifying against TMDB.
 * Rejects non-movie types (person, tv, collection) and malformed entities.
 */

// ============================================================
// TYPES
// ============================================================

export type EntityStatus = 
  | 'VALID'
  | 'PENDING_VALIDATION'
  | 'INVALID_NOT_MOVIE'        // TMDB entity is not a movie
  | 'INVALID_NOT_TELUGU'       // Not Telugu language
  | 'INVALID_NO_TMDB_MATCH'    // Cannot find on TMDB
  | 'INVALID_DUPLICATE'        // Already exists in DB
  | 'INVALID_MISSING_DATA'     // Missing required fields
  | 'INVALID_CAST_CREW'        // Director missing or < 3 cast
  | 'INVALID_NO_IMAGE'         // No poster or backdrop
  | 'INVALID_FUTURE_RELEASE';  // Release date too far in future

export interface MovieValidationResult {
  isValid: boolean;
  status: EntityStatus;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  tmdbData?: TMDBMovieData | null;
  canonicalTitle?: string;
  suggestions?: string[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
}

export interface TMDBMovieData {
  id: number;
  title: string;
  original_title: string;
  original_language: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  vote_average: number;
  popularity: number;
  runtime: number | null;
  genres: { id: number; name: string }[];
  credits?: {
    cast: TMDBCastMember[];
    crew: TMDBCrewMember[];
  };
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface MovieCandidate {
  title_en: string;
  title_te?: string;
  release_year?: number;
  tmdb_id?: number;
  wikidata_id?: string;  // Fallback identifier (e.g., Q12345)
  director?: string;
  poster_url?: string;
  backdrop_url?: string;
}

// ============================================================
// TMDB API HELPERS
// ============================================================

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

function getTMDBApiKey(): string | null {
  return process.env.TMDB_API_KEY || null;
}

/**
 * Verify entity type on TMDB - ensure it's actually a movie
 */
export async function verifyTMDBEntityType(tmdbId: number): Promise<{
  isMovie: boolean;
  entityType: 'movie' | 'tv' | 'person' | 'collection' | 'unknown';
  data?: TMDBMovieData;
}> {
  const apiKey = getTMDBApiKey();
  if (!apiKey) {
    console.warn('TMDB_API_KEY not configured');
    return { isMovie: false, entityType: 'unknown' };
  }

  try {
    // Try movie endpoint first
    const movieRes = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits`,
      { cache: 'no-store' }
    );

    if (movieRes.ok) {
      const data = await movieRes.json();
      return {
        isMovie: true,
        entityType: 'movie',
        data: {
          id: data.id,
          title: data.title,
          original_title: data.original_title,
          original_language: data.original_language,
          release_date: data.release_date,
          poster_path: data.poster_path,
          backdrop_path: data.backdrop_path,
          overview: data.overview,
          vote_average: data.vote_average,
          popularity: data.popularity,
          runtime: data.runtime,
          genres: data.genres || [],
          credits: data.credits,
        },
      };
    }

    // Check if it's a TV show
    const tvRes = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${apiKey}`,
      { cache: 'no-store' }
    );
    if (tvRes.ok) {
      return { isMovie: false, entityType: 'tv' };
    }

    // Check if it's a person
    const personRes = await fetch(
      `${TMDB_BASE_URL}/person/${tmdbId}?api_key=${apiKey}`,
      { cache: 'no-store' }
    );
    if (personRes.ok) {
      return { isMovie: false, entityType: 'person' };
    }

    // Check if it's a collection
    const collectionRes = await fetch(
      `${TMDB_BASE_URL}/collection/${tmdbId}?api_key=${apiKey}`,
      { cache: 'no-store' }
    );
    if (collectionRes.ok) {
      return { isMovie: false, entityType: 'collection' };
    }

    return { isMovie: false, entityType: 'unknown' };
  } catch (error) {
    console.error('TMDB verification error:', error);
    return { isMovie: false, entityType: 'unknown' };
  }
}

/**
 * Search TMDB for a movie by title and year
 */
export async function searchTMDBMovie(
  title: string,
  year?: number
): Promise<TMDBMovieData | null> {
  const apiKey = getTMDBApiKey();
  if (!apiKey) return null;

  try {
    const yearParam = year ? `&year=${year}` : '';
    const searchRes = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(title)}${yearParam}&language=te-IN`,
      { cache: 'no-store' }
    );

    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    if (!searchData.results || searchData.results.length === 0) {
      // Try English search
      const enSearchRes = await fetch(
        `${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(title)}${yearParam}`,
        { cache: 'no-store' }
      );
      if (!enSearchRes.ok) return null;
      const enData = await enSearchRes.json();
      if (!enData.results || enData.results.length === 0) return null;
      
      // Get full details
      const firstMatch = enData.results[0];
      const verification = await verifyTMDBEntityType(firstMatch.id);
      return verification.data || null;
    }

    // Get full details with credits
    const firstMatch = searchData.results[0];
    const verification = await verifyTMDBEntityType(firstMatch.id);
    return verification.data || null;
  } catch (error) {
    console.error('TMDB search error:', error);
    return null;
  }
}

// ============================================================
// TITLE CANONICALIZATION
// ============================================================

/**
 * Canonicalize movie title for duplicate detection
 */
export function canonicalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // Remove common suffixes
    .replace(/\s*\(film\)\s*/gi, '')
    .replace(/\s*\(movie\)\s*/gi, '')
    .replace(/\s*\(\d{4}\)\s*/gi, '') // Remove year in parentheses
    .replace(/\s*\(telugu\)\s*/gi, '')
    .replace(/\s*\(hindi dubbed\)\s*/gi, '')
    // Normalize special characters
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[–—]/g, '-')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Remove leading/trailing articles for better matching
    .replace(/^(the|a|an)\s+/i, '')
    // Normalize common patterns
    .replace(/\s*:\s*/g, ' ')
    .replace(/\s*-\s*/g, ' ')
    .trim();
}

/**
 * Generate slug from title
 */
export function generateSlug(title: string, year?: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  return year ? `${base}-${year}` : base;
}

// ============================================================
// VALIDATION FUNCTIONS
// ============================================================

/**
 * Validate director exists and is a person
 */
export function validateDirector(
  credits?: TMDBMovieData['credits']
): { valid: boolean; director?: TMDBCrewMember; error?: ValidationError } {
  if (!credits?.crew) {
    return {
      valid: false,
      error: { code: 'NO_CREW_DATA', message: 'No crew data available' },
    };
  }

  const director = credits.crew.find(c => c.job === 'Director');
  if (!director) {
    return {
      valid: false,
      error: { code: 'NO_DIRECTOR', message: 'No director found in credits', field: 'director' },
    };
  }

  return { valid: true, director };
}

/**
 * Validate minimum cast members
 */
export function validateCast(
  credits?: TMDBMovieData['credits'],
  minCast: number = 3
): { valid: boolean; cast: TMDBCastMember[]; error?: ValidationError } {
  if (!credits?.cast) {
    return {
      valid: false,
      cast: [],
      error: { code: 'NO_CAST_DATA', message: 'No cast data available' },
    };
  }

  const cast = credits.cast.filter(c => c.name && c.name.trim() !== '');
  if (cast.length < minCast) {
    return {
      valid: false,
      cast,
      error: {
        code: 'INSUFFICIENT_CAST',
        message: `Minimum ${minCast} cast members required, found ${cast.length}`,
        field: 'cast_members',
      },
    };
  }

  return { valid: true, cast };
}

/**
 * Validate image availability
 */
export function validateImages(
  data: TMDBMovieData,
  requireBoth: boolean = false
): { valid: boolean; error?: ValidationError; warning?: ValidationWarning } {
  const hasPoster = !!data.poster_path;
  const hasBackdrop = !!data.backdrop_path;

  if (requireBoth && (!hasPoster || !hasBackdrop)) {
    return {
      valid: false,
      error: {
        code: 'MISSING_IMAGES',
        message: 'Both poster and backdrop are required',
        field: 'poster_url',
      },
    };
  }

  if (!hasPoster && !hasBackdrop) {
    return {
      valid: false,
      error: {
        code: 'NO_IMAGES',
        message: 'At least one image (poster or backdrop) is required',
        field: 'poster_url',
      },
    };
  }

  if (!hasPoster) {
    return {
      valid: true,
      warning: { code: 'NO_POSTER', message: 'No poster available, using backdrop only' },
    };
  }

  if (!hasBackdrop) {
    return {
      valid: true,
      warning: { code: 'NO_BACKDROP', message: 'No backdrop available' },
    };
  }

  return { valid: true };
}

/**
 * Validate Telugu language
 */
export function validateTeluguLanguage(data: TMDBMovieData): {
  valid: boolean;
  warning?: ValidationWarning;
} {
  const isTeluguPrimary = data.original_language === 'te';
  const hasTeluguTitle = /[\u0C00-\u0C7F]/.test(data.original_title || '');
  
  if (isTeluguPrimary || hasTeluguTitle) {
    return { valid: true };
  }

  // Check if it might be a dubbed/multilingual film
  const overview = (data.overview || '').toLowerCase();
  if (overview.includes('telugu') || overview.includes('tollywood')) {
    return {
      valid: true,
      warning: { code: 'POSSIBLE_DUB', message: 'May be a dubbed or multilingual film' },
    };
  }

  return { valid: false };
}

// ============================================================
// MAIN VALIDATION GATE
// ============================================================

export interface ValidationOptions {
  strict?: boolean;           // Fail on warnings
  requireBothImages?: boolean;
  minCastMembers?: number;
  allowFutureReleases?: boolean;
  maxFutureDays?: number;     // Max days in future for release
}

const DEFAULT_OPTIONS: ValidationOptions = {
  strict: false,
  requireBothImages: false,
  minCastMembers: 3,
  allowFutureReleases: true,
  maxFutureDays: 365 * 2, // 2 years
};

/**
 * Main Movie Identity Gate
 * Validates a movie candidate through all validation stages
 */
export async function validateMovieCandidate(
  candidate: MovieCandidate,
  options: ValidationOptions = {}
): Promise<MovieValidationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let tmdbData: TMDBMovieData | null = null;

  // Stage 1: Basic field validation
  if (!candidate.title_en || candidate.title_en.trim() === '') {
    errors.push({
      code: 'MISSING_TITLE',
      message: 'English title is required',
      field: 'title_en',
    });
  }

  // Stage 2: TMDB Identity Verification
  if (candidate.tmdb_id) {
    // Verify existing TMDB ID
    const verification = await verifyTMDBEntityType(candidate.tmdb_id);
    
    if (!verification.isMovie) {
      return {
        isValid: false,
        status: 'INVALID_NOT_MOVIE',
        errors: [{
          code: 'NOT_MOVIE',
          message: `TMDB ID ${candidate.tmdb_id} is a ${verification.entityType}, not a movie`,
          field: 'tmdb_id',
        }],
        warnings: [],
        suggestions: ['Remove this entity or correct the TMDB ID'],
      };
    }

    tmdbData = verification.data || null;
  } else {
    // Search TMDB for match
    tmdbData = await searchTMDBMovie(
      candidate.title_en,
      candidate.release_year
    );

    if (!tmdbData) {
      // Try alternate search strategies
      const canonicalTitle = canonicalizeTitle(candidate.title_en);
      if (canonicalTitle !== candidate.title_en.toLowerCase()) {
        tmdbData = await searchTMDBMovie(canonicalTitle, candidate.release_year);
      }
    }

    if (!tmdbData) {
      warnings.push({
        code: 'NO_TMDB_MATCH',
        message: 'Could not find matching movie on TMDB',
      });

      if (opts.strict) {
        return {
          isValid: false,
          status: 'INVALID_NO_TMDB_MATCH',
          errors: [{
            code: 'TMDB_REQUIRED',
            message: 'Strict mode requires TMDB verification',
          }],
          warnings,
          canonicalTitle: canonicalizeTitle(candidate.title_en),
        };
      }
    }
  }

  // If we have TMDB data, validate further
  if (tmdbData) {
    // Stage 3: Telugu Language Validation
    const langResult = validateTeluguLanguage(tmdbData);
    if (!langResult.valid) {
      return {
        isValid: false,
        status: 'INVALID_NOT_TELUGU',
        errors: [{
          code: 'NOT_TELUGU',
          message: 'Movie is not in Telugu language',
          field: 'original_language',
        }],
        warnings,
        tmdbData,
        canonicalTitle: canonicalizeTitle(tmdbData.title),
        suggestions: ['Verify this is a Telugu film or remove from ingestion'],
      };
    }
    if (langResult.warning) warnings.push(langResult.warning);

    // Stage 4: Director Validation
    const directorResult = validateDirector(tmdbData.credits);
    if (!directorResult.valid && directorResult.error) {
      if (opts.strict) {
        errors.push(directorResult.error);
      } else {
        warnings.push({
          code: directorResult.error.code,
          message: directorResult.error.message,
        });
      }
    }

    // Stage 5: Cast Validation
    const castResult = validateCast(tmdbData.credits, opts.minCastMembers);
    if (!castResult.valid && castResult.error) {
      if (opts.strict) {
        errors.push(castResult.error);
      } else {
        warnings.push({
          code: castResult.error.code,
          message: castResult.error.message,
        });
      }
    }

    // Stage 6: Image Validation
    const imageResult = validateImages(tmdbData, opts.requireBothImages);
    if (!imageResult.valid && imageResult.error) {
      if (opts.strict) {
        errors.push(imageResult.error);
      } else {
        warnings.push({
          code: imageResult.error.code,
          message: imageResult.error.message,
        });
      }
    }
    if (imageResult.warning) warnings.push(imageResult.warning);

    // Stage 7: Release Date Validation
    if (tmdbData.release_date) {
      const releaseDate = new Date(tmdbData.release_date);
      const today = new Date();
      const maxFutureDate = new Date();
      maxFutureDate.setDate(maxFutureDate.getDate() + (opts.maxFutureDays || 730));

      if (releaseDate > maxFutureDate && !opts.allowFutureReleases) {
        warnings.push({
          code: 'FAR_FUTURE_RELEASE',
          message: `Release date is more than ${opts.maxFutureDays} days in the future`,
        });
      }
    }
  }

  // Determine final status
  const hasErrors = errors.length > 0;
  const criticalWarnings = opts.strict && warnings.some(w => 
    ['NO_TMDB_MATCH', 'NO_DIRECTOR', 'INSUFFICIENT_CAST', 'NO_IMAGES'].includes(w.code)
  );

  let status: EntityStatus = 'VALID';
  if (hasErrors) {
    // Determine specific status
    if (errors.some(e => e.code === 'INSUFFICIENT_CAST' || e.code === 'NO_DIRECTOR')) {
      status = 'INVALID_CAST_CREW';
    } else if (errors.some(e => e.code === 'NO_IMAGES' || e.code === 'MISSING_IMAGES')) {
      status = 'INVALID_NO_IMAGE';
    } else {
      status = 'INVALID_MISSING_DATA';
    }
  } else if (criticalWarnings) {
    status = 'INVALID_MISSING_DATA';
  }

  return {
    isValid: !hasErrors && !criticalWarnings,
    status,
    errors,
    warnings,
    tmdbData,
    canonicalTitle: canonicalizeTitle(tmdbData?.title || candidate.title_en),
  };
}

/**
 * Batch validate movie candidates
 */
export async function batchValidateMovies(
  candidates: MovieCandidate[],
  options: ValidationOptions = {}
): Promise<{
  valid: { candidate: MovieCandidate; result: MovieValidationResult }[];
  invalid: { candidate: MovieCandidate; result: MovieValidationResult }[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    byStatus: Record<EntityStatus, number>;
  };
}> {
  const valid: { candidate: MovieCandidate; result: MovieValidationResult }[] = [];
  const invalid: { candidate: MovieCandidate; result: MovieValidationResult }[] = [];
  const byStatus: Record<EntityStatus, number> = {} as any;

  for (const candidate of candidates) {
    const result = await validateMovieCandidate(candidate, options);
    
    // Track by status
    byStatus[result.status] = (byStatus[result.status] || 0) + 1;

    if (result.isValid) {
      valid.push({ candidate, result });
    } else {
      invalid.push({ candidate, result });
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  return {
    valid,
    invalid,
    stats: {
      total: candidates.length,
      valid: valid.length,
      invalid: invalid.length,
      byStatus,
    },
  };
}

// ============================================================
// CANONICAL IDENTITY RESOLUTION
// ============================================================

export interface CanonicalIdentity {
  primary_key: { type: 'tmdb_id'; value: number } | null;
  secondary_key: { type: 'normalized_title_year'; value: string } | null;
  fallback_key: { type: 'wikidata_id'; value: string } | null;
  confidence: number;
  resolution_path: string[];
}

/**
 * Fetch Wikidata movie ID using SPARQL query
 */
export async function fetchWikidataMovieId(
  title: string,
  year?: number
): Promise<string | null> {
  const sparqlEndpoint = 'https://query.wikidata.org/sparql';
  
  // Build SPARQL query for Telugu films
  const yearFilter = year ? `FILTER(YEAR(?date) = ${year})` : '';
  const query = `
    SELECT ?film WHERE {
      ?film wdt:P31 wd:Q11424 .          # Instance of: film
      ?film wdt:P364 wd:Q8097 .          # Original language: Telugu
      ?film rdfs:label "${title}"@en .
      OPTIONAL { ?film wdt:P577 ?date . }
      ${yearFilter}
    }
    LIMIT 1
  `;

  try {
    const response = await fetch(sparqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'TeluguVibes/1.0 (https://teluguvibes.com)'
      },
      body: query,
    });

    if (!response.ok) {
      console.warn('Wikidata SPARQL query failed:', response.status);
      return null;
    }

    const data = await response.json();
    const bindings = data?.results?.bindings || [];
    
    if (bindings.length > 0) {
      const filmUri = bindings[0]?.film?.value;
      // Extract Q-id from URI (e.g., http://www.wikidata.org/entity/Q12345 → Q12345)
      const match = filmUri?.match(/Q\d+$/);
      return match ? match[0] : null;
    }

    return null;
  } catch (error) {
    console.error('Wikidata fetch error:', error);
    return null;
  }
}

/**
 * Resolve canonical movie identity using multiple sources
 * Priority: TMDB ID → Normalized Title+Year → Wikidata ID
 */
export async function resolveCanonicalMovieIdentity(
  candidate: MovieCandidate
): Promise<CanonicalIdentity> {
  const resolutionPath: string[] = [];
  let confidence = 0;

  // Primary: TMDB ID
  let primaryKey: CanonicalIdentity['primary_key'] = null;
  if (candidate.tmdb_id) {
    const verification = await verifyTMDBEntityType(candidate.tmdb_id);
    if (verification.isMovie) {
      primaryKey = { type: 'tmdb_id', value: candidate.tmdb_id };
      confidence += 0.5;
      resolutionPath.push(`TMDB verified: ${candidate.tmdb_id}`);
    } else {
      resolutionPath.push(`TMDB ID ${candidate.tmdb_id} is not a movie (${verification.entityType})`);
    }
  }

  // Secondary: Normalized title + year
  let secondaryKey: CanonicalIdentity['secondary_key'] = null;
  const canonicalTitle = canonicalizeTitle(candidate.title_en);
  const normalizedKey = candidate.release_year 
    ? `${canonicalTitle}::${candidate.release_year}`
    : canonicalTitle;
  
  secondaryKey = { type: 'normalized_title_year', value: normalizedKey };
  confidence += 0.3;
  resolutionPath.push(`Normalized: ${normalizedKey}`);

  // Fallback: Wikidata ID
  let fallbackKey: CanonicalIdentity['fallback_key'] = null;
  if (candidate.wikidata_id) {
    fallbackKey = { type: 'wikidata_id', value: candidate.wikidata_id };
    confidence += 0.2;
    resolutionPath.push(`Wikidata provided: ${candidate.wikidata_id}`);
  } else if (!primaryKey) {
    // Try to fetch from Wikidata if no TMDB ID
    const wikidataId = await fetchWikidataMovieId(
      candidate.title_en,
      candidate.release_year
    );
    if (wikidataId) {
      fallbackKey = { type: 'wikidata_id', value: wikidataId };
      confidence += 0.15;
      resolutionPath.push(`Wikidata resolved: ${wikidataId}`);
    }
  }

  return {
    primary_key: primaryKey,
    secondary_key: secondaryKey,
    fallback_key: fallbackKey,
    confidence: Math.min(1, confidence),
    resolution_path: resolutionPath
  };
}

/**
 * Check if two movies are the same entity
 */
export function isSameMovie(
  identity1: CanonicalIdentity,
  identity2: CanonicalIdentity
): { match: boolean; confidence: number; matched_on: string } {
  // Match on TMDB ID (highest confidence)
  if (identity1.primary_key && identity2.primary_key) {
    if (identity1.primary_key.value === identity2.primary_key.value) {
      return { match: true, confidence: 0.99, matched_on: 'tmdb_id' };
    }
  }

  // Match on Wikidata ID
  if (identity1.fallback_key && identity2.fallback_key) {
    if (identity1.fallback_key.value === identity2.fallback_key.value) {
      return { match: true, confidence: 0.95, matched_on: 'wikidata_id' };
    }
  }

  // Match on normalized title + year
  if (identity1.secondary_key && identity2.secondary_key) {
    if (identity1.secondary_key.value === identity2.secondary_key.value) {
      return { match: true, confidence: 0.85, matched_on: 'normalized_title_year' };
    }
  }

  return { match: false, confidence: 0, matched_on: 'none' };
}



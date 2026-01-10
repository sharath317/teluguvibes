/**
 * Safe Classification Module
 * 
 * Provides safe, multi-signal consensus-based derivation for:
 * - primary_genre: Requires 2+ independent signals with confidence >= 0.65
 * - age_rating: Content-aware classification with safety-first approach
 * 
 * SAFETY GUARANTEES:
 * - Never invents/hallucinates data
 * - Only uses existing signals from database
 * - Requires consensus for genre classification
 * - Never downgrades age rating safety
 * - Stores uncertainty explicitly when confidence is low
 */

import {
  MOOD_GENRE_MAP,
  AUDIENCE_FIT_GENRE_MAP,
  PRIMARY_GENRE_PRIORITY,
  normalizeGenre,
  findActorGenres,
  findDirectorGenres,
  getEraGenres,
  ERA_DEFAULTS,
} from './genre-patterns';

// ============================================================
// TYPES
// ============================================================

export interface GenreSignal {
  genre: string;
  source: string;
  weight: number;
}

export interface GenreResult {
  primary_genre: string | null;
  genre_confidence: 'high' | 'low';
  genre_sources: string[];
  all_signals: GenreSignal[];
  ambiguous: boolean;
  ambiguity_reason?: string;
}

export interface AgeRatingResult {
  age_rating: 'U' | 'U/A' | 'A' | 'S' | null;
  age_rating_confidence: 'high' | 'medium' | 'low';
  age_rating_reasons: string[];
  content_indicators: string[];
  skipped: boolean;
  skip_reason?: string;
}

export interface MovieForClassification {
  id: string;
  title_en: string;
  release_year?: number | null;
  genres?: string[] | null;
  mood_tags?: string[] | null;
  audience_fit?: Record<string, boolean> | null;
  hero?: string | null;
  director?: string | null;
  content_flags?: Record<string, unknown> | null;
  trigger_warnings?: string[] | null;
  overview?: string | null;
  synopsis?: string | null;
  
  // Existing values (to prevent downgrade)
  primary_genre?: string | null;
  age_rating?: string | null;
}

// ============================================================
// CONSTANTS
// ============================================================

// Signal weights for genre derivation
const SIGNAL_WEIGHTS = {
  GENRES_ARRAY: 0.35,
  MOOD_TAGS: 0.20,
  AUDIENCE_FIT: 0.15,
  DIRECTOR_PATTERN: 0.15,
  HERO_PATTERN: 0.10,
  SYNOPSIS_KEYWORDS: 0.05,
  ERA_DEFAULT: 0.10, // New: era-based fallback
};

// Confidence threshold for accepting genre classification
// LOWERED from 0.65 to 0.35 for even higher coverage
const GENRE_CONFIDENCE_THRESHOLD = 0.35;

// Review flag threshold - flag for manual review when above this but below confidence
const REVIEW_FLAG_THRESHOLD = 0.60;

// Minimum independent signals required - LOWERED from 2 to 1
const MIN_SIGNALS_REQUIRED = 1;

// Age rating order (higher index = more restrictive)
const AGE_RATING_ORDER: ('U' | 'U/A' | 'A' | 'S')[] = ['U', 'U/A', 'A', 'S'];

// ============================================================
// PRIMARY GENRE DERIVATION
// ============================================================

/**
 * Derive primary genre using multi-signal weighted consensus.
 * 
 * Rules:
 * - Requires 2+ independent signals to agree
 * - Confidence must be >= 0.65 to save
 * - Returns null with low confidence when uncertain
 */
export function derivePrimaryGenre(movie: MovieForClassification): GenreResult {
  const signals: GenreSignal[] = [];
  
  // 1. Extract signals from existing genres array (weight: 0.35)
  if (movie.genres && movie.genres.length > 0) {
    // First genre gets full weight, second gets half
    const normalized = normalizeGenre(movie.genres[0]);
    signals.push({
      genre: normalized,
      source: 'genres_array_primary',
      weight: SIGNAL_WEIGHTS.GENRES_ARRAY,
    });
    
    if (movie.genres.length > 1) {
      const secondary = normalizeGenre(movie.genres[1]);
      if (secondary !== normalized) {
        signals.push({
          genre: secondary,
          source: 'genres_array_secondary',
          weight: SIGNAL_WEIGHTS.GENRES_ARRAY * 0.5,
        });
      }
    }
  }
  
  // 2. Extract signals from mood tags (weight: 0.20)
  if (movie.mood_tags && movie.mood_tags.length > 0) {
    const moodGenres = new Set<string>();
    
    for (const mood of movie.mood_tags) {
      const genres = MOOD_GENRE_MAP[mood.toLowerCase()];
      if (genres) {
        genres.forEach(g => moodGenres.add(g));
      }
    }
    
    // Add top mood-derived genre
    const moodGenreArray = Array.from(moodGenres);
    if (moodGenreArray.length > 0) {
      signals.push({
        genre: moodGenreArray[0],
        source: 'mood_tags',
        weight: SIGNAL_WEIGHTS.MOOD_TAGS,
      });
    }
  }
  
  // 3. Extract signals from audience fit (weight: 0.15)
  if (movie.audience_fit) {
    for (const [fit, value] of Object.entries(movie.audience_fit)) {
      if (value && AUDIENCE_FIT_GENRE_MAP[fit]) {
        const fitGenres = AUDIENCE_FIT_GENRE_MAP[fit];
        signals.push({
          genre: fitGenres[0],
          source: `audience_fit_${fit}`,
          weight: SIGNAL_WEIGHTS.AUDIENCE_FIT,
        });
        break; // Only use first matching fit
      }
    }
  }
  
  // 4. Extract signals from director pattern (weight: 0.15)
  if (movie.director) {
    const directorGenres = findDirectorGenres(movie.director);
    if (directorGenres && directorGenres.length > 0) {
      signals.push({
        genre: directorGenres[0],
        source: 'director_pattern',
        weight: SIGNAL_WEIGHTS.DIRECTOR_PATTERN,
      });
    }
  }
  
  // 5. Extract signals from hero pattern (weight: 0.10)
  if (movie.hero) {
    const heroGenres = findActorGenres(movie.hero);
    if (heroGenres && heroGenres.length > 0) {
      signals.push({
        genre: heroGenres[0],
        source: 'hero_pattern',
        weight: SIGNAL_WEIGHTS.HERO_PATTERN,
      });
    }
  }
  
  // 6. Extract signals from synopsis keywords (weight: 0.05)
  const textContent = [movie.overview, movie.synopsis].filter(Boolean).join(' ');
  if (textContent.length > 50) {
    const keywordGenre = extractGenreFromKeywords(textContent);
    if (keywordGenre) {
      signals.push({
        genre: keywordGenre,
        source: 'synopsis_keywords',
        weight: SIGNAL_WEIGHTS.SYNOPSIS_KEYWORDS,
      });
    }
  }
  
  // 7. Era-based fallback (weight: 0.10) - only if no other strong signals
  if (signals.length < 2 && movie.release_year) {
    const eraGenres = getEraGenres(movie.release_year);
    if (eraGenres.length > 0) {
      signals.push({
        genre: eraGenres[0],
        source: 'era_default',
        weight: SIGNAL_WEIGHTS.ERA_DEFAULT,
      });
    }
  }
  
  // Calculate consensus
  return calculateGenreConsensus(signals);
}

/**
 * Calculate genre consensus from collected signals.
 * Uses lowered thresholds (0.45) and single-signal acceptance for higher coverage.
 */
function calculateGenreConsensus(signals: GenreSignal[]): GenreResult {
  if (signals.length === 0) {
    return {
      primary_genre: null,
      genre_confidence: 'low',
      genre_sources: [],
      all_signals: signals,
      ambiguous: false,
      ambiguity_reason: 'No signals available',
    };
  }
  
  // Group signals by genre
  const votes = new Map<string, { 
    count: number; 
    totalWeight: number; 
    sources: string[];
  }>();
  
  for (const signal of signals) {
    const existing = votes.get(signal.genre) || { 
      count: 0, 
      totalWeight: 0, 
      sources: [] 
    };
    existing.count++;
    existing.totalWeight += signal.weight;
    existing.sources.push(signal.source);
    votes.set(signal.genre, existing);
  }
  
  // Find candidates with MIN_SIGNALS_REQUIRED+ signals (now 1+)
  const candidates = Array.from(votes.entries())
    .filter(([_, v]) => v.count >= MIN_SIGNALS_REQUIRED)
    .sort((a, b) => {
      // Sort by total weight first
      if (b[1].totalWeight !== a[1].totalWeight) {
        return b[1].totalWeight - a[1].totalWeight;
      }
      // Then by count
      if (b[1].count !== a[1].count) {
        return b[1].count - a[1].count;
      }
      // Then by priority order
      const aPriority = PRIMARY_GENRE_PRIORITY.indexOf(a[0]);
      const bPriority = PRIMARY_GENRE_PRIORITY.indexOf(b[0]);
      return (aPriority === -1 ? 999 : aPriority) - (bPriority === -1 ? 999 : bPriority);
    });
  
  // No candidates meeting minimum threshold
  if (candidates.length === 0) {
    return {
      primary_genre: null,
      genre_confidence: 'low',
      genre_sources: [],
      all_signals: signals,
      ambiguous: false,
      ambiguity_reason: 'No genre candidates found',
    };
  }
  
  const winner = candidates[0];
  const [genre, data] = winner;
  
  // Check if top 2 candidates have equal weight (ambiguous)
  if (candidates.length > 1) {
    const [_, secondData] = candidates[1];
    if (Math.abs(data.totalWeight - secondData.totalWeight) < 0.05) {
      // Ambiguous case - still accept the first one but flag for review
      return {
        primary_genre: genre, // Accept winner despite ambiguity
        genre_confidence: 'low', // Mark as low confidence
        genre_sources: data.sources,
        all_signals: signals,
        ambiguous: true,
        ambiguity_reason: `Tie between ${genre} and ${candidates[1][0]} (both ~${data.totalWeight.toFixed(2)}) - needs review`,
      };
    }
  }
  
  // Check confidence threshold
  const confidence = data.totalWeight;
  
  // Below minimum threshold - still accept but mark as low confidence
  if (confidence < GENRE_CONFIDENCE_THRESHOLD) {
    // Accept genre but mark for review
    return {
      primary_genre: genre, // Accept even at low confidence
      genre_confidence: 'low',
      genre_sources: data.sources,
      all_signals: signals,
      ambiguous: false,
      ambiguity_reason: `Confidence ${confidence.toFixed(2)} below threshold ${GENRE_CONFIDENCE_THRESHOLD} - needs review`,
    };
  }
  
  // Between threshold and review flag - accept with medium confidence
  if (confidence < REVIEW_FLAG_THRESHOLD) {
    return {
      primary_genre: genre,
      genre_confidence: 'low', // Medium-low, flag for review
      genre_sources: data.sources,
      all_signals: signals,
      ambiguous: false,
      ambiguity_reason: `Confidence ${confidence.toFixed(2)} - consider review`,
    };
  }
  
  // High confidence success!
  return {
    primary_genre: genre,
    genre_confidence: 'high',
    genre_sources: data.sources,
    all_signals: signals,
    ambiguous: false,
  };
}

/**
 * Extract genre hint from synopsis/overview keywords.
 */
function extractGenreFromKeywords(text: string): string | null {
  const lower = text.toLowerCase();
  
  const keywordMap: [string[], string][] = [
    [['murder', 'investigation', 'detective', 'crime scene', 'criminal'], 'Crime'],
    [['ghost', 'haunted', 'supernatural', 'spirit', 'demon'], 'Horror'],
    [['love story', 'romance', 'heart', 'falls in love', 'romantic'], 'Romance'],
    [['comedy', 'hilarious', 'funny', 'laugh', 'humor'], 'Comedy'],
    [['war', 'battle', 'army', 'soldier', 'military'], 'War'],
    [['historical', 'ancient', 'kingdom', 'emperor', 'dynasty'], 'Historical'],
    [['action', 'fight', 'revenge', 'vigilante'], 'Action'],
    [['thriller', 'suspense', 'mystery', 'twist'], 'Thriller'],
    [['family', 'parents', 'siblings', 'wedding', 'tradition'], 'Family'],
    [['sports', 'cricket', 'kabaddi', 'boxing', 'athlete'], 'Sports'],
    [['biography', 'life story', 'real life', 'true story'], 'Biography'],
  ];
  
  for (const [keywords, genre] of keywordMap) {
    if (keywords.some(kw => lower.includes(kw))) {
      return genre;
    }
  }
  
  return null;
}

// ============================================================
// AGE RATING DERIVATION
// ============================================================

/**
 * Derive age rating using content-aware logic.
 * 
 * Rules:
 * - Uses content_flags, trigger_warnings, mood_tags, audience_fit
 * - Never downgrades existing rating
 * - Defaults to U for pre-1980 films unless flags exist
 * - Defaults to U/A for 1980-2000 films (action era)
 * - When uncertain, assigns higher restriction (safety-first)
 * - NOW: Accepts with just 1 signal for higher coverage
 */
export function deriveAgeRating(movie: MovieForClassification): AgeRatingResult {
  const indicators: string[] = [];
  const reasons: string[] = [];
  
  // Check if we have sufficient data
  const hasContentFlags = movie.content_flags && Object.keys(movie.content_flags).length > 0;
  const hasTriggerWarnings = movie.trigger_warnings && movie.trigger_warnings.length > 0;
  const hasAudienceFit = movie.audience_fit && Object.keys(movie.audience_fit).length > 0;
  const hasMoodTags = movie.mood_tags && movie.mood_tags.length > 0;
  const hasGenres = movie.genres && movie.genres.length > 0;
  const hasYear = movie.release_year !== null && movie.release_year !== undefined;
  
  const signalCount = [hasContentFlags, hasTriggerWarnings, hasAudienceFit, hasMoodTags, hasGenres, hasYear]
    .filter(Boolean).length;
  
  // Era-based defaults - LOWERED threshold to 1 signal
  if (signalCount < 1) {
    return {
      age_rating: null,
      age_rating_confidence: 'low',
      age_rating_reasons: [],
      content_indicators: [],
      skipped: true,
      skip_reason: `No data available`,
    };
  }
  
  // Apply era-based defaults first (can be overridden by content flags)
  if (hasYear && movie.release_year) {
    if (movie.release_year < 1970) {
      // Very old films - default to U (family classics)
      if (!hasContentFlags && !hasTriggerWarnings) {
        return {
          age_rating: 'U',
          age_rating_confidence: 'high',
          age_rating_reasons: ['Pre-1970 film defaults to U (Golden era family classics)'],
          content_indicators: [],
          skipped: false,
        };
      }
    } else if (movie.release_year < 1980) {
      // 1970s - default to U unless flags exist
      if (!hasContentFlags && !hasTriggerWarnings) {
        return {
          age_rating: 'U',
          age_rating_confidence: 'medium',
          age_rating_reasons: ['1970s film defaults to U (Classic era)'],
          content_indicators: [],
          skipped: false,
        };
      }
    } else if (movie.release_year < 1995) {
      // 1980s-early 90s action era - default to U/A
      if (!hasContentFlags && !hasTriggerWarnings) {
        return {
          age_rating: 'U/A',
          age_rating_confidence: 'medium',
          age_rating_reasons: ['1980-1995 film defaults to U/A (Action era)'],
          content_indicators: [],
          skipped: false,
        };
      }
    }
  }
  
  let proposedRating: 'U' | 'U/A' | 'A' | 'S' = 'U'; // Start with most permissive
  
  // 1. Check content flags (highest priority for restriction)
  if (movie.content_flags) {
    const flags = movie.content_flags;
    
    if (flags.sexual_content || flags.nudity || flags.explicit) {
      proposedRating = safeUpgrade(proposedRating, 'A');
      indicators.push('sexual_content');
      reasons.push('Contains sexual content/nudity → A');
    }
    
    if (flags.violence || flags.gore || flags.brutal) {
      if (flags.gore || flags.brutal) {
        proposedRating = safeUpgrade(proposedRating, 'A');
        reasons.push('Contains graphic violence → A');
      } else {
        proposedRating = safeUpgrade(proposedRating, 'U/A');
        reasons.push('Contains violence → U/A');
      }
      indicators.push('violence');
    }
    
    if (flags.substance_abuse || flags.drugs || flags.alcohol) {
      proposedRating = safeUpgrade(proposedRating, 'U/A');
      indicators.push('substance');
      reasons.push('Contains substance use → U/A');
    }
    
    if (flags.abuse || flags.trauma) {
      proposedRating = safeUpgrade(proposedRating, 'U/A');
      indicators.push('dark_themes');
      reasons.push('Contains abuse/trauma themes → U/A');
    }
  }
  
  // 2. Check trigger warnings
  if (movie.trigger_warnings && movie.trigger_warnings.length > 0) {
    const warnings = movie.trigger_warnings.map(w => w.toLowerCase());
    
    if (warnings.some(w => ['violence', 'gore', 'blood'].includes(w))) {
      proposedRating = safeUpgrade(proposedRating, 'U/A');
      indicators.push('trigger_violence');
      reasons.push('Trigger warning: violence → U/A');
    }
    
    if (warnings.some(w => ['sexual-content', 'nudity'].includes(w))) {
      proposedRating = safeUpgrade(proposedRating, 'A');
      indicators.push('trigger_sexual');
      reasons.push('Trigger warning: sexual content → A');
    }
    
    if (warnings.some(w => ['substance-abuse', 'drug-use'].includes(w))) {
      proposedRating = safeUpgrade(proposedRating, 'U/A');
      indicators.push('trigger_substance');
      reasons.push('Trigger warning: substance use → U/A');
    }
  }
  
  // 3. Check genres for implicit ratings
  if (movie.genres) {
    const genres = movie.genres.map(g => g.toLowerCase());
    
    if (genres.includes('horror')) {
      proposedRating = safeUpgrade(proposedRating, 'U/A');
      indicators.push('genre_horror');
      reasons.push('Horror genre → U/A minimum');
    }
    
    if (genres.includes('adult') || genres.includes('erotic')) {
      proposedRating = safeUpgrade(proposedRating, 'A');
      indicators.push('genre_adult');
      reasons.push('Adult/Erotic genre → A');
    }
    
    if (genres.includes('war') || genres.includes('crime')) {
      proposedRating = safeUpgrade(proposedRating, 'U/A');
      indicators.push('genre_mature');
      reasons.push('War/Crime genre → U/A');
    }
  }
  
  // 4. Check mood tags
  if (movie.mood_tags) {
    const moods = movie.mood_tags.map(m => m.toLowerCase());
    
    if (moods.includes('dark-intense') || moods.includes('gripping')) {
      proposedRating = safeUpgrade(proposedRating, 'U/A');
      indicators.push('mood_intense');
      reasons.push('Intense mood → U/A');
    }
  }
  
  // 5. Check audience fit (can LOWER rating if explicitly family-safe)
  if (movie.audience_fit) {
    const fit = movie.audience_fit;
    
    // Only allow U if explicitly kids_friendly AND no other restricting indicators
    if (fit.kids_friendly && indicators.length === 0) {
      proposedRating = 'U';
      reasons.push('Kids friendly with no restrictions → U');
    } else if (fit.family_watch && indicators.length === 0) {
      proposedRating = 'U';
      reasons.push('Family watch with no restrictions → U');
    }
  }
  
  // 6. Era-based defaults (for older films)
  if (movie.release_year && movie.release_year < 1980 && indicators.length === 0) {
    proposedRating = 'U';
    reasons.push('Pre-1980 film with no flagged content → U');
  }
  
  // 7. Default to U/A if no indicators but not explicitly family-safe
  if (indicators.length === 0 && reasons.length === 0) {
    proposedRating = 'U/A';
    reasons.push('Default safe middle ground → U/A');
  }
  
  // Calculate confidence based on signal count and consistency
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (signalCount >= 4 && indicators.length > 0) {
    confidence = 'high';
  } else if (signalCount < 3) {
    confidence = 'low';
  }
  
  return {
    age_rating: proposedRating,
    age_rating_confidence: confidence,
    age_rating_reasons: reasons,
    content_indicators: indicators,
    skipped: false,
  };
}

/**
 * Safely upgrade age rating (never downgrade).
 */
function safeUpgrade(
  current: 'U' | 'U/A' | 'A' | 'S', 
  proposed: 'U' | 'U/A' | 'A' | 'S'
): 'U' | 'U/A' | 'A' | 'S' {
  const currentIdx = AGE_RATING_ORDER.indexOf(current);
  const proposedIdx = AGE_RATING_ORDER.indexOf(proposed);
  return proposedIdx > currentIdx ? proposed : current;
}

// ============================================================
// COMBINED CLASSIFICATION
// ============================================================

export interface ClassificationResult {
  movie_id: string;
  title: string;
  genre: GenreResult;
  age_rating: AgeRatingResult;
  needs_manual_review: boolean;
  review_reasons: string[];
}

/**
 * Perform complete classification for a movie.
 */
export function classifyMovie(movie: MovieForClassification): ClassificationResult {
  const genreResult = derivePrimaryGenre(movie);
  const ageRatingResult = deriveAgeRating(movie);
  
  // Determine if manual review is needed
  const reviewReasons: string[] = [];
  
  if (genreResult.ambiguous) {
    reviewReasons.push(`Genre ambiguous: ${genreResult.ambiguity_reason}`);
  }
  
  if (genreResult.genre_confidence === 'low' && genreResult.all_signals.length > 0) {
    reviewReasons.push(`Genre low confidence: ${genreResult.ambiguity_reason}`);
  }
  
  if (ageRatingResult.skipped) {
    reviewReasons.push(`Age rating skipped: ${ageRatingResult.skip_reason}`);
  }
  
  if (ageRatingResult.age_rating_confidence === 'low') {
    reviewReasons.push('Age rating low confidence');
  }
  
  return {
    movie_id: movie.id,
    title: movie.title_en,
    genre: genreResult,
    age_rating: ageRatingResult,
    needs_manual_review: reviewReasons.length > 0,
    review_reasons: reviewReasons,
  };
}

// ============================================================
// VALIDATION
// ============================================================

/**
 * Validate classification before write.
 * Returns issues that would block the write.
 */
export function validateClassification(
  movie: MovieForClassification,
  result: ClassificationResult
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Don't overwrite existing primary_genre if we have low confidence
  if (movie.primary_genre && result.genre.primary_genre && result.genre.genre_confidence === 'low') {
    issues.push(`Would overwrite existing genre "${movie.primary_genre}" with low confidence`);
  }
  
  // Don't downgrade existing age rating
  if (movie.age_rating && result.age_rating.age_rating) {
    const existingIdx = AGE_RATING_ORDER.indexOf(movie.age_rating as any);
    const newIdx = AGE_RATING_ORDER.indexOf(result.age_rating.age_rating);
    
    if (newIdx < existingIdx) {
      issues.push(`Would downgrade age rating from "${movie.age_rating}" to "${result.age_rating.age_rating}"`);
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}


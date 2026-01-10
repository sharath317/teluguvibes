/**
 * Tag Derivation Module
 * 
 * Automatically derives movie tags based on various signals
 */

// ============================================================
// TYPES
// ============================================================

export interface DerivedTags {
    // Box office performance
    box_office_category?: 'industry-hit' | 'blockbuster' | 'super-hit' | 'hit' | 'average' | 'below-average' | 'disaster';

    // Mood/tone tags
    mood_tags?: string[];

    // Quality indicators
    quality_tags?: string[];

    // Audience fit
    audience_fit?: string[];

    // Watch recommendation
    watch_recommendation?: 'theater-must' | 'theater-preferred' | 'ott-friendly' | 'any';

    // Legacy boolean flags
    is_blockbuster?: boolean;
    is_underrated?: boolean;
    is_classic?: boolean;
    is_cult?: boolean;

    // General tags array
    tags?: string[];
}

export interface MovieForTagging {
  id: string;
  title_en: string;
  title_te?: string;
  release_year?: number;
    our_rating?: number;
    avg_rating?: number;
  tmdb_rating?: number;
  imdb_rating?: number;
    genres?: string[];
    cast?: string[];
    directors?: string[];
    runtime?: number;
    box_office_collection?: number;
    budget?: number;
    review_count?: number;
    views?: number;
  popularity_score?: number;
    total_reviews?: number;
  is_blockbuster?: boolean;
  is_classic?: boolean;
    is_underrated?: boolean;
  overview?: string;
  tagline?: string;
    awards?: unknown[];
    content_flags?: Record<string, unknown>;
}

// ============================================================
// TAG DERIVATION
// ============================================================

/**
 * Derive all tags for a movie based on available signals
 */
export function deriveAllTags(movie: MovieForTagging): DerivedTags {
    const tags: DerivedTags = {
        tags: [],
        mood_tags: [],
        quality_tags: [],
        audience_fit: [],
    };

    const rating = movie.our_rating || movie.avg_rating || 0;
    const year = movie.release_year || new Date().getFullYear();
  
    // Derive quality tags based on rating
    if (rating >= 4.5) {
        tags.quality_tags?.push('masterpiece');
    } else if (rating >= 4.0) {
        tags.quality_tags?.push('critically-acclaimed');
    } else if (rating >= 3.5) {
        tags.quality_tags?.push('good-watch');
    }

    // Derive classic status
    if (year < 2005 && rating >= 3.5) {
        tags.is_classic = true;
        tags.tags?.push('classic');
  }
  
    // Derive underrated status (good rating but low views)
    if (rating >= 3.5 && (movie.views || 0) < 1000 && (movie.review_count || 0) < 10) {
        tags.is_underrated = true;
        tags.tags?.push('hidden-gem');
        tags.quality_tags?.push('hidden-gem');
    }

    // Derive mood from genres (case-insensitive)
    const genres = (movie.genres || []).map(g => g.toLowerCase());

    // Feel-good moods
    if (genres.some(g => ['comedy', 'family', 'animation'].includes(g))) {
        tags.mood_tags?.push('feel-good');
    }
    if (genres.includes('comedy')) {
        tags.mood_tags?.push('light-hearted');
    }

    // Intense moods
    if (genres.some(g => ['thriller', 'crime', 'horror', 'mystery'].includes(g))) {
        tags.mood_tags?.push('dark-intense');
    }
    if (genres.some(g => ['action', 'adventure'].includes(g))) {
        tags.mood_tags?.push('edge-of-seat');
    }
    if (genres.includes('horror')) {
        tags.mood_tags?.push('gripping');
    }

    // Emotional/thoughtful moods  
    if (genres.includes('drama')) {
        tags.mood_tags?.push('emotional');
        if (rating >= 3.5) {
            tags.mood_tags?.push('thought-provoking');
    }
  }
    if (genres.includes('romance')) {
        tags.mood_tags?.push('romantic');
    }

    // Special moods
    if (genres.some(g => ['war', 'history', 'biography'].includes(g))) {
        tags.mood_tags?.push('patriotic');
    }
    if (year < 2000) {
        tags.mood_tags?.push('nostalgic');
  }
    if (genres.includes('documentary')) {
        tags.mood_tags?.push('informative');
    }
    if (genres.some(g => ['musical', 'music'].includes(g))) {
        tags.mood_tags?.push('melodious');
  }
  
    // Ensure at least one mood tag
    if (tags.mood_tags?.length === 0) {
        // Default based on rating
        if (rating >= 3.5) {
            tags.mood_tags?.push('engaging');
        } else {
            tags.mood_tags?.push('casual');
        }
    }

    // Deduplicate mood tags
    tags.mood_tags = [...new Set(tags.mood_tags)];
  
    // Derive audience fit
    if (genres.includes('animation') || genres.includes('family')) {
        tags.audience_fit?.push('kids_friendly');
        tags.audience_fit?.push('family_watch');
  }
    if (genres.includes('romance')) {
        tags.audience_fit?.push('date_movie');
  }
    if (genres.includes('action') || genres.includes('comedy')) {
        tags.audience_fit?.push('group_watch');
  }
  
    // Default watch recommendation
    tags.watch_recommendation = rating >= 4.0 ? 'theater-must' :
        rating >= 3.5 ? 'theater-preferred' : 'ott-friendly';
  
    return tags;
}

/**
 * Derive blockbuster status
 */
export function deriveBlockbusterStatus(movie: MovieForTagging, topHeroes: string[], topDirectors: string[]): boolean {
    const rating = movie.our_rating || movie.avg_rating || 0;
    const cast = movie.cast || [];
    const directors = movie.directors || [];
  
    // High rating with top stars or directors
    if (rating >= 4.0) {
        const hasTopHero = cast.some(actor => topHeroes.includes(actor));
        const hasTopDirector = directors.some(dir => topDirectors.includes(dir));

      if (hasTopHero || hasTopDirector) {
          return true;
      }
  }
  
    // Very high rating is blockbuster regardless
    if (rating >= 4.5) {
        return true;
    }

    return false;
}

/**
 * Derive mood tags from movie content (comprehensive, case-insensitive)
 */
export function deriveMoodTags(movie: MovieForTagging): string[] {
    const moods: string[] = [];
    const genres = (movie.genres || []).map(g => g.toLowerCase());
    const rating = movie.our_rating || movie.avg_rating || 0;
  
    // Genre-based mood mapping
    const GENRE_MOOD_MAP: Record<string, string[]> = {
        'comedy': ['feel-good', 'light-hearted'],
        'family': ['feel-good'],
        'animation': ['feel-good'],
        'horror': ['dark-intense', 'gripping'],
        'thriller': ['dark-intense', 'edge-of-seat'],
        'crime': ['dark-intense', 'gripping'],
        'mystery': ['gripping'],
        'action': ['edge-of-seat', 'intense'],
        'adventure': ['edge-of-seat'],
        'drama': ['emotional', 'thought-provoking'],
        'romance': ['romantic', 'emotional'],
        'war': ['patriotic', 'intense'],
        'history': ['patriotic'],
        'biography': ['inspirational'],
        'documentary': ['informative'],
        'musical': ['melodious'],
        'fantasy': ['imaginative'],
        'sci-fi': ['futuristic'],
    };
  
    for (const genre of genres) {
        const moodList = GENRE_MOOD_MAP[genre];
        if (moodList) {
            moods.push(...moodList);
        }
  }
  
    // Ensure at least one mood
    if (moods.length === 0) {
        moods.push(rating >= 3.5 ? 'engaging' : 'casual');
  }
  
    // Deduplicate
    return [...new Set(moods)];
}

/**
 * Derive box office category
 */
export function deriveBoxOfficeCategory(
    collection: number | undefined,
    budget: number | undefined
): DerivedTags['box_office_category'] {
    if (!collection || !budget) return undefined;
  
    const ratio = collection / budget;
  
    if (ratio >= 5) return 'industry-hit';
    if (ratio >= 3) return 'blockbuster';
    if (ratio >= 2) return 'super-hit';
    if (ratio >= 1.5) return 'hit';
    if (ratio >= 1) return 'average';
    if (ratio >= 0.5) return 'below-average';
    return 'disaster';
}


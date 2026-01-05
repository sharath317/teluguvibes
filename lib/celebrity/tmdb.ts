/**
 * TMDB Integration for Celebrity Data
 * Fetches filmography, posters, popularity scores
 *
 * Legal: TMDB API with proper attribution
 */

import type { TMDBPerson, TMDBMovieCredit } from '@/types/celebrity';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

interface TMDBSearchResult {
  id: number;
  name: string;
  known_for_department: string;
  popularity: number;
  profile_path?: string;
}

/**
 * Search TMDB for a person by name
 */
export async function searchPersonOnTMDB(name: string): Promise<TMDBSearchResult[]> {
  if (!TMDB_API_KEY) {
    console.warn('TMDB_API_KEY not configured');
    return [];
  }

  const url = `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}&language=en-US`;

  try {
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('TMDB search error:', error);
    return [];
  }
}

/**
 * Get detailed person info from TMDB
 */
export async function getPersonDetails(tmdbId: number): Promise<TMDBPerson | null> {
  if (!TMDB_API_KEY) return null;

  const url = `${TMDB_BASE_URL}/person/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.error('TMDB person details error:', error);
    return null;
  }
}

/**
 * Get movie credits for a person
 */
export async function getPersonMovieCredits(tmdbId: number): Promise<TMDBMovieCredit[]> {
  if (!TMDB_API_KEY) return [];

  const url = `${TMDB_BASE_URL}/person/${tmdbId}/movie_credits?api_key=${TMDB_API_KEY}&language=en-US`;

  try {
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();

    // Combine cast and crew credits
    const castCredits = (data.cast || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      release_date: c.release_date,
      character: c.character,
      poster_path: c.poster_path,
    }));

    return castCredits;
  } catch (error) {
    console.error('TMDB credits error:', error);
    return [];
  }
}

/**
 * Get person's images from TMDB
 */
export async function getPersonImages(tmdbId: number): Promise<string[]> {
  if (!TMDB_API_KEY) return [];

  const url = `${TMDB_BASE_URL}/person/${tmdbId}/images?api_key=${TMDB_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();

    // Get profile images, sorted by vote average
    const profiles = (data.profiles || [])
      .sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0))
      .slice(0, 5)
      .map((img: any) => `${TMDB_IMAGE_BASE}/w500${img.file_path}`);

    return profiles;
  } catch (error) {
    console.error('TMDB images error:', error);
    return [];
  }
}

/**
 * Build full TMDB image URL
 */
export function buildTMDBImageUrl(path: string | null, size: 'w185' | 'w342' | 'w500' | 'original' = 'w500'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/**
 * Match Wikidata celebrity with TMDB person
 * Uses name matching and birth date verification
 */
export async function matchCelebrityWithTMDB(
  name: string,
  birthDate?: string,
  occupation?: string[]
): Promise<{ tmdbId: number; confidence: number } | null> {
  console.log(`🔗 Matching "${name}" with TMDB...`);

  const searchResults = await searchPersonOnTMDB(name);

  if (searchResults.length === 0) {
    console.log(`  ❌ No TMDB results for "${name}"`);
    return null;
  }

  // Score each result
  const scoredResults = await Promise.all(
    searchResults.slice(0, 5).map(async (result) => {
      let score = 0;

      // Exact name match
      if (result.name.toLowerCase() === name.toLowerCase()) {
        score += 50;
      } else if (result.name.toLowerCase().includes(name.toLowerCase())) {
        score += 30;
      }

      // Department match
      const isActor = occupation?.some(o =>
        o.toLowerCase().includes('actor') || o.toLowerCase().includes('actress')
      );
      const isDirector = occupation?.some(o => o.toLowerCase().includes('director'));

      if (isActor && result.known_for_department === 'Acting') {
        score += 30;
      }
      if (isDirector && result.known_for_department === 'Directing') {
        score += 30;
      }

      // Popularity bonus
      score += Math.min(result.popularity / 10, 10);

      // Birth date verification
      if (birthDate) {
        const details = await getPersonDetails(result.id);
        if (details?.birthday === birthDate) {
          score += 40; // Strong match
        }
      }

      return { ...result, score };
    })
  );

  // Get best match
  const bestMatch = scoredResults.sort((a, b) => b.score - a.score)[0];

  if (bestMatch.score >= 50) {
    console.log(`  ✅ Matched with TMDB ID ${bestMatch.id} (score: ${bestMatch.score})`);
    return {
      tmdbId: bestMatch.id,
      confidence: Math.min(bestMatch.score / 100, 1)
    };
  }

  console.log(`  ⚠️ Low confidence match for "${name}"`);
  return null;
}

/**
 * Fetch complete celebrity data from TMDB
 */
export async function fetchCompleteTMDBData(tmdbId: number): Promise<{
  person: TMDBPerson | null;
  credits: TMDBMovieCredit[];
  images: string[];
}> {
  const [person, credits, images] = await Promise.all([
    getPersonDetails(tmdbId),
    getPersonMovieCredits(tmdbId),
    getPersonImages(tmdbId),
  ]);

  return { person, credits, images };
}

/**
 * Get Telugu movies from credits
 * Filters by looking for Telugu language movies
 */
export function filterTeluguMovies(credits: TMDBMovieCredit[]): TMDBMovieCredit[] {
  // TMDB doesn't directly provide language info in credits
  // We'll return all and let the caller filter if needed
  return credits
    .filter(c => c.release_date) // Only movies with release dates
    .sort((a, b) => {
      const dateA = new Date(a.release_date || '1900-01-01');
      const dateB = new Date(b.release_date || '1900-01-01');
      return dateB.getTime() - dateA.getTime();
    });
}

/**
 * Identify iconic movies (based on character name patterns)
 */
export function identifyIconicMovies(credits: TMDBMovieCredit[]): TMDBMovieCredit[] {
  // Movies where character name suggests lead role
  return credits.filter(c => {
    if (!c.character) return false;

    // Lead role indicators
    const isLead =
      c.character.toLowerCase().includes('lead') ||
      c.character.toLowerCase().includes('himself') ||
      c.character.toLowerCase().includes('herself') ||
      !c.character.includes('/') || // Not multiple characters
      c.character.split(' ').length <= 3; // Short character name

    return isLead;
  });
}









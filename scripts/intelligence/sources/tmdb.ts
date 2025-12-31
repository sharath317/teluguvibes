/**
 * TMDB SOURCE FETCHER
 *
 * Fetches Telugu movies and celebrities from TMDB API.
 *
 * Rate Limits:
 * - 40 requests per 10 seconds
 * - We use 200ms delay between requests to stay safe
 */

import type { RawEntity, RawCelebrityData, RawMovieData, TargetType } from '../types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Telugu language code for TMDB
const TELUGU_LANGUAGE = 'te';
const TELUGU_REGION = 'IN';

interface TMDBMovieResult {
  id: number;
  title: string;
  original_title: string;
  original_language: string;
  release_date: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
}

/**
 * Main entry point - fetch from TMDB based on targets
 */
export async function fetchFromTMDB(
  limit: number,
  targets: TargetType[]
): Promise<RawEntity[]> {
  // Read API key at runtime
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('  ⚠ TMDB_API_KEY not set, skipping TMDB source');
    return [];
  }

  const entities: RawEntity[] = [];

  // Fetch movies if targeted
  if (targets.includes('movies') || targets.includes('reviews')) {
    const movies = await fetchTeluguMovies(apiKey, limit);
    entities.push(...movies);
  }

  // Fetch celebrities if targeted
  if (targets.includes('celebrities')) {
    const celebrities = await fetchTeluguCelebrities(apiKey, limit);
    entities.push(...celebrities);
  }

  return entities;
}

/**
 * Fetch Telugu movies from TMDB
 * Uses discover endpoint with Telugu language filter
 */
async function fetchTeluguMovies(apiKey: string, limit: number): Promise<RawEntity[]> {
  const entities: RawEntity[] = [];
  const pages = Math.ceil(limit / 20); // TMDB returns 20 per page

  for (let page = 1; page <= pages && entities.length < limit; page++) {
    try {
      // Discover Telugu movies
      const url = `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}` +
        `&with_original_language=${TELUGU_LANGUAGE}` +
        `&region=${TELUGU_REGION}` +
        `&sort_by=popularity.desc` +
        `&page=${page}`;

      const response = await fetch(url);
      if (!response.ok) continue;

      const data = await response.json();
      const movies: TMDBMovieResult[] = data.results || [];

      for (const movie of movies) {
        if (entities.length >= limit) break;

        // Fetch detailed movie info
        const details = await fetchMovieDetails(apiKey, movie.id);

        const rawData: RawMovieData = {
          type: 'movie',
          tmdb_id: movie.id,
          title_en: movie.title,
          title_te: movie.original_title !== movie.title ? movie.original_title : undefined,
          release_date: movie.release_date,
          overview: movie.overview,
          poster_url: movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : undefined,
          backdrop_url: movie.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
            : undefined,
          popularity: movie.popularity,
          vote_average: movie.vote_average,
          vote_count: movie.vote_count,
          genres: details?.genres?.map((g: { name: string }) => g.name) || [],
          runtime: details?.runtime,
          budget: details?.budget,
          revenue: details?.revenue,
          cast: details?.credits?.cast?.slice(0, 10).map((c: { name: string; character: string; order: number }) => ({
            name: c.name,
            character: c.character,
            order: c.order,
          })) || [],
          crew: details?.credits?.crew?.filter((c: { job: string }) =>
            ['Director', 'Music Director', 'Producer', 'Writer'].includes(c.job)
          ).map((c: { name: string; job: string; department: string }) => ({
            name: c.name,
            job: c.job,
            department: c.department,
          })) || [],
        };

        entities.push({
          entity_type: 'movie',
          source: 'tmdb',
          source_id: `tmdb_movie_${movie.id}`,
          name_en: movie.title,
          name_te: rawData.title_te,
          data: rawData,
          fetched_at: new Date().toISOString(),
        });

        // Rate limit delay
        await delay(200);
      }

      await delay(300); // Extra delay between pages
    } catch (error) {
      console.warn(`  ⚠ Failed to fetch TMDB movies page ${page}:`, error);
    }
  }

  return entities;
}

/**
 * Fetch Telugu celebrities from TMDB
 */
async function fetchTeluguCelebrities(apiKey: string, limit: number): Promise<RawEntity[]> {
  const entities: RawEntity[] = [];

  // TMDB doesn't have a direct "Telugu actors" endpoint
  // Strategy: Fetch popular people who appear in Telugu movies

  // First, get some popular Telugu movies
  const moviesUrl = `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}` +
    `&with_original_language=${TELUGU_LANGUAGE}` +
    `&sort_by=popularity.desc` +
    `&page=1`;

  try {
    const moviesResponse = await fetch(moviesUrl);
    const moviesData = await moviesResponse.json();
    const movieIds = (moviesData.results || []).slice(0, 10).map((m: { id: number }) => m.id);

    // Collect unique person IDs from movie credits
    const personIds = new Set<number>();

    for (const movieId of movieIds) {
      const creditsUrl = `${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${apiKey}`;
      const creditsResponse = await fetch(creditsUrl);

      if (!creditsResponse.ok) continue;

      const credits = await creditsResponse.json();

      // Add cast members
      (credits.cast || []).slice(0, 5).forEach((c: { id: number }) => personIds.add(c.id));

      // Add key crew
      (credits.crew || [])
        .filter((c: { job: string }) => ['Director', 'Music Director'].includes(c.job))
        .forEach((c: { id: number }) => personIds.add(c.id));

      await delay(150);

      if (personIds.size >= limit) break;
    }

    // Fetch detailed person info
    const personIdArray = Array.from(personIds).slice(0, limit);

    for (const personId of personIdArray) {
      try {
        const personUrl = `${TMDB_BASE_URL}/person/${personId}?api_key=${apiKey}&append_to_response=movie_credits`;
        const personResponse = await fetch(personUrl);

        if (!personResponse.ok) continue;

        const person = await personResponse.json();

        const rawData: RawCelebrityData = {
          type: 'celebrity',
          tmdb_id: person.id,
          gender: person.gender === 1 ? 'female' : person.gender === 2 ? 'male' : 'unknown',
          birth_date: person.birthday,
          death_date: person.deathday,
          occupation: [person.known_for_department],
          biography: person.biography,
          image_url: person.profile_path
            ? `https://image.tmdb.org/t/p/w500${person.profile_path}`
            : undefined,
          popularity: person.popularity,
          known_for: (person.also_known_as || []).slice(0, 5),
          filmography: (person.movie_credits?.cast || [])
            .filter((m: { original_language: string }) => m.original_language === 'te')
            .slice(0, 20)
            .map((m: { title: string; release_date: string; character: string }) => ({
              title: m.title,
              year: m.release_date ? new Date(m.release_date).getFullYear() : null,
              role: m.character,
            })),
        };

        entities.push({
          entity_type: 'celebrity',
          source: 'tmdb',
          source_id: `tmdb_person_${person.id}`,
          name_en: person.name,
          data: rawData,
          fetched_at: new Date().toISOString(),
        });

        await delay(200);
      } catch (error) {
        console.warn(`  ⚠ Failed to fetch person ${personId}:`, error);
      }
    }
  } catch (error) {
    console.warn('  ⚠ Failed to fetch TMDB celebrities:', error);
  }

  return entities;
}

/**
 * Fetch detailed movie info including credits
 */
async function fetchMovieDetails(apiKey: string, movieId: number): Promise<Record<string, unknown> | null> {
  try {
    const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${apiKey}&append_to_response=credits`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

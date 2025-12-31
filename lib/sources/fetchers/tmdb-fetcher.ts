/**
 * TMDB FETCHER (PRIMARY CANONICAL SOURCE)
 *
 * High-confidence source for modern Telugu movies and celebrities.
 * Rate limit: 40 requests per 10 seconds
 */

import { BaseFetcher } from '../base-fetcher';
import type { FetcherResult, FetcherConfig, MovieData, PersonData, CastMember, CrewMember } from '../types';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TELUGU_LANGUAGE = 'te';

type TMDBEntity = MovieData | PersonData;

export class TMDBFetcher extends BaseFetcher<TMDBEntity> {
  constructor() {
    super('tmdb');
    this.rateLimit = { requests: 40, windowMs: 10000 };
  }

  async fetch(config: FetcherConfig): Promise<FetcherResult<TMDBEntity>[]> {
    if (!TMDB_API_KEY) {
      console.warn('TMDB_API_KEY not set');
      return [];
    }

    const results: FetcherResult<TMDBEntity>[] = [];
    const limit = config.limit || 50;

    // Fetch movies
    const movies = await this.fetchTeluguMovies(limit);
    results.push(...movies);

    // Fetch people from movie credits
    const people = await this.fetchTeluguPeople(Math.floor(limit / 2));
    results.push(...people);

    return results;
  }

  protected isTeluguRelated(data: TMDBEntity): boolean {
    if ('genres' in data) {
      // Movie - check if we fetched it from Telugu filter
      return true; // Already filtered in query
    }
    if ('roles' in data) {
      // Person - check filmography
      return (data as PersonData).filmography?.some(f => f.movie_title) || false;
    }
    return false;
  }

  /**
   * Fetch Telugu movies from TMDB
   */
  private async fetchTeluguMovies(limit: number): Promise<FetcherResult<MovieData>[]> {
    const results: FetcherResult<MovieData>[] = [];
    const pages = Math.ceil(limit / 20);

    for (let page = 1; page <= pages && results.length < limit; page++) {
      const url = `${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}` +
        `&with_original_language=${TELUGU_LANGUAGE}` +
        `&sort_by=popularity.desc` +
        `&page=${page}`;

      const data = await this.fetchJSON<any>(url);
      if (!data?.results) continue;

      for (const movie of data.results) {
        if (results.length >= limit) break;

        // Fetch detailed info
        const details = await this.fetchMovieDetails(movie.id);
        if (!details) continue;

        const movieData = this.transformMovie(movie, details);
        const confidence = this.calculateMovieConfidence(movieData, details);

        results.push(this.wrapResult(movieData, confidence, true, {
          query_used: 'discover/movie',
          total_results: data.total_results,
          page,
        }));
      }
    }

    return results;
  }

  /**
   * Fetch detailed movie info
   */
  private async fetchMovieDetails(movieId: number): Promise<any> {
    const url = `${TMDB_BASE}/movie/${movieId}?api_key=${TMDB_API_KEY}` +
      `&append_to_response=credits,videos,keywords`;
    return this.fetchJSON(url);
  }

  /**
   * Transform TMDB movie to standard format
   */
  private transformMovie(basic: any, details: any): MovieData {
    const credits = details.credits || {};

    return {
      tmdb_id: basic.id,
      title_en: basic.title,
      title_te: basic.original_title !== basic.title ? basic.original_title : undefined,
      title_original: basic.original_title,
      release_date: basic.release_date,
      release_year: basic.release_date ? new Date(basic.release_date).getFullYear() : undefined,
      runtime_minutes: details.runtime,
      genres: (details.genres || []).map((g: any) => g.name),
      director: credits.crew?.find((c: any) => c.job === 'Director')?.name,
      directors: credits.crew?.filter((c: any) => c.job === 'Director').map((c: any) => c.name),
      hero: credits.cast?.[0]?.name,
      heroine: credits.cast?.find((c: any) => c.gender === 1)?.name,
      cast: this.transformCast(credits.cast || []),
      crew: this.transformCrew(credits.crew || []),
      music_director: credits.crew?.find((c: any) =>
        c.job === 'Music' || c.job === 'Original Music Composer'
      )?.name,
      cinematographer: credits.crew?.find((c: any) =>
        c.job === 'Director of Photography'
      )?.name,
      producer: credits.crew?.find((c: any) => c.job === 'Producer')?.name,
      production_company: details.production_companies?.[0]?.name,
      budget: details.budget || undefined,
      budget_currency: 'USD',
      revenue: details.revenue || undefined,
      poster_url: basic.poster_path
        ? `https://image.tmdb.org/t/p/w500${basic.poster_path}`
        : undefined,
      backdrop_url: basic.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${basic.backdrop_path}`
        : undefined,
      trailer_url: this.extractTrailerUrl(details.videos?.results),
      tmdb_rating: basic.vote_average,
      vote_count: basic.vote_count,
      overview_en: basic.overview,
      tagline: details.tagline,
      catalogue_status: 'verified',
      data_sources: ['tmdb'],
    };
  }

  private transformCast(cast: any[]): CastMember[] {
    return cast.slice(0, 15).map((c: any) => ({
      name: c.name,
      character: c.character,
      order: c.order,
      tmdb_id: c.id,
      image_url: c.profile_path
        ? `https://image.tmdb.org/t/p/w185${c.profile_path}`
        : undefined,
    }));
  }

  private transformCrew(crew: any[]): CrewMember[] {
    const importantJobs = [
      'Director', 'Producer', 'Writer', 'Screenplay',
      'Music', 'Original Music Composer', 'Director of Photography',
      'Editor', 'Art Direction',
    ];
    return crew
      .filter((c: any) => importantJobs.includes(c.job))
      .slice(0, 20)
      .map((c: any) => ({
        name: c.name,
        job: c.job,
        department: c.department,
        tmdb_id: c.id,
      }));
  }

  private extractTrailerUrl(videos: any[]): string | undefined {
    const trailer = videos?.find((v: any) =>
      v.type === 'Trailer' && v.site === 'YouTube'
    );
    return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : undefined;
  }

  private calculateMovieConfidence(movie: MovieData, details: any): number {
    let confidence = this.baseReliability;

    // Completeness factors
    if (movie.release_date) confidence += 0.02;
    if (movie.director) confidence += 0.02;
    if (movie.cast && movie.cast.length > 5) confidence += 0.02;
    if (movie.poster_url) confidence += 0.01;
    if (movie.overview_en && movie.overview_en.length > 100) confidence += 0.02;
    if ((movie.vote_count || 0) > 100) confidence += 0.02;

    return Math.min(1, confidence);
  }

  /**
   * Fetch Telugu cinema people
   */
  private async fetchTeluguPeople(limit: number): Promise<FetcherResult<PersonData>[]> {
    const results: FetcherResult<PersonData>[] = [];
    const seenIds = new Set<number>();

    // Get from popular Telugu movies' credits
    const moviesUrl = `${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}` +
      `&with_original_language=${TELUGU_LANGUAGE}` +
      `&sort_by=popularity.desc&page=1`;

    const moviesData = await this.fetchJSON<any>(moviesUrl);
    if (!moviesData?.results) return results;

    for (const movie of moviesData.results.slice(0, 5)) {
      const creditsUrl = `${TMDB_BASE}/movie/${movie.id}/credits?api_key=${TMDB_API_KEY}`;
      const credits = await this.fetchJSON<any>(creditsUrl);
      if (!credits) continue;

      // Get top cast and key crew
      const personIds = [
        ...credits.cast?.slice(0, 5).map((c: any) => c.id) || [],
        ...credits.crew?.filter((c: any) =>
          ['Director', 'Music', 'Producer'].includes(c.job)
        ).map((c: any) => c.id) || [],
      ];

      for (const personId of personIds) {
        if (seenIds.has(personId) || results.length >= limit) continue;
        seenIds.add(personId);

        const personData = await this.fetchPersonDetails(personId);
        if (!personData) continue;

        const confidence = this.calculatePersonConfidence(personData);
        results.push(this.wrapResult(personData, confidence, true));
      }
    }

    return results;
  }

  private async fetchPersonDetails(personId: number): Promise<PersonData | null> {
    const url = `${TMDB_BASE}/person/${personId}?api_key=${TMDB_API_KEY}` +
      `&append_to_response=movie_credits`;
    const data = await this.fetchJSON<any>(url);
    if (!data) return null;

    // Filter to Telugu movies only
    const teluguMovies = (data.movie_credits?.cast || [])
      .filter((m: any) => m.original_language === 'te')
      .slice(0, 20);

    const teluguCrewMovies = (data.movie_credits?.crew || [])
      .filter((m: any) => m.original_language === 'te')
      .slice(0, 10);

    return {
      tmdb_id: data.id,
      imdb_id: data.imdb_id,
      name_en: data.name,
      aliases: data.also_known_as?.slice(0, 5),
      gender: data.gender === 1 ? 'female' : data.gender === 2 ? 'male' : 'other',
      birth_date: data.birthday,
      death_date: data.deathday,
      birth_place: data.place_of_birth,
      roles: this.inferRoles(data, teluguMovies, teluguCrewMovies),
      primary_role: this.inferPrimaryRole(data.known_for_department),
      biography_en: data.biography,
      image_url: data.profile_path
        ? `https://image.tmdb.org/t/p/w500${data.profile_path}`
        : undefined,
      filmography: teluguMovies.map((m: any) => ({
        movie_title: m.title,
        year: m.release_date ? new Date(m.release_date).getFullYear() : undefined,
        character: m.character,
        tmdb_id: m.id,
      })),
      notable_movies: teluguMovies.slice(0, 5).map((m: any) => m.title),
      catalogue_status: 'verified',
      data_sources: ['tmdb'],
    };
  }

  private inferRoles(data: any, castMovies: any[], crewMovies: any[]): PersonData['roles'] {
    const roles: PersonData['roles'] = [];

    if (castMovies.length > 0) {
      roles.push(data.gender === 1 ? 'actress' : 'actor');
    }

    for (const movie of crewMovies) {
      if (movie.job === 'Director' && !roles.includes('director')) {
        roles.push('director');
      }
      if (movie.job === 'Producer' && !roles.includes('producer')) {
        roles.push('producer');
      }
      if ((movie.job === 'Music' || movie.job === 'Original Music Composer') &&
          !roles.includes('music_director')) {
        roles.push('music_director');
      }
    }

    return roles.length > 0 ? roles : ['actor'];
  }

  private inferPrimaryRole(department: string): PersonData['primary_role'] {
    const mapping: Record<string, PersonData['primary_role']> = {
      Acting: 'actor',
      Directing: 'director',
      Production: 'producer',
      Sound: 'music_director',
      Writing: 'writer',
      Camera: 'cinematographer',
      Editing: 'editor',
    };
    return mapping[department] || 'actor';
  }

  private calculatePersonConfidence(person: PersonData): number {
    let confidence = this.baseReliability;

    if (person.birth_date) confidence += 0.02;
    if (person.biography_en && person.biography_en.length > 100) confidence += 0.03;
    if (person.image_url) confidence += 0.02;
    if ((person.filmography?.length || 0) > 5) confidence += 0.03;

    return Math.min(1, confidence);
  }
}




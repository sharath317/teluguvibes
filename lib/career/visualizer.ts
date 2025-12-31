/**
 * CAREER POSTER VISUALIZER
 *
 * Generates career visualization data for celebrities.
 * Shows poster grid with color-coded performance (Hit/Flop).
 *
 * Data sources:
 * - TMDB posters (licensed)
 * - Internal box office classification
 */

import { createClient } from '@supabase/supabase-js';
import type { CareerVisualization, CareerMovie } from '../games/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// VERDICT COLORS
// ============================================================

export const VERDICT_COLORS: Record<string, string> = {
  blockbuster: '#10B981', // Green-500
  superhit: '#34D399',    // Green-400
  hit: '#6EE7B7',         // Green-300
  average: '#FBBF24',     // Yellow-400
  flop: '#F87171',        // Red-400
  disaster: '#EF4444',    // Red-500
  classic: '#A855F7',     // Purple-500
  unknown: '#6B7280',     // Gray-500
};

export const VERDICT_LABELS: Record<string, string> = {
  blockbuster: 'Blockbuster',
  superhit: 'Super Hit',
  hit: 'Hit',
  average: 'Average',
  flop: 'Flop',
  disaster: 'Disaster',
  classic: 'Classic',
  unknown: 'Unknown',
};

export const VERDICT_LABELS_TE: Record<string, string> = {
  blockbuster: 'బ్లాక్‌బస్టర్',
  superhit: 'సూపర్ హిట్',
  hit: 'హిట్',
  average: 'యావరేజ్',
  flop: 'ఫ్లాప్',
  disaster: 'డిజాస్టర్',
  classic: 'క్లాసిక్',
  unknown: 'తెలియదు',
};

// ============================================================
// MAIN VISUALIZER
// ============================================================

export class CareerVisualizer {
  /**
   * Get career visualization for a celebrity
   */
  async getCareerVisualization(celebIdOrSlug: string): Promise<CareerVisualization | null> {
    // Get celebrity
    const { data: celebrity } = await supabase
      .from('celebrities')
      .select('*')
      .or(`id.eq.${celebIdOrSlug},slug.eq.${celebIdOrSlug}`)
      .single();

    if (!celebrity) return null;

    // Get movies featuring this celebrity
    const movies = await this.getCelebrityMovies(celebrity.id, celebrity.name_en);

    // Calculate stats
    const stats = this.calculateStats(movies);

    // Get available filters
    const years = [...new Set(movies.map(m => m.year))].sort((a, b) => b - a);
    const genres = [...new Set(movies.flatMap(m => m.genre ? [m.genre] : []))];
    const roles = [...new Set(movies.map(m => m.role).filter(Boolean))];

    return {
      celebrity_id: celebrity.id,
      celebrity_name: celebrity.name_en,
      celebrity_name_te: celebrity.name_te,
      celebrity_image: celebrity.image_url,
      total_movies: movies.length,
      hits: stats.hits,
      average: stats.average,
      flops: stats.flops,
      classics: stats.classics,
      debut_year: celebrity.debut_year || movies[movies.length - 1]?.year,
      active_years: this.getActiveYears(movies),
      peak_years: this.getPeakYears(movies),
      movies,
      years,
      genres,
      roles,
    };
  }

  /**
   * Get all movies for a celebrity
   */
  private async getCelebrityMovies(celebId: string, celebName: string): Promise<CareerMovie[]> {
    // First try to get from movies table with celebrity link
    const { data: linkedMovies } = await supabase
      .from('movies')
      .select('*')
      .or(`hero.ilike.%${celebName}%,heroine.ilike.%${celebName}%,cast.cs.{${celebName}}`)
      .order('release_year', { ascending: false });

    // Also try filmography from celebrity record
    const { data: celeb } = await supabase
      .from('celebrities')
      .select('filmography')
      .eq('id', celebId)
      .single();

    const filmography = celeb?.filmography || [];

    // Merge and deduplicate
    const moviesMap = new Map<string, CareerMovie>();

    // Add linked movies
    for (const movie of (linkedMovies || [])) {
      const key = movie.title_en?.toLowerCase() || movie.id;
      if (!moviesMap.has(key)) {
        moviesMap.set(key, this.transformToCareerMovie(movie, celebName));
      }
    }

    // Add filmography entries
    for (const entry of filmography) {
      const key = entry.movie_title?.toLowerCase() || entry.tmdb_id;
      if (!moviesMap.has(key)) {
        moviesMap.set(key, {
          movie_id: entry.tmdb_id || `filmography_${key}`,
          title: entry.movie_title,
          year: entry.year || 0,
          verdict: 'unknown',
          verdict_color: VERDICT_COLORS.unknown,
          is_estimated: true,
          role: entry.character ? 'Lead' : undefined,
        });
      }
    }

    return Array.from(moviesMap.values())
      .filter(m => m.year > 0)
      .sort((a, b) => b.year - a.year);
  }

  /**
   * Transform movie record to career movie
   */
  private transformToCareerMovie(movie: any, celebName: string): CareerMovie {
    const verdict = this.normalizeVerdict(movie.verdict);

    // Determine role
    let role = 'Supporting';
    if (movie.hero?.toLowerCase().includes(celebName.toLowerCase())) {
      role = 'Lead';
    } else if (movie.heroine?.toLowerCase().includes(celebName.toLowerCase())) {
      role = 'Lead';
    }

    return {
      movie_id: movie.id,
      title: movie.title_en,
      title_te: movie.title_te,
      year: movie.release_year,
      poster_url: movie.poster_url,
      poster_source: 'tmdb',
      verdict,
      verdict_color: VERDICT_COLORS[verdict] || VERDICT_COLORS.unknown,
      genre: movie.genres?.[0],
      role,
      director: movie.director,
      is_estimated: !movie.box_office_verified,
    };
  }

  /**
   * Normalize verdict to standard values
   */
  private normalizeVerdict(verdict: string | null): CareerMovie['verdict'] {
    if (!verdict) return 'unknown';

    const v = verdict.toLowerCase();
    if (v.includes('block') || v.includes('industry')) return 'blockbuster';
    if (v.includes('super')) return 'superhit';
    if (v.includes('hit') && !v.includes('flop')) return 'hit';
    if (v.includes('average') || v.includes('decent')) return 'average';
    if (v.includes('disaster')) return 'disaster';
    if (v.includes('flop')) return 'flop';
    if (v.includes('classic') || v.includes('cult')) return 'classic';

    return 'unknown';
  }

  /**
   * Calculate career statistics
   */
  private calculateStats(movies: CareerMovie[]) {
    let hits = 0;
    let average = 0;
    let flops = 0;
    let classics = 0;

    for (const movie of movies) {
      switch (movie.verdict) {
        case 'blockbuster':
        case 'superhit':
        case 'hit':
          hits++;
          break;
        case 'average':
          average++;
          break;
        case 'flop':
        case 'disaster':
          flops++;
          break;
        case 'classic':
          classics++;
          hits++; // Classics are also hits
          break;
      }
    }

    return { hits, average, flops, classics };
  }

  /**
   * Get active years range
   */
  private getActiveYears(movies: CareerMovie[]): string {
    if (movies.length === 0) return 'Unknown';

    const years = movies.map(m => m.year).filter(y => y > 0);
    if (years.length === 0) return 'Unknown';

    const min = Math.min(...years);
    const max = Math.max(...years);

    return min === max ? `${min}` : `${min} - ${max}`;
  }

  /**
   * Get peak years (most hits)
   */
  private getPeakYears(movies: CareerMovie[]): string {
    const hitsByYear: Record<number, number> = {};

    for (const movie of movies) {
      if (['blockbuster', 'superhit', 'hit', 'classic'].includes(movie.verdict)) {
        hitsByYear[movie.year] = (hitsByYear[movie.year] || 0) + 1;
      }
    }

    const entries = Object.entries(hitsByYear);
    if (entries.length === 0) return 'N/A';

    // Find peak years (most hits)
    const maxHits = Math.max(...Object.values(hitsByYear));
    const peakYears = entries
      .filter(([, count]) => count === maxHits)
      .map(([year]) => year)
      .sort();

    if (peakYears.length === 1) return peakYears[0];
    if (peakYears.length <= 3) return peakYears.join(', ');
    return `${peakYears[0]} - ${peakYears[peakYears.length - 1]}`;
  }
}

// ============================================================
// EXPORTS
// ============================================================

let visualizerInstance: CareerVisualizer | null = null;

export function getCareerVisualizer(): CareerVisualizer {
  if (!visualizerInstance) {
    visualizerInstance = new CareerVisualizer();
  }
  return visualizerInstance;
}

export async function getCareerVisualization(
  celebIdOrSlug: string
): Promise<CareerVisualization | null> {
  return getCareerVisualizer().getCareerVisualization(celebIdOrSlug);
}

#!/usr/bin/env npx tsx
/**
 * KRISHNA FILMOGRAPHY COMPREHENSIVE AUDIT
 * 
 * Complete audit script for Krishna movies:
 * 1. Duplicate detection (title similarity + TMDB cross-reference)
 * 2. Data completeness validation (poster, director, heroine, synopsis)
 * 3. Image audit (placeholder detection, URL validation)
 * 4. Cross-reference enrichment (TMDB, Wikipedia EN/TE)
 * 5. Actionable report generation
 * 
 * Usage:
 *   npx tsx scripts/audit-krishna-filmography.ts                           # Full audit (dry run)
 *   npx tsx scripts/audit-krishna-filmography.ts --fix-duplicates          # Fix duplicate entries
 *   npx tsx scripts/audit-krishna-filmography.ts --enrich --execute        # Enrich missing data
 *   npx tsx scripts/audit-krishna-filmography.ts --fix-images --execute    # Fix placeholder images
 *   npx tsx scripts/audit-krishna-filmography.ts --all --execute           # Full fix
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import chalk from 'chalk';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TMDB_API_KEY = process.env.TMDB_API_KEY;

// ============================================================
// TYPES
// ============================================================

interface Movie {
  id: string;
  title_en: string;
  title_te?: string;
  slug: string;
  release_year: number;
  release_date?: string;
  poster_url?: string;
  backdrop_url?: string;
  synopsis?: string;
  director?: string;
  heroine?: string;
  hero?: string;
  music_director?: string;
  tmdb_id?: number;
  imdb_id?: string;
  genres?: string[];
  our_rating?: number;
  avg_rating?: number;
  is_published?: boolean;
  poster_confidence?: number;
  poster_source?: string;
}

interface DuplicatePair {
  movie1: Movie;
  movie2: Movie;
  similarity: number;
  reason: string;
  recommendation: 'DELETE_FIRST' | 'DELETE_SECOND' | 'MERGE' | 'REVIEW';
}

interface MissingDataItem {
  movie: Movie;
  missingFields: string[];
  enrichmentSources: string[];
}

interface ImageIssue {
  movie: Movie;
  issue: 'placeholder' | 'missing' | 'broken_url' | 'low_confidence';
  currentUrl?: string;
  suggestedSource?: string;
}

interface AuditReport {
  timestamp: string;
  actor: string;
  totalMovies: number;
  duplicates: DuplicatePair[];
  missingData: MissingDataItem[];
  imageIssues: ImageIssue[];
  summary: {
    duplicateCount: number;
    moviesNeedingEnrichment: number;
    imageIssuesCount: number;
    moviesWithoutTmdb: number;
    moviesWithoutDirector: number;
    moviesWithoutHeroine: number;
    moviesWithoutSynopsis: number;
    moviesWithoutPoster: number;
  };
  fixActions: {
    duplicatesToDelete: string[];
    moviesToEnrich: string[];
    imagesToFix: string[];
  };
}

// ============================================================
// DUPLICATE DETECTION
// ============================================================

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimilarity(title1: string, title2: string): number {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);

  if (norm1 === norm2) return 1.0;
  if (norm1.replace(/\s/g, '') === norm2.replace(/\s/g, '')) return 0.98;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;

  // Levenshtein distance
  const matrix: number[][] = [];
  const n = norm1.length;
  const m = norm2.length;

  if (n === 0) return m === 0 ? 1 : 0;
  if (m === 0) return 0;

  for (let i = 0; i <= n; i++) matrix[i] = [i];
  for (let j = 0; j <= m; j++) matrix[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = norm1[i - 1] === norm2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[n][m];
  const maxLen = Math.max(n, m);
  return 1 - distance / maxLen;
}

async function findDuplicates(movies: Movie[]): Promise<DuplicatePair[]> {
  const duplicates: DuplicatePair[] = [];
  const checked = new Set<string>();

  for (let i = 0; i < movies.length; i++) {
    for (let j = i + 1; j < movies.length; j++) {
      const m1 = movies[i];
      const m2 = movies[j];
      const key = [m1.id, m2.id].sort().join('-');
      if (checked.has(key)) continue;
      checked.add(key);

      // Check year proximity (same year or adjacent)
      const yearDiff = Math.abs((m1.release_year || 0) - (m2.release_year || 0));
      if (yearDiff > 1) continue;

      const similarity = calculateSimilarity(m1.title_en, m2.title_en);
      
      if (similarity >= 0.8) {
        // Determine recommendation
        let recommendation: DuplicatePair['recommendation'] = 'REVIEW';
        let reason = `Title similarity: ${(similarity * 100).toFixed(0)}%`;

        // If same TMDB ID, definitely duplicates
        if (m1.tmdb_id && m2.tmdb_id && m1.tmdb_id === m2.tmdb_id) {
          reason = 'Same TMDB ID';
          // Keep the one with more data
          const m1Score = scoreMovieCompleteness(m1);
          const m2Score = scoreMovieCompleteness(m2);
          recommendation = m1Score >= m2Score ? 'DELETE_SECOND' : 'DELETE_FIRST';
        } else if (similarity >= 0.95) {
          // Very high similarity - likely duplicate
          const m1Score = scoreMovieCompleteness(m1);
          const m2Score = scoreMovieCompleteness(m2);
          recommendation = m1Score >= m2Score ? 'DELETE_SECOND' : 'DELETE_FIRST';
        }

        duplicates.push({
          movie1: m1,
          movie2: m2,
          similarity,
          reason,
          recommendation,
        });
      }
    }
  }

  return duplicates;
}

function scoreMovieCompleteness(movie: Movie): number {
  let score = 0;
  if (movie.tmdb_id) score += 10;
  if (movie.poster_url && !movie.poster_url.includes('placeholder')) score += 5;
  if (movie.backdrop_url) score += 3;
  if (movie.synopsis && movie.synopsis.length > 50) score += 5;
  if (movie.director) score += 3;
  if (movie.heroine) score += 3;
  if (movie.music_director) score += 2;
  if (movie.genres && movie.genres.length > 0) score += 2;
  if (movie.our_rating) score += 2;
  if (movie.poster_confidence && movie.poster_confidence > 0.8) score += 2;
  return score;
}

// ============================================================
// DATA COMPLETENESS VALIDATION
// ============================================================

function validateDataCompleteness(movies: Movie[]): MissingDataItem[] {
  const issues: MissingDataItem[] = [];

  for (const movie of movies) {
    const missingFields: string[] = [];
    const enrichmentSources: string[] = [];

    if (!movie.director || movie.director === 'Unknown') {
      missingFields.push('director');
      enrichmentSources.push('TMDB', 'Wikipedia');
    }

    if (!movie.heroine || movie.heroine === 'N/A') {
      missingFields.push('heroine');
      enrichmentSources.push('TMDB', 'Wikipedia');
    }

    if (!movie.synopsis || movie.synopsis.length < 50) {
      missingFields.push('synopsis');
      enrichmentSources.push('TMDB', 'Wikipedia');
    }

    if (!movie.poster_url || movie.poster_url.includes('placeholder')) {
      missingFields.push('poster_url');
      enrichmentSources.push('TMDB', 'Wikipedia', 'Wikimedia');
    }

    if (!movie.backdrop_url) {
      missingFields.push('backdrop_url');
      enrichmentSources.push('TMDB');
    }

    if (!movie.music_director) {
      missingFields.push('music_director');
      enrichmentSources.push('TMDB', 'Wikipedia');
    }

    if (!movie.tmdb_id) {
      missingFields.push('tmdb_id');
      enrichmentSources.push('TMDB Search');
    }

    if (!movie.genres || movie.genres.length === 0) {
      missingFields.push('genres');
      enrichmentSources.push('TMDB');
    }

    if (missingFields.length > 0) {
      issues.push({
        movie,
        missingFields,
        enrichmentSources: [...new Set(enrichmentSources)],
      });
    }
  }

  return issues;
}

// ============================================================
// IMAGE AUDIT
// ============================================================

function auditImages(movies: Movie[]): ImageIssue[] {
  const issues: ImageIssue[] = [];

  for (const movie of movies) {
    // Check for missing poster
    if (!movie.poster_url) {
      issues.push({
        movie,
        issue: 'missing',
        suggestedSource: 'TMDB, Wikipedia, Wikimedia',
      });
      continue;
    }

    // Check for placeholder images
    if (
      movie.poster_url.includes('placeholder') ||
      movie.poster_url.includes('no-image') ||
      movie.poster_url.includes('default')
    ) {
      issues.push({
        movie,
        issue: 'placeholder',
        currentUrl: movie.poster_url,
        suggestedSource: 'TMDB, Wikipedia, Wikimedia',
      });
      continue;
    }

    // Check for low confidence
    if (movie.poster_confidence && movie.poster_confidence < 0.7) {
      issues.push({
        movie,
        issue: 'low_confidence',
        currentUrl: movie.poster_url,
        suggestedSource: 'Verify with TMDB',
      });
    }
  }

  return issues;
}

// ============================================================
// TMDB CROSS-REFERENCE
// ============================================================

interface TMDBSearchResult {
  id: number;
  title: string;
  original_title: string;
  original_language: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
}

async function searchTMDB(title: string, year: number): Promise<TMDBSearchResult | null> {
  if (!TMDB_API_KEY) return null;

  try {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}&language=en-US`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.results || data.results.length === 0) return null;

    // Prefer Telugu movies
    const teluguMovie = data.results.find((m: any) => m.original_language === 'te');
    return teluguMovie || data.results[0];
  } catch {
    return null;
  }
}

async function getTMDBDetails(tmdbId: number): Promise<any | null> {
  if (!TMDB_API_KEY) return null;

  try {
    const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ============================================================
// WIKIPEDIA CROSS-REFERENCE
// ============================================================

async function searchWikipedia(title: string, year: number): Promise<{
  poster_url: string | null;
  synopsis: string | null;
  source: string;
} | null> {
  try {
    const patterns = [
      `${title.replace(/ /g, '_')}_(${year}_film)`,
      `${title.replace(/ /g, '_')}_(Telugu_film)`,
      `${title.replace(/ /g, '_')}_(film)`,
      title.replace(/ /g, '_'),
    ];

    for (const pattern of patterns) {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pattern)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'TeluguPortal/1.0 (audit)' },
      });

      if (!res.ok) continue;

      const data = await res.json();
      const description = (data.description || '').toLowerCase();
      const extract = (data.extract || '').toLowerCase();

      const isFilm =
        description.includes('film') ||
        description.includes('movie') ||
        extract.includes('telugu') ||
        extract.includes('directed by');

      if (isFilm) {
        let posterUrl = null;
        if (data.thumbnail?.source) {
          posterUrl = data.thumbnail.source
            .replace('/thumb/', '/')
            .replace(/\/[0-9]+px-[^/]+$/, '');
        }

        return {
          poster_url: posterUrl,
          synopsis: data.extract || null,
          source: 'wikipedia_en',
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================
// ENRICHMENT
// ============================================================

interface EnrichmentUpdate {
  movieId: string;
  updates: Partial<Movie>;
  sources: string[];
}

async function generateEnrichmentUpdates(
  missingDataItems: MissingDataItem[]
): Promise<EnrichmentUpdate[]> {
  const updates: EnrichmentUpdate[] = [];
  let processed = 0;

  for (const item of missingDataItems) {
    processed++;
    if (processed % 10 === 0) {
      console.log(`  Processing enrichment: ${processed}/${missingDataItems.length}`);
    }

    const movieUpdates: Partial<Movie> = {};
    const sources: string[] = [];

    // Try TMDB first
    let tmdbData: any = null;
    if (item.movie.tmdb_id) {
      tmdbData = await getTMDBDetails(item.movie.tmdb_id);
    } else {
      const searchResult = await searchTMDB(item.movie.title_en, item.movie.release_year);
      if (searchResult) {
        movieUpdates.tmdb_id = searchResult.id;
        tmdbData = await getTMDBDetails(searchResult.id);
        sources.push('TMDB Search');
      }
    }

    if (tmdbData) {
      if (item.missingFields.includes('synopsis') && tmdbData.overview) {
        movieUpdates.synopsis = tmdbData.overview;
        sources.push('TMDB');
      }

      if (item.missingFields.includes('poster_url') && tmdbData.poster_path) {
        movieUpdates.poster_url = `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`;
        sources.push('TMDB');
      }

      if (item.missingFields.includes('backdrop_url') && tmdbData.backdrop_path) {
        movieUpdates.backdrop_url = `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}`;
        sources.push('TMDB');
      }

      if (item.missingFields.includes('director') && tmdbData.credits?.crew) {
        const director = tmdbData.credits.crew.find((c: any) => c.job === 'Director');
        if (director) {
          movieUpdates.director = director.name;
          sources.push('TMDB');
        }
      }

      if (item.missingFields.includes('music_director') && tmdbData.credits?.crew) {
        const composer = tmdbData.credits.crew.find(
          (c: any) => c.job === 'Original Music Composer' || c.job === 'Music'
        );
        if (composer) {
          movieUpdates.music_director = composer.name;
          sources.push('TMDB');
        }
      }

      if (item.missingFields.includes('genres') && tmdbData.genres) {
        movieUpdates.genres = tmdbData.genres.map((g: any) => g.name);
        sources.push('TMDB');
      }

      // Try to find heroine from cast
      if (item.missingFields.includes('heroine') && tmdbData.credits?.cast) {
        const femaleCast = tmdbData.credits.cast.filter(
          (c: any) => c.gender === 1 && c.order <= 5
        );
        if (femaleCast.length > 0) {
          movieUpdates.heroine = femaleCast[0].name;
          sources.push('TMDB');
        }
      }
    }

    // Try Wikipedia for remaining fields
    if (
      item.missingFields.includes('synopsis') && !movieUpdates.synopsis ||
      item.missingFields.includes('poster_url') && !movieUpdates.poster_url
    ) {
      const wikiData = await searchWikipedia(item.movie.title_en, item.movie.release_year);
      if (wikiData) {
        if (!movieUpdates.synopsis && wikiData.synopsis) {
          movieUpdates.synopsis = wikiData.synopsis;
          sources.push('Wikipedia');
        }
        if (!movieUpdates.poster_url && wikiData.poster_url) {
          movieUpdates.poster_url = wikiData.poster_url;
          sources.push('Wikipedia');
        }
      }
    }

    if (Object.keys(movieUpdates).length > 0) {
      updates.push({
        movieId: item.movie.id,
        updates: movieUpdates,
        sources: [...new Set(sources)],
      });
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  return updates;
}

// ============================================================
// FIX FUNCTIONS
// ============================================================

async function fixDuplicates(duplicates: DuplicatePair[]): Promise<number> {
  let deleted = 0;

  for (const dup of duplicates) {
    if (dup.recommendation === 'DELETE_FIRST') {
      const { error } = await supabase
        .from('movies')
        .update({ is_published: false })
        .eq('id', dup.movie1.id);

      if (!error) {
        console.log(chalk.green(`  Unpublished: ${dup.movie1.title_en} (${dup.movie1.release_year})`));
        deleted++;
      }
    } else if (dup.recommendation === 'DELETE_SECOND') {
      const { error } = await supabase
        .from('movies')
        .update({ is_published: false })
        .eq('id', dup.movie2.id);

      if (!error) {
        console.log(chalk.green(`  Unpublished: ${dup.movie2.title_en} (${dup.movie2.release_year})`));
        deleted++;
      }
    }
  }

  return deleted;
}

async function applyEnrichmentUpdates(updates: EnrichmentUpdate[]): Promise<number> {
  let applied = 0;

  for (const update of updates) {
    const { error } = await supabase
      .from('movies')
      .update({
        ...update.updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', update.movieId);

    if (!error) {
      applied++;
    } else {
      console.error(chalk.red(`  Failed to update ${update.movieId}: ${error.message}`));
    }
  }

  return applied;
}

// ============================================================
// REPORT GENERATION
// ============================================================

function generateReport(
  actor: string,
  movies: Movie[],
  duplicates: DuplicatePair[],
  missingData: MissingDataItem[],
  imageIssues: ImageIssue[]
): AuditReport {
  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    actor,
    totalMovies: movies.length,
    duplicates,
    missingData,
    imageIssues,
    summary: {
      duplicateCount: duplicates.length,
      moviesNeedingEnrichment: missingData.length,
      imageIssuesCount: imageIssues.length,
      moviesWithoutTmdb: movies.filter((m) => !m.tmdb_id).length,
      moviesWithoutDirector: movies.filter((m) => !m.director || m.director === 'Unknown').length,
      moviesWithoutHeroine: movies.filter((m) => !m.heroine || m.heroine === 'N/A').length,
      moviesWithoutSynopsis: movies.filter((m) => !m.synopsis || m.synopsis.length < 50).length,
      moviesWithoutPoster: movies.filter((m) => !m.poster_url || m.poster_url.includes('placeholder')).length,
    },
    fixActions: {
      duplicatesToDelete: duplicates
        .filter((d) => d.recommendation !== 'REVIEW')
        .map((d) =>
          d.recommendation === 'DELETE_FIRST' ? d.movie1.id : d.movie2.id
        ),
      moviesToEnrich: missingData.map((m) => m.movie.id),
      imagesToFix: imageIssues.map((i) => i.movie.id),
    },
  };

  return report;
}

function printReport(report: AuditReport): void {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════════════╗
║              ${report.actor.toUpperCase()} FILMOGRAPHY COMPREHENSIVE AUDIT                    ║
╚══════════════════════════════════════════════════════════════════════════╝
`));

  console.log(chalk.bold('📊 OVERVIEW'));
  console.log('═'.repeat(70));
  console.log(`  Total Movies:           ${chalk.cyan(report.totalMovies)}`);
  console.log(`  Duplicates Found:       ${report.summary.duplicateCount > 0 ? chalk.red(report.summary.duplicateCount) : chalk.green('0')}`);
  console.log(`  Movies Need Enrichment: ${report.summary.moviesNeedingEnrichment > 0 ? chalk.yellow(report.summary.moviesNeedingEnrichment) : chalk.green('0')}`);
  console.log(`  Image Issues:           ${report.summary.imageIssuesCount > 0 ? chalk.yellow(report.summary.imageIssuesCount) : chalk.green('0')}`);

  console.log(chalk.bold('\n📋 DATA COMPLETENESS'));
  console.log('═'.repeat(70));
  console.log(`  Without TMDB ID:        ${report.summary.moviesWithoutTmdb}`);
  console.log(`  Without Director:       ${report.summary.moviesWithoutDirector}`);
  console.log(`  Without Heroine:        ${report.summary.moviesWithoutHeroine}`);
  console.log(`  Without Synopsis:       ${report.summary.moviesWithoutSynopsis}`);
  console.log(`  Without Poster:         ${report.summary.moviesWithoutPoster}`);

  if (report.duplicates.length > 0) {
    console.log(chalk.bold('\n🔀 DUPLICATE PAIRS'));
    console.log('═'.repeat(70));
    for (const dup of report.duplicates.slice(0, 20)) {
      const action = dup.recommendation === 'DELETE_FIRST' 
        ? chalk.red('DELETE') + ` ${dup.movie1.slug}`
        : dup.recommendation === 'DELETE_SECOND'
        ? chalk.red('DELETE') + ` ${dup.movie2.slug}`
        : chalk.yellow('REVIEW');
      
      console.log(`  "${dup.movie1.title_en}" (${dup.movie1.release_year}) ↔ "${dup.movie2.title_en}" (${dup.movie2.release_year})`);
      console.log(`    Reason: ${dup.reason} | Action: ${action}`);
      console.log(`    IDs: ${dup.movie1.id.slice(0, 8)}... vs ${dup.movie2.id.slice(0, 8)}...`);
      console.log();
    }
    if (report.duplicates.length > 20) {
      console.log(chalk.gray(`  ... and ${report.duplicates.length - 20} more duplicates`));
    }
  }

  if (report.imageIssues.length > 0) {
    console.log(chalk.bold('\n🖼️  IMAGE ISSUES (Top 20)'));
    console.log('═'.repeat(70));
    for (const issue of report.imageIssues.slice(0, 20)) {
      const badge = issue.issue === 'missing' 
        ? chalk.red('[MISSING]')
        : issue.issue === 'placeholder'
        ? chalk.yellow('[PLACEHOLDER]')
        : chalk.gray(`[${issue.issue.toUpperCase()}]`);
      console.log(`  ${badge} ${issue.movie.title_en} (${issue.movie.release_year})`);
    }
    if (report.imageIssues.length > 20) {
      console.log(chalk.gray(`  ... and ${report.imageIssues.length - 20} more image issues`));
    }
  }

  // Breakdown by decade
  const decades = new Map<string, number>();
  const missingByDecade = new Map<string, number>();
  
  for (const item of report.missingData) {
    const decade = Math.floor(item.movie.release_year / 10) * 10;
    const decadeStr = `${decade}s`;
    missingByDecade.set(decadeStr, (missingByDecade.get(decadeStr) || 0) + 1);
  }

  if (missingByDecade.size > 0) {
    console.log(chalk.bold('\n📅 MISSING DATA BY DECADE'));
    console.log('═'.repeat(70));
    const sortedDecades = [...missingByDecade.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [decade, count] of sortedDecades) {
      const bar = '█'.repeat(Math.min(40, Math.round(count / 2)));
      console.log(`  ${decade}: ${chalk.cyan(bar)} ${count}`);
    }
  }

  console.log(chalk.bold('\n🔧 AVAILABLE ACTIONS'));
  console.log('═'.repeat(70));
  console.log(`  --fix-duplicates    Unpublish ${report.fixActions.duplicatesToDelete.length} duplicate entries`);
  console.log(`  --enrich --execute  Enrich ${report.fixActions.moviesToEnrich.length} movies with missing data`);
  console.log(`  --fix-images        Fix ${report.fixActions.imagesToFix.length} image issues`);
  console.log(`  --all --execute     Run all fixes`);
}

function generateCSVReport(report: AuditReport, filename: string): void {
  const lines: string[] = [
    'Type,Title,Year,ID,Issue,Recommendation,Missing Fields',
  ];

  // Duplicates
  for (const dup of report.duplicates) {
    lines.push(
      `Duplicate,"${dup.movie1.title_en}",${dup.movie1.release_year},${dup.movie1.id},"${dup.reason}",${dup.recommendation},-`
    );
    lines.push(
      `Duplicate,"${dup.movie2.title_en}",${dup.movie2.release_year},${dup.movie2.id},"${dup.reason}",${dup.recommendation},-`
    );
  }

  // Missing Data
  for (const item of report.missingData) {
    lines.push(
      `MissingData,"${item.movie.title_en}",${item.movie.release_year},${item.movie.id},-,ENRICH,"${item.missingFields.join('; ')}"`
    );
  }

  // Image Issues
  for (const issue of report.imageIssues) {
    lines.push(
      `ImageIssue,"${issue.movie.title_en}",${issue.movie.release_year},${issue.movie.id},${issue.issue},FIX_IMAGE,-`
    );
  }

  fs.writeFileSync(filename, lines.join('\n'));
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const actorArg = args.find((a) => a.startsWith('--actor='));
  const actor = actorArg ? actorArg.split('=')[1] : 'Krishna';
  const fixDuplicatesFlag = args.includes('--fix-duplicates');
  const enrichFlag = args.includes('--enrich');
  const fixImagesFlag = args.includes('--fix-images');
  const allFlag = args.includes('--all');
  const executeFlag = args.includes('--execute');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 500;

  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════════════╗
║              ${actor.toUpperCase()} FILMOGRAPHY AUDIT STARTING...                        ║
╚══════════════════════════════════════════════════════════════════════════╝
`));

  // Fetch all movies for the actor
  console.log(`📥 Fetching ${actor} movies...`);
  
  const { data: movies, error } = await supabase
    .from('movies')
    .select('*')
    .eq('language', 'Telugu')
    .eq('hero', actor)
    .order('release_year', { ascending: true })
    .limit(limit);

  if (error || !movies) {
    console.error(chalk.red(`Failed to fetch movies: ${error?.message}`));
    process.exit(1);
  }

  console.log(`  Found ${chalk.cyan(movies.length)} movies for ${actor}\n`);

  // Phase 1: Duplicate Detection
  console.log('🔍 Phase 1: Detecting duplicates...');
  const duplicates = await findDuplicates(movies);
  console.log(`  Found ${duplicates.length} potential duplicate pairs\n`);

  // Phase 2: Data Completeness Validation
  console.log('📋 Phase 2: Validating data completeness...');
  const missingData = validateDataCompleteness(movies);
  console.log(`  Found ${missingData.length} movies with missing data\n`);

  // Phase 3: Image Audit
  console.log('🖼️  Phase 3: Auditing images...');
  const imageIssues = auditImages(movies);
  console.log(`  Found ${imageIssues.length} image issues\n`);

  // Generate report
  const report = generateReport(actor, movies, duplicates, missingData, imageIssues);
  
  // Save JSON report
  const jsonPath = `docs/${actor.toUpperCase()}_AUDIT_REPORT.json`;
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`📝 Saved JSON report: ${jsonPath}`);

  // Save CSV report
  const csvPath = `docs/${actor.toUpperCase()}_AUDIT_REPORT.csv`;
  generateCSVReport(report, csvPath);
  console.log(`📝 Saved CSV report: ${csvPath}\n`);

  // Print report
  printReport(report);

  // Apply fixes if requested
  if ((fixDuplicatesFlag || allFlag) && executeFlag) {
    console.log(chalk.cyan.bold('\n🔧 FIXING DUPLICATES...\n'));
    const deleted = await fixDuplicates(duplicates.filter(d => d.recommendation !== 'REVIEW'));
    console.log(chalk.green(`  Unpublished ${deleted} duplicate entries`));
  }

  if ((enrichFlag || allFlag) && executeFlag) {
    console.log(chalk.cyan.bold('\n🔧 ENRICHING MISSING DATA...\n'));
    console.log('  Generating enrichment updates from TMDB/Wikipedia...');
    const enrichmentUpdates = await generateEnrichmentUpdates(missingData.slice(0, 100)); // Limit for safety
    console.log(`  Generated ${enrichmentUpdates.length} enrichment updates`);
    
    const applied = await applyEnrichmentUpdates(enrichmentUpdates);
    console.log(chalk.green(`  Applied ${applied} enrichment updates`));
  }

  if ((fixImagesFlag || allFlag) && executeFlag) {
    console.log(chalk.cyan.bold('\n🔧 FIXING IMAGES...\n'));
    // For images, we reuse the enrichment logic for poster_url only
    const imageItems = imageIssues.map(i => ({
      movie: i.movie,
      missingFields: ['poster_url'],
      enrichmentSources: ['TMDB', 'Wikipedia'],
    }));
    const imageUpdates = await generateEnrichmentUpdates(imageItems.slice(0, 50));
    const applied = await applyEnrichmentUpdates(imageUpdates);
    console.log(chalk.green(`  Fixed ${applied} image issues`));
  }

  if (!executeFlag && (fixDuplicatesFlag || enrichFlag || fixImagesFlag || allFlag)) {
    console.log(chalk.yellow('\n⚠️  DRY RUN - No changes made. Add --execute to apply changes.'));
  }

  console.log(chalk.green('\n✅ Audit complete!\n'));
}

main().catch((err) => {
  console.error(chalk.red('Fatal error:'), err);
  process.exit(1);
});



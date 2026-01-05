/**
 * Movie Catalogue Admin API
 * Handles ingestion and management of Telugu movie catalogue
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  runFullIngestion,
  getFullCatalogueStats,
  getTopMovies,
  findDuplicates,
  mergeDuplicates,
  ingestFilmsByDecade,
  ingestMoviesByYear,
  enrichMoviesWithTMDB,
  linkMoviesToPersons,
  updateActorStats,
} from '@/lib/movie-catalogue';

export const maxDuration = 300; // 5 minutes for long ingestion

/**
 * GET - Get catalogue stats or movies
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'stats';

  try {
    switch (action) {
      case 'stats':
        const stats = await getFullCatalogueStats();
        return NextResponse.json({ success: true, data: stats });

      case 'top':
        const sortBy = (searchParams.get('sortBy') || 'rating') as 'rating' | 'gross' | 'popularity';
        const era = searchParams.get('era') || undefined;
        const decade = searchParams.get('decade') || undefined;
        const limit = parseInt(searchParams.get('limit') || '20');

        const topMovies = await getTopMovies({ sortBy, era, decade, limit });
        return NextResponse.json({ success: true, data: topMovies });

      case 'duplicates':
        const duplicates = await findDuplicates();
        return NextResponse.json({ success: true, data: duplicates });

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Movie catalogue GET error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST - Trigger ingestion or other operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'full-ingestion':
        // Full ingestion with all options
        const fullResult = await runFullIngestion({
          wikidataDecades: params.wikidataDecades ?? true,
          tmdbYears: params.tmdbYears ?? { start: 2020, end: new Date().getFullYear() },
          enrichWithTMDB: params.enrichWithTMDB ?? true,
          linkPersons: params.linkPersons ?? true,
          updateStats: params.updateStats ?? true,
        });
        return NextResponse.json({ success: true, data: fullResult });

      case 'wikidata-decade':
        // Ingest specific decade from Wikidata
        const { startYear, endYear } = params;
        if (!startYear || !endYear) {
          return NextResponse.json({
            success: false,
            error: 'startYear and endYear required'
          }, { status: 400 });
        }
        const wdResult = await ingestFilmsByDecade(startYear, endYear);
        return NextResponse.json({ success: true, data: wdResult });

      case 'tmdb-year':
        // Ingest specific year from TMDB
        const year = params.year;
        if (!year) {
          return NextResponse.json({
            success: false,
            error: 'year required'
          }, { status: 400 });
        }
        const tmdbResult = await ingestMoviesByYear(year);
        return NextResponse.json({ success: true, data: tmdbResult });

      case 'enrich-tmdb':
        // Enrich existing movies with TMDB data
        const enrichResult = await enrichMoviesWithTMDB();
        return NextResponse.json({ success: true, data: enrichResult });

      case 'link-persons':
        // Link movies to persons
        const linkResult = await linkMoviesToPersons();
        return NextResponse.json({ success: true, data: linkResult });

      case 'update-stats':
        // Update actor statistics
        const statsResult = await updateActorStats();
        return NextResponse.json({ success: true, data: statsResult });

      case 'merge-duplicates':
        // Merge duplicate movies
        const { keepId, removeId } = params;
        if (!keepId || !removeId) {
          return NextResponse.json({
            success: false,
            error: 'keepId and removeId required'
          }, { status: 400 });
        }
        const mergeResult = await mergeDuplicates(keepId, removeId);
        return NextResponse.json({ success: true, data: mergeResult });

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Movie catalogue POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}









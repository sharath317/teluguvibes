import { NextResponse } from 'next/server';
import { getRecommendations, type RecommendMePreferences } from '@/lib/movies/recommend-me';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Build preferences from request body
    const prefs: RecommendMePreferences = {
      languages: body.languages,
      genres: body.genres,
      moods: body.moods,
      era: body.era,
      familyFriendly: body.familyFriendly,
      blockbustersOnly: body.blockbustersOnly,
      hiddenGems: body.hiddenGems,
      highlyRatedOnly: body.highlyRatedOnly,
      criticsChoice: body.criticsChoice,
      excludeMovieId: body.excludeMovieId,
    };

    const sections = await getRecommendations(prefs);

    return NextResponse.json({
      success: true,
      sections,
      meta: {
        totalSections: sections.length,
        totalMovies: sections.reduce((sum, s) => sum + s.movies.length, 0),
        preferences: {
          languages: prefs.languages || ['Telugu'],
          genres: prefs.genres || [],
          moods: prefs.moods || [],
          era: prefs.era || [],
        },
      },
    });
  } catch (error: any) {
    console.error('Recommendation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

// GET endpoint for simple requests with query params
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const prefs: RecommendMePreferences = {
      languages: searchParams.get('languages')?.split(',').filter(Boolean),
      genres: searchParams.get('genres')?.split(',').filter(Boolean),
      moods: searchParams.get('moods')?.split(',').filter(Boolean) as any,
      era: searchParams.get('era')?.split(',').filter(Boolean) as any,
      familyFriendly: searchParams.get('familyFriendly') === 'true',
      blockbustersOnly: searchParams.get('blockbustersOnly') === 'true',
      hiddenGems: searchParams.get('hiddenGems') === 'true',
      highlyRatedOnly: searchParams.get('highlyRatedOnly') === 'true',
      criticsChoice: searchParams.get('criticsChoice') === 'true',
      excludeMovieId: searchParams.get('excludeMovieId') || undefined,
    };

    const sections = await getRecommendations(prefs);

    return NextResponse.json({
      success: true,
      sections,
      meta: {
        totalSections: sections.length,
        totalMovies: sections.reduce((sum, s) => sum + s.movies.length, 0),
      },
    });
  } catch (error: any) {
    console.error('Recommendation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { fetchGoogleTrends, trendToPostDraft } from '@/lib/trends';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch current trends
export async function GET() {
  try {
    const trends = await fetchGoogleTrends();
    return NextResponse.json({ trends });
  } catch (error) {
    console.error('Failed to fetch trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trends' },
      { status: 500 }
    );
  }
}

// POST: Import trends as drafts
export async function POST() {
  try {
    // Fetch trends
    const trends = await fetchGoogleTrends();

    if (trends.length === 0) {
      return NextResponse.json({
        message: 'No trends found to import',
        count: 0,
      });
    }

    // Convert to post drafts
    const drafts = trends.map(trendToPostDraft);

    // Insert into Supabase (ignore duplicates based on slug)
    const { data, error } = await supabase
      .from('posts')
      .insert(drafts)
      .select();

    if (error) {
      // If duplicate slug error, try with unique slugs
      if (error.code === '23505') {
        // Generate more unique slugs and retry
        const uniqueDrafts = drafts.map(draft => ({
          ...draft,
          slug: `${draft.slug}-${Math.random().toString(36).substring(2, 7)}`,
        }));

        const { data: retryData, error: retryError } = await supabase
          .from('posts')
          .insert(uniqueDrafts)
          .select();

        if (retryError) {
          console.error('Supabase retry error:', retryError);
          return NextResponse.json(
            { error: 'Failed to save drafts' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          message: 'Trends imported as drafts',
          count: retryData?.length || 0,
          drafts: retryData,
        });
      }

      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save drafts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Trends imported as drafts',
      count: data?.length || 0,
      drafts: data,
    });
  } catch (error) {
    console.error('Failed to import trends:', error);
    return NextResponse.json(
      { error: 'Failed to import trends' },
      { status: 500 }
    );
  }
}

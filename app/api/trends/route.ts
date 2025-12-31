import { NextResponse } from 'next/server';
import { fetchGoogleTrends } from '@/lib/trends';
import { generateValidatedDrafts } from '@/lib/pipeline/unified-content-pipeline';
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

// POST: Import trends as drafts with FULL validation pipeline
// All content generation, image fetching, and validation happens BEFORE saving
export async function POST(request: Request) {
  try {
    // Get limit from URL params
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('   📥 IMPORTING TRENDS WITH UNIFIED PIPELINE');
    console.log('   (Content + Image + Validation BEFORE saving)');
    console.log('════════════════════════════════════════════════════════════\n');

    // Fetch trends
    const trends = await fetchGoogleTrends();
    console.log(`📊 Found ${trends.length} trends`);

    if (trends.length === 0) {
      console.log('⚠️ No trends found');
      return NextResponse.json({
        message: 'No trends found to import',
        count: 0,
      });
    }

    // Prepare topics for unified pipeline
    const topics = trends.slice(0, limit).map(trend => ({
      title: trend.title,
      category: 'trending',
    }));

    // Run through unified pipeline (all validation happens here)
    const { successful, failed, summary } = await generateValidatedDrafts(topics, {
      verbose: true,
      continueOnError: true,
    });

    // Only save validated drafts
    const drafts = successful;

    if (drafts.length === 0) {
      console.log('⚠️ No valid drafts generated');
      return NextResponse.json({
        message: 'No valid drafts could be generated',
        count: 0,
        failed: failed.length,
        failedTopics: failed.map(f => ({ topic: f.topic.slice(0, 50), errors: f.errors })),
      });
    }

    console.log(`\n💾 Saving ${drafts.length} validated drafts to database...`);

    // Strip internal fields before saving to database
    const dbDrafts = drafts.map(draft => {
      const { _confidence, _source, ...dbDraft } = draft as any;
      return dbDraft;
    });

    // Insert validated drafts into Supabase
    const { data, error } = await supabase
      .from('posts')
      .insert(dbDrafts)
      .select();

    if (error) {
      // If duplicate slug error, try with unique slugs
      if (error.code === '23505') {
        const uniqueDrafts = dbDrafts.map(draft => ({
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
          message: `Imported ${retryData?.length || 0} validated drafts (${failed.length} failed validation)`,
          count: retryData?.length || 0,
          failed: failed.length,
          avgConfidence: (summary.avgConfidence * 100).toFixed(0) + '%',
          drafts: retryData?.map(d => ({ id: d.id, title: d.title?.slice(0, 50) })),
        });
      }

      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save drafts' },
        { status: 500 }
      );
    }

    console.log(`\n✅ Successfully saved ${data?.length || 0} drafts!`);

    return NextResponse.json({
      message: `Imported ${data?.length || 0} validated drafts (${failed.length} failed validation)`,
      count: data?.length || 0,
      failed: failed.length,
      avgConfidence: (summary.avgConfidence * 100).toFixed(0) + '%',
      drafts: data?.map(d => ({ id: d.id, title: d.title?.slice(0, 50) })),
    });
  } catch (error) {
    console.error('Failed to import trends:', error);
    return NextResponse.json(
      { error: 'Failed to import trends: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

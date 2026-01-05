/**
 * Celebrity Sync API
 * Syncs celebrity data from Wikidata and TMDB
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchTeluguCelebrities, fetchWikipediaSummary, fetchWikimediaImage } from '@/lib/celebrity/wikidata';
import { matchCelebrityWithTMDB, fetchCompleteTMDBData, buildTMDBImageUrl } from '@/lib/celebrity/tmdb';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: Sync celebrities from external sources
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'incremental'; // 'full' or 'incremental'
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    console.log(`🔄 Starting celebrity sync (mode: ${mode}, limit: ${limit})`);

    const stats = {
      fetched: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    // Fetch from Wikidata
    const wikidataCelebrities = await fetchTeluguCelebrities();
    stats.fetched = wikidataCelebrities.length;

    console.log(`📥 Fetched ${stats.fetched} celebrities from Wikidata`);

    // Process each celebrity
    for (const wikiPerson of wikidataCelebrities.slice(0, limit)) {
      try {
        // Check if already exists
        const { data: existing } = await supabase
          .from('celebrities')
          .select('id, last_synced_at')
          .eq('wikidata_id', wikiPerson.id)
          .single();

        if (existing && mode === 'incremental') {
          // Skip if synced recently (within 7 days)
          const lastSync = existing.last_synced_at
            ? new Date(existing.last_synced_at)
            : new Date(0);
          const daysSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24);

          if (daysSinceSync < 7) {
            stats.skipped++;
            continue;
          }
        }

        // Fetch Wikipedia summary
        const summary = await fetchWikipediaSummary(wikiPerson.name);

        // Match with TMDB
        const tmdbMatch = await matchCelebrityWithTMDB(
          wikiPerson.name,
          wikiPerson.birthDate,
          wikiPerson.occupation
        );

        let tmdbData = null;
        let profileImage = wikiPerson.image;

        if (tmdbMatch) {
          tmdbData = await fetchCompleteTMDBData(tmdbMatch.tmdbId);

          // Prefer TMDB image if available
          if (tmdbData.person?.profile_path) {
            profileImage = buildTMDBImageUrl(tmdbData.person.profile_path, 'w500') || profileImage;
          }
        }

        // Process Wikimedia image if using Wikidata image
        if (profileImage && profileImage.includes('commons.wikimedia.org')) {
          const wikimediaUrl = await fetchWikimediaImage(profileImage);
          if (wikimediaUrl) profileImage = wikimediaUrl;
        }

        // Prepare celebrity data
        const celebrityData = {
          name_en: wikiPerson.name,
          name_te: wikiPerson.name_te || null,
          birth_date: wikiPerson.birthDate || null,
          death_date: wikiPerson.deathDate || null,
          birth_place: wikiPerson.birthPlace || null,
          occupation: wikiPerson.occupation || [],
          short_bio: summary || wikiPerson.description || null,
          wikidata_id: wikiPerson.id,
          wikipedia_url: `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiPerson.name.replace(/ /g, '_'))}`,
          tmdb_id: tmdbMatch?.tmdbId || null,
          imdb_id: tmdbData?.person?.imdb_id || null,
          profile_image: profileImage || null,
          popularity_score: tmdbData?.person?.popularity
            ? Math.min(tmdbData.person.popularity, 100)
            : 50,
          last_synced_at: new Date().toISOString(),
        };

        if (existing) {
          // Update
          await supabase
            .from('celebrities')
            .update(celebrityData)
            .eq('id', existing.id);
          stats.updated++;
        } else {
          // Create
          const { data: newCeleb } = await supabase
            .from('celebrities')
            .insert(celebrityData)
            .select('id')
            .single();

          if (newCeleb) {
            // Generate events
            await supabase.rpc('generate_celebrity_events', {
              p_celebrity_id: newCeleb.id
            });

            // Import filmography from TMDB
            if (tmdbData?.credits && tmdbData.credits.length > 0) {
              const works = tmdbData.credits.slice(0, 20).map(credit => ({
                celebrity_id: newCeleb.id,
                title_en: credit.title,
                work_type: 'movie',
                release_date: credit.release_date || null,
                release_year: credit.release_date
                  ? new Date(credit.release_date).getFullYear()
                  : null,
                role_name: credit.character || null,
                tmdb_movie_id: credit.id,
                poster_url: credit.poster_path
                  ? buildTMDBImageUrl(credit.poster_path, 'w342')
                  : null,
              }));

              await supabase.from('celebrity_works').insert(works);
            }
          }
          stats.created++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (err) {
        console.error(`Error processing ${wikiPerson.name}:`, err);
        stats.errors++;
      }
    }

    console.log('📊 Sync complete:', stats);

    return NextResponse.json({
      success: true,
      message: 'Sync completed',
      stats,
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// GET: Get sync status
export async function GET() {
  try {
    const { count: totalCount } = await supabase
      .from('celebrities')
      .select('*', { count: 'exact', head: true });

    const { count: verifiedCount } = await supabase
      .from('celebrities')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', true);

    const { count: eventsCount } = await supabase
      .from('celebrity_events')
      .select('*', { count: 'exact', head: true });

    const { data: recentSync } = await supabase
      .from('celebrities')
      .select('last_synced_at')
      .order('last_synced_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      totalCelebrities: totalCount || 0,
      verifiedCelebrities: verifiedCount || 0,
      totalEvents: eventsCount || 0,
      lastSyncAt: recentSync?.last_synced_at || null,
    });

  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}









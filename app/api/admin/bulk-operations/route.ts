/**
 * Bulk Operations API
 *
 * Supports:
 * - Bulk publish drafts
 * - Bulk delete posts/drafts
 * - Bulk status change
 * - Database reset & seed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ids, status, options } = body;

    switch (action) {
      // ============================================================
      // BULK PUBLISH
      // ============================================================
      case 'publish': {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json(
            { success: false, error: 'No IDs provided' },
            { status: 400 }
          );
        }

        const { data, error } = await supabase
          .from('posts')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
          })
          .in('id', ids)
          .select('id');

        if (error) {
          return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Published ${data.length} posts`,
          count: data.length,
        });
      }

      // ============================================================
      // BULK DELETE
      // ============================================================
      case 'delete': {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json(
            { success: false, error: 'No IDs provided' },
            { status: 400 }
          );
        }

        const { error } = await supabase
          .from('posts')
          .delete()
          .in('id', ids);

        if (error) {
          return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Deleted ${ids.length} posts`,
          count: ids.length,
        });
      }

      // ============================================================
      // BULK STATUS CHANGE
      // ============================================================
      case 'changeStatus': {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json(
            { success: false, error: 'No IDs provided' },
            { status: 400 }
          );
        }

        if (!status || !['draft', 'published', 'archived'].includes(status)) {
          return NextResponse.json(
            { success: false, error: 'Invalid status' },
            { status: 400 }
          );
        }

        const updateData: any = { status };
        if (status === 'published') {
          updateData.published_at = new Date().toISOString();
        }

        const { data, error } = await supabase
          .from('posts')
          .update(updateData)
          .in('id', ids)
          .select('id');

        if (error) {
          return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Changed status to ${status} for ${data.length} posts`,
          count: data.length,
        });
      }

      // ============================================================
      // DELETE ALL DRAFTS
      // ============================================================
      case 'deleteAllDrafts': {
        const { count, error } = await supabase
          .from('posts')
          .delete()
          .eq('status', 'draft');

        if (error) {
          return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Deleted all drafts`,
          count: count || 0,
        });
      }

      // ============================================================
      // DATABASE RESET (CAUTION!)
      // ============================================================
      case 'resetDatabase': {
        const confirm = options?.confirm;
        if (confirm !== 'RESET_ALL_DATA') {
          return NextResponse.json(
            { success: false, error: 'Confirmation required: set options.confirm to "RESET_ALL_DATA"' },
            { status: 400 }
          );
        }

        const tables = [
          'posts',
          'comments',
          'historic_post_tracking',
          'image_usage_tracking',
          'image_fetch_log',
          'entity_trend_signals',
          'trend_historic_matches',
          'fusion_content_recommendations',
          'historic_generation_log',
        ];

        const results: { table: string; success: boolean; error?: string }[] = [];

        for (const table of tables) {
          try {
            const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            results.push({ table, success: !error, error: error?.message });
          } catch (e) {
            results.push({ table, success: false, error: String(e) });
          }
        }

        return NextResponse.json({
          success: true,
          message: 'Database reset completed',
          results,
        });
      }

      // ============================================================
      // SEED FRESH DATA
      // ============================================================
      case 'seedFreshData': {
        const results: { step: string; success: boolean; count?: number; error?: string }[] = [];

        // Step 1: Create sample categories
        const categories = ['entertainment', 'movies', 'celebrity', 'ott', 'trending'];

        // Step 2: Trigger trend ingestion
        try {
          const trendRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/trends`, {
            method: 'POST',
          });
          const trendData = await trendRes.json();
          results.push({ step: 'Import Trends', success: trendData.success, count: trendData.draftsCreated });
        } catch (e) {
          results.push({ step: 'Import Trends', success: false, error: String(e) });
        }

        // Step 3: Run Historic Intelligence
        try {
          const historicRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/cron/historic-intelligence?action=run`);
          const historicData = await historicRes.json();
          results.push({
            step: 'Historic Intelligence',
            success: historicData.success,
            count: historicData.data?.drafts_generated
          });
        } catch (e) {
          results.push({ step: 'Historic Intelligence', success: false, error: String(e) });
        }

        // Step 4: Run Trend Fusion
        try {
          const fusionRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/trend-fusion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'run' }),
          });
          const fusionData = await fusionRes.json();
          results.push({
            step: 'Trend Fusion',
            success: fusionData.success,
            count: fusionData.data?.recommendations_generated
          });
        } catch (e) {
          results.push({ step: 'Trend Fusion', success: false, error: String(e) });
        }

        return NextResponse.json({
          success: true,
          message: 'Fresh data seeded',
          results,
        });
      }

      // ============================================================
      // GET STATS
      // ============================================================
      case 'getStats': {
        const [
          { count: totalPosts },
          { count: drafts },
          { count: published },
          { count: archived },
        ] = await Promise.all([
          supabase.from('posts').select('*', { count: 'exact', head: true }),
          supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
          supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
          supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'archived'),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            total: totalPosts || 0,
            drafts: drafts || 0,
            published: published || 0,
            archived: archived || 0,
          },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Bulk operations error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}




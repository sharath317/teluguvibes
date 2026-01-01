/**
 * Celebrity Social Profiles API
 * 
 * GET /api/celebrity/[id]/social
 * Returns verified social profiles for a celebrity
 * 
 * Used by:
 * - Hot Media generator
 * - Glamour content AI
 * - Browser personalization
 * - Recommendation engine
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateProfileEmbed, buildSocialLinksGrid } from '@/lib/social/oembed';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SocialProfile {
  id: string;
  platform: string;
  handle: string;
  profile_url: string;
  source: string;
  confidence_score: number;
  verified: boolean;
  is_official: boolean;
  is_primary: boolean;
  metadata: Record<string, any>;
}

/**
 * GET /api/celebrity/[id]/social
 * 
 * Query params:
 *   platform: Filter by platform (instagram, youtube, twitter, etc.)
 *   verified: Only return verified handles (true/false)
 *   include_embed: Include embed HTML in response (true/false)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get('platform');
    const verifiedOnly = searchParams.get('verified') === 'true';
    const includeEmbed = searchParams.get('include_embed') === 'true';

    // Build query
    let query = supabase
      .from('celebrity_social_profiles')
      .select('*')
      .eq('celebrity_id', id)
      .eq('is_active', true)
      .order('verified', { ascending: false })
      .order('confidence_score', { ascending: false });

    if (platform) {
      query = query.eq('platform', platform);
    }

    if (verifiedOnly) {
      query = query.eq('verified', true);
    } else {
      // By default, only return profiles with confidence >= 0.6
      query = query.gte('confidence_score', 0.6);
    }

    const { data: profiles, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Get celebrity name for context
    const { data: celebrity } = await supabase
      .from('celebrities')
      .select('name_en, name_te')
      .eq('id', id)
      .single();

    // Format response
    const formattedProfiles = (profiles || []).map((profile: SocialProfile) => {
      const result: any = {
        id: profile.id,
        platform: profile.platform,
        handle: profile.handle,
        profile_url: profile.profile_url,
        source: profile.source,
        confidence: Math.round(profile.confidence_score * 100),
        verified: profile.verified,
        is_official: profile.is_official,
        is_primary: profile.is_primary,
      };

      // Add embed HTML if requested
      if (includeEmbed) {
        result.embed_html = generateProfileEmbed(
          profile.platform,
          profile.handle,
          profile.profile_url
        );
      }

      return result;
    });

    // Group by platform for easier consumption
    const byPlatform: Record<string, any[]> = {};
    for (const profile of formattedProfiles) {
      if (!byPlatform[profile.platform]) {
        byPlatform[profile.platform] = [];
      }
      byPlatform[profile.platform].push(profile);
    }

    // Generate links grid HTML
    const linksGrid = buildSocialLinksGrid(
      formattedProfiles.map((p: any) => ({
        platform: p.platform,
        handle: p.handle,
        profile_url: p.profile_url,
        verified: p.verified,
      }))
    );

    return NextResponse.json({
      success: true,
      celebrity: celebrity ? {
        id,
        name_en: celebrity.name_en,
        name_te: celebrity.name_te,
      } : null,
      profiles: formattedProfiles,
      by_platform: byPlatform,
      links_grid_html: linksGrid,
      total: formattedProfiles.length,
      verified_count: formattedProfiles.filter((p: any) => p.verified).length,
    });
  } catch (error) {
    console.error('Social profiles API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/celebrity/[id]/social
 * 
 * Add a new social profile (admin only)
 * 
 * Body:
 *   platform: Platform name
 *   handle: Social media handle
 *   profile_url: Full profile URL
 *   source: Data source (manual, wikidata, etc.)
 *   verified: Whether verified (optional)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { platform, handle, profile_url, source, verified } = body;

    // Validate required fields
    if (!platform || !handle || !profile_url) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: platform, handle, profile_url' },
        { status: 400 }
      );
    }

    // Check if celebrity exists
    const { data: celebrity } = await supabase
      .from('celebrities')
      .select('id')
      .eq('id', id)
      .single();

    if (!celebrity) {
      return NextResponse.json(
        { success: false, error: 'Celebrity not found' },
        { status: 404 }
      );
    }

    // Check if blocked
    const { data: blocked } = await supabase
      .from('social_blocked_handles')
      .select('id, reason')
      .eq('platform', platform)
      .eq('handle', handle)
      .single();

    if (blocked) {
      return NextResponse.json(
        { success: false, error: `Handle is blocked: ${blocked.reason}` },
        { status: 400 }
      );
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('celebrity_social_profiles')
      .select('id')
      .eq('celebrity_id', id)
      .eq('platform', platform)
      .eq('handle', handle)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Profile already exists' },
        { status: 409 }
      );
    }

    // Insert
    const { data: profile, error } = await supabase
      .from('celebrity_social_profiles')
      .insert({
        celebrity_id: id,
        platform,
        handle,
        profile_url,
        source: source || 'manual',
        confidence_score: source === 'manual' ? 0.7 : 0.5,
        verified: verified || false,
        verification_method: verified ? 'admin_verified' : 'unverified',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('Social profiles POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/celebrity/[id]/social
 * 
 * Update a social profile (admin only)
 * 
 * Body:
 *   profile_id: Profile ID to update
 *   verified: Update verified status
 *   is_active: Activate/deactivate
 *   is_primary: Set as primary for platform
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { profile_id, verified, is_active, is_primary } = body;

    if (!profile_id) {
      return NextResponse.json(
        { success: false, error: 'Missing profile_id' },
        { status: 400 }
      );
    }

    // Build update object
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (verified !== undefined) {
      updates.verified = verified;
      updates.verification_method = verified ? 'admin_verified' : 'unverified';
      if (verified) {
        updates.last_verified = new Date().toISOString();
      }
    }

    if (is_active !== undefined) {
      updates.is_active = is_active;
    }

    if (is_primary !== undefined) {
      updates.is_primary = is_primary;
      
      // If setting as primary, unset other primaries for same platform
      if (is_primary) {
        const { data: profile } = await supabase
          .from('celebrity_social_profiles')
          .select('platform')
          .eq('id', profile_id)
          .single();

        if (profile) {
          await supabase
            .from('celebrity_social_profiles')
            .update({ is_primary: false })
            .eq('celebrity_id', id)
            .eq('platform', profile.platform)
            .neq('id', profile_id);
        }
      }
    }

    const { data: updated, error } = await supabase
      .from('celebrity_social_profiles')
      .update(updates)
      .eq('id', profile_id)
      .eq('celebrity_id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: updated,
    });
  } catch (error) {
    console.error('Social profiles PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/celebrity/[id]/social
 * 
 * Delete or block a social profile
 * 
 * Query params:
 *   profile_id: Profile ID to delete
 *   block: Also add to blocked list (true/false)
 *   reason: Block reason (required if block=true)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const profile_id = searchParams.get('profile_id');
    const block = searchParams.get('block') === 'true';
    const reason = searchParams.get('reason');

    if (!profile_id) {
      return NextResponse.json(
        { success: false, error: 'Missing profile_id' },
        { status: 400 }
      );
    }

    // Get profile info before deletion
    const { data: profile } = await supabase
      .from('celebrity_social_profiles')
      .select('platform, handle')
      .eq('id', profile_id)
      .eq('celebrity_id', id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Add to blocked list if requested
    if (block) {
      if (!reason) {
        return NextResponse.json(
          { success: false, error: 'Block reason required' },
          { status: 400 }
        );
      }

      await supabase
        .from('social_blocked_handles')
        .insert({
          platform: profile.platform,
          handle: profile.handle,
          reason,
          blocked_at: new Date().toISOString(),
        })
        .select();
    }

    // Delete profile
    const { error } = await supabase
      .from('celebrity_social_profiles')
      .delete()
      .eq('id', profile_id)
      .eq('celebrity_id', id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: { id: profile_id, ...profile },
      blocked: block,
    });
  } catch (error) {
    console.error('Social profiles DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


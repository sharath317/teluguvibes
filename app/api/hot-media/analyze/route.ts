// Hot Media Analyze API - Preview analysis before saving
import { NextRequest, NextResponse } from 'next/server';
import { fetchMediaFromUrl, validateUrl, getPlatformInfo } from '@/lib/hot-media/embed-validator';
import { analyzeGlamContent } from '@/lib/hot-media/ai-caption-generator';
import { getSafetyBadge } from '@/lib/hot-media/safety-checker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Analyze URL without saving
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, entity_name } = body;
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    // Step 1: Validate URL
    const validation = validateUrl(url);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        step: 'validate',
        error: validation.error,
      }, { status: 400 });
    }
    
    // Step 2: Fetch embed data
    const mediaResult = await fetchMediaFromUrl(url);
    if (!mediaResult.success) {
      return NextResponse.json({
        success: false,
        step: 'fetch',
        error: mediaResult.error || 'Failed to fetch media',
        validation,
      }, { status: 400 });
    }
    
    // Step 3: AI Analysis
    const analysis = await analyzeGlamContent({
      url,
      text: mediaResult.title || '',
      entityName: entity_name || 'Celebrity',
      platform: validation.platform,
    });
    
    // Step 4: Safety badge
    const safetyBadge = getSafetyBadge(analysis.safety.risk);
    const platformInfo = getPlatformInfo(validation.platform);
    
    return NextResponse.json({
      success: true,
      validation: {
        platform: validation.platform,
        mediaType: validation.mediaType,
        cleanUrl: validation.cleanUrl,
        platformInfo,
      },
      embed: {
        html: mediaResult.embed_html,
        thumbnailUrl: mediaResult.thumbnail_url,
        title: mediaResult.title,
        authorName: mediaResult.author_name,
      },
      analysis: {
        captions: analysis.captions,
        suggestedCategory: analysis.suggestedCategory,
        suggestedTags: analysis.suggestedTags,
        audienceEmotion: analysis.audienceEmotion,
        glamAngle: analysis.glamAngle,
        confidence: analysis.confidence,
      },
      safety: {
        risk: analysis.safety.risk,
        flags: analysis.safety.flags,
        blockedReason: analysis.safety.blockedReason,
        requiresReview: analysis.safety.requiresReview,
        autoApproveEligible: analysis.safety.autoApproveEligible,
        badge: safetyBadge,
      },
    });
  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Analysis failed',
    }, { status: 500 });
  }
}


/**
 * Hot Media Pipeline API
 * 
 * Endpoints:
 * POST /api/hot-media/pipeline - Run auto-discovery pipeline
 * GET /api/hot-media/pipeline - Get learning insights
 * PUT /api/hot-media/pipeline - Update trending scores
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { runAutoPipeline, quickPipelineRun } from '@/lib/hot-media/auto-pipeline';
import { 
  getDiscoveryRecommendations, 
  updateTrendingScores,
  getTopCategories,
  getTopPerformingCelebrities
} from '@/lib/hot-media/learning-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET - Get learning insights and recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    const [recommendations, categories, celebrities] = await Promise.all([
      getDiscoveryRecommendations(supabase),
      getTopCategories(supabase),
      getTopPerformingCelebrities(supabase, 20),
    ]);
    
    return NextResponse.json({
      success: true,
      insights: {
        priorityCelebrities: recommendations.priorityCelebrities,
        recommendedCategories: recommendations.recommendedCategories,
        learningInsights: recommendations.insights,
        categoryPerformance: categories,
        allCelebrities: celebrities,
      },
    });
  } catch (error) {
    console.error('Pipeline insights error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}

/**
 * POST - Run the auto-discovery pipeline
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    
    const maxItems = body.maxItems || 20;
    const requireReview = body.requireReview ?? false;
    const categories = body.categories || [
      'photoshoot', 'fashion', 'traditional', 'western', 
      'events', 'fitness', 'beach', 'reels'
    ];
    
    console.log(`🚀 Pipeline API: Starting with max=${maxItems}, review=${requireReview}`);
    
    const result = await runAutoPipeline({
      maxNewItems: maxItems,
      autoPublishThreshold: requireReview ? 100 : 75,
      requireReview,
      categories,
      supabaseUrl,
      supabaseKey,
    });
    
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Pipeline run error:', error);
    return NextResponse.json(
      { error: 'Pipeline execution failed', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update trending scores
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const updated = await updateTrendingScores(supabase);
    
    return NextResponse.json({
      success: true,
      updated,
      message: `Updated ${updated} trending scores`,
    });
  } catch (error) {
    console.error('Trending update error:', error);
    return NextResponse.json(
      { error: 'Failed to update trending scores' },
      { status: 500 }
    );
  }
}


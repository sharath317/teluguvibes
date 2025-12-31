// Hot Media Categories API
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { GLAM_CATEGORIES } from '@/types/media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Fetch categories with counts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Try to get categories from DB first
    const { data: dbCategories } = await supabase
      .from('hot_media_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    
    // Get counts per category
    const { data: counts } = await supabase
      .from('hot_media')
      .select('category')
      .eq('status', 'approved')
      .eq('is_blocked', false);
    
    // Count by category
    const categoryCounts: Record<string, number> = {};
    if (counts) {
      for (const item of counts) {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      }
    }
    
    // Merge with GLAM_CATEGORIES constant
    const categories = GLAM_CATEGORIES.map(cat => ({
      ...cat,
      count: categoryCounts[cat.id] || 0,
    }));
    
    return NextResponse.json({
      success: true,
      categories,
      dbCategories: dbCategories || [],
    });
  } catch (error) {
    console.error('Categories GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/categories
 * Get all active categories with their rules
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Get post counts per category
    const { data: postCounts } = await supabase
      .from('posts')
      .select('category')
      .eq('status', 'published');

    const counts: Record<string, number> = {};
    postCounts?.forEach(post => {
      counts[post.category] = (counts[post.category] || 0) + 1;
    });

    const categoriesWithCounts = data?.map(cat => ({
      ...cat,
      post_count: counts[cat.slug] || 0,
    }));

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      categories: categoriesWithCounts,
    });
  } catch (error) {
    console.error('Categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories
 * Create a new category
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      slug,
      name_te,
      name_en,
      description_te,
      description_en,
      icon,
      content_type = 'news',
      risk_level = 'low',
      image_style = 'stock',
      ai_rules = {},
      display_order = 0,
    } = body;

    if (!slug || !name_te || !name_en) {
      return NextResponse.json(
        { error: 'Missing required fields: slug, name_te, name_en' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        slug,
        name_te,
        name_en,
        description_te,
        description_en,
        icon,
        content_type,
        risk_level,
        image_style,
        ai_rules,
        display_order,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      category: data,
    });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/categories
 * Update a category
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing category id' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('categories')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      category: data,
    });
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}









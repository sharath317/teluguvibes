import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import slugify from 'slugify';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generate unique slug from title
function generateSlug(title: string): string {
  const baseSlug = slugify(title, {
    lower: true,
    strict: true,
    locale: 'en',
  });

  // Add timestamp to ensure uniqueness
  const timestamp = Date.now().toString(36);
  return `${baseSlug || 'post'}-${timestamp}`;
}

// GET: Fetch all posts (admin)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ posts: data || [] });
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create new post
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Auto-generate slug if not provided
    const postData = {
      ...body,
      slug: body.slug || generateSlug(body.title),
    };

    const { data, error } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();

    if (error) {
      console.error('Error creating post:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create post' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, post: data });
  } catch (error) {
    console.error('Failed to create post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

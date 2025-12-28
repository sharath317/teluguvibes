import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('posts')
      .update({
        status: 'published',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error publishing post:', error);
      return NextResponse.json(
        { error: 'Failed to publish post' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      post: data,
      message: 'Post published successfully'
    });
  } catch (error) {
    console.error('Failed to publish post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * STORIES API
 *
 * Generate and manage Telugu life stories.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateStories, getStoriesEngine } from '@/lib/stories';
import type { StoryCategory } from '@/lib/stories/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') as StoryCategory | null;
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    const engine = getStoriesEngine();
    const stories = await engine.getEvergreenStories(limit);

    // Filter by category if specified
    const filtered = category
      ? stories.filter(s => s.category === category)
      : stories;

    return NextResponse.json({ stories: filtered });
  } catch (error) {
    console.error('Stories fetch error:', error);
    return NextResponse.json({ stories: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, category, count } = body;

    if (action === 'generate') {
      if (!category) {
        return NextResponse.json(
          { error: 'Category is required' },
          { status: 400 }
        );
      }

      const stories = await generateStories(category as StoryCategory, count || 3);
      return NextResponse.json({ stories, count: stories.length });
    }

    if (action === 'recycle') {
      const { storyId } = body;
      if (!storyId) {
        return NextResponse.json(
          { error: 'Story ID is required' },
          { status: 400 }
        );
      }

      const engine = getStoriesEngine();
      const updated = await engine.recycleStory(storyId);
      return NextResponse.json({ story: updated });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Stories API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process' },
      { status: 500 }
    );
  }
}

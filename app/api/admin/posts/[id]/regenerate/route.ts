/**
 * Content/Image Regeneration API
 * One-click regenerate for content, image, or both
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateTeluguContent } from '@/lib/pipeline/content-generator';
import { selectBestImage } from '@/lib/intelligence/image-intelligence';
import { getEnhancedImage } from '@/lib/content/telugu-templates';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { type = 'both' } = body; // 'content' | 'image' | 'both'

  try {
    // Fetch existing post
    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const results: Record<string, unknown> = {
      postId: id,
      type,
    };

    // Regenerate content
    if (type === 'content' || type === 'both') {
      console.log(`Regenerating content for post ${id}...`);
      
      const topic = post.title || post.title_te || '';
      const contentResult = await generateTeluguContent(topic);

      if (contentResult && contentResult.bodyTe) {
        updates.title_te = contentResult.titleTe || post.title_te;
        updates.body_te = contentResult.bodyTe;
        updates.telugu_body = contentResult.bodyTe;
        updates.excerpt = contentResult.excerpt || contentResult.bodyTe.slice(0, 150) + '...';
        
        results.contentRegenerated = true;
        results.contentLength = contentResult.bodyTe.length;
        results.contentSource = contentResult.source;
      } else {
        results.contentRegenerated = false;
        results.contentError = 'Content generation failed';
      }
    }

    // Regenerate image
    if (type === 'image' || type === 'both') {
      console.log(`Regenerating image for post ${id}...`);
      
      const topic = post.title || post.title_te || '';
      
      // Try enhanced Wikipedia image first
      let imageUrl = null;
      let imageSource = null;

      const wikiImage = await getEnhancedImage(topic);
      if (wikiImage && wikiImage.url) {
        imageUrl = wikiImage.url;
        imageSource = wikiImage.source;
      } else {
        // Fallback to full image intelligence
        const imageResult = await selectBestImage({
          topic,
          entityType: 'post',
          category: post.category,
        });

        if (imageResult.selectedImage) {
          imageUrl = imageResult.selectedImage.url;
          imageSource = imageResult.selectedImage.source;
        }
      }

      if (imageUrl) {
        updates.image_url = imageUrl;
        updates.image_source = imageSource;
        
        results.imageRegenerated = true;
        results.imageUrl = imageUrl;
        results.imageSource = imageSource;
      } else {
        results.imageRegenerated = false;
        results.imageError = 'No suitable image found';
      }
    }

    // Apply updates
    if (Object.keys(updates).length > 1) {
      const { error: updateError } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update post', details: updateError.message },
          { status: 500 }
        );
      }

      results.success = true;
      results.updatedFields = Object.keys(updates).filter(k => k !== 'updated_at');
    } else {
      results.success = false;
      results.message = 'Nothing was regenerated';
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Regeneration failed:', error);
    return NextResponse.json(
      { error: 'Regeneration failed', details: String(error) },
      { status: 500 }
    );
  }
}


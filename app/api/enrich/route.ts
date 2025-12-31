import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateTeluguContent, isOllamaAvailable } from '@/lib/pipeline/content-generator';
import { findEntity, extractTags, getEntityImage } from '@/lib/content/telugu-templates';
import { fetchRelevantImage } from '@/lib/image-fetcher';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST: Enrich a post with better content and images
 * Uses the same high-quality generator as pnpm free:run
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, topic } = body;

    if (!postId && !topic) {
      return NextResponse.json(
        { error: 'Either postId or topic is required' },
        { status: 400 }
      );
    }

    let originalTitle = topic;
    let originalPost = null;

    // If postId provided, fetch the post first
    if (postId) {
      const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error || !post) {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        );
      }

      originalPost = post;
      originalTitle = post.title || post.title_te || topic;
    }

    console.log(`\n🔄 [Enrich] Processing: ${originalTitle?.slice(0, 50)}...`);

    // Generate enriched content
    const enrichedContent = await generateTeluguContent(originalTitle);

    if (!enrichedContent) {
      return NextResponse.json(
        { error: 'Failed to generate enriched content' },
        { status: 500 }
      );
    }

    console.log(`   ✅ Generated: ${enrichedContent.titleTe?.slice(0, 40)}...`);
    console.log(`   📍 Source: ${enrichedContent.source}`);
    console.log(`   📊 Confidence: ${(enrichedContent.confidence * 100).toFixed(0)}%`);

    // If we have a postId, update the existing post
    if (postId && originalPost) {
      const updateData: Record<string, any> = {
        title: enrichedContent.titleTe,
        title_te: enrichedContent.titleTe,
        excerpt: enrichedContent.excerpt,
        body_te: enrichedContent.bodyTe,
        telugu_body: enrichedContent.bodyTe,
        tags: enrichedContent.tags,
        updated_at: new Date().toISOString(),
      };

      // Smart Image Search (same as free:run)
      // Priority: Entity DB → TMDB → Wikipedia → Unsplash → Default
      let imageUrl = enrichedContent.imageUrl;
      let imageSource = 'Wikipedia';

      if (!imageUrl || imageUrl.includes('unsplash.com')) {
        // Use the comprehensive image fetcher
        console.log(`   🔍 Searching for better image...`);
        const imageResult = await fetchRelevantImage(
          originalTitle,
          enrichedContent.bodyTe || '',
          originalPost.category || 'entertainment'
        );

        if (imageResult && imageResult.source !== 'stock') {
          imageUrl = imageResult.url;
          imageSource = imageResult.source === 'tmdb' ? 'TMDB' :
                       imageResult.source === 'unsplash' ? 'Unsplash' : 'Wikipedia';
          console.log(`   ✅ Found: ${imageSource} image`);
        }
      }

      if (imageUrl) {
        updateData.image_url = imageUrl;
        updateData.image_alt = enrichedContent.imageAlt || `Image for ${originalTitle}`;
        updateData.image_source = imageSource;
        updateData.image_license = imageSource === 'TMDB' ? 'TMDB License' :
                                   imageSource === 'Unsplash' ? 'Unsplash License' : 'CC BY-SA';
      }

      const { error: updateError } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', postId);

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update post' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Post enriched successfully',
        postId,
        source: enrichedContent.source,
        confidence: enrichedContent.confidence,
        changes: {
          title: enrichedContent.titleTe,
          contentLength: enrichedContent.bodyTe?.length,
          tags: enrichedContent.tags,
          hasImage: !!imageUrl,
          imageSource: imageSource,
        },
      });
    }

    // If no postId, return the generated content for preview
    return NextResponse.json({
      success: true,
      content: enrichedContent,
    });

  } catch (error) {
    console.error('Enrich error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET: Enrich all drafts
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '10');
  const status = searchParams.get('status') || 'draft';

  try {
    // Fetch posts that need enrichment (empty body or no image)
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, title, title_te, body_te, telugu_body, image_url')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    // Filter posts that need enrichment:
    // 1. No content or low content (<200 chars)
    // 2. No image OR has non-Wikipedia image (we prefer Wikipedia for all)
    const needsEnrichment = posts?.filter(p => {
      const hasGoodContent = (p.body_te?.length || 0) > 200 || (p.telugu_body?.length || 0) > 200;
      const hasWikipediaImage = p.image_url &&
        (p.image_url.includes('wikimedia.org') || p.image_url.includes('wikipedia.org'));
      return !hasGoodContent || !hasWikipediaImage;
    }) || [];

    console.log(`\n🔄 [Enrich] Found ${needsEnrichment.length} posts needing enrichment`);

    const results = {
      total: posts?.length || 0,
      enriched: 0,
      failed: 0,
      details: [] as any[],
    };

    for (const post of needsEnrichment) {
      try {
        const topic = post.title || post.title_te;
        const enriched = await generateTeluguContent(topic);

        if (enriched) {
          const updateData: Record<string, any> = {
            title: enriched.titleTe,
            title_te: enriched.titleTe,
            excerpt: enriched.excerpt,
            body_te: enriched.bodyTe,
            telugu_body: enriched.bodyTe,
            tags: enriched.tags,
            updated_at: new Date().toISOString(),
          };

          // Smart Image Search - use comprehensive fetcher
          let imageUrl = enriched.imageUrl;
          let imageSource = 'Wikipedia';

          if (!imageUrl || imageUrl.includes('unsplash.com')) {
            const imageResult = await fetchRelevantImage(
              topic,
              enriched.bodyTe || '',
              'entertainment'
            );

            if (imageResult && imageResult.source !== 'stock') {
              imageUrl = imageResult.url;
              imageSource = imageResult.source === 'tmdb' ? 'TMDB' :
                           imageResult.source === 'unsplash' ? 'Unsplash' : 'Wikipedia';
            }
          }

          if (imageUrl) {
            updateData.image_url = imageUrl;
            updateData.image_alt = enriched.imageAlt || `Image for ${topic}`;
            updateData.image_source = imageSource;
            updateData.image_license = imageSource === 'TMDB' ? 'TMDB License' :
                                       imageSource === 'Unsplash' ? 'Unsplash License' : 'CC BY-SA';
          }

          await supabase.from('posts').update(updateData).eq('id', post.id);
          results.enriched++;
          results.details.push({
            id: post.id,
            title: enriched.titleTe?.slice(0, 50),
            source: enriched.source,
            success: true,
          });
        } else {
          results.failed++;
          results.details.push({ id: post.id, success: false });
        }
      } catch (e) {
        results.failed++;
        results.details.push({ id: post.id, success: false, error: (e as Error).message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Enriched ${results.enriched} posts`,
      ...results,
    });

  } catch (error) {
    console.error('Batch enrich error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

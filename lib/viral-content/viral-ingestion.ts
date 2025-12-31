/**
 * Viral Content Ingestion Pipeline
 *
 * Main orchestrator that fetches viral content from multiple sources,
 * moderates it, and creates media_posts entries for the Hot page.
 */

import { createClient } from '@supabase/supabase-js';
import { fetchMediaEmbed, detectPlatform } from '@/lib/media/embed-fetcher';
import { fetchYouTubeTrending, calculateYouTubeViralScore, extractYouTubeTags, type YouTubeTrendingItem } from './youtube-trending';
import { fetchRedditHot, calculateRedditViralScore, extractRedditTags, getEmbeddableRedditPosts, type RedditHotItem } from './reddit-hot';
import { fetchTwitterEmbed, calculateTwitterViralScore, extractTwitterTags, type TwitterViralItem } from './twitter-viral';
import { moderateContent, type ModerationResult, type ContentForModeration } from './moderation';
import type { MediaType, MediaSource, MediaCategory } from '@/types/media';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// TYPES
// ============================================================

export interface ViralIngestionResult {
  total_fetched: number;
  total_processed: number;
  auto_approved: number;
  pending_review: number;
  auto_rejected: number;
  duplicates_skipped: number;
  errors: string[];
  by_source: {
    youtube: number;
    reddit: number;
    twitter: number;
  };
}

interface ProcessedViralItem {
  source_url: string;
  media_type: MediaType;
  source: MediaSource;
  embed_html: string | null;
  thumbnail_url: string | null;
  image_url?: string; // For direct images
  title: string;
  description?: string;
  tags: string[];
  category: MediaCategory;
  viral_score: number;
  external_views?: number;
  external_likes?: number;
  external_shares?: number;
  viral_source: string;
  channel_id?: string;
  moderation: ModerationResult;
}

// ============================================================
// YOUTUBE INGESTION
// ============================================================

async function processYouTubeContent(): Promise<ProcessedViralItem[]> {
  const items: ProcessedViralItem[] = [];

  try {
    const trending = await fetchYouTubeTrending({
      maxResults: 50,
      teluguOnly: true,
    });

    for (const video of trending) {
      // Fetch embed data
      const embedResult = await fetchMediaEmbed(video.url);

      if (!embedResult.success) {
        continue;
      }

      const viralScore = calculateYouTubeViralScore(video);
      const tags = extractYouTubeTags(video);

      // Determine category from tags/title
      const category = inferCategory(video.title, tags);

      // Prepare for moderation
      const moderationContent: ContentForModeration = {
        title: video.title,
        description: video.description,
        tags,
        sourceType: 'youtube',
        sourceId: video.channelId,
        mediaType: video.url.includes('/shorts/') ? 'youtube_short' : 'youtube_video',
        viralScore,
        externalViews: video.viewCount,
        externalLikes: video.likeCount,
      };

      const moderation = moderateContent(moderationContent);

      items.push({
        source_url: video.url,
        media_type: video.url.includes('/shorts/') ? 'youtube_short' : 'youtube_video',
        source: 'youtube_embed',
        embed_html: embedResult.embed_html || null,
        thumbnail_url: video.thumbnail || embedResult.thumbnail_url || null,
        title: video.title,
        description: video.description,
        tags,
        category,
        viral_score: viralScore,
        external_views: video.viewCount,
        external_likes: video.likeCount,
        external_shares: video.commentCount,
        viral_source: 'youtube_trending',
        channel_id: video.channelId,
        moderation,
      });
    }

    console.log(`✅ Processed ${items.length} YouTube videos`);

  } catch (error) {
    console.error('YouTube processing error:', error);
  }

  return items;
}

// ============================================================
// REDDIT INGESTION (Images + Embeddable Content)
// ============================================================

async function processRedditContent(): Promise<ProcessedViralItem[]> {
  const items: ProcessedViralItem[] = [];

  try {
    // Fetch ALL hot posts (not just embeddable)
    const hotPosts = await fetchRedditHot({
      maxPerSubreddit: 25,
      minScore: 30,
      embeddableOnly: false, // Include images too
    });

    for (const post of hotPosts) {
      // Skip text-only posts
      if (post.mediaType === 'text' || post.mediaType === 'link') continue;

      // Skip NSFW
      if (post.isNsfw) continue;

      const viralScore = calculateRedditViralScore(post);
      const tags = extractRedditTags(post);
      const category = inferCategory(post.title, tags);

      // Handle Reddit-hosted images
      if (post.mediaType === 'image' && post.mediaUrl) {
        const moderationContent: ContentForModeration = {
          title: post.title,
          tags,
          sourceType: 'reddit',
          sourceId: post.subreddit,
          mediaType: 'image',
          viralScore,
          externalViews: post.score,
          externalLikes: post.score,
        };

        const moderation = moderateContent(moderationContent);

        items.push({
          source_url: post.permalink,
          media_type: 'image',
          source: 'official_website',
          embed_html: null,
          thumbnail_url: post.thumbnail,
          image_url: post.mediaUrl,
          title: post.title,
          tags,
          category: category === 'general' ? 'photoshoot' : category,
          viral_score: viralScore,
          external_views: post.score,
          external_likes: post.score,
          external_shares: post.numComments,
          viral_source: `reddit_${post.subreddit}`,
          moderation,
        });
        continue;
      }

      // Handle Reddit-hosted videos
      if (post.mediaType === 'video' && post.mediaUrl) {
        const moderationContent: ContentForModeration = {
          title: post.title,
          tags,
          sourceType: 'reddit',
          sourceId: post.subreddit,
          mediaType: 'youtube_video', // Treat as video for display
          viralScore,
          externalViews: post.score,
          externalLikes: post.score,
        };

        const moderation = moderateContent(moderationContent);

        // Create video embed HTML for Reddit videos
        const videoEmbedHtml = `<video controls autoplay muted loop style="width:100%;max-height:80vh;"><source src="${post.mediaUrl}" type="video/mp4">Your browser does not support video.</video>`;

        items.push({
          source_url: post.permalink,
          media_type: 'youtube_video', // Use youtube_video type for video display
          source: 'official_website',
          embed_html: videoEmbedHtml,
          thumbnail_url: post.thumbnail,
          title: post.title,
          tags,
          category,
          viral_score: viralScore,
          external_views: post.score,
          external_likes: post.score,
          external_shares: post.numComments,
          viral_source: `reddit_${post.subreddit}`,
          moderation,
        });
        continue;
      }

      // Handle embeddable content (YouTube, Twitter, Instagram links)
      if (['youtube', 'twitter', 'instagram'].includes(post.mediaType) && post.mediaUrl) {
        const embedResult = await fetchMediaEmbed(post.mediaUrl);

        if (!embedResult.success) {
          continue;
        }

        const moderationContent: ContentForModeration = {
          title: post.title,
          tags,
          sourceType: 'reddit',
          sourceId: post.subreddit,
          mediaType: embedResult.media_type,
          viralScore,
          externalViews: post.score,
          externalLikes: post.score,
        };

        const moderation = moderateContent(moderationContent);

        items.push({
          source_url: post.mediaUrl,
          media_type: embedResult.media_type,
          source: embedResult.source,
          embed_html: embedResult.embed_html || null,
          thumbnail_url: post.thumbnail || embedResult.thumbnail_url || null,
          title: post.title,
          tags,
          category,
          viral_score: viralScore,
          external_views: post.score,
          external_likes: post.score,
          external_shares: post.numComments,
          viral_source: `reddit_${post.subreddit}`,
          moderation,
        });

        // Rate limiting between embeds
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`✅ Processed ${items.length} Reddit posts`);

  } catch (error) {
    console.error('Reddit processing error:', error);
  }

  return items;
}

// ============================================================
// TWITTER INGESTION (from Reddit/news links)
// ============================================================

async function processTwitterFromReddit(): Promise<ProcessedViralItem[]> {
  const items: ProcessedViralItem[] = [];

  try {
    // Get Reddit posts that link to Twitter
    const hotPosts = await fetchRedditHot({
      maxPerSubreddit: 15,
      minScore: 30,
    });

    const twitterUrls = hotPosts
      .filter(p => p.mediaType === 'twitter' && p.mediaUrl)
      .map(p => p.mediaUrl!)
      .slice(0, 20);

    for (const url of twitterUrls) {
      const twitterItem = await fetchTwitterEmbed(url);

      if (!twitterItem) continue;

      const viralScore = calculateTwitterViralScore(twitterItem);
      const tags = extractTwitterTags(twitterItem);

      const category = inferCategory(twitterItem.authorName, tags);

      // Prepare for moderation
      const moderationContent: ContentForModeration = {
        title: twitterItem.authorName,
        tags,
        sourceType: 'twitter',
        sourceId: twitterItem.authorUrl.split('/').pop() || '',
        mediaType: 'twitter_post',
        viralScore,
      };

      const moderation = moderateContent(moderationContent);

      items.push({
        source_url: twitterItem.url,
        media_type: 'twitter_post',
        source: 'twitter_embed',
        embed_html: twitterItem.html,
        thumbnail_url: null,
        title: `Tweet by ${twitterItem.authorName}`,
        tags,
        category,
        viral_score: viralScore,
        viral_source: 'twitter_viral',
        moderation,
      });
    }

    console.log(`✅ Processed ${items.length} Twitter posts`);

  } catch (error) {
    console.error('Twitter processing error:', error);
  }

  return items;
}

// ============================================================
// DATABASE OPERATIONS
// ============================================================

async function checkDuplicate(sourceUrl: string): Promise<boolean> {
  const { data } = await supabase
    .from('media_posts')
    .select('id')
    .eq('source_url', sourceUrl)
    .single();

  return !!data;
}

async function saveMediaPost(item: ProcessedViralItem): Promise<boolean> {
  try {
    // Determine status based on moderation
    let status: 'approved' | 'pending' | 'rejected';
    switch (item.moderation.decision) {
      case 'auto_approve':
        status = 'approved';
        break;
      case 'auto_reject':
        status = 'rejected';
        break;
      default:
        status = 'pending';
    }

    const { error } = await supabase
      .from('media_posts')
      .insert({
        media_type: item.media_type,
        source: item.source,
        source_url: item.source_url,
        source_license: 'embed-allowed',
        embed_html: item.embed_html,
        image_url: item.image_url || null,
        thumbnail_url: item.thumbnail_url || item.image_url || null,
        title: item.title,
        caption: item.description?.slice(0, 500),
        tags: item.tags,
        category: item.category,
        trending_score: item.viral_score,
        external_views: item.external_views || 0,
        external_likes: item.external_likes || 0,
        external_shares: item.external_shares || 0,
        viral_source: item.viral_source,
        status,
        is_hot: status === 'approved' && item.viral_score >= 50,
        is_featured: status === 'approved' && item.viral_score >= 80,
        moderation_notes: item.moderation.reasons.join('; '),
        fetched_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving media post:', error);
      return false;
    }

    return true;

  } catch (error) {
    console.error('Save error:', error);
    return false;
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function inferCategory(title: string, tags: string[]): MediaCategory {
  const text = `${title} ${tags.join(' ')}`.toLowerCase();

  // Movie Promotion - trailers, teasers, first look, posters
  if (/trailer|teaser|promo|first look|firstlook|motion poster|glimpse|title reveal/.test(text)) return 'movie_promotion';

  // Events - launches, press meets, success meets
  if (/event|audio launch|pre-release|press meet|success meet|thanks meet|celebration|award|launch|premiere/.test(text)) return 'event';

  // Behind the scenes - making, interviews
  if (/making|bts|behind the scenes|on set|shooting|interview|ఇంటర్వ్యూ|rapid fire/.test(text)) return 'behind_the_scenes';

  // Photoshoot - photos, pics, shoot, look
  if (/photoshoot|photo shoot|photos|pics|stunning|gorgeous|beautiful|hot|sizzling|glamour|look\b|latest pics|new pics/.test(text)) return 'photoshoot';

  // Fitness - gym, workout
  if (/fitness|gym|workout|training|body|transformation|muscle|exercise/.test(text)) return 'fitness';

  // Traditional - saree, ethnic, wedding
  if (/traditional|saree|lehenga|ethnic|పట్టు|wedding|bridal|festival|diwali|sankranti|haldi/.test(text)) return 'traditional';

  // Travel - vacation
  if (/travel|vacation|trip|holiday|beach|mountain|abroad/.test(text)) return 'travel';

  // Songs/Music - keep as general but could be separate
  if (/song|music|lyrical|video song/.test(text)) return 'general';

  // Default for images: photoshoot, for videos: general
  return 'general';
}

// ============================================================
// MAIN PIPELINE
// ============================================================

/**
 * Run the full viral content ingestion pipeline
 */
export async function ingestViralContent(): Promise<ViralIngestionResult> {
  console.log('\n🔥 ============================================');
  console.log('   VIRAL CONTENT INGESTION PIPELINE');
  console.log('============================================\n');

  const result: ViralIngestionResult = {
    total_fetched: 0,
    total_processed: 0,
    auto_approved: 0,
    pending_review: 0,
    auto_rejected: 0,
    duplicates_skipped: 0,
    errors: [],
    by_source: {
      youtube: 0,
      reddit: 0,
      twitter: 0,
    },
  };

  try {
    // Step 1: Fetch from all sources in parallel
    console.log('📡 Step 1: Fetching viral content from sources...');

    const [youtubeItems, redditItems, twitterItems] = await Promise.all([
      processYouTubeContent(),
      processRedditContent(),
      processTwitterFromReddit(),
    ]);

    const allItems = [...youtubeItems, ...redditItems, ...twitterItems];
    result.total_fetched = allItems.length;

    console.log(`\n📊 Fetched: YouTube=${youtubeItems.length}, Reddit=${redditItems.length}, Twitter=${twitterItems.length}`);

    // Step 2: Process and save each item
    console.log('\n💾 Step 2: Saving to database...');

    for (const item of allItems) {
      // Check for duplicates
      const isDuplicate = await checkDuplicate(item.source_url);
      if (isDuplicate) {
        result.duplicates_skipped++;
        continue;
      }

      // Save to database
      const saved = await saveMediaPost(item);

      if (saved) {
        result.total_processed++;

        // Track by moderation decision
        switch (item.moderation.decision) {
          case 'auto_approve':
            result.auto_approved++;
            break;
          case 'pending_review':
            result.pending_review++;
            break;
          case 'auto_reject':
            result.auto_rejected++;
            break;
        }

        // Track by source
        if (item.viral_source.startsWith('youtube')) {
          result.by_source.youtube++;
        } else if (item.viral_source.startsWith('reddit')) {
          result.by_source.reddit++;
        } else if (item.viral_source.startsWith('twitter')) {
          result.by_source.twitter++;
        }
      }
    }

    // Step 3: Update trending scores for existing hot content
    console.log('\n📈 Step 3: Updating trending scores...');
    await updateTrendingScores();

    // Step 4: Archive old content
    console.log('\n🗄️ Step 4: Archiving old content...');
    await archiveOldContent();

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.errors.push(errorMsg);
    console.error('Pipeline error:', error);
  }

  console.log('\n📊 ============================================');
  console.log('   INGESTION SUMMARY');
  console.log('============================================');
  console.log(`  Total Fetched: ${result.total_fetched}`);
  console.log(`  Total Processed: ${result.total_processed}`);
  console.log(`  Auto-Approved: ${result.auto_approved}`);
  console.log(`  Pending Review: ${result.pending_review}`);
  console.log(`  Auto-Rejected: ${result.auto_rejected}`);
  console.log(`  Duplicates Skipped: ${result.duplicates_skipped}`);
  console.log(`  By Source: YouTube=${result.by_source.youtube}, Reddit=${result.by_source.reddit}, Twitter=${result.by_source.twitter}`);
  console.log('============================================\n');

  return result;
}

/**
 * Update trending scores for existing hot content
 */
async function updateTrendingScores(): Promise<void> {
  try {
    // Get recent hot posts
    const { data: posts } = await supabase
      .from('media_posts')
      .select('id, views, likes, shares, created_at')
      .eq('is_hot', true)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (!posts) return;

    for (const post of posts) {
      // Recalculate trending score using the database function
      await supabase.rpc('update_media_trending_score', { p_post_id: post.id });
    }

    console.log(`  Updated scores for ${posts.length} posts`);

  } catch (error) {
    console.error('Error updating trending scores:', error);
  }
}

/**
 * Archive content older than 7 days that isn't featured
 */
async function archiveOldContent(): Promise<void> {
  try {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('media_posts')
      .update({
        is_hot: false,
        status: 'archived',
      })
      .lt('created_at', cutoffDate)
      .eq('is_hot', true)
      .eq('is_featured', false)
      .select('id');

    if (!error && data) {
      console.log(`  Archived ${data.length} old posts`);
    }

  } catch (error) {
    console.error('Error archiving old content:', error);
  }
}

/**
 * Get ingestion statistics for dashboard
 */
export async function getIngestionStats(): Promise<{
  last_24h: number;
  last_7d: number;
  pending_moderation: number;
  by_platform: Record<string, number>;
}> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [last24h, last7d, pending, byPlatform] = await Promise.all([
    supabase
      .from('media_posts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo),

    supabase
      .from('media_posts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo),

    supabase
      .from('media_posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),

    supabase
      .from('media_posts')
      .select('viral_source')
      .gte('created_at', sevenDaysAgo),
  ]);

  // Count by platform
  const platformCounts: Record<string, number> = {};
  for (const post of byPlatform.data || []) {
    const platform = (post.viral_source as string)?.split('_')[0] || 'unknown';
    platformCounts[platform] = (platformCounts[platform] || 0) + 1;
  }

  return {
    last_24h: last24h.count || 0,
    last_7d: last7d.count || 0,
    pending_moderation: pending.count || 0,
    by_platform: platformCounts,
  };
}
